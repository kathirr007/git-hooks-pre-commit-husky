/**
 * Copyright � Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'jquery',
  'underscore',
  'ko',
  'uiComponent',
  'Magento_Checkout/js/model/step-navigator',
  'Magento_Catalog/js/price-utils',
  'Magento_Checkout/js/model/quote'
], function ($, _, ko, Component, stepNavigator, priceUtils, quote) {
  'use strict'

  const steps = stepNavigator.steps

  return Component.extend({
    defaults: {
      template: 'Magento_Checkout/progress-bar',
      visible: true
    },
    steps: steps,

    /** @inheritdoc */
    initialize: function () {
      let stepsValue

      this._super()
      window.addEventListener(
        'hashchange',
        _.bind(stepNavigator.handleHash, stepNavigator)
      )

      if (!window.location.hash) {
        stepsValue = stepNavigator.steps()

        if (stepsValue.length) {
          stepNavigator.setHash(
            stepsValue.sort(stepNavigator.sortItems)[0].code
          )
        }
      }

      stepNavigator.handleHash()
    },

    CusMobSummaryTotal: function () {
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
    /**
         * @param {*} itemOne
         * @param {*} itemTwo
         * @return {*|Number}
         */
    sortItems: function (itemOne, itemTwo) {
      return stepNavigator.sortItems(itemOne, itemTwo)
    },

    /**
         * @param {Object} step
         */
    navigateTo: function (step) {
      stepNavigator.navigateTo(step.code)
    },

    /**
         * @param {Object} item
         * @return {*|Boolean}
         */
    isProcessed: function (item) {
      return stepNavigator.isProcessed(item.code)
    }
  })
})
