define(['jquery', 'jquery/ui', 'slick', 'mage/translate'], function ($) {
  'use strict'

  $(document).ready(function ($) {
    $(document).on('click', '#load-more-products', function (evt) {
      evt.preventDefault()
      const elementNext = $(
        '.main .toolbar-products .pages-items .next, .main .toolbar-products .pagination .next'
      ).last()
      const url = elementNext.attr('href')
      const urlList = url.split('?')
      callScrollAjax(urlList[0], urlList[1])
    })
  })

  function callScrollAjax (baseUrl, paramData) {
    const self = this
    $.ajax({
      url: baseUrl,
      data:
                paramData && paramData.length > 0
                  ? paramData + '&ajax=1'
                  : 'ajax=1',
      type: 'get',
      dataType: 'json',
      cache: false,
      showLoader: true
    })
      .done(function (response) {
        if (response.success) {
          updateScrollContent(response.html)
        } else {
          const msg = response.error_message
          if (msg) {
            self.setMessage({
              type: 'error',
              text: msg
            })
          }
        }
      })
      .fail(function () {
        self.setMessage({
          type: 'error',
          text: 'Sorry, something went wrong. Please try again.'
        })
      })
  }

  function updateScrollContent (Scrollresponse) {
    let ScrollPages

    if (Scrollresponse.products_list) {
      ScrollPages = $(Scrollresponse.products_list).find('.pages')
      $('.main .toolbar-products .pages').each(function (i, pages) {
        if (ScrollPages[i]) {
          $(pages).replaceWith(ScrollPages[i])
        }
      })

      $(Scrollresponse.products_list)
        .find('li.item.product.product-item')
        .each(function (i, productItem) {
          $('.main .products li.item.product.product-item')
            .last()
            .after(productItem)
        })

      $('.main .products').append(
        $(Scrollresponse.products_list).filter(
          'script[type="text/x-magento-init"]'
        )
      )
      $('.main .products').trigger('contentUpdated')
    }

    /* if (Scrollresponse.filters) {
$('#layered-filter-block').replaceWith(Scrollresponse.filters);
} */

    // startLoading = false;
  }
})
