/**
 * Copyright � Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'jquery',
  'underscore',
  'uiComponent',
  'ko',
  'Magento_Checkout/js/model/quote',
  'Magento_Checkout/js/checkout-data',
  'Magento_Checkout/js/model/step-navigator',
  'Magento_Checkout/js/model/payment-service',
  'Magento_Checkout/js/model/payment/method-converter',
  'Magento_Checkout/js/action/get-payment-information',
  'Magento_Checkout/js/model/checkout-data-resolver',
  'mage/translate'
], function (
  $,
  _,
  Component,
  ko,
  quote,
  checkoutData,
  stepNavigator,
  paymentService,
  methodConverter,
  getPaymentInformation,
  checkoutDataResolver,
  $t
) {
  'use strict'

  /** Set payment methods to collection */
  paymentService.setPaymentMethods(
    methodConverter(window.checkoutConfig.paymentMethods)
  )

  return Component.extend({
    defaults: {
      template: 'Magento_Checkout/payment',
      activeMethod: ''
    },
    isVisible: ko.observable(quote.isVirtual()),
    quoteIsVirtual: quote.isVirtual(),
    isPaymentMethodsAvailable: ko.computed(function () {
      return paymentService.getAvailablePaymentMethods().length > 0
    }),

    /** @inheritdoc */
    initialize: function () {
      this._super()
      checkoutDataResolver.resolvePaymentMethod()
      stepNavigator.registerStep(
        'payment',
        null,
        $t('Review & Payments'),
        this.isVisible,
        _.bind(this.navigate, this),
        this.sortOrder
      )

      return this
    },

    /**
         * Navigate method.
         */
    navigate: function () {
      const self = this

      if (!self.hasShippingMethod()) {
        this.isVisible(false)
        stepNavigator.setHash('shipping')
      } else {
        getPaymentInformation().done(function () {
          self.isVisible(true)
        })
      }
    },

    /**
         * @return {Boolean}
         */
    hasShippingMethod: function () {
      return window.checkoutConfig.selectedShippingMethod !== null
    },

    gotoreviewstep: function () {
      if (stepNavigator.getActiveItemIndex() == 1) {
        const paymentSelect = $(
          '.payment-group .payment-method '
        ).hasClass('_active')
        if (paymentSelect) {
          $(
            '.payment-method._active .actions-toolbar button'
          ).click()
        } else {
          const html =
                        '<div data-role="checkout-messages" class="messages" id="payment_not_selected"><div role="alert" class="message message-error error"><div data-ui-id="checkout-cart-validationmessages-message-error">Please select payment method</div></div></div>'
          $('#payment_not_selected').remove()
          $('#checkout-payment-method-load').after(html)

          setTimeout(function () {
            $('#payment_not_selected').hide('blind', {}, 500)
          }, 5000)
        }
      }
    },

    /**
         * @return {*}
         */
    isShippingToPaymentStep: function () {
      if (stepNavigator.getActiveItemIndex() == 0) {
        window.isshippingAddressValid = 0
      }
      if (stepNavigator.getActiveItemIndex() == 1) {
        $('.breadcrumbs .items .Payment').show()
        $('.breadcrumbs .items .Payment').css(
          'display',
          'inline-block'
        )
        $('.breadcrumbs .items .Shipping a').addClass('step_done')
        $('.checkout-index-index').addClass('shipping_done')
        return true
      } else {
        $('.checkout-index-index').removeClass('shipping_done')
        return false
      }
    },
    getCusShippingMethod: function () {
      const shippingMethod = quote.shippingMethod()
      const title = shippingMethod
        ? `${shippingMethod.carrier_title} - ${shippingMethod.method_title}`
        : ''
      return title
    },

    getCusPhoneNumber: function () {
      const shippingAddressData = quote.shippingAddress()
      let telephone
      if (shippingAddressData) {
        telephone = shippingAddressData.telephone
      } else {
        telephone = ''
      }
      return telephone
    },
    getCusEmailAddress: function () {
      const Email = checkoutData.getValidatedEmailValue()
      return Email
      // console.log(checkoutData.getInputFieldEmailValue());
    },

    getCusShippingAddress: function () {
      const shippingAddressData = quote.shippingAddress()
      let ShippingLine
      if (shippingAddressData) {
        const street = shippingAddressData
          ? shippingAddressData.street[0]
          : ''

        const street1 = shippingAddressData.street[1]
          ? shippingAddressData.street[1]
          : ''
        const city = shippingAddressData.city
          ? shippingAddressData.city
          : ''
        const country_id = shippingAddressData.countryId
          ? shippingAddressData.countryId
          : ''
        const PostalCode = shippingAddressData.postcode
          ? shippingAddressData.postcode
          : ''
        const regionCode = shippingAddressData.regionCode
          ? shippingAddressData.regionCode
          : ''

        ShippingLine = `${street} ${street1}<br/>${city}, ${regionCode}, ${country_id} ${PostalCode}`
        return ShippingLine
      } else {
        ShippingLine = ''
        return ShippingLine
      }

      // console.log(checkoutData.getInputFieldEmailValue());
    },

    getFormKey: function () {
      return window.checkoutConfig.formKey
    }
  })
})
