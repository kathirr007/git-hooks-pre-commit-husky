/**
 * Copyright � Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'jquery',
  'underscore',
  'Magento_Ui/js/form/form',
  'ko',
  'Magento_Customer/js/model/customer',
  'Magento_Customer/js/model/address-list',
  'Magento_Checkout/js/model/address-converter',
  'Magento_Checkout/js/model/quote',
  'Magento_Checkout/js/action/create-shipping-address',
  'Magento_Checkout/js/action/select-shipping-address',
  'Magento_Checkout/js/model/shipping-rates-validator',
  'Magento_Checkout/js/model/shipping-address/form-popup-state',
  'Magento_Checkout/js/model/shipping-service',
  'Magento_Checkout/js/action/select-shipping-method',
  'Magento_Checkout/js/model/shipping-rate-registry',
  'Magento_Checkout/js/action/set-shipping-information',
  'Magento_Checkout/js/model/step-navigator',
  'Magento_Ui/js/modal/modal',
  'Magento_Checkout/js/model/checkout-data-resolver',
  'Magento_Checkout/js/checkout-data',
  'uiRegistry',
  'mage/translate',
  'Magento_Checkout/js/model/shipping-rate-service'
], function (
  $,
  _,
  Component,
  ko,
  customer,
  addressList,
  addressConverter,
  quote,
  createShippingAddress,
  selectShippingAddress,
  shippingRatesValidator,
  formPopUpState,
  shippingService,
  selectShippingMethodAction,
  rateRegistry,
  setShippingInformationAction,
  stepNavigator,
  modal,
  checkoutDataResolver,
  checkoutData,
  registry,
  $t
) {
  'use strict'

  let popUp = null

  return Component.extend({
    defaults: {
      template: 'Magento_Checkout/shipping',
      shippingFormTemplate: 'Magento_Checkout/shipping-address/form',
      shippingMethodListTemplate:
                'Magento_Checkout/shipping-address/shipping-method-list',
      shippingMethodItemTemplate:
                'Magento_Checkout/shipping-address/shipping-method-item'
    },
    visible: ko.observable(!quote.isVirtual()),
    errorValidationMessage: ko.observable(false),
    isCustomerLoggedIn: customer.isLoggedIn,
    isFormPopUpVisible: formPopUpState.isVisible,
    isFormInline: addressList().length === 0,
    isNewAddressAdded: ko.observable(false),
    saveInAddressBook: 1,
    quoteIsVirtual: quote.isVirtual(),

    /**
         * @return {exports}
         */
    initialize: function () {
      const self = this
      const fieldsetName =
                'checkout.steps.shipping-step.shippingAddress.shipping-address-fieldset'

      this._super()

      if (!quote.isVirtual()) {
        stepNavigator.registerStep(
          'shipping',
          '',
          $t('Shipping'),
          this.visible,
          _.bind(this.navigate, this),
          this.sortOrder
        )
      }
      checkoutDataResolver.resolveShippingAddress()
      const hasNewAddress = addressList.some(function (address) {
        return address.getType() == 'new-customer-address'
      })
      this.isNewAddressAdded(hasNewAddress)

      this.isFormPopUpVisible.subscribe(function (value) {
        if (value) {
          self.getPopUp().openModal()
        }
      })

      quote.shippingMethod.subscribe(function () {
        self.errorValidationMessage(false)
      })

      registry.async('checkoutProvider')(function (checkoutProvider) {
        const shippingAddressData =
                    checkoutData.getShippingAddressFromData()

        if (shippingAddressData) {
          checkoutProvider.set(
            'shippingAddress',
            $.extend(
              true,
              {},
              checkoutProvider.get('shippingAddress'),
              shippingAddressData
            )
          )
        }
        checkoutProvider.on(
          'shippingAddress',
          function (shippingAddrsData) {
            checkoutData.setShippingAddressFromData(
              shippingAddrsData
            )
          }
        )
        shippingRatesValidator.initFields(fieldsetName)
      })

      return this
    },

    /**
         * Navigator change hash handler.
         *
         * @param {Object} step - navigation step
         */
    navigate: function (step) {
      step && step.isVisible(true)
    },

    /**
         * @return {*}
         */
    getPopUp: function () {
      const self = this
      let buttons

      if (!popUp) {
        buttons = this.popUpForm.options.buttons
        this.popUpForm.options.buttons = [
          {
            text: buttons.save.text
              ? buttons.save.text
              : $t('Save Address'),
            class: buttons.save.class
              ? buttons.save.class
              : 'action primary action-save-address',
            click: self.saveNewAddress.bind(self)
          },
          {
            text: buttons.cancel.text
              ? buttons.cancel.text
              : $t('Cancel'),
            class: buttons.cancel.class
              ? buttons.cancel.class
              : 'action secondary action-hide-popup',

            /** @inheritdoc */
            click: this.onClosePopUp.bind(this)
          }
        ]

        /** @inheritdoc */
        this.popUpForm.options.closed = function () {
          self.isFormPopUpVisible(false)
        }

        this.popUpForm.options.modalCloseBtnHandler =
                    this.onClosePopUp.bind(this)
        this.popUpForm.options.keyEventHandlers = {
          escapeKey: this.onClosePopUp.bind(this)
        }

        /** @inheritdoc */
        this.popUpForm.options.opened = function () {
          // Store temporary address for revert action in case when user click cancel action
          self.temporaryAddress = $.extend(
            true,
            {},
            checkoutData.getShippingAddressFromData()
          )
        }
        popUp = modal(
          this.popUpForm.options,
          $(this.popUpForm.element)
        )
      }
      $('#shipping-save-in-address-book').click()
      return popUp
    },

    /**
         * Revert address and close modal.
         */
    onClosePopUp: function () {
      checkoutData.setShippingAddressFromData(
        $.extend(true, {}, this.temporaryAddress)
      )
      this.getPopUp().closeModal()
      const updateAddressId = localStorage.getItem('update_address_id')
      if (
        $(`#current_address_id_${updateAddressId}`).hasClass(
          'pre_select'
        )
      ) {
        $(`#current_address_id_${updateAddressId}`).addClass(
          'not-selected-item'
        )
        $(`#current_address_id_${updateAddressId}`).addClass(
          'selected-item'
        )
      }
    },

    /**
         * Show address form popup
         */
    showFormPopUp: function () {
      $('#co-shipping-form').trigger('reset')
      this.isFormPopUpVisible(true)
    },

    /**
         * Save new shipping address
         */
    saveNewAddress: function () {
      let addressData, newShippingAddress
      const i = 0
      let count = 0
      this.source.set('params.invalid', false)
      this.triggerShippingDataValidateEvent()
      const updateAddressId = localStorage.getItem('update_address_id')
      $('#shipping-new-address-form input[name="firstname"]').keyup()
      $('#shipping-new-address-form input[name="lastname"]').keyup()
      $('#shipping-new-address-form input[name="telephone"]').keyup()
      if (!this.source.get('params.invalid')) {
        addressData = this.source.get('shippingAddress')
        // if user clicked the checkbox, its value is true or false. Need to convert.
        addressData.save_in_address_book = this.saveInAddressBook
          ? 1
          : 0
        // New address must be selected as a shipping address

        if (updateAddressId) {
          addressData = this.source.get('shippingAddress')
        } else {
          localStorage.removeItem('update_address_id')
          addressData = this.source.get('shippingAddress')
          // if user clicked the checkbox, its value is true or false. Need to convert.
          addressData.save_in_address_book = this.saveInAddressBook
            ? 1
            : 0
          /* eslint-disable array-callback-return */
          addressList.some(function (address) {
            const addresStreetStr = address.street[0].toUpperCase()
            const addresPostcodeStr = address.postcode
            // if (address.customerAddressId != updateAddressId) {
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
            // }
          })
          /* eslint-disable array-callback-return */
          if (count > 0) {
            $('.action-save-address').attr('disabled', 'disabled')
            if (
              !$('.shipping-address-validation-error-message').is(
                ':visible'
              )
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
            // New address must be selected as a shipping address
            newShippingAddress = createShippingAddress(addressData)
            selectShippingAddress(newShippingAddress)
            checkoutData.setSelectedShippingAddress(
              newShippingAddress.getKey()
            )
            checkoutData.setNewCustomerShippingAddress(
              $.extend(true, {}, addressData)
            )
            // this.getPopUp().closeModal();
            this.isNewAddressAdded(true)
          }
        }
      }
    },

    /**
         * Shipping Method View
         */
    rates: shippingService.getShippingRates(),
    isLoading: shippingService.isLoading,
    isSelected: ko.computed(function () {
      return quote.shippingMethod()
        ? `${quote.shippingMethod().carrier_code}_${
                      quote.shippingMethod().method_code
                  }`
        : null
    }),

    /**
         * @param {Object} shippingMethod
         * @return {Boolean}
         */
    selectShippingMethod: function (shippingMethod) {
      selectShippingMethodAction(shippingMethod)
      checkoutData.setSelectedShippingRate(
                `${shippingMethod.carrier_code}_${shippingMethod.method_code}`
      )

      return true
    },

    /**
         * Set shipping information handler
         */
    setShippingInformation: function () {
      if (this.validateShippingInformation()) {
        quote.billingAddress(null)
        checkoutDataResolver.resolveBillingAddress()
        registry.async('checkoutProvider')(function (checkoutProvider) {
          const shippingAddressData =
                        checkoutData.getShippingAddressFromData()

          if (shippingAddressData) {
            checkoutProvider.set(
              'shippingAddress',
              $.extend(
                true,
                {},
                checkoutProvider.get('shippingAddress'),
                shippingAddressData
              )
            )
          }
        })
        setShippingInformationAction().done(function () {
          stepNavigator.next()
        })
      }
    },

    /**
         * @return {Boolean}
         */
    validateShippingInformation: function () {
      let shippingAddress
      let addressData
      const loginFormSelector =
                'form[data-role=email-with-possible-login]'
      let emailValidationResult = customer.isLoggedIn()
      let field
      const country = registry.get(
                `${this.parentName}.shippingAddress.shipping-address-fieldset.country_id`
      )
      const countryIndexedOptions = country.indexedOptions
      const option =
                countryIndexedOptions[quote.shippingAddress().countryId]
      const messageContainer =
                registry.get('checkout.errors').messageContainer

      if (!quote.shippingMethod()) {
        this.errorValidationMessage(
          $t(
            'The shipping method is missing. Select the shipping method and try again.'
          )
        )

        return false
      }

      if (!customer.isLoggedIn()) {
        $(loginFormSelector).validation()
        emailValidationResult = Boolean(
          $(`${loginFormSelector} input[name=username]`).valid()
        )
      }

      if (this.isFormInline) {
        this.source.set('params.invalid', false)
        this.triggerShippingDataValidateEvent()

        if (
          (emailValidationResult &&
                        this.source.get('params.invalid')) ||
                    !quote.shippingMethod().method_code ||
                    !quote.shippingMethod().carrier_code
        ) {
          this.focusInvalid()

          return false
        }

        shippingAddress = quote.shippingAddress()
        addressData = addressConverter.formAddressDataToQuoteAddress(
          this.source.get('shippingAddress')
        )

        // Copy form data to quote shipping address object
        for (field in addressData) {
          if (
            Object.prototype.hasOwnProperty.call(
              addressData,
              field
            ) &&
                        Object.prototype.hasOwnProperty.call(
                          shippingAddress,
                          field
                        ) &&
                        typeof addressData[field] != 'function' &&
                        _.isEqual(shippingAddress[field], addressData[field])
          ) {
            shippingAddress[field] = addressData[field]
          } else if (
            typeof addressData[field] != 'function' &&
                        !_.isEqual(shippingAddress[field], addressData[field])
          ) {
            shippingAddress = addressData
            break
          }
        }

        if (customer.isLoggedIn()) {
          shippingAddress.save_in_address_book = 1
        }
        selectShippingAddress(shippingAddress)
      } else if (
        customer.isLoggedIn() &&
                option &&
                option.is_region_required &&
                !quote.shippingAddress().region
      ) {
        messageContainer.addErrorMessage({
          message: $t(
            'Please specify a regionId in shipping address.'
          )
        })

        return false
      }

      if (!emailValidationResult) {
        $(`${loginFormSelector} input[name=username]`).focus()

        return false
      }

      return true
    },

    isCustomerareNotLogin: function () {
      const isCustomerLogin = window.checkoutConfig.isCustomerLoggedIn
      if (isCustomerLogin) {
        return false
      } else {
        return true
      }
    },

    /**
         * Trigger Shipping data Validate Event.
         */
    triggerShippingDataValidateEvent: function () {
      this.source.trigger('shippingAddress.data.validate')

      if (this.source.get('shippingAddress.custom_attributes')) {
        this.source.trigger(
          'shippingAddress.custom_attributes.data.validate'
        )
      }
    }
  })
})
