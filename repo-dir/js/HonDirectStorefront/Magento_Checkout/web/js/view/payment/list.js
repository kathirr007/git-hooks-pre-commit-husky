/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'underscore',
  'ko',
  'mageUtils',
  'uiComponent',
  'Magento_Checkout/js/model/payment/method-list',
  'Magento_Checkout/js/model/payment/renderer-list',
  'uiLayout',
  'Magento_Checkout/js/model/checkout-data-resolver',
  'mage/translate',
  'uiRegistry'
], function (
  _,
  ko,
  utils,
  Component,
  paymentMethods,
  rendererList,
  layout,
  checkoutDataResolver,
  $t,
  registry
) {
  'use strict'
  const walletBalance = window.checkoutConfig.payment.customerBalance.balance
  return Component.extend({
    defaults: {
      template: 'Magento_Checkout/payment-methods/list',
      visible: paymentMethods().length > 0,
      configDefaultGroup: {
        name: 'methodGroup',
        component: 'Magento_Checkout/js/model/payment/method-group'
      },
      paymentGroupsList: [],
      defaultGroupTitle: $t('Select a new payment method')
    },

    /**
         * Initialize view.
         *
         * @returns {Component} Chainable.
         */
    initialize: function () {
      this._super().initDefaulGroup().initChildren()
      paymentMethods.subscribe(
        function (changes) {
          checkoutDataResolver.resolvePaymentMethod()
          // remove renderer for "deleted" payment methods
          _.each(
            changes,
            function (change) {
              if (change.status === 'deleted') {
                this.removeRenderer(change.value.method)
              }
            },
            this
          )
          // add renderer for "added" payment methods
          _.each(
            changes,
            function (change) {
              if (change.status === 'added') {
                this.createRenderer(change.value)
              }
            },
            this
          )
        },
        this,
        'arrayChange'
      )

      return this
    },

    /** @inheritdoc */
    initObservable: function () {
      this._super().observe(['paymentGroupsList'])

      return this
    },

    /**
         * Creates default group
         *
         * @returns {Component} Chainable.
         */
    initDefaulGroup: function () {
      layout([this.configDefaultGroup])

      return this
    },

    /**
         * Create renders for child payment methods.
         *
         * @returns {Component} Chainable.
         */
    initChildren: function () {
      const self = this

      _.each(paymentMethods(), function (paymentMethodData) {
        self.createRenderer(paymentMethodData)
      })

      return this
    },

    /**
         * @returns
         */
    createComponent: function (payment) {
      const templateData = {
        parentName: this.name,
        name: payment.name
      }
      const rendererTemplate = {
                parent: "${ $.$data.parentName }", // eslint-disable-line
                name: "${ $.$data.name }", // eslint-disable-line
        displayArea: payment.displayArea,
        component: payment.component
      }
      const rendererComponent = utils.template(
        rendererTemplate,
        templateData
      )
      utils.extend(rendererComponent, {
        item: payment.item,
        config: payment.config
      })

      return rendererComponent
    },

    /**
         * Create renderer.
         *
         * @param {Object} paymentMethodData
         */
    createRenderer: function (paymentMethodData) {
      let isRendererForMethod = false
      let currentGroup

      registry.get(
        this.configDefaultGroup.name,
        function (defaultGroup) {
          _.each(
            rendererList(),
            function (renderer) {
              if (
                Object.prototype.hasOwnProperty.call(
                  renderer,
                  'typeComparatorCallback'
                ) &&
                                typeof renderer.typeComparatorCallback ==
                                    'function'
              ) {
                isRendererForMethod =
                                    renderer.typeComparatorCallback(
                                      renderer.type,
                                      paymentMethodData.method
                                    )
              } else {
                isRendererForMethod =
                                    renderer.type === paymentMethodData.method
              }

              if (isRendererForMethod) {
                currentGroup = renderer.group
                  ? renderer.group
                  : defaultGroup

                this.collectPaymentGroups(currentGroup)

                layout([
                  this.createComponent({
                    config: renderer.config,
                    component: renderer.component,
                    name: renderer.type,
                    method: paymentMethodData.method,
                    item: paymentMethodData,
                    displayArea: currentGroup.displayArea
                  })
                ])
              }
            }.bind(this)
          )
        }.bind(this)
      )
    },

    /**
         * Collects unique groups of available payment methods
         *
         * @param {Object} group
         */
    collectPaymentGroups: function (group) {
      let groupsList = this.paymentGroupsList()
      const isGroupExists = _.some(groupsList, function (existsGroup) {
        return existsGroup.alias === group.alias
      })

      if (!isGroupExists) {
        groupsList.push(group)
        groupsList = _.sortBy(groupsList, function (existsGroup) {
          return existsGroup.sortOrder
        })
        this.paymentGroupsList(groupsList)
      }
    },

    /**
         * Returns payment group title
         *
         * @param {Object} group
         * @returns {String}
         */
    getGroupTitle: function (group) {
      let title = 'Payment'

      if (group().isDefault() && this.paymentGroupsList().length > 1) {
        title = 'Payment'
      }

      return title
    },

    /**
         * Checks if at least one payment method available
         *
         * @returns {String}
         */
    isPaymentMethodsAvailable: function () {
      return _.some(
        this.paymentGroupsList(),
        function (group) {
          return this.getRegion(group.displayArea)().length
        },
        this
      )
    },

    walletBalance: function () {
      return walletBalance
    },
    /**
         * Remove view renderer.
         *
         * @param {String} paymentMethodCode
         */
    removeRenderer: function (paymentMethodCode) {
      let items

      _.each(
        this.paymentGroupsList(),
        function (group) {
          items = this.getRegion(group.displayArea)

          _.find(items(), function (value) {
            if (
              value.item.method.indexOf(paymentMethodCode) === 0
            ) {
              value.disposeSubscriptions()
              value.destroy()
            }
          })
        },
        this
      )
    }
  })
})
