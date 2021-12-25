define([
  'jquery',
  'underscore',
  'Magento_Ui/js/modal/alert',
  'mage/translate',
  'Magento_Checkout/js/model/quote',
  'jquery/ui',
  'Magento_Customer/js/model/address-list'
], function ($, _, modal, $t, quote, ui, addressList) {
  'use strict'

  $.widget('mage.iwdAddressValidation', {
    _initOptions: function (options) {
      const self = this

      options = options || {}
      $.each(options, function (i, e) {
        self.options[i] = e
      })
    },

    validateAddress: function () {
      if (this.checkIsAddressFilled()) {
        this.checkIsAddressValid()
      }
    },

    checkIsAddressFilled: function () {
      const empty = []

      $.each(this.options.address, function (i, e) {
        if (!e || e.length == 0 || e == 0) {
          empty.push(i)
        }
      })

      if (empty.length == 0) {
        return true
      }

      if (empty.length > 2) {
        return false
      }

      if (empty.length > 1) {
        return (
          empty.indexOf('region_id') != -1 &&
                    empty.indexOf('region') != -1
        )
      }

      return (
        !(empty.indexOf('region_id') == -1) ||
                !(empty.indexOf('region') == -1)
      )
    },

    checkIsAddressValid: function () {
      const update_address_id = localStorage.getItem('update_address_id')
      const isshipHereBtn = parseInt($('#ship_here_btn_click').val())
      const self = this

      if (this.request && this.request.readystate != 4) {
        this.request.abort()
      }

      this.request = $.ajax({
        url: this.options.urlValidation,
        data: this.options.address,
        type: 'post',
        dataType: 'json',
        context: this,
        beforeSend: function () {
          self.beforeValidAddress()
        },
        complete: function () {
          self.afterValidAddress()
        }
      })
        .done(function (response) {
          if (response.error) {
            self._showError(response)
          }
          if (response.is_valid) {
            this.whenAddressValid()
            $('.modal-popup .action-close').click()
            if (isshipHereBtn > 0 && update_address_id) {
              const updateAddressId =
                                localStorage.getItem('update_address_id')
              const formId = this.options.formId
              let count = 0
              const addressData = {}
              const street = {}
              street[0] = $(
                                `${formId} [name^="street[0]"]`
              ).val()
              street[1] = $(
                                `${formId} [name^="street[1]"]`
              ).val()
              addressData.street = street
              addressData.firstname = $(
                                `${formId} [name^="firstname"]`
              ).val()
              addressData.lastname = $(
                                `${formId} [name^="lastname"]`
              ).val()
              addressData.telephone = $(
                                `${formId} [name^="telephone"]`
              ).val()
              addressData.company = $(
                                `${formId} [name^="company"]`
              ).val()
              addressData.city = $(
                                `${formId} [name^="city"]`
              ).val()
              addressData.region_id = $(
                                `${formId} [name^="region_id"]`
              ).val()
              addressData.country_id = $(
                                `${formId} [name^="country_id"]`
              ).val()
              addressData.postcode = $(
                                `${formId} [name^="postcode"]`
              ).val()
              /* eslint-disable array-callback-return */
              addressList.some(function (address) {
                const addresStreetStr =
                                    address.street[0].toUpperCase()
                const addresPostcodeStr = address.postcode
                if (
                  address.customerAddressId != updateAddressId
                ) {
                  if (
                    typeof address.street[1] !== 'undefined'
                  ) {
                    const addresStreetLine2Str =
                                            address.street[1].toUpperCase()
                    if (
                      _.isEqual(
                        addresStreetStr,
                        addressData.street[0].toUpperCase()
                      ) &&
                                            _.isEqual(
                                              addresStreetLine2Str,
                                              addressData.street[1].toUpperCase()
                                            ) &&
                                            _.isEqual(
                                              addresPostcodeStr,
                                              addressData.postcode
                                            )
                    ) {
                      count = count + 1
                    }
                  } else {
                    if (
                      _.isEqual(
                        addresStreetStr,
                        addressData.street[0].toUpperCase()
                      ) &&
                                            _.isEqual(
                                              addresPostcodeStr,
                                              addressData.postcode
                                            )
                    ) {
                      count = count + 1
                    }
                  }
                }
              })
              /* eslint-disable array-callback-return */

              if (count > 0) {
                $('.action-save-address').attr(
                  'disabled',
                  'disabled'
                )
                if (
                  !$(
                    '.shipping-address-validation-error-message'
                  ).is(':visible')
                ) {
                  $('.action-save-address')
                    .parent()
                    .append(
                                            `<span id="shipping-address-validation-error-message-id" generated="true" style= "color:red;" class="shipping-address-validation-error-message mage-error">${$t(
                                                'The shipping address is same as existing. Please enter new address and try again.'
                                            )}</span>`
                    )
                  setTimeout(function () {
                    $(
                      '.shipping-address-validation-error-message'
                    ).html('')
                    $(
                      '#shipping-address-validation-error-message-id'
                    ).remove()
                    $('.action-save-address').removeAttr(
                      'disabled'
                    )
                  }, 3000)
                }
              } else {
                this.saveCustomerAddress(
                  updateAddressId,
                  addressData
                )
              }
            }
            // eslint-disable-next-line
                        if ($(".modal-popup.modal-slide").hasClass("_show")) {
            } else {
              if (self.isshippingAddressValid <= 0) {
                self.isshippingAddressValid =
                                    self.isshippingAddressValid + 1
                setTimeout(function () {
                  $(
                    '#shipping-method-buttons-container .primary button'
                  ).removeAttr('disabled')
                  $(
                    '#shipping-method-buttons-container .primary button'
                  ).trigger('click')
                }, 1000)
              }
            }
          } else {
            this.whenAddressInvalid(response)
          }
        })
        .fail(function (error) {
          self._showError(error)
        })
    },

    showModal: function (response) {
      const self = this

      $('.iwd-address-validation-popup')
        .removeClass('_show')
        .addClass('_hide')

      modal({
        title: $t(self.options.content.header),
        content: response.modal_content,
        modalClass: 'iwd-address-validation-popup',
        buttons: [
          {
            text: $t('Continue'),
            class: '',
            click: function () {
              if (self.updateAddress(response)) {
                this.closeModal()
                const checkedAddress = $(
                  "input[name='candidate']:checked"
                )
                const address =
                                    response.suggested_addresses[
                                      checkedAddress.val()
                                    ]
                if (typeof address != 'undefined' && address) {
                  if (
                    $('.modal-popup.modal-slide').hasClass(
                      '_show'
                    )
                  ) {
                    $(
                      '.modal-footer .action-save-address'
                    ).trigger('click')
                  } else {
                    $(
                      '#shipping-method-buttons-container .primary button'
                    ).attr('disabled', 'disabled')
                    setTimeout(function () {
                      $(
                        '#shipping-method-buttons-container .primary button'
                      ).removeAttr('disabled')
                      $(
                        '#shipping-method-buttons-container .primary button'
                      ).trigger('click')
                      $(
                        '#shipping-method-buttons-container .primary button'
                      ).attr('disabled', 'disabled')
                    }, 2000)
                  }
                }
              } else {
                $(
                  '.iwd-address-validation-popup .modal-content .mage-error'
                ).remove()
                $(
                  '.iwd-address-validation-popup .modal-content'
                ).append(
                                    `<div generated="true" class="mage-error">${$t(
                                        self.options.content.makeChoice
                                    )}</div>`
                )
              }
            }
          }
        ]
      })
    },

    checkCandidateAddress: function () {
      $(document).on(
        'change',
        '.iwd-address-validation-popup input[name="candidate"]',
        function () {
          $(
            '.iwd-address-validation-popup .modal-content .mage-error'
          ).remove()
        }
      )
    },

    _showError: function (error) {
      console.log(JSON.stringify(error))
    },
    whenAddressInvalid: function (response) {
      this.disableNextButton(this.options.content.updateAddress)
      this.disableBlocks()
      this.showModal(response)
    },

    saveCustomerAddress: function (updateAddressId, addressData) {
      $.ajax({
        url: `${window.BASE_URL}customeraddress/index/save`,
        method: 'POST',
        data: {
          address: addressData,
          address_id: updateAddressId
        },
        dataType: 'json',
        showLoader: true,
        success: function (response) {
          const address = quote.shippingAddress()
          quote.shippingAddress(address)
          $(`#button-${updateAddressId}`)
            .parent()
            .find('.action-select-shipping-item')
            .trigger('click')
          localStorage.removeItem('update_address_id')
          $('.modal-popup .action-close').click()
          $('#ship_here_btn_click').val(0)
          location.reload()
        }
      })
    },

    toArray: function (obj) {
      const dataArray = []
      for (const o in obj) {
        dataArray.push(obj[o])
      }
      return dataArray
    },

    whenAddressValid: function () {
      $('.iwd-address-validation-error-message').remove()
      $(this.options.nextStepButtonId).attr('disabled', null)
      this.enableBlocks()
    },

    updateFormAddress: function (address) {
      const formId = this.options.formId
      const map = this.options.addressMap

      if (quote.shippingAddress()) {
        const shippingAddress = quote.shippingAddress()
        $.each($(`${formId} [name^="firstname"]`), function () {
          if ($(this).val() == '') {
            $(this)
              .val(shippingAddress.firstname)
              .trigger('change')
          }
        })
        $.each($(`${formId} [name^="lastname"]`), function () {
          if ($(this).val() == '') {
            $(this).val(shippingAddress.lastname).trigger('change')
          }
        })
        $.each($(`${formId} [name^="telephone"]`), function () {
          if ($(this).val() == '') {
            $(this)
              .val(shippingAddress.telephone)
              .trigger('change')
          }
        })
      }

      $.each($(`${formId} [name^="street"]`), function () {
        $(this).val('')
      })
      $.each(map, function (i, e) {
        const elem = $(`${formId} [name="${e}"]`)
        if (elem && elem.length > 0 && address[i] && address[i] != '') {
          elem.val(address[i]).trigger('change')
        } else {
          if (elem && elem.length) {
            elem.val('').trigger('change')
          }
        }
      })
    },

    disableBlocks: function () {
      $('.iwd-loader-for-av').show()
    },
    enableBlocks: function () {
      $('.iwd-loader-for-av').hide()
    },

    disableNextButton: function (message) {
      $(this.options.nextStepButtonId).attr('disabled', 'disabled')
      $('.iwd-address-validation-error-message').remove()
      $(this.options.nextStepButtonId)
        .parent()
        .append(
                    `<div style="clear:both"></div><div generated="true" class="iwd-address-validation-error-message mage-error">${$t(
                        message
                    )}</div>`
        )
    },

    beforeValidAddress: function () {
      this.disableNextButton(this.options.content.validatingAddress)
      this.validation = 'validations'
    },

    afterValidAddress: function () {
      this.validation = true
    },

    updateAddress: function (response) {
      this.checkIsExistingAddress()
      const self = this
      if ($("input[name='candidate']").length == 0) {
        if (this.isExistingAddress) {
          this.updateExistingAddress(response.original_address)
        }
        self.hideOverlay()
        return true
      }

      const checkedAddress = $("input[name='candidate']:checked")
      if (checkedAddress.length == 0) {
        self.hideOverlay()
        return false
      }

      if (checkedAddress.val() == 'origin') {
        this.whenAddressValid()
        self.hideOverlay()
        return true
      }

      const address = response.suggested_addresses[checkedAddress.val()]

      if (this.isExistingAddress) {
        this.updateExistingAddress(address)
      } else {
        this.updateFormAddress(address)
      }
      self.hideOverlay()
      return true
    }
  })

  return $.mage.iwdAddressValidation
})
