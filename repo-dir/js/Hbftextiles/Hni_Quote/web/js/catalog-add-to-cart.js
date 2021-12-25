define([
  'jquery',
  'mage/translate',
  'Magento_Catalog/js/product/view/product-ids-resolver',
  'Magento_Customer/js/customer-data',
  'Magento_Ui/js/modal/modal',
  'jquery/ui'
], function ($, $t, idsResolver, customerData, modal) {
  'use strict'

  $.widget('quote.hniQuoteToCart', {
    options: {
      quoteFormUrl: false,
      processStart: null,
      processStop: null,
      bindSubmit: true,
      noAjax: true,
      minicartSelector: '[data-block="minicart"]',
      messagesSelector: '[data-placeholder="messages"]',
      productStatusSelector: '.stock.available',

      addToCartButton: {
        selector: '#product-addtocart-button',
        disabledClass: 'disabled',
        textWhileAdding: $t('Adding...'),
        textAdded: $t('Added'),
        textDefault: $t('Add to Cart')
      },

      addToQuoteButton: {
        selector: '#hni-addtoquote-button',
        disabledClass: 'disabled',
        textWhileAdding: $t('Adding to Quote...'),
        textAdded: $t('Added'),
        textDefault: $t('Add to Quote')
      }
    },

    _create: function () {
      if (this.options.bindSubmit) {
        this._bindSubmit()
      }
    },

    _bindSubmit: function () {
      const self = this
      this.element.on('submit', function (e) {
        e.preventDefault()
        self.submitForm($(this))
      })
    },

    isLoaderEnabled: function () {
      return this.options.processStart && this.options.processStop
    },

    submitForm: function (form) {
      const self = this
      if (self.isQuoteRequest()) {
        self.ajaxSubmit(form)
      } else {
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
          if (
            v.name ==
                        'bundle_selection_qty[' + selected_bundle + ']'
          ) {
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
            The quantity requested for ${product_name} ${selected_color} exceeds currently available inventory. Your order will be vailable to ship within ${product_lead_time}. Would you like to proceed?
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
            </div>
        `

        const avaliable_qty = bundle_qty
        if (parseInt(treshold_qty) >= avaliable_qty) {
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
      }
    },

    ajaxSubmit: function (form) {
      const self = this
      const productIds = idsResolver(form)
      let formData
      let action = form.attr('action')
      let productTag = ''

      // Check if quote is being requested.
      if (self.isQuoteRequest()) {
        self.disableButton(form, self.options.addToCartButton, false)
        self.disableButton(form, self.options.addToQuoteButton, true)
        action = self.options.quoteFormUrl

        if (
          $('#quote_product_tag').length > 0 &&
                    $('#quote_product_tag').val() != ''
        ) {
          productTag = $('#quote_product_tag').val()
        }
      } else {
        self.disableButton(form, self.options.addToCartButton, true)
        self.disableButton(form, self.options.addToQuoteButton, false)
        $(self.options.minicartSelector).trigger('contentLoading')

        if ($('.catalog-product-view').length > 0) {
          action = window.BASE_URL + 'ajaxcartpopup/cart/add'
        }
        if (
          $('#product_tag').length > 0 &&
                    $('#product_tag').val() != ''
        ) {
          productTag = $('#product_tag').val()
        }
      }

      $.ajax({
        url: action,
        data: form.serialize() + '&tag=' + productTag,
        type: 'post',
        dataType: 'json',
        showLoader: true,
        beforeSend: function () {
          if (self.isLoaderEnabled()) {
            $('body').trigger(self.options.processStart)
          }
        },
        success: function (res) {
          if ($('.catalog-product-view').length > 0) {
            if (self.isLoaderEnabled()) {
              $('body').trigger(self.options.processStop)
            }

            if (res.success) {
              if (self.isQuoteRequest()) {
                if (res.html_popup) {
                  $('body').append(res.html_popup)
                }
              } else {
                const sections = ['cart']
                customerData.invalidate(sections)
                customerData.reload(sections, true)

                if ($('#ajaxcartpopup').length > 0) {
                  // $('#ajaxcartpopup').remove();
                }
                $('body').append(res.html_popup)
                $('#ajaxcartpopup').show()
              }
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

            if (res.backUrl) {
              window.location = res.backUrl
              return
            }
            if (res.reload) {
              location.reload()
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

            if (self.isQuoteRequest()) {
              self.enableButton(
                form,
                self.options.addToCartButton,
                false
              )
              self.enableButton(
                form,
                self.options.addToQuoteButton,
                true
              )
            } else {
              self.enableButton(
                form,
                self.options.addToCartButton,
                true
              )
              self.enableButton(
                form,
                self.options.addToQuoteButton,
                false
              )
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
            self.enableButton(
              form,
              self.options.addToCartButton,
              true
            )
          }
        }
      })
    },

    disableButton: function (form, buttonType, useTextWhileAdding) {
      const textWhileAdding = $.mage.__(buttonType.textWhileAdding)
      const button = $(form).find(buttonType.selector)
      button.addClass(buttonType.disabledClass)
      if (useTextWhileAdding) {
        button.attr('title', textWhileAdding)
        button.find('span').text(textWhileAdding)
      }
    },

    enableButton: function (form, buttonType, useTextAdded) {
      const self = this
      const button = $(form).find(buttonType.selector)
      const textAdded = $.mage.__(buttonType.textAdded)
      if (useTextAdded) {
        button.find('span').text(textAdded)
        button.attr('title', textAdded)
      }

      setTimeout(function () {
        const textDefault = $.mage.__(buttonType.textDefault)
        button.removeClass(buttonType.disabledClass)
        button.find('span').text(textDefault)
        button.attr('title', textDefault)
      }, 1000)
    },

    /**
         * Checks if requesting a quote.
         * @returns {boolean}
         */
    isQuoteRequest: function () {
      if (this.options.quoteFormUrl !== false) {
        return true
      } else {
        return false
      }
    }
  })

  $(document).on('click', '#ajaxcartpopup .close', function () {
    $('#ajaxcartpopup').hide()
  })
  $(document).on('click', '#ajaxcartpopup .close-popup', function () {
    $('#ajaxcartpopup').hide()
  })

  return $.quote.hniQuoteToCart
})
