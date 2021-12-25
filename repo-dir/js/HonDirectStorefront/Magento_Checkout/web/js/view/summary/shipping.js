/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'jquery',
  'underscore',
  'Magento_Checkout/js/view/summary/abstract-total',
  'Magento_Checkout/js/model/quote',
  'Magento_SalesRule/js/view/summary/discount'
], function ($, _, Component, quote, discountView) {
  'use strict'

  return Component.extend({
    defaults: {
      template: 'Magento_Checkout/summary/shipping'
    },
    quoteIsVirtual: quote.isVirtual(),
    totals: quote.getTotals(),

    /**
         * @return {*}
         */
    getShippingMethodTitle: function () {
      const shippingMethodTitle = ''

      if (!this.isCalculated()) {
        return ''
      }
      const shippingMethod = quote.shippingMethod()

      if (!_.isArray(shippingMethod) && !_.isObject(shippingMethod)) {
        return ''
      }

      /* if (typeof shippingMethod['method_title'] !== 'undefined') {
                shippingMethodTitle = ' - ' + shippingMethod['method_title'];
            } */

      return shippingMethodTitle
        ? shippingMethod.carrier_title + shippingMethodTitle
        : shippingMethod.carrier_title
    },

    /**
         * @return {*|Boolean}
         */
    isCalculated: function () {
      return (
        this.totals() &&
                this.isFullMode() &&
                quote.shippingMethod() != null
      )
    },

    /**
         * @return {*}
         */
    getValue: function () {
      if (!this.isCalculated()) {
        return this.notCalculatedMessage
      }
      const price = this.totals().shipping_amount

      if (price === 0) {
        return 'Free'
      }

      return this.getFormattedPrice(price)
    },

    /**
         * If is set coupon code, but there wasn't displayed discount view.
         *
         * @return {Boolean}
         */
    haveToShowCoupon: function () {
      let couponCode = this.totals().coupon_code

      if (typeof couponCode === 'undefined') {
        couponCode = false
      }

      return couponCode && !discountView().isDisplayed()
    },

    /**
         * Returns coupon code description.
         *
         * @return {String}
         */
    getCouponDescription: function () {
      if (!this.haveToShowCoupon()) {
        return ''
      }

      return '(' + this.totals().coupon_code + ')'
    }
  })
})
