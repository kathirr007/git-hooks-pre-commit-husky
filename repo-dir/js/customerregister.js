define(['jquery', 'jquery/ui'], function ($) {
  'use strict'

  $('#is_residence').change(function () {
    if (this.checked) {
      $('#isresidence_checkbox').val(1)
    } else {
      $('#isresidence_checkbox').val(0)
    }
  })

  $('#is_tax_exempt_status_checkbox').change(function () {
    if (this.checked) {
      $('#is_tax_exempt_status').val(1)
    } else {
      $('#is_tax_exempt_status').val(0)
    }
  })
})
