define([
  'jquery',
  'underscore',
  'Magento_Ui/js/modal/alert',
  'mage/translate',
  'Magento_Checkout/js/model/quote',
  'Magento_Customer/js/model/address-list',
  'jquery/ui'
], function ($, _, modal, $t, quote, addressList) {
  'use strict'

  $.widget('mage.iwdBillingAddressValidation', {
    _initOptions: function (options) {
      const self = this

      options = options || {}
      $.each(options, function (i, e) {
        self.options[i] = e
      })
    },

    validateAddress: function (
      isPlaceOrderButton = false,
      isBillingFormSubmit = false
    ) {
      if (this.checkIsAddressFilled()) {
        this.checkIsAddressValid(
          isPlaceOrderButton,
          isBillingFormSubmit
        )
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

    checkIsAddressValid: function (
      isPlaceOrderButton = false,
      isBillingFormSubmit = false
    ) {
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
            this.whenAddressValid(
              isPlaceOrderButton,
              isBillingFormSubmit
            )
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
              } else {
                $(
                  '.iwd-address-validation-popup .modal-content .mage-error'
                ).remove()
                $(
                  '.iwd-address-validation-popup .modal-content'
                ).append(
                  '<div generated="true" class="mage-error">' +
                                        $t(self.options.content.makeChoice) +
                                        '</div>'
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

    toArray: function (obj) {
      const dataArray = []
      for (const o in obj) {
        dataArray.push(obj[o])
      }
      return dataArray
    },

    whenAddressValid: function (
      isPlaceOrderButton = false,
      isBillingFormSubmit = false
    ) {
      window.isBillingAddressValid = true
      $('.iwd-address-validation-error-message').remove()
      $(this.options.nextStepButtonId).attr('disabled', null)
      if (isPlaceOrderButton) {
        $('#review_order_btn').click()
      }
      if (isBillingFormSubmit) {
        const formId = this.options.formId
        const updateAddressId =
                    localStorage.getItem('update_address_id')
        const addressData = {}
        const street = {}
        street[0] = $(formId + ' [name^="street[0]"]').val()
        street[1] = $(formId + ' [name^="street[1]"]').val()
        addressData.street = street

        addressData.firstname = $(
          formId + ' [name^="firstname"]'
        ).val()
        addressData.lastname = $(formId + ' [name^="lastname"]').val()
        addressData.telephone = $(
          formId + ' [name^="telephone"]'
        ).val()
        addressData.company = $(formId + ' [name^="company"]').val()
        addressData.city = $(formId + ' [name^="city"]').val()
        addressData.region_id = $(
          formId + ' [name^="region_id"]'
        ).val()
        addressData.country_id = $(
          formId + ' [name^="country_id"]'
        ).val()
        addressData.postcode = $(formId + ' [name^="postcode"]').val()

        let count = 0
        /* eslint-disable array-callback-return */
        addressList.some(function (address) {
          if (address.customerAddressId != updateAddressId) {
            const addresStreetStr = address.street[0].toUpperCase()
            const addresPostcodeStr = address.postcode
            if (typeof address.street[1] !== 'undefined') {
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
          $('.action-save-billing-address').attr(
            'disabled',
            'disabled'
          )
          $('.action-save-billing-address')
            .parent()
            .append(
              '<span id="billing-address-validation-error-message-id" generated="true" style= "color:red;" class="billing-address-validation-error-message mage-error">' +
                                $t(
                                  'The billing address is same as existing. Please enter new address and try again.'
                                ) +
                                '</span>'
            )
          setTimeout(function () {
            $('.billing-address-validation-error-message').html('')
            $(
              '#billing-address-validation-error-message-id'
            ).remove()
            $('.action-save-billing-address').removeAttr(
              'disabled'
            )
          }, 3000)
        } else {
          $.ajax({
            url: window.BASE_URL + 'customeraddress/index/save',
            method: 'POST',
            data: {
              address: addressData,
              address_id: updateAddressId
            },
            dataType: 'json',
            showLoader: true,
            success: function (response) {
              const address = quote.billingAddress()
              quote.billingAddress(address)
              if (response.success) {
                // window.newAddressId = response.address_id;
              }

              $('#button-' + updateAddressId)
                .parent()
                .find('.action-select-billing-item')
                .trigger('click')
              localStorage.removeItem('update_address_id')
              $('.modal-popup .action-close').click()
              location.reload()
            }
          })
        }
      }
      this.enableBlocks()
    },

    whenAddressInvalid: function (response) {
      window.isBillingAddressValid = false
      this.disableNextButton(this.options.content.updateAddress)
      this.disableBlocks()
      this.showModal(response)
    },

    updateFormAddress: function (address) {
      const formId = this.options.formId
      const map = this.options.addressMap

      if (quote.billingAddress()) {
        const billingAddress = quote.billingAddress()
        $.each($(formId + ' [name^="firstname"]'), function () {
          if ($(this).val() == '') {
            $(this).val(billingAddress.firstname).trigger('change')
          }
        })
        $.each($(formId + ' [name^="lastname"]'), function () {
          if ($(this).val() == '') {
            $(this).val(billingAddress.lastname).trigger('change')
          }
        })
        $.each($(formId + ' [name^="telephone"]'), function () {
          if ($(this).val() == '') {
            $(this).val(billingAddress.telephone).trigger('change')
          }
        })
      }

      $.each($(formId + ' [name^="street"]'), function () {
        $(this).val('')
      })
      $.each(map, function (i, e) {
        const elem = $(formId + ' [name="' + e + '"]')
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
          '<div style="clear:both"></div><div generated="true" class="iwd-address-validation-error-message mage-error">' +
                        $t(message) +
                        '</div>'
        )
    },

    beforeValidAddress: function () {
      this.disableNextButton(this.options.content.validatingAddress)
      this.validation = 'validations'
    },

    afterValidAddress: function () {
      this.validation = true
    },

    updateAddress: function (response) {}
  })

  return $.mage.iwdBillingAddressValidation
})
