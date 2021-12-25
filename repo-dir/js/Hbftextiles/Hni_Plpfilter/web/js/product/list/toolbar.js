define([
  'jquery',
  'jquery/ui',
  'Magento_Theme/js/view/messages',
  'ko',
  'priceUtils',
  'Magento_Catalog/js/product/list/toolbar',
  'Hni_Plpfilter/js/product/list/rangeSlider.min'
], function ($, ui, messageComponent, ko, utils) {
  if (
    $('#plp_filter_ajax_enable').length &&
        $('#plp_filter_ajax_enable').val() == 1
  ) {
    $.widget('mage.productListToolbarForm', $.mage.productListToolbarForm, {
      options: {
        modeControl: '[data-role="mode-switcher"]',
        directionControl: '[data-role="direction-switcher"]',
        orderControl: '[data-role="sorter"]',
        limitControl: '[data-role="limiter"]',
        pageControl: '[data-role="pager"], .pages-items a',
        mode: 'product_list_mode',
        direction: 'product_list_dir',
        order: 'product_list_order',
        limit: 'product_list_limit',
        pageNo: 'p',
        modeDefault: 'grid',
        directionDefault: 'asc',
        orderDefault: 'position',
        limitDefault: '9',
        pageNoDefault: '1',
        productsToolbar: '.toolbar.toolbar-products',
        productsList: '.products.wrapper',
        layeredNavigationFilter: '.block.filter',
        filterItem:
                    '.block.filter .item a, .block.filter .filter-clear,.block.filter .swatch-option-link-layered, .pages-items a, .block.filter .item .plpfilter_checkbox_box .plp_checkbox',
        url: '',
        mobileFilterParam: ''
      },
      _create: function () {
        const count = $('#toolbar-amount .toolbar-number:last').html()
        if (typeof count === 'undefined') {
          $('#total_number_of_products').text('Showing 0 results')
        } else {
          $('#total_number_of_products').text(
                        `Showing ${count} results`
          )
        }
        window.filterPrice = ''
        this.filterOptionShowMore()
        this.PriceSlider()
        this._super()
        this.initWindowScrollContent()
        this.PriceSliderajax()
        this.closeMobilePopup()
        this.ApplysortingFilter()
        this._bind(
          $(this.options.pageControl),
          this.options.pageNo,
          this.options.pageNoDefault
        )
        $(this.options.filterItem)
          .off(`click.${this.namespace}productListToolbarForm`)
          .on(
                        `click.${this.namespace}productListToolbarForm`,
                        {},
                        $.proxy(this.applyFilterToProductsListBlock, this)
          )
        this.applyMobileFilter()
      },
      applyMobileFilter: function () {
        const self = this
        $('#mobile_filter_apply').click(function () {
          self.setMobileFilterData()
          const url = self.options.url.split('?')[0]
          self.callAjax(url, self.options.mobileFilterParam)
        })
      },
      setMobileFilterData: function () {
        let paramData = ''
        $(
          '.filter-options-item div.filter-options-content .items li.item input[type="radio"][name="cus_sort_by"]:checked'
        ).each(function () {
          const param = `product_list_order=${$(this).attr(
                        'data-type'
                    )}&product_list_dir=${$(this).attr('data-sort')}`
          paramData =
                        paramData && paramData.length > 0
                          ? `${paramData}&${param}`
                          : param
        })
        $(
          '.filter-options-item div.filter-options-content .items li.item input[type="checkbox"]:checked'
        ).each(function () {
          const param = `${$(this).attr('name')}=${$(this).val()}`
          paramData =
                        paramData && paramData.length > 0
                          ? `${paramData}&${param}`
                          : param
        })
        if (window.filterPrice != '') {
          paramData =
                        paramData && paramData.length > 0
                          ? `${paramData}&${window.filterPrice}`
                          : window.filterPrice
        }
        this.options.mobileFilterParam = paramData
      },
      PriceSlider: function () {
        const self = this
        const slider = $('#price-range-slider')
        const pricePrefix = '$'
        const pricePostfix = ''
        const skin = 'round'
        const isPriceInputs = 'false'
        let minPrice = slider.data('min')
        let maxPrice = slider.data('max')
        let fromPrice = slider.data('from')
        let toPrice = slider.data('to')
        const priceActive = window.location.search.split('price=')[1]
        if (priceActive) {
          slider.data('from', fromPrice)
          slider.data('to', toPrice)
        }
        const onFinish = function (obj) {
          fromPrice = obj.from
          if (obj.to == 0) {
            toPrice = '0.5'
          } else {
            toPrice = obj.to
          }
          let url = slider.data('href')
          const limit = 'price=' + obj.from + '-' + toPrice
          url = url.replace('price=', limit)
          const urlList = url.split('?')
          if ($(window).width() <= 767) {
            window.filterPrice = limit
            self.setMobileFilterData()
          } else {
            self.callAjax(urlList[0], urlList[1])
          }
          minPrice = obj.min
          maxPrice = obj.max
        }
        const $inputFrom = $(
          '.filter_price_slider_range .range-input-from'
        )
        const $inputTo = $(
          '.filter_price_slider_range .range-input-to'
        )
        if (!isPriceInputs) {
          $inputFrom.parent().hide()
        }
        const updateInputs = function (data) {
          $inputFrom.prop('value', data.from)
          $inputTo.prop('value', data.to)
        }
        slider.RangeSlider({
          skin: skin,
          type: 'double',
          min: minPrice,
          max: maxPrice,
          from: fromPrice,
          to: toPrice,
          force_edges: true,
          prettify_enabled: true,
          prefix: pricePrefix,
          postfix: pricePostfix,
          grid: true,
          onFinish: onFinish,
          onStart: updateInputs,
          onChange: updateInputs
        })
        const instance = slider.data('RangeSlider')
        $inputFrom.on('input', function () {
          let val
          val = $(this).prop('value')
          if (val < minPrice) {
            val = minPrice
          } else if (val > toPrice) {
            val = toPrice
          }
          instance.update({
            from: val
          })
        })
        $inputTo.on('input', function () {
          let val
          val = $(this).prop('value')
          if (val < fromPrice) {
            val = fromPrice
          } else if (val > maxPrice) {
            val = maxPrice
          }
          instance.update({
            to: val
          })
        })
      },
      PriceSliderajax: function () {
        const price_url = $('#price_range_url').val()
        if (price_url) {
          $('div#price-slider').slider({
            change: (event, ui) => {
              const url = price_url.replace(
                'price=',
                                `price=${ui.values[0]}-${ui.values[1]}`
              )
              const urlList = url.split('?')
              if ($(window).width() <= 767) {
                const limit = `price=${ui.values[0]}-${ui.values[1]}`
                window.filterPrice = limit
                this.setMobileFilterData()
              } else {
                this.callAjax(urlList[0], urlList[1])
                event.preventDefault()
              }
            }
          })
        }
        // this.PriceOnChangeajax(minimum,maximum,PriceUrl);
      },
      closeMobilePopup: function () {
        $('.close_filter_popup').click(function () {
          $('.desktop_title').attr('aria-selected', 'false')
          $('.desktop_title').attr('aria-expanded', 'false')
          $('.block.filter').removeClass('active')
          $('body.catalog-category-view').removeClass(
            'filter_active'
          )
          $('body.catalogsearch-result-index').removeClass(
            'filter_active'
          )
          $('body.catalog-category-view').removeClass(
            'filter-active'
          )
          $('body.catalogsearch-result-index').removeClass(
            'filter-active'
          )
        })
      },
      initWindowScrollContent: function () {
        let startLoading = false
        // $(window).on('scroll', $.proxy(function (evt) {
        console.log('test---')
        let elementNextTop, url
        const elementNext = $(
          '.main .toolbar-products .pages-items .next, .main .toolbar-products .pagination .next'
        ).last()
        const CustelementNext = $('.page-footer')
        console.log('element length toolbar', elementNext.length)
        if (elementNext.length === 0) {
          $('#load-more-product').hide()
          $('#load-more-loader').hide()
          startLoading = true
          // return;
        }
      },
      ApplysortingFilter: function () {
        const self = this
        $('.custom_sort_by_input').click(function () {
          const sortby = $(this).attr('data-type')
          const sorttype = $(this).attr('data-sort')
          const newurl = self.applyToolbarElement(sortby, sorttype)
          const urlList = newurl.split('?')
          if ($(window).width() <= 767) {
            self.setMobileFilterData()
          } else {
            self.callAjax(urlList[0], urlList[1])
          }
        })
      },
      applyToolbarElement: function (sortby, sorttype) {
        const self = this
        const urlParams = self.urlParams(self.options.url)
        const newurl = self.options.url.split('?')[0]
        urlParams.product_list_order = sortby
        urlParams.product_list_dir = sorttype
        const finalUrl = `${newurl}?${window.decodeURIComponent(
                    $.param(urlParams).replace(/\+/g, '%20')
                )}`
        return finalUrl
      },
      urlParams: function (url) {
        const result = {}
        const searchIndex = url.indexOf('?')
        if (searchIndex == -1) return result
        const sPageURL = url.substring(searchIndex + 1)
        const sURLVariables = sPageURL.split('&')
        for (let i = 0; i < sURLVariables.length; i++) {
          const sParameterName = sURLVariables[i].split('=')
          result[sParameterName[0]] = sParameterName[1]
        }
        return result
      },
      _bind: function (element, paramName, defaultValue) {
        if (element.is('select')) {
          element
            .off(`change.${this.namespace}productListToolbarForm`)
            .on(
                            `change.${this.namespace}productListToolbarForm`,
                            {
                              paramName: paramName,
                              default: defaultValue
                            },
                            $.proxy(this._processSelect, this)
            )
        } else {
          element
            .off(`click.${this.namespace}productListToolbarForm`)
            .on(
                            `click.${this.namespace}productListToolbarForm`,
                            {
                              paramName: paramName,
                              default: defaultValue
                            },
                            $.proxy(this._processLink, this)
            )
        }
      },
      applyFilterToProductsListBlock: function (evt) {
        const link = $(evt.currentTarget)
        const urlList = link.attr('href').split('?')
        if ($(window).width() <= 767) {
          this.setMobileFilterData()
        } else {
          this.callAjax(urlList[0], urlList[1])
          evt.preventDefault()
        }
      },
      updateUrl: function (url, paramData) {
        if (!url) {
          return
        }
        if (paramData && paramData.length > 0) {
          url += '?' + paramData
        }
        const key = 'ajax'
        url = url
          .replace(new RegExp(key + '=\\w+'), '')
          .replace('?&', '?')
          .replace('&&', '&')
        console.log('Update URL', url)

        if (typeof history.replaceState === 'function') {
          history.replaceState(null, null, url)
        }
      },
      getParams: function (
        urlParams,
        paramName,
        paramValue,
        defaultValue
      ) {
        const paramData = {}
        let parameters
        for (let i = 0; i < urlParams.length; i++) {
          parameters = urlParams[i].split('=')
          if (parameters[1] !== undefined) {
            paramData[parameters[0]] = parameters[1]
          } else {
            paramData[parameters[0]] = ''
          }
        }
        paramData[paramName] = paramValue
        if (paramValue == defaultValue) {
          delete paramData[paramName]
        }
        return window.decodeURIComponent(
          $.param(paramData).replace(/\+/g, '%20')
        )
      },
      _updateContent: function (content) {
        $(this.options.productsToolbar).remove()
        if (content.products_list) {
          $(this.options.productsList).replaceWith(
            content.products_list
          )
          const count = $(
            '#toolbar-amount .toolbar-number:last'
          ).html()
          if (typeof count === 'undefined') {
            $('#total_number_of_products').text(
              'Showing 0 results'
            )
          } else {
            $('#total_number_of_products').text(
                            `Showing ${count} results`
            )
          }
          if (typeof count === 'undefined' || count == '0') {
            const currentPageUrl = $(
              '#current_active_page_url'
            ).val()
            const htmlStr = `<a href='${currentPageUrl}' id='reset_current_filter_url'>Reset applied filter(s)</a>`
            const stringVal = `We can't find products matching the selection. ${htmlStr}`
            $('#reset_current_filter_url').remove()
            $('.sidebar.sidebar-main').addClass('no-display')
            $('.column .message.info.empty div').after(htmlStr)
            $('.search.results .message.notice div').html(
              stringVal
            )
          } else {
            $('#reset_current_filter_url').remove()
            $('.sidebar.sidebar-main').removeClass('no-display')
          }
          if (parseInt(count) < 2) {
            $('.filter-options-item.Price').hide()
          } else {
            $('.filter-options-item.Price').show()
          }
        }
        if (content.filters) {
          $(this.options.layeredNavigationFilter).replaceWith(
            content.filters
          )
          $(this.options.layeredNavigationFilter).addClass('active')
          $('body.catalog-category-view').addClass('filter_active')
          $('body.catalogsearch-result-index').addClass(
            'filter_active'
          )
        }
        $('body').trigger('contentUpdated')
      },
      updateContent: function (content) {
        $('html, body').animate(
          {
            scrollTop: $(
              this.options.productsToolbar + ':first'
            ).offset().top
          },
          100,
          'swing',
          this._updateContent(content)
        )
      },
      checkSortinType: function (paramData) {
        const urlParams = new URLSearchParams(paramData)
        const OrderType = urlParams.get('product_list_order')
        const OrderDir = urlParams.get('product_list_dir')
        if (OrderType == 'featured') {
          $('.custom_sort_by_input').prop('checked', false)
          $('.custom_sort_by_input.featured').prop('checked', true)
        }
        if (OrderType == 'newest') {
          $('.custom_sort_by_input').prop('checked', false)
          $('.custom_sort_by_input.newest').prop('checked', true)
        }
        if (OrderType == 'price_low_to_high' && OrderDir == 'asc') {
          $('.custom_sort_by_input').prop('checked', false)
          $('.custom_sort_by_input.price_asc').prop('checked', true)
        }
        if (OrderType == 'price_high_to_low' && OrderDir == 'desc') {
          $('.custom_sort_by_input').prop('checked', false)
          $('.custom_sort_by_input.price_desc').prop('checked', true)
        }
        if (OrderType == 'onsale') {
          $('.custom_sort_by_input').prop('checked', false)
          $('.custom_sort_by_input.onsale').prop('checked', true)
        }
      },
      changeUrl: function (paramName, paramValue, defaultValue) {
        const urlPaths = this.options.url.split('?')
        const baseUrl = urlPaths[0]
        const urlParams = urlPaths[1] ? urlPaths[1].split('&') : []
        const paramData = this.getParams(
          urlParams,
          paramName,
          paramValue,
          defaultValue
        )
        this.callAjax(baseUrl, paramData)
      },
      filterOptionShowMore: function () {
        $('.filter-options-item .filter-options-content .items').each(
          function () {
            if (
              $(this).find('li.item').length > 10 &&
                            $(this).find('li.item.custom_sort_by').length == 0
            ) {
              if ($(this).find('li.show_more').length == 0) {
                $(this)
                  .find('li.item:last')
                  .after(
                    '<li class="show_more"><a href="javascript:void(0);" data-option="more">Show more</a></li>'
                  )
              }
              let itemNo = 1
              $(this)
                .find('li.item')
                .each(function () {
                  if (itemNo > 10) {
                    $(this).addClass('hide_item')
                  }
                  itemNo++
                })
            }
          }
        )
        $(
          '.filter-options-item .filter-options-content .items li.show_more'
        ).on('click', function () {
          $(this)
            .closest('.items')
            .find('li.item')
            .removeClass('hide_item')
          $(this).remove()
        })
      },
      callAjax: function (baseUrl, paramData) {
        const self = this
        $.ajax({
          url: baseUrl,
          data:
                        paramData && paramData.length > 0
                          ? `${paramData}&ajax=1`
                          : 'ajax=1',
          type: 'get',
          dataType: 'json',
          cache: true,
          showLoader: true,
          timeout: 10000
        })
          .done(function (response) {
            console.log('ajax request paramdata ...', paramData)
            if (!paramData == '') {
              $('#load-more-product').hide()
            }
            if (response.success) {
              self.updateUrl(baseUrl, paramData)
              self.updateContent(response.html)
              self.checkSortinType(paramData)

              setTimeout(function () {
                // for checkbox filters
                const selectedFilter = $(
                  'body.catalog-category-view'
                ).find(
                  '.plpfilter_checkbox_box input[type="checkbox"]'
                )
                if (
                  selectedFilter.attr('checked') == 'checked'
                ) {
                  selectedFilter
                    .closest('.filter-options-item')
                    .addClass('active')
                  selectedFilter
                    .closest('.filter-options-item')
                    .find('.filter-options-title')
                    .attr('aria-selected', 'true')
                  selectedFilter
                    .closest('.filter-options-item')
                    .find('.filter-options-title')
                    .attr('aria-expanded', 'true')
                  selectedFilter
                    .closest('.filter-options-item')
                    .find('.filter-options-content')
                    .attr('aria-hidden', 'false')
                  selectedFilter
                    .closest('.filter-options-item')
                    .find('.filter-options-content')
                    .css('display', 'block')
                }

                // for price slider
                if ($('#price-range-slider').length != 0) {
                  const dataFrom = $(
                    '#price-range-slider'
                  ).attr('data-from')
                  const dataTo = $('#price-range-slider').attr(
                    'data-to'
                  )
                  const dataMin = $('#price-range-slider').attr(
                    'data-min'
                  )
                  const dataMax = $('#price-range-slider').attr(
                    'data-max'
                  )
                  if (
                    dataMin != dataFrom ||
                                        dataMax != dataTo
                  ) {
                    $('#price-range-slider')
                      .closest('.filter-options-item')
                      .addClass('active')
                    $('#price-range-slider')
                      .closest('.filter-options-item')
                      .find('.filter-options-title')
                      .attr('aria-selected', 'true')
                    $('#price-range-slider')
                      .closest('.filter-options-item')
                      .find('.filter-options-title')
                      .attr('aria-expanded', 'true')
                    $('#price-range-slider')
                      .closest('.filter-options-item')
                      .find('.filter-options-content')
                      .attr('aria-hidden', 'false')
                    $('#price-range-slider')
                      .closest('.filter-options-item')
                      .find('.filter-options-content')
                      .css('display', 'block')
                  }
                }

                // for color
                const selectedColor = $(
                  'body.catalog-category-view'
                ).find(
                  '.swatch-attribute-options .filter_opt a'
                )
                if (selectedColor.hasClass('selected')) {
                  selectedColor
                    .closest('.filter-options-item')
                    .addClass('active')
                  selectedColor
                    .closest('.filter-options-item')
                    .find('.filter-options-title')
                    .attr('aria-selected', 'true')
                  selectedColor
                    .closest('.filter-options-item')
                    .find('.filter-options-title')
                    .attr('aria-expanded', 'true')
                  selectedColor
                    .closest('.filter-options-item')
                    .find('.filter-options-content')
                    .attr('aria-hidden', 'false')
                  selectedColor
                    .closest('.filter-options-item')
                    .find('.filter-options-content')
                    .css('display', 'block')
                }
              }, 1000)
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
      },

      setMessage: function (obj) {
        const messages = ko.observableArray([obj])
        messageComponent().messages({
          messages: messages
        })
      }
    })
    $('.filter-options-title').click(function () {
      $(this)
        .parent('.filter-options-item')
        .find('.active_con')
        .removeClass('active_con')
    })
  }
  return $.mage.productListToolbarForm
})
