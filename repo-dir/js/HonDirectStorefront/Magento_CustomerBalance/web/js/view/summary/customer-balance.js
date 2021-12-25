/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

/**
 * Customer balance summary block info
 */
define([
  'Magento_Checkout/js/view/summary/abstract-total',
  'Magento_Checkout/js/model/totals',
  'Magento_CustomerBalance/js/action/remove-balance',
  'Magento_CustomerBalance/js/view/payment/customer-balance'
], function (Component, totals, removeCustomerBalance, customerBalance) {
  'use strict'

  return Component.extend({
    defaults: {
      template: 'Magento_CustomerBalance/summary/customer-balance',
      storeCreditFormName:
                'checkout.steps.billing-step.payment.beforeMethods.storeCredit',
      modules: {
                storeCreditForm: "${ $.storeCreditFormName }", // eslint-disable-line
      }
    },
    totals: totals.totals(),

    /**
         * Used balance without any formatting
         *
         * @return {Number}
         */
    getPureValue: function () {
      let price = 0
      let segment

      if (this.totals) {
        segment = totals.getSegment('customerbalance')

        if (segment) {
          price = segment.value
        }
      }

      return price
    },

    /**
         * Used balance with currency sign and localization
         *
         * @return {String}
         */
    getValue: function () {
      return this.getFormattedPrice(this.getPureValue())
    },

    /**
         * Availability status
         *
         * @returns {Boolean}
         */
    isAvailable: function () {
      return this.isFullMode() && this.getPureValue() != 0
    },

    /**
         * Send request to unuse balance
         */
    sendRequest: function () {
      removeCustomerBalance()
      this.storeCreditForm().setAmountSubstracted(false)
      customerBalance()
    }
  })
})
