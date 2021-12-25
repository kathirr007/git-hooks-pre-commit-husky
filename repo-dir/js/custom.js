define(['jquery', 'jquery/ui', 'slick', 'mage/translate'], function ($) {
  'use strict'
  $(document).ready(function () {
    cookieIntegration()
    RedirectUrl()
    $('.liked-product-slider').slick({
      arrows: true,
      infinite: false,
      slidesToShow: 4,
      slidesToScroll: 1,
      autoplay: false,
      autoplaySpeed: 5000,
      responsive: [
        {
          breakpoint: 1200,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 1
          }
        },
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 1
          }
        },
        {
          breakpoint: 767,
          settings: {
            slidesToShow: 1.3,
            slidesToScroll: 1
          }
        }
      ]
    })
    $('body').click(function () {
      $('.submenu').removeClass('show')
      $('.category-item').removeClass('active')
    })

    $(window).load(function () {
      serchBox()
    })
    $(window).resize(function () {
      serchBox()
    })
  })
  function serchBox () {
    if ($(window).width() <= 767) {
      if ($('.page-header .center-search').length > 0) {
        $('.page-header .center-search').insertBefore(
          $('[id="store.menu"] .navigation')
        )
      }
      if ($('.page-header .block.block-search').length > 0) {
        $('.page-header .block.block-search').insertBefore(
          $('[id="store.menu"] .navigation')
        )
      }
    } else {
      if ($('[id="store.menu"] .block.block-search').length > 0) {
        $('[id="store.menu"] .block.block-search').insertAfter(
          $('.page-header .panel.header > .quote-link')
        )
      }
      if ($('[id="store.menu"] .center-search').length > 0) {
        $('[id="store.menu"] .center-search').insertAfter(
          $('.page-header .panel.header > .quote-link')
        )
      }
    }
  }
  function cookieIntegration () {
    if (document.cookie.indexOf('banner_removed=1') !== -1) {
      $('#closeCookieBtn').parent().hide()
    }
    $('#closeCookieBtn').click(function () {
      $(this).parent().hide()
      document.cookie = 'banner_removed=1'
    })
  }

  function RedirectUrl () {
    const expression =
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
    const regex = new RegExp(expression)
    const current_url = window.location.href
    const redirect_url = '/newsinspiration'
    if (current_url.indexOf('/news-inspiration') > -1) {
      if (!current_url.match(redirect_url) && current_url.match(regex)) {
        window.location.replace(redirect_url)
      }
    }
  }
})
