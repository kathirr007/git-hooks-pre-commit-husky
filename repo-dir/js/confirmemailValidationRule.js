define(['jquery', 'jquery/ui', 'jquery/validate', 'mage/translate'], function (
  $
) {
  'use strict'
  return function () {
    $.validator.addMethod(
      'confirmemailvalidationrule',
      function (value, element) {
        const email1 = $('#email_address').val().toLowerCase()
        const email2 = value.toLowerCase()
        if (email1 != email2) {
          return false
        }
        return true
      },
      $.mage.__('Emails are not matches')
    )
  }
})
