define([
  'jquery',
  'IWD_AddressValidation/js/validation',
  'Magento_Ui/js/modal/alert',
  'mage/translate',
  'Magento_Checkout/js/model/quote',
  'Magento_Customer/js/model/address-list',
  'jquery/ui'
], function ($, iwdAddressValidation, modal, $t, quote, addressList, ui) {
  'use strict'
  const addressOptions = addressList().filter(function (address) {
    return address.getType() === 'customer-address'
  })
  $.widget('mage.iwdAddressValidationCheckout', $.mage.iwdAddressValidation, {
    options: {
      urlValidation: '',
      allowInvalidAddress: true,
      formId: '#co-shipping-form',
      nextStepButtonId: 'button.continue, button.action-save-address',
      closePopup: '.modal-popup .action-close, .action-hide-popup',
      shipHereButton: 'button.action-select-shipping-item',
      newShippingAddressForm: '.opc-new-shipping-address',

      validateAddressTimeout: 0,
      address: {},

      addressMap: {
        street: 'street[0]',
        street1: 'street[1]',
        street2: 'street[2]',
        street3: 'street[3]',
        city: 'city',
        country_id: 'country_id',
        postcode: 'postcode',
        region_id: 'region_id',
        region: 'region'
      }
    },
    request: null,
    currentModal: null,
    isExistingAddress: true,
    validation: false,
    init: function (options) {
      this._initOptions(options)

      this.checkCandidateAddress()

      this.onClickNextButton()
      this.onClickCancelButton()

      this.onAddressForm()
      this.selectExistingAddress()
      window.isshippingAddressValid = 0
    },

    onClickNextButton: function () {
      const self = this
      $(document).on(
        'click',
        this.options.nextStepButtonId,
        function (e) {
          const formValid = self.CheckAddressFormValid()
          if (formValid) {
            $('#ship_here_btn_click').val(1)
            /* if (self.validation == true) {
                         $(self.options.nextStepButtonId).attr('disabled', null);
                         return;
                     } */
            if (
              self.validation == false ||
                            self.validation == 'existing'
            ) {
              e.preventDefault()
              $(self.options.nextStepButtonId).attr(
                'disabled',
                'disabled'
              )
              if (
                $(this).hasClass('action-save-address') ||
                                addressOptions.length <= 0
              ) {
                self.readAddressForm()
              } else {
                self.readAddressQuote()
              }
              self.validateAddress()
            } else {
              $(self.options.nextStepButtonId).attr(
                'disabled',
                null
              )
            }
            // $("#ship_here_btn_click").val(0);
          }
        }
      )
    },
    CheckAddressFormValid: function () {
      const street = $(
        this.options.formId + ' [name^="street[0]"]'
      ).val()
      const firstname = $(
        this.options.formId + ' [name^="firstname"]'
      ).val()
      const lastname = $(
        this.options.formId + ' [name^="lastname"]'
      ).val()
      const telephone = $(
        this.options.formId + ' [name^="telephone"]'
      ).val()
      const city = $(this.options.formId + ' [name^="city"]').val()
      const region_id = $(
        this.options.formId + ' [name^="region_id"]'
      ).val()
      const postcode = $(
        this.options.formId + ' [name^="postcode"]'
      ).val()
      if (
        street &&
                firstname &&
                lastname &&
                telephone &&
                city &&
                region_id &&
                postcode
      ) {
        return true
      } else {
        return false
      }
    },
    onClickCancelButton: function () {
      const self = this
      $(document).on(
        'click touchstart',
        this.options.closePopup,
        function (e) {
          self.validation = false
          // self.disableNextButton('Please, recheck and update address before continue.');
        }
      )
    },

    onAddressForm: function () {
      const self = this
      const form_inputs =
                this.options.formId +
                ' input, ' +
                this.options.formId +
                ' select'
      const map = self.toArray(self.options.addressMap)

      $(document).on('change', form_inputs, function () {
        self.checkIsExistingAddress()

        if (
          !self.isExistingAddress &&
                    map.indexOf($(this).attr('name')) !== -1
        ) {
          self.validation = 'changed'
          clearTimeout(self.validateAddressTimeout)
          self.validateAddressTimeout = setTimeout(function () {
            self.isExistingAddress = false
            self.readAddressForm()
            $(self.options.nextStepButtonId).attr('disabled', null)
            // self.validateAddress();
          }, 500)
        }
        self.validation = false
      })
    },

    selectExistingAddress: function () {
      const self = this
      $(document).on(
        'click touchstart',
        this.options.shipHereButton,
        function () {
          clearTimeout(self.validateAddressTimeout)
          $('.checkout-index-index').addClass('selected_address')
          self.validateAddressTimeout = setTimeout(function () {
            self.isExistingAddress = true
            self.validation = 'changed'
            self.readAddressQuote()
            self.validateAddress()
          }, 500)
        }
      )
    },

    readAddressQuote: function () {
      const addressQuote = quote.shippingAddress()
      const address = {}
      address.postcode = addressQuote.postcode
      address.city = addressQuote.city
      address.country_id = addressQuote.countryId
      address.region = addressQuote.region
      address.region_id = addressQuote.regionId

      let street = ''
      $.each(addressQuote.street, function (i, e) {
        street += ' ' + e
      })
      address.street = street.trim()

      return (this.options.address = address)
    },

    readAddressForm: function () {
      const address = {}
      const formId = this.options.formId

      address.street = ''
      $.each(this.options.addressMap, function (i, e) {
        const elem = $(formId + ' [name="' + e + '"]')
        if (elem && elem.length > 0) {
          if (i.indexOf('street') !== -1) {
            address.street += ' ' + elem.val()
          } else {
            address[i] = elem.val()
          }
        }
      })

      return (this.options.address = address)
    },

    checkIsExistingAddress: function () {
      this.isExistingAddress =
                $('.shipping-address-items').length == 1 &&
                $('.modal-popup._show #co-shipping-form').length == 0

      return this.isExistingAddress
    },

    updateExistingAddress: function (address) {
      const self = this
      $('.checkout-shipping-address button.action-show-popup').trigger(
        'click'
      )
      setTimeout(function () {
        self.validation = 'existing'
        self.updateFormAddress(address)
      }, 50)
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
    },

    hideOverlay: function () {
      const overlay = $('.modals-overlay')
      if (
        overlay.length != 0 &&
                $(overlay[0]).attr('style') == 'z-index: 900;'
      ) {
        overlay.attr('style', 'z-index: 899;')
      }
    }
  })

  return $.mage.iwdAddressValidationCheckout
})
