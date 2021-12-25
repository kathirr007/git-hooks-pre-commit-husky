define(['jquery', 'jquery/ui'], function ($) {
  'use strict'

  $('.level0').on('mouseover', function (event) {
    event.stopImmediatePropagation()
    // alert('I called');
  })

  $('.level0').on('mouseout', function (event) {
    event.stopImmediatePropagation()
  })

  $('.navigation >ul > .show-sub > a').on('mouseout', function (e) {
    e.stopPropagation()
  })

  // $('.navigation >ul > .show-sub > a').removeAttr('href');
  $('.navigation >ul > .show-sub').click(function (e) {
    $('.navigation >ul > .show-sub').removeClass('active')
    if (!$(this).hasClass('active')) {
      $(this).addClass('active')
    }

    if (!$(this).children('ul').hasClass('show')) {
      $('.navigation >ul > .show-sub').children('ul').removeClass('show')
    }

    $(this).children('ul').toggleClass('show')
    $(this).siblings('li').find('ul').hide()

    e.stopPropagation()
  })

  $('.navigation ul .show-sub ul li').each(function () {
    if ($(this).hasClass('active')) {
      $(this).parents('.show-sub').addClass('active')
    }
  })
})
