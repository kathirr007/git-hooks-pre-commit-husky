/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'uiComponent',
  'Magento_Checkout/js/model/totals',
  'Magento_Catalog/js/price-utils',
  'Magento_Checkout/js/model/quote'
], function (Component, totals, priceUtils, quote) {
  'use strict'
  return Component.extend({
    CusSummaryTotal: function () {
      const Subtotal = window.checkoutConfig.totalsData.subtotal
      if (Subtotal) {
        const OrderTotal = priceUtils.formatPrice(
          Subtotal,
          quote.getPriceFormat()
        )
        return OrderTotal
      } else {
        return false
      }
    },
    isLoading: totals.isLoading
  })
})
