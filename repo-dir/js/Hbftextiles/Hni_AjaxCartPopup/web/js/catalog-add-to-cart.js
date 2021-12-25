/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'jquery',
  'mage/translate',
  'underscore',
  'Magento_Catalog/js/product/view/product-ids-resolver',
  'Magento_Customer/js/customer-data',
  'jquery-ui-modules/widget'
], function ($, $t, _, idsResolver, customerData) {
  'use strict'

  $.widget('mage.catalogAddToCart', {
    options: {
      processStart: null,
      processStop: null,
      bindSubmit: true,
      minicartSelector: '[data-block="minicart"]',
      messagesSelector: '[data-placeholder="messages"]',
      productStatusSelector: '.stock.available',
      addToCartButtonSelector: '.action.tocart',
      addToCartButtonDisabledClass: 'disabled',
      addToCartButtonTextWhileAdding: '',
      addToCartButtonTextAdded: '',
      addToCartButtonTextDefault: ''
    },

    /** @inheritdoc */
    _create: function () {
      if (this.options.bindSubmit) {
        this._bindSubmit()
      }
    },

    /**
         * @private
         */
    _bindSubmit: function () {
      const self = this

      if (this.element.data('catalog-addtocart-initialized')) {
        return
      }

      this.element.data('catalog-addtocart-initialized', 1)
      this.element.on('submit', function (e) {
        e.preventDefault()
        self.submitForm($(this))
      })
    },

    /**
         * @private
         */
    _redirect: function (url) {
      // var urlParts, locationParts, forceReload;

      const urlParts = url.split('#')
      const locationParts = window.location.href.split('#')
      const forceReload = urlParts[0] === locationParts[0]

      window.location.assign(url)

      if (forceReload) {
        window.location.reload()
      }
    },

    /**
         * @return {Boolean}
         */
    isLoaderEnabled: function () {
      return this.options.processStart && this.options.processStop
    },

    /**
         * Handler for the form 'submit' event
         *
         * @param {jQuery} form
         */
    submitForm: function (form) {
      const FormArray = form.serializeArray()

      let product_name
      $.each(FormArray, function (i, v) {
        if (v.name == 'product_name') {
          product_name = v.value
        }
      })

      let bundle_selection_option_id
      $.each(FormArray, function (i, v) {
        if (v.name == 'bundle_selection_option_id') {
          bundle_selection_option_id = v.value
        }
      })

      let selected_bundle
      $.each(FormArray, function (i, v) {
        if (
          v.name ==
                    'bundle_option[' + bundle_selection_option_id + ']'
        ) {
          selected_bundle = v.value
        }
      })

      let selected_color
      $.each(FormArray, function (i, v) {
        if (
          v.name ==
                    'bundle_selection_color[' + selected_bundle + ']'
        ) {
          selected_color = v.value
        }
      })

      let bundle_qty
      $.each(FormArray, function (i, v) {
        if (v.name == 'bundle_selection_qty[' + selected_bundle + ']') {
          bundle_qty = v.value
        }
      })

      let bundle_type
      $.each(FormArray, function (i, v) {
        if (
          v.name ==
                    'bundle_selection_type[' + selected_bundle + ']'
        ) {
          bundle_type = v.value
        }
      })

      if (bundle_type == '') {
        $.each(FormArray, function (i, v) {
          if (v.name == 'product_mesurement_type') {
            bundle_type = v.value
          }
        })
      }

      let treshold_qty
      if (bundle_type == 'Yard') {
        $.each(FormArray, function (i, v) {
          if (v.name == 'fabric_treshold') {
            treshold_qty = v.value
          }
        })
      } else if (bundle_type == 'Sq. Ft') {
        $.each(FormArray, function (i, v) {
          if (v.name == 'leather_treshold') {
            treshold_qty = v.value
          }
        })
      } else {
        $.each(FormArray, function (i, v) {
          if (v.name == 'fabric_treshold') {
            treshold_qty = v.value
          }
        })
      }

      let requested_qty
      $.each(FormArray, function (i, v) {
        if (v.name == 'qty') {
          requested_qty = v.value
        }
      })

      let product_lead_time
      $.each(FormArray, function (i, v) {
        if (v.name == 'product_lead_time') {
          product_lead_time = v.value
        }
      })

      const lowInventoryMessage = `
        The quantity requested for ${product_name} ${selected_color} exceeds available inventory.
        Order will be available to ship within ${product_lead_time}. Do you want to proceed?
      `
      const htmlInventoryContent = `
        <div id="ajaxcartpopup" class="ajax-cart-popup low-inv-popup-main">
            <div class="modal-dialog model-popup modal-dialog-centered">
                <div class="modal-content">
                    <table class="ajax-cart-popup-top">
                        <thead>
                            <tr>
                                <td>
                                    <div class="popup-title-show">Low Inventory</div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div class="popup-title-text">
                                        ${lowInventoryMessage}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td class="cart-details">
                                    <button type="button" data-role="proceed-to-checkout" title="Cancel"
                                        class="action primary checkout low-inv-cancel">
                                        <span>Cancel</span>
                                    </button>
                                    <button type="button" onClick="" title="Proceed"
                                        class="action primary continue btn btn-utility low-inv-proceed">
                                        <span>Proceed</span>
                                    </button>
                                </td>
                            </tr>
                        </thead>
                    </table>
                </div>
            </div>
        </div>`

      const avaliable_qty = bundle_qty
      const self = this
      if (treshold_qty >= avaliable_qty) {
        $('body').append(htmlInventoryContent)
        $('.low-inv-popup-main').show()
        $('.low-inv-cancel').on('click', function () {
          $('.low-inv-popup-main').hide()
          $('.low-inv-popup-main').remove()
        })

        $('.low-inv-proceed').on('click', function () {
          $('.low-inv-popup-main').hide()
          $('.low-inv-popup-main').remove()
          self.ajaxSubmit(form)
        })
      } else {
        self.ajaxSubmit(form)
      }
    },
    /**
         * @param {jQuery} form
         */
    ajaxSubmit: function (form) {
      const self = this
      const productIds = idsResolver(form)

      $(self.options.minicartSelector).trigger('contentLoading')
      self.disableAddToCartButton(form)
      const formData = new FormData(form[0])

      let action_url = form.attr('action')
      if ($('.catalog-product-view').length > 0) {
        action_url = window.BASE_URL + 'ajaxcartpopup/cart/add'
      }

      $.ajax({
        url: action_url,
        data: formData,
        type: 'post',
        dataType: 'json',
        showLoader: true,
        cache: false,
        contentType: false,
        processData: false,

        /** @inheritdoc */
        beforeSend: function () {
          if (self.isLoaderEnabled()) {
            $('body').trigger(self.options.processStart)
          }
        },

        /** @inheritdoc */
        success: function (res) {
          if ($('.catalog-product-view').length > 0) {
            if (self.isLoaderEnabled()) {
              $('body').trigger(self.options.processStop)
            }

            self.enableAddToCartButton(form)

            if (res.success) {
              const sections = ['cart']
              customerData.invalidate(sections)
              customerData.reload(sections, true)

              if ($('#ajaxcartpopup').length > 0) {
                // $('#ajaxcartpopup').remove();
              }
              $('body').append(res.html_popup)
              $('#ajaxcartpopup').show()
            }

            if (res.error) {
              const msg = $.mage.__(res.message)

              $('.loading-mask').hide()
              $('.page.messages').removeClass('error message')
              $(
                ".page.messages div[data-placeholder='messages']"
              ).remove()
              $(
                ".page.messages div[data-placeholder='messages']"
              ).text(msg)
              $('.page.messages').addClass('error message')
              window.scrollTo({ top: 0, behavior: 'smooth' })

              setTimeout(function () {
                $(
                  ".page.messages div[data-placeholder='messages']"
                ).text(' ')
                $('.page.messages').removeClass(
                  'error message'
                )
              }, 5000)
            }

            if (res.reload) {
              location.reload()
            }
          } else {
            let eventData, parameters

            $(document).trigger('ajax:addToCart', {
              sku: form.data().productSku,
              productIds: productIds,
              form: form,
              response: res
            })

            if (self.isLoaderEnabled()) {
              $('body').trigger(self.options.processStop)
            }

            if (res.backUrl) {
              eventData = {
                form: form,
                redirectParameters: []
              }
              // trigger global event, so other modules will be able add parameters to redirect url
              $('body').trigger(
                'catalogCategoryAddToCartRedirect',
                eventData
              )

              if (
                eventData.redirectParameters.length > 0 &&
                                window.location.href.split(/[?#]/)[0] ===
                                    res.backUrl
              ) {
                parameters = res.backUrl.split('#')
                parameters.push(
                  eventData.redirectParameters.join('&')
                )
                res.backUrl = parameters.join('#')
              }

              self._redirect(res.backUrl)

              return
            }

            if (res.messages) {
              $(self.options.messagesSelector).html(res.messages)
            }

            if (res.minicart) {
              $(self.options.minicartSelector).replaceWith(
                res.minicart
              )
              $(self.options.minicartSelector).trigger(
                'contentUpdated'
              )
            }

            if (res.product && res.product.statusText) {
              $(self.options.productStatusSelector)
                .removeClass('available')
                .addClass('unavailable')
                .find('span')
                .html(res.product.statusText)
            }
            self.enableAddToCartButton(form)
          }
        },

        /** @inheritdoc */
        error: function (res) {
          $(document).trigger('ajax:addToCart:error', {
            sku: form.data().productSku,
            productIds: productIds,
            form: form,
            response: res
          })
        },

        /** @inheritdoc */
        complete: function (res) {
          if (res.state() === 'rejected') {
            location.reload()
          }
        }
      })
    },

    /**
         * @param {String} form
         */
    disableAddToCartButton: function (form) {
      const addToCartButtonTextWhileAdding =
                this.options.addToCartButtonTextWhileAdding || $t('Adding...')
      const addToCartButton = $(form).find(
        this.options.addToCartButtonSelector
      )

      addToCartButton.addClass(this.options.addToCartButtonDisabledClass)
      addToCartButton.find('span').text(addToCartButtonTextWhileAdding)
      addToCartButton.attr('title', addToCartButtonTextWhileAdding)
    },

    /**
         * @param {String} form
         */
    enableAddToCartButton: function (form) {
      const addToCartButtonTextAdded =
                this.options.addToCartButtonTextAdded || $t('Added')
      const self = this
      const addToCartButton = $(form).find(
        this.options.addToCartButtonSelector
      )

      addToCartButton.find('span').text(addToCartButtonTextAdded)
      addToCartButton.attr('title', addToCartButtonTextAdded)

      setTimeout(function () {
        let addToCartButtonTextDefault =
                    self.options.addToCartButtonTextDefault ||
                    $t('Add to Cart')
        if ($('.catalog-product-view.page-product-bundle').length > 0) {
          addToCartButtonTextDefault = $t('Add Bundle to Cart')
        }

        addToCartButton.removeClass(
          self.options.addToCartButtonDisabledClass
        )
        addToCartButton.find('span').text(addToCartButtonTextDefault)
        addToCartButton.attr('title', addToCartButtonTextDefault)
      }, 1000)
    }
  })

  $(document).on('click', '#ajaxcartpopup .close', function () {
    $('#ajaxcartpopup').hide()
  })
  $(document).on('click', '#ajaxcartpopup .close-popup', function () {
    $('#ajaxcartpopup').hide()
  })

  return $.mage.catalogAddToCart
})
