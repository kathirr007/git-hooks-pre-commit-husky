/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

/**
 * Customer balance view model
 */
define([
  'ko',
  'uiComponent',
  'Magento_Checkout/js/model/quote',
  'Magento_Catalog/js/price-utils',
  'Magento_CustomerBalance/js/action/use-balance',
  'jquery',
  'Magento_Checkout/js/model/totals',
  'Magento_Checkout/js/model/step-navigator'
], function (
  ko,
  component,
  quote,
  priceUtils,
  useBalanceAction,
  $,
  totals,
  stepNavigator
) {
  'use strict'

  const walletSplit = window.checkoutConfig.corporate_wallet_split_enable
  const walletBalance = window.checkoutConfig.payment.customerBalance.balance
  const walletBalanceMsg = window.checkoutConfig.customer_wallet_error_msg
  const corporateWalletEnable = window.checkoutConfig.corporate_wallet_enable
  const globalWalletEnabled = window.checkoutConfig.global_wallet_enabled
  const corporateWalletfundsforOrder =
        window.checkoutConfig.corporate_wallet_only
  const amountSubstracted = ko.observable(
    window.checkoutConfig.payment.customerBalance.amountSubstracted
  )
  const isActive = ko.pureComputed(function () {
    const totals = quote.getTotals()
    return totals().grand_total > 0
  })

  return component.extend({
    defaults: {
      template: 'Magento_CustomerBalance/payment/customer-balance',
      isEnabled: true
    },
    totals: totals.totals(),
    isAvailable: window.checkoutConfig.payment.customerBalance.isAvailable,
    amountSubstracted:
            window.checkoutConfig.payment.customerBalance.amountSubstracted,
    usedAmount: window.checkoutConfig.payment.customerBalance.usedAmount,
    balance: window.checkoutConfig.payment.customerBalance.balance,

    /** @inheritdoc */
    initObservable: function () {
      const self = this
      this._super().observe('isEnabled')
      const applyTotal = this.getapplyPureValue()
      if (applyTotal > 0) {
        this._super().observe({ checkIfbalance: ko.observable(true) })
        $('#store_credit_input_box_wrapper').show()
      } else {
        this._super().observe({ checkIfbalance: ko.observable(false) })
        $('#store_credit_input_box_wrapper').hide()
      }

      this.checkIfbalance.subscribe(function (newValue) {
        if (newValue) {
          $('#store_credit_input_box_wrapper').show()
        } else {
          $('#delete-customer-balance').click()
          $('#store_credit_input_box_wrapper').hide()
        }
      })

      this._super().observe({
        checknonspiltpayment: ko.observable(true)
      })
      this.checknonspiltpayment.subscribe(function (newValue) {
        if (newValue) {
          amountSubstracted(true)
          useBalanceAction()
        } else {
          $('#delete-customer-balance').click()
        }
      })

      return this
    },
    /**
         * Get active status
         *
         * @return {Boolean}
         */
    applyDirectstoreCredit: function () {
      const customval = this.getapplyPureValue()
      if (customval > 0) {
        this.applyCurrentCreditInput(customval)
      } else {
        this.sendRequest()
      }
      $('#apply_wallet_balance').prop('checked', true)
      $('#store_credit_check_box').prop('checked', true)
    },

    disbaleCorporateWalletfunds: function () {
      return corporateWalletfundsforOrder
    },

    OnStoreCreditInput: function () {
      const storeCredit = parseFloat($('#store_credit_input_box').val())
      if (storeCredit > 0) {
        const baseUrl = window.BASE_URL
        const finalUrl = baseUrl + 'wallet/index/credit'
        const param = ''
        $.ajax({
          showLoader: true,
          url: finalUrl,
          data: { credit: storeCredit },
          type: 'POST',
          dataType: 'json'
        }).done(function (data) {
          if (data.status) {
            amountSubstracted(true)
            useBalanceAction()
          }
        })
      }
    },
    applyCurrentCreditInput: function (customval) {
      const storeCredit = customval
      if (storeCredit > 0) {
        const baseUrl = window.BASE_URL
        const finalUrl = baseUrl + 'wallet/index/credit'
        const param = ''
        $.ajax({
          showLoader: true,
          url: finalUrl,
          data: { credit: storeCredit },
          type: 'POST',
          dataType: 'json'
        }).done(function (data) {
          if (data.status) {
            amountSubstracted(true)
            useBalanceAction()
          }
        })
      }
    },
    checkEnterKey: function (data, event) {
      if (event.which == 13) {
        return false
      } else {
        return true
      }
    },
    getapplyPureValue: function () {
      let price = 0
      let segment

      if (this.totals) {
        segment = totals.getSegment('customerbalance')

        if (segment) {
          price = segment.value
        }
      }
      price = Math.abs(price)
      return price
    },
    isActive: function () {
      return isActive()
    },

    getGrandTotal: function () {
      const totals = quote.totals()
      return (totals || quote).grand_total
    },

    isSplitAllowed: function () {
      return walletSplit
    },

    walletBalance: function () {
      return walletBalance
    },
    walletBalanceMsg: function () {
      return walletBalanceMsg
    },

    corporateWalletEnable: function () {
      return corporateWalletEnable
    },

    globalWalletEnabled: function () {
      return globalWalletEnabled
    },

    /**
         * Format customer balance
         *
         * @return {String}
         */
    formatBalance: function () {
      return priceUtils.formatPrice(this.balance, quote.getPriceFormat())
    },

    /**
         * Set amount substracted from checkout.
         *
         * @param {Boolean} isAmountSubstracted
         * @return {Object}
         */
    setAmountSubstracted: function (isAmountSubstracted) {
      amountSubstracted(isAmountSubstracted)
      return this
    },

    /**
         * Send request to use balance
         */
    sendRequest: function () {
      const storeCredit = 0
      const baseUrl = window.BASE_URL
      const finalUrl = baseUrl + 'wallet/index/credit'
      $.ajax({
        showLoader: true,
        url: finalUrl,
        data: { credit: storeCredit },
        type: 'POST',
        dataType: 'json'
      }).done(function (data) {
        if (data.status) {
          amountSubstracted(true)
          useBalanceAction()
        }
      })
    }
  })
})
