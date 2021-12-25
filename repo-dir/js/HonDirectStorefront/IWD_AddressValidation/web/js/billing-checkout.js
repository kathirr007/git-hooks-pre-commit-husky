/* eslint-disable */
define([
    "jquery",
    "IWD_AddressValidation/js/billing-validation",
    "Magento_Ui/js/modal/alert",
    "mage/translate",
    "Magento_Checkout/js/model/quote",
    "Magento_Customer/js/model/address-list",
    "jquery/ui",
], function ($, iwdBillingAddressValidation, modal, $t, quote, addressList) {
    "use strict";

    const addressOptions = addressList().filter(function (address) {
        return address.getType() === "customer-address";
    });

    $.widget(
        "mage.iwdBillingAddressValidationCheckout",
        $.mage.iwdBillingAddressValidation,
        {
            options: {
                urlValidation: "",
                allowInvalidAddress: true,
                formId: "#co-billing-form",
                nextStepButtonId:
                    "button.action-save-billing-address, .payments .billing_step_order_order_btn, .checkout-billing-address .action.action-update",
                placeOrderButtonId: ".payments .billing_step_order_order_btn",
                closePopup: ".modal-popup .action-close",
                shipHereButton: "button.action-select-billing-item",
                newShippingAddressForm: ".billing-address-form",

                validateAddressTimeout: 0,
                address: {},

                addressMap: {
                    street: "street[0]",
                    street1: "street[1]",
                    street2: "street[2]",
                    street3: "street[3]",
                    city: "city",
                    country_id: "country_id",
                    postcode: "postcode",
                    region_id: "region_id",
                    region: "region",
                },
            },
            request: null,
            currentModal: null,
            isExistingAddress: true,
            validation: false,

            init: function (options) {
                this._initOptions(options);

                this.checkCandidateAddress();

                this.onClickNextButton();
                this.onClickCancelButton();

                this.onAddressForm();
                this.selectExistingAddress();
            },

            onClickNextButton: function () {
                var self = this;
                $(document).on(
                    "click",
                    this.options.nextStepButtonId,
                    function (e) {
                        $(".checkout-index-index").removeClass(
                            "selected_address"
                        );
                        /*if(self.validation == true){
                        $(self.options.nextStepButtonId).attr('disabled', null);
                        return;
                    }*/
                        self.validation = false;

                        if (self.validation == false) {
                            e.preventDefault();
                            $(self.options.nextStepButtonId).attr(
                                "disabled",
                                "disabled"
                            );
                            self.readAddressQuote();
                            let isBillingFormSubmit = false;
                            if (localStorage.getItem("update_address_id")) {
                                isBillingFormSubmit = true;
                            }
                            self.validateAddress(false, isBillingFormSubmit);
                        } else {
                            $(self.options.nextStepButtonId).attr(
                                "disabled",
                                null
                            );
                        }
                    }
                );

                $(document).on(
                    "click",
                    this.options.placeOrderButtonId,
                    function (e) {
                        $(".checkout-index-index").removeClass(
                            "selected_address"
                        );

                        self.validation = false;
                        e.preventDefault();

                        if (addressOptions.length == 0) {
                            $(
                                ".checkout-billing-address .action.action-update"
                            ).click();
                        }
                        $(self.options.placeOrderButtonId).attr(
                            "disabled",
                            "disabled"
                        );
                        self.readAddressQuote();
                        self.validateAddress(true);
                    }
                );
            },

            onClickCancelButton: function () {
                const self = this;
                $(document).on("click", this.options.closePopup, function (e) {
                    self.validation = false;
                    //self.disableNextButton('Please, recheck and update address before continue.');
                });
            },

            onAddressForm: function () {
                const self = this;
                const form_inputs =
                    this.options.formId +
                    " input, " +
                    this.options.formId +
                    " select";
                const map = self.toArray(self.options.addressMap);

                $(document).on("change", form_inputs, function () {
                    window.isBillingAddressValid = false;
                    self.checkIsExistingAddress();

                    if (
                        !self.isExistingAddress &&
                        map.indexOf($(this).attr("name")) !== -1
                    ) {
                        self.validation = "changed";
                        clearTimeout(self.validateAddressTimeout);
                        self.validateAddressTimeout = setTimeout(function () {
                            self.isExistingAddress = false;
                            self.readAddressForm();
                            self.validateAddress();
                        }, 500);
                    }
                });
            },

            selectExistingAddress: function () {
                const self = this;
                $(document).on(
                    "click",
                    this.options.shipHereButton,
                    function () {
                        window.isBillingAddressValid = false;
                        $(".checkout-index-index").addClass("selected_address");
                        clearTimeout(self.validateAddressTimeout);
                        self.validateAddressTimeout = setTimeout(function () {
                            self.isExistingAddress = true;
                            self.validation = "changed";
                            self.readAddressQuote();
                            self.validateAddress();
                        }, 500);
                    }
                );
            },

            readAddressQuote: function () {
                if (localStorage.getItem("update_address_id")) {
                    const address = {};
                    const formId = this.options.formId;

                    address.street = "";
                    $.each(this.options.addressMap, function (i, e) {
                        const elem = $(formId + ' [name="' + e + '"]');
                        if (elem && elem.length > 0) {
                            if (i.indexOf("street") !== -1) {
                                address.street += " " + elem.val();
                            } else {
                                address[i] = elem.val();
                            }
                        }
                    });
                } else if (addressOptions.length > 0) {
                    const addressQuote = quote.billingAddress();
                    const address = {};

                    address.postcode = addressQuote.postcode;
                    address.city = addressQuote.city;
                    address.country_id = addressQuote.countryId;
                    address.region = addressQuote.region;
                    address.region_id = addressQuote.regionId;

                    let street = "";
                    $.each(addressQuote.street, function (i, e) {
                        street += " " + e;
                    });
                    address.street = street.trim();
                } else {
                    const address = {};
                    const formId = this.options.formId;

                    address.street = "";
                    $.each(this.options.addressMap, function (i, e) {
                        const elem = $(formId + ' [name="' + e + '"]');
                        if (elem && elem.length > 0) {
                            if (i.indexOf("street") !== -1) {
                                address.street += " " + elem.val();
                            } else {
                                address[i] = elem.val();
                            }
                        }
                    });
                }

                return (this.options.address = address);
            },

            readAddressForm: function () {
                const address = {};
                const formId = this.options.formId;

                address.street = "";
                $.each(this.options.addressMap, function (i, e) {
                    const elem = $(formId + ' [name="' + e + '"]');
                    if (elem && elem.length > 0) {
                        if (i.indexOf("street") !== -1) {
                            address.street += " " + elem.val();
                        } else {
                            address[i] = elem.val();
                        }
                    }
                });

                return (this.options.address = address);
            },

            checkIsExistingAddress: function () {
                this.isExistingAddress =
                    $(".billing-address-items").length == 1 &&
                    $(".modal-popup._show #co-billing-form").length == 0;

                return this.isExistingAddress;
            },

            updateExistingAddress: function (address) {
                const self = this;
                $(".checkout-billing-address button.action-show-popup").trigger(
                    "click"
                );
                setTimeout(function () {
                    self.validation = "existing";
                    self.updateFormAddress(address);
                }, 50);
            },

            updateAddress: function (response) {
                this.checkIsExistingAddress();
                const self = this;
                if ($("input[name='candidate']").length == 0) {
                    if (this.isExistingAddress) {
                        this.updateExistingAddress(response.original_address);
                    }
                    self.hideOverlay();
                    return true;
                }

                const checkedAddress = $("input[name='candidate']:checked");
                if (checkedAddress.length == 0) {
                    self.hideOverlay();
                    return false;
                }

                if (checkedAddress.val() == "origin") {
                    this.whenAddressValid();
                    self.hideOverlay();
                    return true;
                }

                const address =
                    response.suggested_addresses[checkedAddress.val()];

                if (this.isExistingAddress) {
                    this.updateExistingAddress(address);
                } else {
                    this.updateFormAddress(address);
                }
                self.hideOverlay();
                return true;
            },

            hideOverlay: function () {
                const overlay = $(".modals-overlay");
                if (
                    overlay.length != 0 &&
                    $(overlay[0]).attr("style") == "z-index: 900;"
                ) {
                    overlay.attr("style", "z-index: 899;");
                }
            },
        }
    );

    return $.mage.iwdBillingAddressValidationCheckout;
});
