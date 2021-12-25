/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'uiComponent',
  'Magento_Customer/js/model/address-list',
  'mage/translate',
  'Magento_Customer/js/model/customer',
  'Magento_Ui/js/modal/modal',
  'Magento_Customer/js/customer-data',
  'jquery',
  'Magento_Checkout/js/model/quote'
], function (
  Component,
  addressList,
  $t,
  customer,
  modal,
  customerData,
  $,
  quote
) {
  'use strict'
  const countryData = customerData.get('directory-data')
  const newAddressOption = {
    /**
         * Get new address label
         * @returns {String}
         */
    getAddressInline: function () {
      return $t('New Address')
    },
    customerAddressId: null
  }
  const addressOptions = addressList().filter(function (address) {
    return address.getType() === 'customer-address'
  })

  return Component.extend({
    defaults: {
      template: 'Magento_Checkout/billing-address',
      selectedAddress: null,
      isNewAddressSelected: false,
      addressOptions: addressOptions,
      exports: {
                selectedAddress: "${ $.parentName }:selectedAddress", // eslint-disable-line
      }
    },
    currentBillingAddress: quote.billingAddress,

    /**
         * @returns {Object} Chainable.
         */
    initConfig: function () {
      this._super()
      this.addressOptions.push(newAddressOption)

      return this
    },

    /**
         * @return {exports.initObservable}
         */
    initObservable: function () {
      this._super()
        .observe('selectedAddress isNewAddressSelected')
        .observe({
          isNewAddressSelected:
                        !customer.isLoggedIn() || !addressOptions.length
        })
      window.billingAddress = quote.billingAddress
      return this
    },

    /**
         * @param {Object} address
         * @return {*}
         */
    addressOptionsText: function (address) {
      return address.getAddressInline()
    },

    /**
         * @param {Object} address
         */
    onAddressChange: function (address) {
      this.isNewAddressSelected(address === newAddressOption)
    },

    onBillingSelect: function (addressText, address) {
      $('.billing-address-item').removeClass('selected-item')
      $('.billing-address-item button').show()

      $(`[billingid=${address}]`).addClass('selected-item')
      $(`[billingid=${address}] button`).hide()

      const divID =
                `#billing_address_id option:contains(${addressText})`
      $(divID).attr('selected', 'selected').trigger('change')

      if (
        $(
          '.billing-address-item.new-address .action-select-new-billing-address'
        ).length > 0
      ) {
        $(
          '.billing-address-item.new-address .action-select-new-billing-address'
        ).show()
      }

      $('.action.action-update').click()
      // $('.new-address').remove();
    },

    onNewBillingSelect: function () {
      $('.billing-address-item').removeClass('selected-item')
      $('.billing-address-item button').show()

      $('.billing-address-item.new-address').addClass('selected-item')
      $(
        '.billing-address-item.new-address .action-select-new-billing-address'
      ).hide()

      $('#billing_address_id option:contains(New Address)')
        .attr('selected', 'selected')
        .trigger('change')
      $('.action.action-update').click()
    },

    /**
         * Edit address action
         */
    editAddress: function (element) {
      localStorage.removeItem('update_address_id')
      localStorage.setItem(
        'update_address_id',
        element.customerAddressId
      )

      $(".billing-address-form form input[name='firstname']")
        .val(element.firstname)
        .trigger('change')
      $(".billing-address-form form input[name='lastname']")
        .val(element.lastname)
        .trigger('change')
      $(".billing-address-form form input[name='telephone']")
        .val(element.telephone)
        .trigger('change')
      $(".billing-address-form form input[name='company']")
        .val(element.company)
        .trigger('change')
      $(".billing-address-form form input[name='city']")
        .val(element.city)
        .trigger('change')
      $(".billing-address-form form select[name='region_id']")
        .val(element.regionId)
        .attr('selected', 'selected')
        .trigger('change')
      $(".billing-address-form form input[name='postcode']")
        .val(element.postcode)
        .trigger('change')
      $(".billing-address-form form input[name='street[0]']")
        .val(element.street[0])
        .trigger('change')
      $(".billing-address-form form input[name='street[1]']")
        .val(element.street[1])
        .trigger('change')
      // $("#billing-save-in-address-book-shared").prop('checked',false).trigger('change');

      // $('.billing-address-item').removeClass('selected-item');
      $('.billing-address-item button').show()
      const newAddress = false
      this.showBillingPopup(newAddress)
    },

    /**
         * @param {Number} countryId
         * @return {*}
         */
    getCountryName: function (countryId) {
      return countryData()[countryId] != undefined
        ? countryData()[countryId].name
                : ""; //eslint-disable-line
    },

    showBillingPopup: function (newAddress) {
      $(".billing-address-form form input[name='telephone']").addClass(
        'customphonevalid'
      )
      if (newAddress) {
        localStorage.removeItem('update_address_id')
        $('.billing-address-form form').get(0).reset()
        $(
          '.billing-address-form form input, .billing-address-form form select'
        ).trigger('change')
        $(
          '.billing-address-form form input, .billing-address-form form select'
        )
          .closest('.field._required._error')
          .find('.field-error span')
          .html('')
        $(
          '.billing-address-form form input, .billing-address-form form select'
        )
          .closest('.field._required._error')
          .removeClass('_error')
        if (window.newBillingAddress) {
          $(".billing-address-form form input[name='firstname']")
            .val(window.newBillingAddress.firstname)
            .trigger('change')
          $(".billing-address-form form input[name='lastname']")
            .val(window.newBillingAddress.lastname)
            .trigger('change')
          $(".billing-address-form form input[name='telephone']")
            .val(window.newBillingAddress.telephone)
            .trigger('change')
          $(".billing-address-form form input[name='company']")
            .val(window.newBillingAddress.company)
            .trigger('change')
          $(".billing-address-form form input[name='city']")
            .val(window.newBillingAddress.city)
            .trigger('change')
          $(".billing-address-form form select[name='region_id']")
            .val(window.newBillingAddress.regionId)
            .attr('selected', 'selected')
            .trigger('change')
          $(".billing-address-form form input[name='postcode']")
            .val(window.newBillingAddress.postcode)
            .trigger('change')
          $(".billing-address-form form input[name='street[0]']")
            .val(window.newBillingAddress.street[0])
            .trigger('change')
          $(".billing-address-form form input[name='street[1]']")
            .val(window.newBillingAddress.street[1])
            .trigger('change')
          /* if(window.newBillingAddress.saveInAddressBook){
						$("#billing-save-in-address-book-shared").prop('checked',true).trigger('change');
					}else{
						$("#billing-save-in-address-book-shared").prop('checked',false).trigger('change');
					} */
        }
      }
      this.isNewAddressSelected(true)
      const options = {
        type: 'popup',
        responsive: true,
        innerScroll: true,
        title: $.mage.__('Billing Address'),
        buttons: [
          {
            text: $.mage.__('Bill Here'),
            class: 'action-save-billing-address',
            click: function () {
              $('.action.action-update').click()
              /* this.closeModal();

                        $('.new-address').remove();
                        var newaddressBox = $('.billing-address-details').html();

                        newaddressBox = '<div class="billing-address-item shipping-address-item selected-item new-address">' + newaddressBox + '</div>'
                        $('.billing-address-items').append(newaddressBox);
                        $('.new-address button').remove(); */
            }
          },
          {
            text: $.mage.__('Cancel'),
            class: '',
            click: function () {
              localStorage.removeItem('update_address_id')
              this.closeModal()
            }
          }
        ]
      }

      const popup = modal(options, $('#billing-popup'))
      $('#billing-popup').modal('openModal')
    }
  })
})
