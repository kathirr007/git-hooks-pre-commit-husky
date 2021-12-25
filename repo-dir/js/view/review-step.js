define([
  'jquery',
  'ko',
  'uiComponent',
  'Magento_Checkout/js/model/quote',
  'Magento_Checkout/js/checkout-data',
  'underscore',
  'Magento_Checkout/js/model/step-navigator',
  'mage/translate'
], function ($, ko, Component, quote, checkoutData, _, stepNavigator, $t) {
  'use strict'
  return Component.extend({
    defaults: {
      template: 'Hni_Checkout/reviewstep/reviewinfo'
    },

    isVisible: ko.observable(false),

    initialize: function () {
      this._super()
      // register your step
      stepNavigator.registerStep(
        'review_info',
        null,
        $t('Review'),
        this.isVisible,
        _.bind(this.navigate, this),
        30
      )
      return this
    },

    navigate: function () {
      const self = this
      self.isVisible(true)
    },

    navigateToNextStep: function () {
      stepNavigator.next()
    },

    placeorder: function () {
      $('.payment-method._active .primary button.checkout').trigger('click')
    },

    back: function () {
      stepNavigator.navigateTo('shipping')
    },

    isPaymentToReviewStep: function () {
      if (stepNavigator.getActiveItemIndex() == 2) {
        $('.breadcrumbs .items .Review').show()
        $('.breadcrumbs .items .Review').css('display', 'inline-block')

        $('.checkout-index-index').addClass('payment_done')
        $('.checkout-index-index').addClass('shipping_done')

        return true
      } else {
        $('.checkout-index-index').removeClass('payment_done')

        return false
      }
    },
    getReviewShippingMethod: function () {
      const shippingMethod = quote.shippingMethod()
      const title = shippingMethod
        ? shippingMethod.carrier_title +
          ' - ' +
          shippingMethod.method_title
        : ''
      return title
    },

    getReviewPhoneNumber: function () {
      const shippingAddressData = quote.shippingAddress()
      let telephone

      if (shippingAddressData) {
        telephone = shippingAddressData.telephone
          ? shippingAddressData.telephone
          : ''
      } else {
        telephone = ''
      }
      return telephone
    },
    getReviewEmailAddress: function () {
      const isCustomerLogin = window.checkoutConfig.isCustomerLoggedIn
      let Email
      if (isCustomerLogin) {
        Email = window.checkoutConfig.quoteData.customer_email
      } else {
        Email = $('#customer-email-fieldset #customer-email').val()
      }

      return Email
    },

    getReviewShippingAddress: function () {
      const shippingAddressData = quote.shippingAddress()
      let ShippingLine
      if (shippingAddressData) {
        const street = shippingAddressData.street[0]
          ? shippingAddressData.street[0]
          : ''

        const street1 = shippingAddressData.street[1]
          ? shippingAddressData.street[1]
          : ''
        const city = shippingAddressData.city ? shippingAddressData.city : ''
        const country_id = shippingAddressData.country_id
          ? shippingAddressData.country_id
          : ''
        const PostalCode = shippingAddressData.postcode
          ? shippingAddressData.postcode
          : ''
        const regionCode = shippingAddressData.regionCode
          ? shippingAddressData.regionCode
          : ''

        ShippingLine =
          street +
          ' ' +
          street1 +
          '<br/>' +
          city +
          ', ' +
          regionCode +
          ', ' +
          country_id +
          ' ' +
          PostalCode
        return ShippingLine
      } else {
        ShippingLine = ''
        return ShippingLine
      }

      // console.log(checkoutData.getInputFieldEmailValue());
    },
    getReviewPaymentInfo: function () {
      const paymentInfo = $(
        '.payment-method._active .payment-method-title .label span'
      ).text()
      return paymentInfo
    },

    getReviewBillingInfo: function () {
      const UseForBilling = $(
        '.payment-method._active .payment-method-content .billing-address-same-as-shipping-block input'
      ).prop('checked')
      let htmlStr
      if (UseForBilling) {
        htmlStr = 'Same as Shipping'
      } else {
        const BillingAddressData = quote.billingAddress()
        if (BillingAddressData) {
          const street = BillingAddressData.street[0]
            ? BillingAddressData.street[0]
            : ''
          const street1 = BillingAddressData.street[1]
            ? BillingAddressData.street[1]
            : ''
          const city = BillingAddressData.city ? BillingAddressData.city : ''
          const country_id = BillingAddressData.countryId
            ? BillingAddressData.countryId
            : ''
          const PostalCode = BillingAddressData.postcode
            ? BillingAddressData.postcode
            : ''
          const regionCode = BillingAddressData.regionCode
            ? BillingAddressData.regionCode
            : ''
          htmlStr =
            street +
            ' ' +
            street1 +
            '<br/>' +
            city +
            ', ' +
            regionCode +
            ', ' +
            country_id +
            ' ' +
            PostalCode
        } else {
          htmlStr = ''
        }
      }
      return htmlStr
    },

    backbilling: function () {
      $('.payment-method._active .primary button.checkout').removeClass(
        'disabled'
      )
      stepNavigator.navigateTo('payment')
    }
  })
})
