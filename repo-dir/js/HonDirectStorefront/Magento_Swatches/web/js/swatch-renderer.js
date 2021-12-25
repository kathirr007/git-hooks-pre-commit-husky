/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
  'jquery',
  'underscore',
  'mage/template',
  'mage/smart-keyboard-handler',
  'mage/translate',
  'priceUtils',
  'jquery-ui-modules/widget',
  'jquery/jquery.parsequery',
  'mage/validation/validation'
], function ($, _, mageTemplate, keyboardHandler, $t, priceUtils) {
  'use strict'

  /**
     * Extend form validation to support swatch accessibility
     */
  $.widget('mage.validation', $.mage.validation, {
    /**
         * Handle form with swatches validation. Focus on first invalid swatch block.
         *
         * @param {jQuery.Event} event
         * @param {Object} validation
         */
    listenFormValidateHandler: function (event, validation) {
      // let swatchWrapper, firstActive, swatches, swatch, successList, errorList, firstSwatch;

      this._superApply(arguments)

      const swatchWrapper = '.swatch-attribute-options'
      const swatches = $(event.target).find(swatchWrapper)

      if (!swatches.length) {
        return
      }

      const swatch = '.swatch-attribute'
      const firstActive = $(validation.errorList[0].element || [])
      const successList = validation.successList
      const errorList = validation.errorList
      const firstSwatch = $(firstActive)
        .parent(swatch)
        .find(swatchWrapper)

      keyboardHandler.focus(swatches)

      $.each(successList, function (index, item) {
        $(item)
          .parent(swatch)
          .find(swatchWrapper)
          .attr('aria-invalid', false)
      })

      $.each(errorList, function (index, item) {
        $(item.element)
          .parent(swatch)
          .find(swatchWrapper)
          .attr('aria-invalid', true)
      })

      if (firstSwatch.length) {
        $(firstSwatch).focus()
      }
    }
  })

  /**
     * Render tooltips by attributes (only to up).
     * Required element attributes:
     *  - option-type (integer, 0-3)
     *  - option-label (string)
     *  - option-tooltip-thumb
     *  - option-tooltip-value
     *  - thumb-width
     *  - thumb-height
     */
  $.widget('mage.SwatchRendererTooltip', {
    options: {
      delay: 200, // how much ms before tooltip to show
      tooltipClass: 'swatch-option-tooltip' // configurable, but remember about css
    },

    /**
         * @private
         */
    _init: function () {
      const $widget = this
      const $this = this.element
      let $element = $(`.${$widget.options.tooltipClass}`)
      let timer
      const type = parseInt($this.attr('option-type'), 10)
      const label = $this.attr('option-label')
      const thumb = $this.attr('option-tooltip-thumb')
      const value = $this.attr('option-tooltip-value')
      const width = $this.attr('thumb-width')
      const height = $this.attr('thumb-height')
      // let $image;
      // let $title;
      // let $corner;

      if (!$element.length) {
        $element = $(
                    `<div class="${$widget.options.tooltipClass}"><div class="image"></div><div class="title"></div><div class="corner"></div></div>`
        )
        $('body').append($element)
      }

      const $image = $element.find('.image')
      const $title = $element.find('.title')
      const $corner = $element.find('.corner')

      $this.hover(
        function () {
          if (!$this.hasClass('disabled')) {
            timer = setTimeout(function () {
              let leftOpt = null
              let leftCorner = 0
              let left
              // let $window;

              if (type === 2) {
                // Image
                $image.css({
                  background: `url("${thumb}") no-repeat center`, // Background case
                  'background-size': 'initial',
                  width: `${width}px`,
                  height: `${height}px`
                })
                $image.show()
              } else if (type === 1) {
                // Color
                $image.css({
                  background: value
                })
                $image.show()
              } else if (type === 0 || type === 3) {
                // Default
                $image.hide()
              }

              $title.text(label)

              leftOpt = $this.offset().left
              left =
                                leftOpt +
                                $this.width() / 2 -
                                $element.width() / 2
              const $window = $(window)

              // the numbers (5 and 5) is magick constants for offset from left or right page
              if (left < 0) {
                left = 5
              } else if (
                left + $element.width() >
                                $window.width()
              ) {
                left = $window.width() - $element.width() - 5
              }

              // the numbers (6,  3 and 18) is magick constants for offset tooltip
              leftCorner = 0

              if ($element.width() < $this.width()) {
                leftCorner = $element.width() / 2 - 3
              } else {
                leftCorner =
                                    (leftOpt > left
                                      ? leftOpt - left
                                      : left - leftOpt) +
                                    $this.width() / 2 -
                                    6
              }

              $corner.css({
                left: leftCorner
              })
              $element
                .css({
                  left: left,
                  top:
                                        $this.offset().top -
                                        $element.height() -
                                        $corner.height() -
                                        18
                })
                .show()
            }, $widget.options.delay)
          }
        },
        function () {
          $element.hide()
          clearTimeout(timer)
        }
      )

      $(document).on('tap', function () {
        $element.hide()
        clearTimeout(timer)
      })

      $this.on('tap', function (event) {
        event.stopPropagation()
      })
    }
  })

  /**
     * Render swatch controls with options and use tooltips.
     * Required two json:
     *  - jsonConfig (magento's option config)
     *  - jsonSwatchConfig (swatch's option config)
     *
     *  Tuning:
     *  - numberToShow (show "more" button if options are more)
     *  - onlySwatches (hide selectboxes)
     *  - moreButtonText (text for "more" button)
     *  - selectorProduct (selector for product container)
     *  - selectorProductPrice (selector for change price)
     */
  $.widget('mage.SwatchRenderer', {
    options: {
      classes: {
        attributeClass: 'swatch-attribute',
        attributeLabelClass: 'swatch-attribute-label',
        attributeSelectedOptionLabelClass:
                    'swatch-attribute-selected-option',
        attributeOptionsWrapper: 'swatch-attribute-options',
        attributeInput: 'swatch-input',
        optionClass: 'swatch-option',
        selectClass: 'swatch-select',
        moreButton: 'swatch-more',
        loader: 'swatch-option-loading',
        outOfStock: 'out-of-stock-msg'
      },
      // option's json config
      jsonConfig: {},

      // swatch's json config
      jsonSwatchConfig: {},

      // selector of parental block of prices and swatches (need to know where to seek for price block)
      selectorProduct: '.product-info-main',

      // selector of price wrapper (need to know where set price)
      selectorProductPrice: '[data-role=priceBox]',

      // selector of product images gallery wrapper
      mediaGallerySelector: '[data-gallery-role=gallery-placeholder]',

      // selector of category product tile wrapper
      selectorProductTile: '.product-item',

      // number of controls to show (false or zero = show all)
      numberToShow: false,

      // show only swatch controls
      onlySwatches: false,

      // enable label for control
      enableControlLabel: true,

      // control label id
      controlLabelId: '',

      // text for more button
      moreButtonText: $t('More'),

      // Callback url for media
      mediaCallback: '',

      // Local media cache
      mediaCache: {},

      // Cache for BaseProduct images. Needed when option unset
      mediaGalleryInitial: [{}],

      // Use ajax to get image data
      useAjax: false,

      /**
             * Defines the mechanism of how images of a gallery should be
             * updated when user switches between configurations of a product.
             *
             * As for now value of this option can be either 'replace' or 'prepend'.
             *
             * @type {String}
             */
      gallerySwitchStrategy: 'replace',

      // whether swatches are rendered in product list or on product page
      inProductList: false,

      // sly-old-price block selector
      slyOldPriceSelector: '.sly-old-price',

      // tier prise selectors start
      tierPriceTemplateSelector: '#tier-prices-template',
      tierPriceBlockSelector: '[data-role="tier-price-block"]',
      tierPriceTemplate: '',
      // tier prise selectors end
      searchList: false,
      // A price label selector
      normalPriceLabelSelector: '.normal-price .price-label'
    },

    /**
         * Get chosen product
         *
         * @returns int|null
         */
    getProduct: function () {
      const products = this._CalcProducts()

      return _.isArray(products) ? products[0] : null
    },

    /**
         * @private
         */
    _init: function () {
      // Don't render the same set of swatches twice
      if ($(this.element).attr('data-rendered')) {
        return
      }
      $(this.element).attr('data-rendered', true)

      if (_.isEmpty(this.options.jsonConfig.images)) {
        this.options.useAjax = true
        // creates debounced variant of _LoadProductMedia()
        // to use it in events handlers instead of _LoadProductMedia()
        this._debouncedLoadProductMedia = _.debounce(
          this._LoadProductMedia.bind(this),
          500
        )
      }

      if (
        this.options.jsonConfig !== '' &&
                this.options.jsonSwatchConfig !== ''
      ) {
        // store unsorted attributes
        this.options.jsonConfig.mappedAttributes = _.clone(
          this.options.jsonConfig.attributes
        )
        this._sortAttributes()
        this._RenderControls()

        // this is additional code for select first attribute value
        if (this.options.jsonConfig.attributes.length > 0) {
          const selectswatch = this.element.find(
            `.${
                            this.options.classes.attributeClass
                            } .${
                            this.options.classes.attributeOptionsWrapper}`
          )
          $.each(selectswatch, function (index, item) {
            const swatchOption = $(item)
              .find('div.swatch-option')
              .first()
            if (
              swatchOption.length &&
                            !$(item)
                              .find('div.swatch-option')
                              .hasClass('selected')
            ) {
              if (!$('.wishlist-index-index').length) {
                swatchOption.trigger('click')
              }
            }
          })
        }

        this._setPreSelectedGallery()
        $(this.element).trigger('swatch.initialized')
      } else {
        console.log('SwatchRenderer: No input data received')
      }
      this.options.tierPriceTemplate = $(
        this.options.tierPriceTemplateSelector
      ).html()
    },

    /**
         * @private
         */
    _sortAttributes: function () {
      this.options.jsonConfig.attributes = _.sortBy(
        this.options.jsonConfig.attributes,
        function (attribute) {
          return parseInt(attribute.position, 10)
        }
      )
    },

    /**
         * @private
         */
    _create: function () {
      const options = this.options
      const gallery = $(
        '[data-gallery-role=gallery-placeholder]',
        '.column.main'
      )
      const productData = this._determineProductData()
      const $main = productData.isInProductView
        ? this.element.parents('.column.main')
        : this.element.parents('.product-item-info')

      if (productData.isInProductView) {
        gallery.data('gallery')
          ? this._onGalleryLoaded(gallery)
          : gallery.on(
            'gallery:loaded',
            this._onGalleryLoaded.bind(this, gallery)
          )
      } else {
        options.mediaGalleryInitial = [
          { img: $main.find('.product-image-photo').attr('src') }
        ]
      }

      this.productForm = this.element
        .parents(this.options.selectorProductTile)
        .find('form:first')
      if (this.options.searchList == true) {
        this.inProductList = true
      } else {
        this.inProductList = this.productForm.length > 0
      }
    },

    /**
         * Determine product id and related data
         *
         * @returns {{productId: *, isInProductView: bool}}
         * @private
         */
    _determineProductData: function () {
      // Check if product is in a list of products.
      let productId
      let isInProductView = false

      productId = this.element
        .parents('.product-item-details')
        .find('.price-box.price-final_price')
        .attr('data-product-id')

      if (!productId) {
        // Check individual product.
        productId = $('[name=product]').val()
        isInProductView = productId > 0
      }
      if (this.options.searchList == true) {
        isInProductView = false
      }
      return {
        productId: productId,
        isInProductView: isInProductView
      }
    },

    /**
         * Render controls
         *
         * @private
         */
    _RenderControls: function () {
      const $widget = this
      const container = this.element
      const classes = this.options.classes
      const chooseText = this.options.jsonConfig.chooseText
      const showTooltip = this.options.showTooltip

      $widget.optionsMap = {}

      $.each(this.options.jsonConfig.attributes, function () {
        const item = this
        const controlLabelId = `option-label-${item.code}-${item.id}`
        const options = $widget._RenderSwatchOptions(
          item,
          controlLabelId
        )
        const select = $widget._RenderSwatchSelect(item, chooseText)
        let input = $widget._RenderFormInput(item)
        let listLabel = ''
        let label = ''

        // Show only swatch controls
        if (
          $widget.options.onlySwatches &&
                    !Object.prototype.hasOwnProperty.call(
                      $widget.options.jsonSwatchConfig,
                      item.id
                    )
        ) {
          return
        }

        if ($widget.options.enableControlLabel) {
          label +=
                        `<span id="${
                        controlLabelId
                        }" class="${
                        classes.attributeLabelClass
                        }">${
                        $('<i></i>').text(item.label).html()
                        }</span>` +
                        `<span class="${
                        classes.attributeSelectedOptionLabelClass
                        }"></span>`
        }

        if ($widget.inProductList) {
          $widget.productForm.append(input)
          input = ''
          listLabel =
                        `aria-label="${
                        $('<i></i>').text(item.label).html()
                        }"`
        } else {
          listLabel = `aria-labelledby="${controlLabelId}"`
        }

        // Out of stock message
        const outOfStockLabel =
                    `<span id="out-of-stock-msg" class="${
                    classes.outOfStock
                    }"></span>`

        // Create new control
        container.append(
          `<div class="${
                        classes.attributeClass
                        } ${
                        item.code
                        }" ` +
                        `attribute-code="${
                        item.code
                        }" ` +
                        `attribute-id="${
                        item.id
                        }">${
                        label
                        }<div aria-activedescendant="" ` +
                        'tabindex="0" ' +
                        'aria-invalid="false" ' +
                        'aria-required="true" ' +
                        `role="listbox" ${
                        listLabel
                        }class="${
                        classes.attributeOptionsWrapper
                        } clearfix">${
                        options
                        }${select
                        }</div>${
                        outOfStockLabel
                        }${input
                        }</div>`
        )

        $widget.optionsMap[item.id] = {}

        // Aggregate options array to hash (key => value)
        $.each(item.options, function () {
          if (this.products.length > 0) {
            $widget.optionsMap[item.id][this.id] = {
              price: parseInt(
                $widget.options.jsonConfig.optionPrices[
                  this.products[0]
                ].finalPrice.amount,
                10
              ),
              products: this.products
            }
          }
        })
      })

      if (showTooltip === 1) {
        // Connect Tooltip
        container
          .find(
            '[option-type="1"], [option-type="2"], [option-type="0"], [option-type="3"]'
          )
          .SwatchRendererTooltip()
      }

      // Hide all elements below more button
      $(`.${classes.moreButton}`).nextAll().hide()

      // Handle events like click or change
      $widget._EventListener()

      // Rewind options
      $widget._Rewind(container)

      // Emulate click on all swatches from Request
      $widget._EmulateSelected($.parseQuery())
      $widget._EmulateSelected($widget._getSelectedAttributes())
    },

    /**
         * Render swatch options by part of config
         *
         * @param {Object} config
         * @param {String} controlId
         * @returns {String}
         * @private
         */
    _RenderSwatchOptions: function (config, controlId) {
      const optionConfig = this.options.jsonSwatchConfig[config.id]
      const optionClass = this.options.classes.optionClass
      const sizeConfig = this.options.jsonSwatchImageSizeConfig
      const moreLimit = parseInt(this.options.numberToShow, 10)
      const moreClass = this.options.classes.moreButton
      const moreText = this.options.moreButtonText
      let countAttributes = 0
      let html = ''

      if (
        !Object.prototype.hasOwnProperty.call(
          this.options.jsonSwatchConfig,
          config.id
        )
      ) {
        return ''
      }

      let swatchCount = 1
      $.each(config.options, function (index) {
        let attr, optionExtraClass

        if (
          !Object.prototype.hasOwnProperty.call(
            optionConfig.hasOwnProperty,
            this.id
          )
        ) {
          return ''
        }

        // Add more button
        if (moreLimit === countAttributes++) {
          html +=
                        `<a href="#" class="${
                        moreClass
                        }"><span>${
                        moreText
                        }</span></a>`
        }

        const id = this.id
        const type = parseInt(optionConfig[id].type, 10)
        const value = Object.prototype.hasOwnProperty.call(
          optionConfig[id],
          'value'
        )
          ? $('<i></i>').text(optionConfig[id].value).html()
          : ''
        const thumb = Object.prototype.hasOwnProperty.call(
          optionConfig[id],
          'thumb'
        )
          ? optionConfig[id].thumb
          : ''
        const width = _.has(sizeConfig, 'swatchThumb')
          ? sizeConfig.swatchThumb.width
          : 110
        const height = _.has(sizeConfig, 'swatchThumb')
          ? sizeConfig.swatchThumb.height
          : 90
        const label = this.label
          ? $('<i></i>').text(this.label).html()
          : ''

        attr =
                    ` id="${
                    controlId
                    }-item-${
                    id
                    }"` +
                    ` index="${
                    index
                    }"` +
                    ' aria-checked="false"' +
                    ` aria-describedby="${
                    controlId
                    }"` +
                    ' tabindex="0"' +
                    ` option-type="${
                    type
                    }"` +
                    ` option-id="${
                    id
                    }"` +
                    ` option-label="${
                    label
                    }"` +
                    ` aria-label="${
                    label
                    }"` +
                    ` option-tooltip-thumb="${
                    thumb
                    }"` +
                    ` option-tooltip-value="${
                    value
                    }"` +
                    ' role="option"' +
                    ` thumb-width="${
                    width
                    }"` +
                    ` count-sw-th="${
                    swatchCount
                    }"` +
                    ` thumb-height="${
                    height
                    }"`

        if (swatchCount > 4) {
          optionExtraClass = ' hidden-swatch m-screen'
        } else {
          optionExtraClass = ' visible-swatch m-screen'
        }

        const swatchImageWidth = _.has(sizeConfig, 'swatchImage')
          ? sizeConfig.swatchImage.width
          : 30
        const swatchImageHeight = _.has(sizeConfig, 'swatchImage')
          ? sizeConfig.swatchImage.height
          : 20

        if (
          !Object.prototype.hasOwnProperty.call(this, 'products') ||
                    this.products.length <= 0
        ) {
          attr += ' option-empty="true"'
        }

        if (type === 0) {
          // Text
          html +=
                        `<div class="${
                        optionClass
                        }${optionExtraClass
                        } text" ${
                        attr
                        }>${
                        value || label
                        }</div>`
        } else if (type === 1) {
          // Color
          html +=
                        `<div class="${
                        optionClass
                        }${optionExtraClass
                        } color" ${
                        attr
                        } style="background: ${
                        value
                        } no-repeat center; background-size: initial;">` +
                        `<span style="display:none;">${
                        label
                        }</span>` +
                        '</div>'
        } else if (type === 2) {
          // Image
          html +=
                        `<div class="${
                        optionClass
                        }${optionExtraClass
                        } image" ${
                        attr
                        } style="background: url(${
                        value
                        }) no-repeat center; background-size: initial;width:${
                        swatchImageWidth
                        }px; height:${
                        swatchImageHeight
                        }px">` +
                        `<span style="display:none;">${
                        label
                        }</span>` +
                        '</div>'
        } else if (type === 3) {
          // Clear
          html +=
                        `<div class="${
                        optionClass
                        }${optionExtraClass
                        }" ${
                        attr
                        }></div>`
        } else {
          // Default
          html +=
                        `<div class="${
                        optionClass
                        }${optionExtraClass
                        }" ${
                        attr
                        }>${
                        label
                        }</div>`
        }
        swatchCount++
      })

      // swatchCount = swatchCount - 5;
      // if(swatchCount>0){
      //     html += '<div class="over-swatch-text" style="display:none;">+'+ swatchCount +'</div>';
      // }

      return html
    },

    /**
         * Render select by part of config
         *
         * @param {Object} config
         * @param {String} chooseText
         * @returns {String}
         * @private
         */
    _RenderSwatchSelect: function (config, chooseText) {
      let html

      if (
        Object.prototype.hasOwnProperty.call(
          this.options.jsonSwatchConfig,
          config.id
        )
      ) {
        return ''
      }

      html =
                `<select class="${
                this.options.classes.selectClass
                } ${
                config.code
                }">` +
                `<option value="0" option-id="0">${
                chooseText
                }</option>`

      $.each(config.options, function () {
        const label = this.label
        let attr = ` value="${this.id}" option-id="${this.id}"`

        if (
          !Object.prototype.hasOwnProperty.call(this, 'products') ||
                    this.products.length <= 0
        ) {
          attr += ' option-empty="true"'
        }

        html += `<option ${attr}>${label}</option>`
      })

      html += '</select>'

      return html
    },

    /**
         * Input for submit form.
         * This control shouldn't have "type=hidden", "display: none" for validation work :(
         *
         * @param {Object} config
         * @private
         */
    _RenderFormInput: function (config) {
      return `<input class="${this.options.classes.attributeInput} super-attribute-select" name="super_attribute[${config.id}]" type="text" value="" data-selector="super_attribute[${config.id}]" data-validate="{required: true}" aria-required="true" aria-invalid="false">`
    },

    /**
         * Event listener
         *
         * @private
         */
    _EventListener: function () {
      const $widget = this
      const options = this.options.classes
      let target

      $widget.element.on(
        'click',
                `.${options.optionClass}`,
                function (e) {
                  if ($(this).hasClass('selected')) {
                    e.preventDefault()
                  } else {
                    return $widget._OnClick($(this), $widget)
                  }
                }
      )

      $widget.element.on(
        'change',
                `.${options.selectClass}`,
                function () {
                  return $widget._OnChange($(this), $widget)
                }
      )

      $widget.element.on('click', `.${options.moreButton}`, function (e) {
        e.preventDefault()

        return $widget._OnMoreClick($(this))
      })

      $widget.element.on('keydown', function (e) {
        if (e.which === 13) {
          target = $(e.target)

          if (target.is(`.${options.optionClass}`)) {
            return $widget._OnClick(target, $widget)
          } else if (target.is(`.${options.selectClass}`)) {
            return $widget._OnChange(target, $widget)
          } else if (target.is(`.${options.moreButton}`)) {
            e.preventDefault()

            return $widget._OnMoreClick(target)
          }
        }
      })
    },

    /**
         * Load media gallery using ajax or json config.
         *
         * @private
         */
    _loadMedia: function () {
      const $main = this.inProductList
        ? this.element.parents('.product-item-info')
        : this.element.parents('.column.main')
      let images

      if (this.options.useAjax) {
        this._debouncedLoadProductMedia()
      } else {
        images = this.options.jsonConfig.images[this.getProduct()]

        if (!images) {
          images = this.options.mediaGalleryInitial
        }
        this.updateBaseImage(
          this._sortImages(images),
          $main,
          !this.inProductList
        )
      }
    },

    /**
         * Sorting images array
         *
         * @private
         */
    _sortImages: function (images) {
      return _.sortBy(images, function (image) {
        return parseInt(image.position, 10)
      })
    },

    /**
         * Event for swatch options
         *
         * @param {Object} $this
         * @param {Object} $widget
         * @private
         */
    _OnClick: function ($this, $widget) {
      const $parent = $this.parents(
                `.${$widget.options.classes.attributeClass}`
      )
      const $wrapper = $this.parents(
                `.${$widget.options.classes.attributeOptionsWrapper}`
      )
      const $label = $parent.find(
        `.${$widget.options.classes.attributeSelectedOptionLabelClass}`
      )
      const $outOfStockLabel = $parent.find(
        `.${$widget.options.classes.outOfStock}`
      )
      const attributeId = $parent.attr('attribute-id')
      let $input = $parent.find(
        `.${$widget.options.classes.attributeInput}`
      )
      const checkAdditionalData = JSON.parse(
        this.options.jsonSwatchConfig[attributeId].additional_data
      )

      /**
             * Change url as per selected color and reload page
             * */
      if (
        $this.parents('.product-options-wrapper').length &&
                $('#isReloadPage').val() == 1
      ) {
        let orig_link = window.location.href
        const params = orig_link.split('?')
        if (params.length > 1) {
          if (params[1].indexOf($this.attr('option-id')) == -1) {
            orig_link = `${params[0]}?color=${$this.attr(
                            'option-id'
                        )}`
            window.location.href = orig_link
            return true
          }
        } else {
          const stateObj = {}
          // var orig_link = window.location.href;
          window.history.pushState(
            stateObj,
            '',
            `${orig_link}?color=${$this.attr('option-id')}`
          )
        }
      }

      if ($widget.inProductList) {
        $input = $widget.productForm.find(
                    `.${$widget.options.classes.attributeInput}[name="super_attribute[${attributeId}]"]`
        )
      }

      /**
             * Fetch selected Child Id
             */
      let childId = 0
      const optionId = $this.attr('option-id')
      let $obj = $widget.options.jsonConfig.index
      $obj = Object.entries($obj)
      $obj.forEach(([key, value]) => {
        const SelectedOptionId = Object.values(value)
        const SelectedAttributeId = Object.keys(value)
        if (
          SelectedOptionId[0] == optionId &&
                    SelectedAttributeId[0] == attributeId
        ) {
          childId = key
        }
      })
      $this.attr({ 'data-child-id': childId })

      /**
             * Change Hover Image Attribute as per selected swatch
             */
      if (
        $('body').hasClass('catalog-category-view') ||
                $('body').hasClass('catalogsearch-result-index')
      ) {
        const dataChildId = $this.attr('data-child-id')
        const hoverImage =
                    this.options.jsonConfig.hover_image[dataChildId]
        if (hoverImage == 'undefined' || hoverImage == null) {
          $this
            .parents('.product-item-info')
            .find('.product-image-photo')
            .removeClass('change-hover-image')

          $this
            .parents('.product-item-info')
            .find('.product-image-photo')
            .removeAttr('data-hover-img')
        } else {
          $this
            .parents('.product-item-info')
            .find('.product-image-photo')
            .addClass('change-hover-image')

          $this
            .parents('.product-item-info')
            .find('.product-image-photo')
            .attr({ 'data-hover-img': hoverImage })
        }
      }

      /**
             * Out Of Stock msg for main image
             */
      setTimeout(function () {
        // as fotorama occurring later on
        if ($this.parents('.product-options-wrapper').length) {
          if (!$('#out-of-stock-over').length) {
            $('.fotorama__stage__shaft').append(
              "<span id='out-of-stock-over' class='out-of-stock-over'></span>"
            )
          }
        }
      }, 2000)

      /**
             * Display Notify Me For Out Of Stock Options
             */
      if ($this.parents('.product-options-wrapper').length) {
        if ($this.hasClass('show-notify')) {
          $('#stock-notify-section').show()
          $('.ship_message').hide()
          $('.box-tocart').hide()
        } else {
          $('#stock-notify-section').hide()
          $('.ship_message').show()
          $('.box-tocart').show()
        }
      }

      if ($this.hasClass('disabled')) {
        return
      }

      if ($this.hasClass('selected')) {
        $parent
          .removeAttr('option-selected')
          .find('.selected')
          .removeClass('selected')
        $input.val('')
        $label.text('')
        $this.attr('aria-checked', false)
      } else {
        $parent
          .attr('option-selected', $this.attr('option-id'))
          .find('.selected')
          .removeClass('selected')
        $label.text($this.attr('option-label'))
        if ($this.parents('.product-options-wrapper').length) {
          if ($this.hasClass('show-notify')) {
            const outOfStock = $t('Out Of Stock')
            $outOfStockLabel.html(outOfStock)
            setTimeout(function () {
              // as fotorama occurring later on
              $('#out-of-stock-over').html(outOfStock)
            }, 2000)
            $('.product.media').addClass('out-of-stock-media')
            $(
              '.product-info-main .product-addto-links .towishlist'
            ).addClass('out-of-stock-wishlist')
          } else {
            $outOfStockLabel.html('')
            setTimeout(function () {
              // as fotorama occurring later on
              $('#out-of-stock-over').html('')
            }, 2000)
            $('.product.media').removeClass('out-of-stock-media')
            $(
              '.product-info-main .product-addto-links .towishlist'
            ).removeClass('out-of-stock-wishlist')
          }
        }
        $input.val($this.attr('option-id'))
        $input.attr(
          'data-attr-name',
          this._getAttributeCodeById(attributeId)
        )
        $this.addClass('selected')
        $widget._toggleCheckedAttributes($this, $wrapper)
      }

      $widget._Rebuild()

      if (
        $widget.element
          .parents($widget.options.selectorProduct)
          .find(this.options.selectorProductPrice)
          .is(':data(mage-priceBox)')
      ) {
        $widget._UpdatePrice()
      }

      $(document).trigger('updateMsrpPriceBlock', [
        _.findKey(
          $widget.options.jsonConfig.index,
          $widget.options.jsonConfig.defaultValues
        ),
        $widget.options.jsonConfig.optionPrices
      ])

      if (
        parseInt(
          checkAdditionalData.update_product_preview_image,
          10
        ) === 1
      ) {
        $widget._loadMedia()
      }

      $input.trigger('change')
      $('.swatch-attribute.color .mage-error').hide()
    },

    /**
         * Get human readable attribute code (eg. size, color) by it ID from configuration
         *
         * @param {Number} attributeId
         * @returns {*}
         * @private
         */
    _getAttributeCodeById: function (attributeId) {
      const attribute =
                this.options.jsonConfig.mappedAttributes[attributeId]
      return attribute ? attribute.code : attributeId
    },

    /**
         * Toggle accessibility attributes
         *
         * @param {Object} $this
         * @param {Object} $wrapper
         * @private
         */
    _toggleCheckedAttributes: function ($this, $wrapper) {
      $wrapper
        .attr('aria-activedescendant', $this.attr('id'))
        .find(`.${this.options.classes.optionClass}`)
        .attr('aria-checked', false)
      $this.attr('aria-checked', true)
    },

    /**
         * Event for select
         *
         * @param {Object} $this
         * @param {Object} $widget
         * @private
         */
    _OnChange: function ($this, $widget) {
      const $parent = $this.parents(
        `.${$widget.options.classes.attributeClass}`
      )
      const attributeId = $parent.attr('attribute-id')
      let $input = $parent.find(
        `.${$widget.options.classes.attributeInput}`
      )

      if ($widget.productForm.length > 0) {
        $input = $widget.productForm.find(
                    `.${$widget.options.classes.attributeInput}[name="super_attribute[${attributeId}]"]`
        )
      }

      if ($this.val() > 0) {
        $parent.attr('option-selected', $this.val())
        $input.val($this.val())
      } else {
        $parent.removeAttr('option-selected')
        $input.val('')
      }

      $widget._Rebuild()
      $widget._UpdatePrice()
      $widget._loadMedia()
      $input.trigger('change')
    },

    /**
         * Event for more switcher
         *
         * @param {Object} $this
         * @private
         */
    _OnMoreClick: function ($this) {
      $this.nextAll().show()
      $this.blur().remove()
    },

    /**
         * Rewind options for controls
         *
         * @private
         */
    _Rewind: function (controls) {
      controls
        .find('div[option-id], option[option-id]')
        .removeClass('disabled')
        .removeAttr('disabled')
      controls
        .find('div[option-empty], option[option-empty]')
      // .attr('disabled', true)
      // .addClass('disabled')
        .addClass('show-notify')
        .attr('tabindex', '-1')
    },

    /**
         * Rebuild container
         *
         * @private
         */
    _Rebuild: function () {
      const $widget = this
      const controls = $widget.element.find(
        `.${$widget.options.classes.attributeClass}[attribute-id]`
      )
      const selected = controls.filter('[option-selected]')

      // Enable all options
      $widget._Rewind(controls)

      // done if nothing selected
      if (selected.length <= 0) {
        return
      }

      // check child product in compare products
      if (controls.length == selected.length) {
        if (this.getProduct() != '') {
          const pid = this.getProduct()
          const inCompareUrl =
                        `${window.BASE_URL}ajaxcompare/index/incompare/`

          if ($('body.catalog-product-view').length > 0) {
            $widget.element
              .closest('.product-info-main')
              .find('.item_checkbox')
              .attr('data-pid', pid)
            $widget.element
              .closest('.product-info-main')
              .find('.item_checkbox')
              .attr('id', `cmpprd_${pid}`)
          } else {
            $widget.element
              .closest('.product-item-details')
              .find('.item_checkbox')
              .attr('data-pid', pid)
            $widget.element
              .closest('.product-item-details')
              .find('.item_checkbox')
              .attr('id', `cmpprd_${pid}`)
          }

          $.ajax({
            url: inCompareUrl,
            method: 'POST',
            data: { productId: pid },
            dataType: 'json',
            showLoader: true,
            success: function (res) {
              if (res.success) {
                if (res.in_compare == 1) {
                  $(`#cmpprd_${pid}`).prop('checked', true)
                  $(`#cmpprd_${pid}`).attr(
                    'data-compstatus',
                    '1'
                  )
                } else {
                  $(`#cmpprd_${pid}`).prop('checked', false)
                  $(`#cmpprd_${pid}`).attr(
                    'data-compstatus',
                    '0'
                  )
                }
              }
            }
          })
        }
      }

      // Disable not available options
      controls.each(function () {
        const $this = $(this)
        const id = $this.attr('attribute-id')
        const products = $widget._CalcProducts(id)

        if (
          selected.length === 1 &&
                    selected.first().attr('attribute-id') === id
        ) {
          return
        }

        $this.find('[option-id]').each(function () {
          const $element = $(this)
          const option = $element.attr('option-id')

          if (
            !Object.prototype.hasOwnProperty.call(
              $widget.optionsMap,
              id
            ) ||
                        !Object.prototype.hasOwnProperty.call(
                          $widget.optionsMap[id],
                          option
                        ) ||
                        $element.hasClass('selected') ||
                        $element.is(':selected')
          ) {
            return
          }

          if (
            _.intersection(
              products,
              $widget.optionsMap[id][option].products
            ).length <= 0
          ) {
            $element.attr('disabled', true).addClass('disabled')
          }
        })
      })
    },

    /**
         * Get selected product list
         *
         * @returns {Array}
         * @private
         */
    _CalcProducts: function ($skipAttributeId) {
      const $widget = this
      let products = []

      // Generate intersection of products
      $widget.element
        .find(
          `.${
                        $widget.options.classes.attributeClass
                        }[option-selected]`
        )
        .each(function () {
          const id = $(this).attr('attribute-id')
          const option = $(this).attr('option-selected')

          if (
            $skipAttributeId !== undefined &&
                        $skipAttributeId === id
          ) {
            return
          }

          if (
            !Object.prototype.hasOwnProperty.call(
              $widget.optionsMap,
              id
            ) ||
                        !Object.prototype.hasOwnProperty.call(
                          $widget.optionsMap[id],
                          option
                        )
          ) {
            return
          }

          if (products.length === 0) {
            products = $widget.optionsMap[id][option].products
          } else {
            products = _.intersection(
              products,
              $widget.optionsMap[id][option].products
            )
          }
        })

      return products
    },

    /**
         * Update total price
         *
         * @private
         */
    _UpdatePrice: function () {
      const $widget = this
      const $product = $widget.element.parents(
        $widget.options.selectorProduct
      )
      const $productPrice = $product.find(
        this.options.selectorProductPrice
      )
      const result = $widget._getNewPrices()
      let tierPriceHtml

      $productPrice.trigger('updatePrice', {
        prices: $widget._getPrices(
          result,
          $productPrice.priceBox('option').prices
        )
      })

      const isShow =
                typeof result != 'undefined' &&
                result.oldPrice.amount !== result.finalPrice.amount

      $product.find(this.options.slyOldPriceSelector)[isShow ? 'show' : 'hide']() // prettier-ignore

      if (
        typeof result != 'undefined' &&
                result.tierPrices &&
                result.tierPrices.length
      ) {
        if (this.options.tierPriceTemplate) {
          tierPriceHtml = mageTemplate(
            this.options.tierPriceTemplate,
            {
              tierPrices: result.tierPrices,
              $t: $t,
              currencyFormat:
                                this.options.jsonConfig.currencyFormat,
              priceUtils: priceUtils
            }
          )
          $(this.options.tierPriceBlockSelector)
            .html(tierPriceHtml)
            .show()
        }
      } else {
        $(this.options.tierPriceBlockSelector).hide()
      }

      $(this.options.normalPriceLabelSelector).hide()

      _.each(
        $(`.${this.options.classes.attributeOptionsWrapper}`),
        function (attribute) {
          if (
            $(attribute).find(
              `.${this.options.classes.optionClass}.selected`
            ).length === 0
          ) {
            if (
              $(attribute).find(
                `.${this.options.classes.selectClass}`
              ).length > 0
            ) {
              _.each(
                $(attribute).find(
                  `.${this.options.classes.selectClass}`
                ),
                function (dropdown) {
                  if ($(dropdown).val() === '0') {
                    $(
                      this.options
                        .normalPriceLabelSelector
                    ).show()
                  }
                }.bind(this)
              )
            } else {
              $(this.options.normalPriceLabelSelector).show()
            }
          }
        }.bind(this)
      )
    },

    /**
         * Get new prices for selected options
         *
         * @returns {*}
         * @private
         */
    _getNewPrices: function () {
      const $widget = this
      let optionPriceDiff = 0
      const allowedProduct = this._getAllowedProductWithMinPrice(
        this._CalcProducts()
      )
      const optionPrices = this.options.jsonConfig.optionPrices
      const basePrice = parseFloat(
        this.options.jsonConfig.prices.basePrice.amount
      )
      let optionFinalPrice
      let newPrices

      if (!_.isEmpty(allowedProduct)) {
        optionFinalPrice = parseFloat(
          optionPrices[allowedProduct].finalPrice.amount
        )
        optionPriceDiff = optionFinalPrice - basePrice
      }

      if (optionPriceDiff !== 0) {
        newPrices =
                    this.options.jsonConfig.optionPrices[allowedProduct]
      } else {
        newPrices = $widget.options.jsonConfig.prices
      }

      return newPrices
    },

    /**
         * Get prices
         *
         * @param {Object} newPrices
         * @param {Object} displayPrices
         * @returns {*}
         * @private
         */
    _getPrices: function (newPrices, displayPrices) {
      const $widget = this

      if (_.isEmpty(newPrices)) {
        newPrices = $widget._getNewPrices()
      }
      _.each(displayPrices, function (price, code) {
        if (newPrices[code]) {
          displayPrices[code].amount =
                        newPrices[code].amount - displayPrices[code].amount
        }
      })

      return displayPrices
    },

    /**
         * Get product with minimum price from selected options.
         *
         * @param {Array} allowedProducts
         * @returns {String}
         * @private
         */
    _getAllowedProductWithMinPrice: function (allowedProducts) {
      const optionPrices = this.options.jsonConfig.optionPrices
      let product = {}
      let optionFinalPrice
      let optionMinPrice

      _.each(
        allowedProducts,
        function (allowedProduct) {
          optionFinalPrice = parseFloat(
            optionPrices[allowedProduct].finalPrice.amount
          )

          if (
            _.isEmpty(product) ||
                        optionFinalPrice < optionMinPrice
          ) {
            optionMinPrice = optionFinalPrice
            product = allowedProduct
          }
        },
        this
      )

      return product
    },

    /**
         * Gets all product media and change current to the needed one
         *
         * @private
         */
    _LoadProductMedia: function () {
      const $widget = this
      const $this = $widget.element
      const productData = this._determineProductData()

      /**
             * Processes product media data
             *
             * @param {Object} data
             * @returns void
             */
      const mediaSuccessCallback = function (data) {
        if (!(mediaCacheKey in $widget.options.mediaCache)) {
          $widget.options.mediaCache[mediaCacheKey] = data
        }
        $widget._ProductMediaCallback(
          $this,
          data,
          productData.isInProductView
        )
        setTimeout(function () {
          $widget._DisableProductMediaLoader($this)
        }, 300)
      }

      if (!$widget.options.mediaCallback) {
        return
      }

      const mediaCallData = {
        product_id: this.getProduct()
      }

      const mediaCacheKey = JSON.stringify(mediaCallData)

      if (mediaCacheKey in $widget.options.mediaCache) {
        $widget._XhrKiller()
        $widget._EnableProductMediaLoader($this)
        mediaSuccessCallback($widget.options.mediaCache[mediaCacheKey])
      } else {
        mediaCallData.isAjax = true
        $widget._XhrKiller()
        $widget._EnableProductMediaLoader($this)
        $widget.xhr = $.ajax({
          url: $widget.options.mediaCallback,
          cache: true,
          type: 'GET',
          dataType: 'json',
          data: mediaCallData,
          success: mediaSuccessCallback
        }).done(function () {
          $widget._XhrKiller()
        })
      }
    },

    /**
         * Enable loader
         *
         * @param {Object} $this
         * @private
         */
    _EnableProductMediaLoader: function ($this) {
      const $widget = this

      if ($('body.catalog-product-view').length > 0) {
        $this
          .parents('.column.main')
          .find('.photo.image')
          .addClass($widget.options.classes.loader)
      } else {
        // Category View
        $this
          .parents('.product-item-info')
          .find('.product-image-photo')
          .addClass($widget.options.classes.loader)
      }
    },

    /**
         * Disable loader
         *
         * @param {Object} $this
         * @private
         */
    _DisableProductMediaLoader: function ($this) {
      const $widget = this

      if ($('body.catalog-product-view').length > 0) {
        $this
          .parents('.column.main')
          .find('.photo.image')
          .removeClass($widget.options.classes.loader)
      } else {
        // Category View
        $this
          .parents('.product-item-info')
          .find('.product-image-photo')
          .removeClass($widget.options.classes.loader)
      }
    },

    /**
         * Callback for product media
         *
         * @param {Object} $this
         * @param {String} response
         * @param {Boolean} isInProductView
         * @private
         */
    _ProductMediaCallback: function ($this, response, isInProductView) {
      const $main = isInProductView
        ? $this.parents('.column.main')
        : $this.parents('.product-item-info')
      const $widget = this
      const images = []

      /**
             * Check whether object supported or not
             *
             * @param {Object} e
             * @returns {*|Boolean}
             */
      const support = function (e) {
        return (
          Object.prototype.hasOwnProperty.call(e, 'large') &&
                    Object.prototype.hasOwnProperty.call(e, 'medium') &&
                    Object.prototype.hasOwnProperty.call(e, 'small')
        )
      }

      this.updateProductLink(response.attr_list)

      if (_.size($widget) < 1 || !support(response)) {
        this.updateBaseImage(
          this.options.mediaGalleryInitial,
          $main,
          isInProductView
        )

        return
      }

      images.push({
        full: response.large,
        img: response.medium,
        thumb: response.small,
        isMain: true
      })

      if (Object.prototype.hasOwnProperty.call(response, 'gallery')) {
        $.each(response.gallery, function () {
          if (!support(this) || response.large === this.large) {
            return
          }
          images.push({
            full: this.large,
            img: this.medium,
            thumb: this.small
          })
        })
      }

      this.updateBaseImage(images, $main, isInProductView)
    },

    updateProductLink: function ($attr_list) {
      const $widget = this
      const parent_container =
                $widget.element.closest('.product-item-info')
      const link_ele = parent_container.find('.product-item-photo')
      let orig_link = link_ele.attr('href')
      let params = []
      const count_val = 0
      const str_param = ''
      const selected_color_code = parent_container
        .find('.swatch-option.selected')
        .attr('option-id')
      if (typeof selected_color_code != 'undefined') {
        params = orig_link.split('?')
        orig_link = `${params[0]}?color=${selected_color_code}`
      } else {
        params = orig_link.split('?')
        orig_link = params[0]
      }

      link_ele.attr('href', orig_link)
      parent_container.find('.product-item-link').attr('href', orig_link)
      parent_container
        .find('.photo.product-item-photo')
        .attr('href', orig_link)
    },

    /**
         * Check if images to update are initial and set their type
         * @param {Array} images
         */
    _setImageType: function (images) {
      const initial = this.options.mediaGalleryInitial[0].img

      if (images[0].img === initial) {
        images = $.extend(true, [], this.options.mediaGalleryInitial)
      } else {
        /* eslint-disable array-callback-return */
        images.map(function (img) {
          if (!img.type) {
            img.type = 'image'
          }
        })
        /* eslint-disable array-callback-return */
      }

      return images
    },

    /**
         * Update [gallery-placeholder] or [product-image-photo]
         * @param {Array} images
         * @param {jQuery} context
         * @param {Boolean} isInProductView
         */
    updateBaseImage: function (images, context, isInProductView) {
      const justAnImage = images[0]
      const initialImages = this.options.mediaGalleryInitial
      let imagesToUpdate
      const gallery = context
        .find(this.options.mediaGallerySelector)
        .data('gallery')
      let isInitial

      if (isInProductView) {
        imagesToUpdate = images.length
          ? this._setImageType($.extend(true, [], images))
          : []
        isInitial = _.isEqual(imagesToUpdate, initialImages)

        if (
          this.options.gallerySwitchStrategy === 'prepend' &&
                    !isInitial
        ) {
          imagesToUpdate = imagesToUpdate.concat(initialImages)
        }

        imagesToUpdate = this._setImageIndex(imagesToUpdate)

        if (!_.isUndefined(gallery)) {
          gallery.updateData(imagesToUpdate)
        } else {
          context.find(this.options.mediaGallerySelector).on(
            'gallery:loaded',
            function (loadedGallery) {
              loadedGallery = context
                .find(this.options.mediaGallerySelector)
                .data('gallery')
              loadedGallery.updateData(imagesToUpdate)
            }.bind(this)
          )
        }

        if (isInitial) {
          if (
            !$('body').hasClass('catalog-category-view') &&
                        !$('body').hasClass('catalogsearch-result-index')
          ) {
            $(
              this.options.mediaGallerySelector
            ).AddFotoramaVideoEvents()
          }
        } else {
          $(this.options.mediaGallerySelector).AddFotoramaVideoEvents(
            {
              selectedOption: this.getProduct(),
              dataMergeStrategy:
                                this.options.gallerySwitchStrategy
            }
          )
        }

        if (gallery) {
          gallery.first()
        }
      } else if (justAnImage && justAnImage.img) {
        context
          .find('.product-image-photo')
          .attr('src', justAnImage.img)
      }
    },

    /**
         * Set correct indexes for image set.
         *
         * @param {Array} images
         * @private
         */
    _setImageIndex: function (images) {
      const length = images.length
      let i

      for (i = 0; length > i; i++) {
        images[i].i = i + 1
      }

      return images
    },

    /**
         * Kill doubled AJAX requests
         *
         * @private
         */
    _XhrKiller: function () {
      const $widget = this

      if ($widget.xhr !== undefined && $widget.xhr !== null) {
        $widget.xhr.abort()
        $widget.xhr = null
      }
    },

    /**
         * Emulate mouse click on all swatches that should be selected
         * @param {Object} [selectedAttributes]
         * @private
         */
    _EmulateSelected: function (selectedAttributes) {
      $.each(
        selectedAttributes,
        $.proxy(function (attributeCode, optionId) {
          const elem = this.element.find(
                        `.${this.options.classes.attributeClass}[attribute-code="${attributeCode}"] [option-id="${optionId}"]`
          )
          const parentInput = elem.parent()

          if (elem.hasClass('selected')) {
            return
          }

          if (
            parentInput.hasClass(this.options.classes.selectClass)
          ) {
            parentInput.val(optionId)
            parentInput.trigger('change')
          } else {
            elem.trigger('click')
          }
        }, this)
      )
    },

    /**
         * Emulate mouse click or selection change on all swatches that should be selected
         * @param {Object} [selectedAttributes]
         * @private
         */
    _EmulateSelectedByAttributeId: function (selectedAttributes) {
      $.each(
        selectedAttributes,
        $.proxy(function (attributeId, optionId) {
          const elem = this.element.find(
                        `.${this.options.classes.attributeClass}[attribute-id="${attributeId}"] [option-id="${optionId}"]`
          )
          const parentInput = elem.parent()

          if (elem.hasClass('selected')) {
            return
          }

          if (
            parentInput.hasClass(this.options.classes.selectClass)
          ) {
            parentInput.val(optionId)
            parentInput.trigger('change')
          } else {
            elem.trigger('click')
          }
        }, this)
      )
    },

    /**
         * Get default options values settings with either URL query parameters
         * @private
         */
    _getSelectedAttributes: function () {
      const hashIndex = window.location.href.indexOf('#')
      let selectedAttributes = {}
      let params

      if (hashIndex !== -1) {
        params = $.parseQuery(
          window.location.href.substr(hashIndex + 1)
        )

        selectedAttributes = _.invert(
          _.mapObject(
            _.invert(params),
            function (attributeId) {
              const attribute =
                                this.options.jsonConfig.mappedAttributes[
                                  attributeId
                                ]
              return attribute ? attribute.code : attributeId
            }.bind(this)
          )
        )
      }

      return selectedAttributes
    },

    /**
         * Callback which fired after gallery gets initialized.
         *
         * @param {HTMLElement} element - DOM element associated with a gallery.
         */
    _onGalleryLoaded: function (element) {
      const galleryObject = element.data('gallery')

      this.options.mediaGalleryInitial =
                galleryObject.returnCurrentImages()
    },

    /**
         * Sets mediaCache for cases when jsonConfig contains preSelectedGallery on layered navigation result pages
         *
         * @private
         */
    _setPreSelectedGallery: function () {
      let mediaCallData

      if (this.options.jsonConfig.preSelectedGallery) {
        mediaCallData = {
          product_id: this.getProduct()
        }

        this.options.mediaCache[JSON.stringify(mediaCallData)] =
                    this.options.jsonConfig.preSelectedGallery
      }
    }
  })

  return $.mage.SwatchRenderer
})
