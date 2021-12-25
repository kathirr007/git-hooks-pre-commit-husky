/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'jquery',
  'ko',
  'uiComponent',
  'underscore',
  'Magento_Checkout/js/action/select-shipping-address',
  'Magento_Checkout/js/model/quote',
  'Magento_Checkout/js/model/shipping-address/form-popup-state',
  'Magento_Checkout/js/checkout-data',
  'Magento_Customer/js/customer-data'
], function (
  $,
  ko,
  Component,
  _,
  selectShippingAddressAction,
  quote,
  formPopUpState,
  checkoutData,
  customerData
) {
  'use strict'

  const countryData = customerData.get('directory-data')

  return Component.extend({
    defaults: {
      template:
                'Magento_Checkout/shipping-address/address-renderer/default'
    },

    /** @inheritdoc */
    initObservable: function () {
      this._super()
      this.isSelected = ko.computed(function () {
        let isSelected = false
        const shippingAddress = quote.shippingAddress()

        if (shippingAddress) {
          isSelected =
                        shippingAddress.getKey() == this.address().getKey() // eslint-disable-line eqeqeq
        }

        return isSelected
      }, this)

      return this
    },

    /**
         * @param {String} countryId
         * @return {String}
         */
    getCountryName: function (countryId) {
      return countryData()[countryId] != undefined
        ? countryData()[countryId].name
                : ""; //eslint-disable-line
    },

    /**
         * Get customer attribute label
         *
         * @param {*} attribute
         * @returns {*}
         */
    getCustomAttributeLabel: function (attribute) {
      let resultAttribute

      if (typeof attribute === 'string') {
        return attribute
      }

      if (attribute.label) {
        return attribute.label
      }

      if (typeof this.source.get('customAttributes') !== 'undefined') {
        resultAttribute = _.findWhere(
          this.source.get('customAttributes')[
            attribute.attribute_code
          ],
          {
            value: attribute.value
          }
        )
      }

      return (
        (resultAttribute && resultAttribute.label) || attribute.value
      )
    },

    /** Set selected customer shipping address  */
    selectAddress: function () {
      $('.shipping-address-item').removeClass('selected-item')
      selectShippingAddressAction(this.address())
      checkoutData.setSelectedShippingAddress(this.address().getKey())
    },

    /**
         * Edit address.
         */
    editAddress: function () {
      formPopUpState.isVisible(true)
      this.showPopup()
    },

    updateShippingAddress: function (place, event) {
      const addressId = event.target.id
      const addressList = window.checkoutConfig.customerData.addresses
      localStorage.removeItem('update_address_id')
      if (addressList && addressId) {
        localStorage.setItem('update_address_id', addressId)
        const selectedAddress = addressList[addressId]
        $(".form-shipping-address input[name='firstname']")
          .val(selectedAddress.firstname)
          .trigger('change')
        $(".form-shipping-address input[name='lastname']")
          .val(selectedAddress.lastname)
          .trigger('change')
        $(".form-shipping-address input[name='company']")
          .val(selectedAddress.company)
          .trigger('change')
        $(".form-shipping-address input[name='street[0]']")
          .val(selectedAddress.street[0])
          .trigger('change')
        $(".form-shipping-address input[name='street[1]']")
          .val(selectedAddress.street[1])
          .trigger('change')
        $(".form-shipping-address input[name='telephone']")
          .val(selectedAddress.telephone)
          .trigger('change')
        $(".form-shipping-address input[name='city']")
          .val(selectedAddress.city)
          .trigger('change')
        $(".form-shipping-address input[name='postcode']")
          .val(selectedAddress.postcode)
          .trigger('change')
        $(".form-shipping-address select[name='region_id']")
          .val(selectedAddress.region_id)
          .attr('selected', 'selected')
          .trigger('change')
      }
      const CurrentAddId =
                `#current_address_id_${
                addressId
                } .action-select-shipping-item`
      const currLen = $(CurrentAddId).length
      if (currLen == 0) {
        $(`#current_address_id_${addressId}`).addClass('pre_select')
      }
      formPopUpState.isVisible(true)
      this.showPopup()
    },

    /**
         * Show popup.
         */
    showPopup: function () {
      $('[data-open-modal="opc-new-shipping-address"]').trigger('click')
    }
  })
})
