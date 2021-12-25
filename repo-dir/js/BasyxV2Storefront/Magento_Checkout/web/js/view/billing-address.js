/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'ko',
  'underscore',
  'Magento_Ui/js/form/form',
  'Magento_Customer/js/model/customer',
  'Magento_Customer/js/model/address-list',
  'Magento_Checkout/js/model/quote',
  'Magento_Checkout/js/action/create-billing-address',
  'Magento_Checkout/js/action/select-billing-address',
  'Magento_Checkout/js/checkout-data',
  'Magento_Checkout/js/model/checkout-data-resolver',
  'Magento_Customer/js/customer-data',
  'Magento_Checkout/js/action/set-billing-address',
  'Magento_Ui/js/model/messageList',
  'mage/translate',
  'Magento_Checkout/js/model/billing-address-postcode-validator',
  'jquery'
], function (
  ko,
  _,
  Component,
  customer,
  addressList,
  quote,
  createBillingAddress,
  selectBillingAddress,
  checkoutData,
  checkoutDataResolver,
  customerData,
  setBillingAddressAction,
  globalMessageList,
  $t,
  billingAddressPostcodeValidator,
  $
) {
  'use strict'

  let lastSelectedBillingAddress = null
  const countryData = customerData.get('directory-data')
  const addressOptions = addressList().filter(function (address) {
    return address.getType() === 'customer-address'
  })

  return Component.extend({
    defaults: {
      template: 'Magento_Checkout/billing-address',
      actionsTemplate: 'Magento_Checkout/billing-address/actions',
      formTemplate: 'Magento_Checkout/billing-address/form',
      detailsTemplate: 'Magento_Checkout/billing-address/details',
      isNewAddressSelected: false,
      links: {
        isAddressFormVisible:
                    "${$.billingAddressListProvider}:isNewAddressSelected", // eslint-disable-line
      }
    },
    currentBillingAddress: quote.billingAddress,
    customerHasAddresses: addressOptions.length > 0,

    /**
         * Init component
         */
    initialize: function () {
      this._super()
      quote.paymentMethod.subscribe(function () {
        checkoutDataResolver.resolveBillingAddress()
      }, this)
      billingAddressPostcodeValidator.initFields(
        `${this.get('name')}.form-fields`
      )
      this.onInputInTelephone()
    },

    /**
         * @return {exports.initObservable}
         */
    initObservable: function () {
      this._super().observe({
        selectedAddress: null,
        isAddressDetailsVisible: quote.billingAddress() != null,
        isAddressFormVisible:
                    !customer.isLoggedIn() || !addressOptions.length,
        isAddressSameAsShipping: false,
        saveInAddressBook: 1,
        isNewAddressSelected:
                    !customer.isLoggedIn() || !addressOptions.length
      })

      quote.billingAddress.subscribe(function (newAddress) {
        this.isAddressSameAsShipping(false)

        if (
          newAddress != null &&
                    newAddress.saveInAddressBook !== undefined
        ) {
          this.saveInAddressBook(newAddress.saveInAddressBook)
        } else {
          this.saveInAddressBook(1)
        }
        this.isAddressDetailsVisible(true)
      }, this)

      return this
    },

    canUseShippingAddress: ko.computed(function () {
      return (
        !quote.isVirtual() &&
                quote.shippingAddress() &&
                quote.shippingAddress().canUseForBilling()
      )
    }),

    /**
         * @param {Object} address
         * @return {*}
         */
    addressOptionsText: function (address) {
      return address.getAddressInline()
    },

    numberOfAddress: function () {
      return addressOptions.length
    },
    onInputInTelephone: function () {
      $(document).on(
        'keyup',
        '#co-billing-form .customphonevalid',
        function (e) {
          let number = $(this)
            .val()
            .replace(/\D/g, '')
            .substring(0, 10)
          if (number.length > 6) {
            number = number.replace(
              /(\d{3})(\d{3})(\d{4})/,
              '($1) $2-$3'
            )
          } else if (number.length > 3) {
            number = number.replace(/(\d{3})(\d{3})/, '($1) $2')
          } else {
            number = number.replace(/(\d{3})/, '($1 ')
          }
          $(this).val(number)
        }
      )
    },

    /**
         * @return {Boolean}
         */
    useShippingAddress: function () {
      if (this.isAddressSameAsShipping()) {
        selectBillingAddress(quote.shippingAddress())

        this.updateAddresses()
        this.isAddressDetailsVisible(true)
      } else {
        lastSelectedBillingAddress = quote.billingAddress()
        quote.billingAddress(null)
        this.isAddressDetailsVisible(false)
      }
      checkoutData.setSelectedBillingAddress(null)

      return true
    },

    /**
         * Update address action
         */
    updateAddress: function () {
      let addressData, newBillingAddress
      const updateAddressId = localStorage.getItem('update_address_id')

      if (this.selectedAddress() && !this.isAddressFormVisible()) {
        selectBillingAddress(this.selectedAddress())
        checkoutData.setSelectedBillingAddress(
          this.selectedAddress().getKey()
        )
        if ($('.billing-address-item .new-address').length > 0) {
          $('.billing-address-popup .action-show-popup').show()
        }
        this.updateAddresses()
      } else {
        this.source.set('params.invalid', false)
        this.source.trigger(`${this.dataScopePrefix}.data.validate`)

        if (
          this.source.get(`${this.dataScopePrefix}.custom_attributes`)
        ) {
          this.source.trigger(
            `${this.dataScopePrefix
                            }.custom_attributes.data.validate`
          )
        }

        if (!this.source.get('params.invalid')) {
          addressData = this.source.get(this.dataScopePrefix)

          if (customer.isLoggedIn() && !this.customerHasAddresses) {
            // eslint-disable-line max-depth
            this.saveInAddressBook(1)
          }
          addressData.save_in_address_book = this.saveInAddressBook()
            ? 1
            : 0

          let count = 0
          /* eslint-disable array-callback-return */
          addressList.some(function (address) {
            if (address.customerAddressId != updateAddressId) {
              const addresStreetStr =
                                address.street[0].toUpperCase()
              const addresPostcodeStr = address.postcode
              if (typeof address.street[1] !== 'undefined') {
                const addresStreetLine2Str =
                                    address.street[1].toUpperCase()
                if (
                  _.isEqual(
                    addresStreetStr,
                    addressData.street[0].toUpperCase()
                  ) &&
                                    _.isEqual(
                                      addresStreetLine2Str,
                                      addressData.street[1].toUpperCase()
                                    ) &&
                                    _.isEqual(
                                      addresPostcodeStr,
                                      addressData.postcode
                                    )
                ) {
                  count = count + 1
                }
              } else {
                if (
                  _.isEqual(
                    addresStreetStr,
                    addressData.street[0].toUpperCase()
                  ) &&
                                    _.isEqual(
                                      addresPostcodeStr,
                                      addressData.postcode
                                    )
                ) {
                  count = count + 1
                }
              }
            }
          })
          /* eslint-disable array-callback-return */
          if (count > 0) {
            $(
              '#billing-address-validation-error-message-id'
            ).remove()
            $('.action-save-billing-address').attr(
              'disabled',
              'disabled'
            )
            $('.action-save-billing-address')
              .parent()
              .append(
                `<span id="billing-address-validation-error-message-id" generated="true" style= "color:red;" class="billing-address-validation-error-message mage-error">${
                                    $t(
                                      'The billing address is same as existing. Please enter new address and try again.'
                                    )
                                    }</span>`
              )
            setTimeout(function () {
              $('.billing-address-validation-error-message').html(
                ''
              )
              $(
                '#billing-address-validation-error-message-id'
              ).remove()
              $('.action-save-billing-address').removeAttr(
                'disabled'
              )
            }, 3000)
          } else {
            if (updateAddressId) {
              const self = this
              $.ajax({
                url:
                                    `${window.BASE_URL
                                    }customeraddress/index/save`,
                method: 'POST',
                data: {
                  address: addressData,
                  address_id: updateAddressId
                },
                dataType: 'json',
                showLoader: true,
                success: function (response) {
                  const address = quote.billingAddress()
                  quote.billingAddress(address)
                  if (response.success) {
                    // window.newAddressId = response.address_id;
                  }

                  $(`#button-${updateAddressId}`)
                    .parent()
                    .find('.action-select-billing-item')
                    .trigger('click')
                  localStorage.removeItem(
                    'update_address_id'
                  )
                  $('.modal-popup .action-close').click()
                  location.reload()
                }
              })
            } else {
              localStorage.removeItem('update_address_id')

              if (addressOptions.length > 0) {
                if (
                  addressData.save_in_address_book ||
                                    window.newAddressId
                ) {
                  let addressId = ''
                  if (window.newAddressId) {
                    addressId = window.newAddressId
                  }
                  $.ajax({
                    url:
                                            `${window.BASE_URL
                                            }customeraddress/index/save`,
                    method: 'POST',
                    data: {
                      address: addressData,
                      address_id: addressId
                    },
                    dataType: 'json',
                    showLoader: true,
                    success: function (response) {
                      if (response.success) {
                        window.newAddressId =
                                                    response.address_id
                      }
                    }
                  })
                }
              } else {
                addressData.save_in_address_book = 1
              }

              newBillingAddress =
                                createBillingAddress(addressData)
              window.newBillingAddress = newBillingAddress

              // New address must be selected as a billing address
              selectBillingAddress(newBillingAddress)
              checkoutData.setSelectedBillingAddress(
                newBillingAddress.getKey()
              )
              checkoutData.setNewCustomerBillingAddress(
                $.extend(true, {}, newBillingAddress)
              )
              this.isAddressDetailsVisible(true)
              this.isNewAddressSelected(true)
              $('.billing-address-item').removeClass(
                'selected-item'
              )
              $('.billing-address-item button').show()

              $('.new-address').remove()
              let newaddressBox = $(
                '.billing-address-details'
              ).html()

              newaddressBox =
                                `<div class="billing-address-item shipping-address-item selected-item new-address">${
                                newaddressBox
                                }</div>`
              $('.billing-address-items').append(newaddressBox)
              // $('.new-address button').remove();
              $(
                '.new-address button.action-edit-address'
              ).remove()
              $(
                '.billing-address-popup .action-show-popup'
              ).hide()
              if (window.isBillingAddressValid) {
                $('.modal-popup .action-close').click()
              }

              $(
                '#billing_address_id option:contains(New Address)'
              )
                .attr('selected', 'selected')
                .trigger('change')
              $(
                '.billing-address-item.new-address .action-select-new-billing-address'
              ).hide()
              this.updateAddresses()
            }
          }
        }
      }
      // this.updateAddresses();
    },

    /**
         * custom list
         */
    customerAddressList: function () {
      const address = addressList
      return address
    },

    /**
         * custom list show
         */
    checkAddressShow: function (addressval) {
      const address = quote.shippingAddress()
      const currentshipping = address.customerAddressId
      const bilingId = addressval.customerAddressId
      if (currentshipping == bilingId) {
        return false
      } else {
        return true
      }
    },

    /**
         * Edit address action
         */
    editAddress: function () {
      lastSelectedBillingAddress = quote.billingAddress()
      quote.billingAddress(null)
      this.isAddressDetailsVisible(false)
    },

    /**
         * Cancel address edit action
         */
    cancelAddressEdit: function () {
      this.restoreBillingAddress()

      if (quote.billingAddress()) {
        // restore 'Same As Shipping' checkbox state
        this.isAddressSameAsShipping(
          quote.billingAddress() != null &&
                        quote.billingAddress().getCacheKey() ==
                            quote.shippingAddress().getCacheKey() && //eslint-disable-line
                        !quote.isVirtual()
        )
        this.isAddressDetailsVisible(true)
      }
    },

    /**
         * Manage cancel button visibility
         */
    canUseCancelBillingAddress: ko.computed(function () {
      return quote.billingAddress() || lastSelectedBillingAddress
    }),

    /**
         * Restore billing address
         */
    restoreBillingAddress: function () {
      if (lastSelectedBillingAddress != null) {
        selectBillingAddress(lastSelectedBillingAddress)
      }
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

    /**
         * Trigger action to update shipping and billing addresses
         */
    updateAddresses: function () {
      if (
        window.checkoutConfig.reloadOnBillingAddress ||
                !window.checkoutConfig.displayBillingOnPaymentMethod
      ) {
        setBillingAddressAction(globalMessageList)
      }
    },

    /**
         * Get code
         * @param {Object} parent
         * @returns {String}
         */
    getCode: function (parent) {
      return _.isFunction(parent.getCode) ? parent.getCode() : 'shared'
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
    }
  })
})
