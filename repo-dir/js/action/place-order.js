define([
    'Magento_Checkout/js/model/quote',
    'Magento_Checkout/js/model/url-builder',
    'Magento_Customer/js/model/customer',
    'Magento_Checkout/js/model/place-order',
    'Magento_Checkout/js/model/step-navigator'
], function (quote, urlBuilder, customer, placeOrderService,stepNavigator) {
    'use strict';

    return function (paymentData, messageContainer) {
        var serviceUrl, payload;

        payload = {
            cartId: quote.getQuoteId(),
            billingAddress: quote.billingAddress(),
            paymentMethod: paymentData
        };

        if (customer.isLoggedIn()) {
            if(stepNavigator.getActiveItemIndex() == 1) {
                /* from payment step only save payment */
                serviceUrl = urlBuilder.createUrl('/carts/mine/payment-information-custom', {});
            } else{
                /* from review step only place order of save payment */
                serviceUrl = urlBuilder.createUrl('/carts/mine/payment-information', {});
            }
        } else {
            if(stepNavigator.getActiveItemIndex() == 1) {
                serviceUrl = urlBuilder.createUrl('/guest-carts/:quoteId/payment-information-custom', {
                    quoteId: quote.getQuoteId()
                });
            } else{
                serviceUrl = urlBuilder.createUrl('/guest-carts/:quoteId/payment-information', {
                    quoteId: quote.getQuoteId()
                });
            }
            payload.email = quote.guestEmail;
        }

        return placeOrderService(serviceUrl, payload, messageContainer);
    };
});