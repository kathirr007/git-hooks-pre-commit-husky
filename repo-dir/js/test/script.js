if (typeof IASCallbacks == 'undefined') {
  var IASCallbacks = function () {
    this.list = []
    this.fireStack = []
    this.isFiring = false
    this.isDisabled = false
    this.test = false

    /**
     * Calls all added callbacks
     *
     * @private
     * @param args
     */
    this.fire = function (args) {
      const context = args[0]
      const deferred = args[1]
      const callbackArguments = args[2]
      this.isFiring = true

      for (let i = 0, l = this.list.length; i < l; i++) {
        if (this.list[i].fn.apply(context, callbackArguments) === false) {
          deferred.reject()

          break
        }
      }

      this.isFiring = false

      deferred.resolve()

      if (this.fireStack.length) {
        this.fire(this.fireStack.shift())
      }
    }

    

    /**
     * Returns index of the callback in the list in a similar way as
     * the indexOf function.
     *
     * @param callback
     * @param {number} index index to start the search from
     * @returns {number}
     */
    this.inList = function (callback, index) {
      index = index || 0

      for (let i = index, length = this.list.length; i < length; i++) {
        if (
          this.list[i].fn === callback ||
          (callback.guid &&
            this.list[i].fn.guid &&
            callback.guid === this.list[i].fn.guid)
        ) {
          return i
        }
      }

      return -1
    }

    return this
  }

  IASCallbacks.prototype = {
    /**
     * Adds a callback
     *
     * @param callback
     * @returns {IASCallbacks}
     * @param priority
     */
    add: function (callback, priority) {
      const callbackObject = { fn: callback, priority: priority }

      priority = priority || 0

      for (let i = 0, length = this.list.length; i < length; i++) {
        if (priority > this.list[i].priority) {
          this.list.splice(i, 0, callbackObject)

          return this
        }
      }

      this.list.push(callbackObject)

      return this
    },

    /**
     * Removes a callback
     *
     * @param callback
     * @returns {IASCallbacks}
     */
    remove: function (callback) {
      let index = 0

      while ((index = this.inList(callback, index)) > -1) {
        this.list.splice(index, 1)
      }

      return this
    },

    /**
     * Checks if callback is added
     *
     * @param callback
     * @returns {*}
     */
    has: function (callback) {
      return this.inList(callback) > -1
    },

    /**
     * Calls callbacks with a context
     *
     * @param context
     * @param args
     * @returns {object|void}
     */
    fireWith: function (context, args) {
      const deferred = jQuery.Deferred()

      if (this.isDisabled) {
        return deferred.reject()
      }

      args = args || []
      args = [context, deferred, args.slice ? args.slice() : args]

      if (this.isFiring) {
        this.fireStack.push(args)
      } else {
        this.fire(args)
      }

      return deferred
    },

    /**
     * Disable firing of new events
     */
    disable: function () {
      this.isDisabled = true
    },

    /**
     * Enable firing of new events
     */
    enable: function () {
      this.isDisabled = false
    }
  }
}
/**
 * Infinite Ajax Scroll v2.1.3
 * A jQuery plugin for infinite scrolling
 * http://infiniteajaxscroll.com
 *
 * Commercial use requires one-time purchase of a commercial license
 * http://infiniteajaxscroll.com/docs/license.html
 *
 * Non-commercial use is licensed under the MIT License
 *
 * Copyright 2014 Webcreate (Jeroen Fiege)
 */
define(['jquery'], function () {
  (function ($) {
    'use strict'

    const UNDETERMINED_SCROLLOFFSET = -1

    const IAS = function ($element, options) {
      this.itemsContainerSelector = options.container
      this.itemSelector = options.item
      this.nextSelector = options.next
      this.paginationSelector = options.pagination
      this.$scrollContainer = $element
      this.$itemsContainer = $(this.itemsContainerSelector)
      this.$container = window === $element.get(0) ? $(document) : $element
      this.defaultDelay = options.delay
      this.negativeMargin = options.negativeMargin
      this.nextUrl = null
      this.isBound = false
      this.listeners = {
        next: new IASCallbacks(),
        load: new IASCallbacks(),
        loaded: new IASCallbacks(),
        render: new IASCallbacks(),
        rendered: new IASCallbacks(),
        scroll: new IASCallbacks(),
        noneLeft: new IASCallbacks(),
        ready: new IASCallbacks()
      }
      this.extensions = []

      /**
       * Scroll event handler
       *
       * Note: calls to this functions should be throttled
       *
       * @private
       */
      this.scrollHandler = function () {
        const currentScrollOffset = this.getCurrentScrollOffset(
          this.$scrollContainer
        )
        const scrollThreshold = this.getScrollThreshold()
        // the throttle method can call the scrollHandler even thought we have called unbind()
        if (!this.isBound) {
          return
        }

        // invalid scrollThreshold. The DOM might not have loaded yet...
        if (UNDETERMINED_SCROLLOFFSET == scrollThreshold) {
          return
        }

        this.fire('scroll', [currentScrollOffset, scrollThreshold])

        if (currentScrollOffset >= scrollThreshold) {
          this.next()
        }
      }

      /**
       * Returns the last item currently in the DOM
       *
       * @private
       * @returns {object}
       */
      this.getLastItem = function () {
        return $(this.itemSelector, this.$itemsContainer.get(0)).last()
      }

      /**
       * Returns the first item currently in the DOM
       *
       * @private
       * @returns {object}
       */
      this.getFirstItem = function () {
        return $(this.itemSelector, this.$itemsContainer.get(0)).first()
      }

      /**
       * Returns scroll threshold. This threshold marks the line from where
       * IAS should start loading the next page.
       *
       * @private
       * @param negativeMargin defaults to {this.negativeMargin}
       * @return {number}
       */
      this.getScrollThreshold = function (negativeMargin) {
        let $lastElement

        negativeMargin = negativeMargin || this.negativeMargin
        negativeMargin =
          negativeMargin >= 0 ? negativeMargin * -1 : negativeMargin

        $lastElement = this.getLastItem()

        // if the don't have a last element, the DOM might not have been loaded,
        // or the selector is invalid
        if ($lastElement.size() === 0) {
          return UNDETERMINED_SCROLLOFFSET
        }

        return (
          $lastElement.offset().top + $lastElement.height() + negativeMargin
        )
      }

      /**
       * Returns current scroll offset for the given scroll container
       *
       * @private
       * @param $container
       * @returns {number}
       */
      this.getCurrentScrollOffset = function ($container) {
        let scrollTop = 0
        let containerHeight = $container.height()

        if (window === $container.get(0)) {
          scrollTop = $container.scrollTop()
        } else {
          scrollTop = $container.offset().top
        }

        // compensate for iPhone
        if (
          navigator.platform.indexOf('iPhone') != -1 ||
          navigator.platform.indexOf('iPod') != -1
        ) {
          containerHeight += 80
        }

        return scrollTop + containerHeight
      }

      /**
       * Returns the url for the next page
       *
       * @private
       */
      this.getNextUrl = function (container) {
        if (!container) {
          container = this.$container
        }

        // always take the last matching item
        let next_url = $(this.nextSelector, container).last().attr('href')
        if (typeof next_url != 'undefined') {
          next_url += '&ajaxscroll=1'
        } else {
          next_url = ''
        }

        return next_url
      }

      /**
       * Loads a page url
       *
       * @param url
       * @param callback
       * @param delay
       * @returns {object}        jsXhr object
       */
      this.load = function (url, callback, delay) {
        const self = this
        let $itemContainer
        const items = []
        const timeStart = +new Date()
        let timeDiff

        delay = delay || this.defaultDelay

        const loadEvent = {
          url: url
        }

        self.fire('load', [loadEvent])

        return $.get(
          loadEvent.url,
          null,
          $.proxy(function (data) {
            $itemContainer = $(this.itemsContainerSelector, data).eq(0)
            if ($itemContainer.length === 0) {
              $itemContainer = $(data)
                .filter(this.itemsContainerSelector)
                .eq(0)
            }

            if ($itemContainer) {
              $itemContainer.find(this.itemSelector).each(function () {
                items.push(this)
              })
            }

            self.fire('loaded', [data, items])

            if (callback) {
              timeDiff = +new Date() - timeStart
              if (timeDiff < delay) {
                setTimeout(function () {
                  callback.call(self, data, items)
                }, delay - timeDiff)
              } else {
                callback.call(self, data, items)
              }
            }
          }, self),
          'html'
        )
      }

      /**
       * Renders items
       *
       * @param callback
       * @param items
       */
      this.render = function (items, callback) {
        const self = this
        const $lastItem = this.getLastItem()
        let count = 0

        const promise = this.fire('render', [items])

        promise.done(function () {
          $(items).hide() // at first, hide it so we can fade it in later

          $lastItem.after(items)

          $(items).fadeIn(400, function () {
            // complete callback get fired for each item,
            // only act on the last item
            if (++count < items.length) {
              return
            }

            self.fire('rendered', [items])

            if (callback) {
              callback()
            }
          })
        })
      }

      /**
       * Hides the pagination
       */
      this.hidePagination = function () {
        if (this.paginationSelector) {
          $(this.paginationSelector, this.$container).hide()
        }
      }

      /**
       * Restores the pagination
       */
      this.restorePagination = function () {
        if (this.paginationSelector) {
          $(this.paginationSelector, this.$container).show()
        }
      }

      /**
       * Throttles a method
       *
       * Adopted from Ben Alman's jQuery throttle / debounce plugin
       *
       * @param callback
       * @param delay
       * @return {object}
       */
      this.throttle = function (callback, delay) {
        let lastExecutionTime = 0
        let wrapper
        let timerId

        wrapper = function () {
          const that = this
          const args = arguments
          const diff = +new Date() - lastExecutionTime

          function execute () {
            lastExecutionTime = +new Date()
            callback.apply(that, args)
          }

          if (!timerId) {
            execute()
          } else {
            clearTimeout(timerId)
          }

          if (diff > delay) {
            execute()
          } else {
            timerId = setTimeout(execute, delay)
          }
        }

        if ($.guid) {
          wrapper.guid = callback.guid = callback.guid || $.guid++
        }

        return wrapper
      }

      /**
       * Fires an event with the ability to cancel further processing. This
       * can be achieved by returning false in a listener.
       *
       * @param event
       * @param args
       * @returns {*}
       */
      this.fire = function (event, args) {
        return this.listeners[event].fireWith(this, args)
      }

      return this
    }

    /**
     * Initialize IAS
     *
     * Note: Should be called when the document is ready
     *
     * @public
     */
    IAS.prototype.initialize = function () {
      const currentScrollOffset = this.getCurrentScrollOffset(
        this.$scrollContainer
      )
      const scrollThreshold = this.getScrollThreshold()

      this.hidePagination()
      this.bind()

      for (let i = 0, l = this.extensions.length; i < l; i++) {
        this.extensions[i].bind(this)
      }

      this.fire('ready')

      this.nextUrl = this.getNextUrl()

      // start loading next page if content is shorter than page fold
      if (currentScrollOffset >= scrollThreshold && this.nextUrl) {
        this.next()
      }

      return this
    }

    /**
     * Binds IAS to DOM events
     *
     * @public
     */
    IAS.prototype.bind = function () {
      if (this.isBound) {
        return
      }

      this.$scrollContainer.on(
        'scroll',
        $.proxy(this.throttle(this.scrollHandler, 150), this)
      )

      this.isBound = true
    }

    /**
     * Unbinds IAS to events
     *
     * @public
     */
    IAS.prototype.unbind = function () {
      if (!this.isBound) {
        return
      }

      this.$scrollContainer.off('scroll', this.scrollHandler)

      this.isBound = false
    }

    /**
     * Destroys IAS instance
     *
     * @public
     */
    IAS.prototype.destroy = function () {
      this.unbind()
    }

    /**
     * Registers an eventListener
     *
     * Note: chainable
     *
     * @public
     * @returns IAS
     */
    IAS.prototype.on = function (event, callback, priority) {
      if (typeof this.listeners[event] == 'undefined') {
        throw new Error('There is no event called "' + event + '"')
      }

      priority = priority || 0

      this.listeners[event].add($.proxy(callback, this), priority)

      return this
    }

    /**
     * Registers an eventListener which only gets
     * fired once.
     *
     * Note: chainable
     *
     * @public
     * @returns IAS
     */
    IAS.prototype.one = function (event, callback) {
      const self = this

      var remover = function () {
        self.off(event, callback)
        self.off(event, remover)
      }

      this.on(event, callback)
      this.on(event, remover)

      return this
    }

    /**
     * Removes an eventListener
     *
     * Note: chainable
     *
     * @public
     * @returns IAS
     */
    IAS.prototype.off = function (event, callback) {
      if (typeof this.listeners[event] == 'undefined') {
        throw new Error('There is no event called "' + event + '"')
      }

      this.listeners[event].remove(callback)

      return this
    }

    /**
     * Load the next page
     *
     * @public
     */
    IAS.prototype.next = function () {
      const url = this.nextUrl
      const self = this

      this.unbind()

      if (!url) {
        this.fire('noneLeft', [this.getLastItem()])
        this.listeners.noneLeft.disable() // disable it so it only fires once

        self.bind()

        return false
      }

      const promise = this.fire('next', [url])

      promise.done(function () {
        self.load(url, function (data, items) {
          self.render(items, function () {
            self.nextUrl = self.getNextUrl(data)

            self.bind()
          })
        })
      })

      promise.fail(function () {
        self.bind()
      })

      return true
    }

    /**
     * Adds an extension
     *
     * @public
     */
    IAS.prototype.extension = function (extension) {
      if (typeof extension.bind == 'undefined') {
        throw new Error('Extension doesn\'t have required method "bind"')
      }

      if (typeof extension.initialize != 'undefined') {
        extension.initialize(this)
      }

      this.extensions.push(extension)

      return this
    }

    /**
     * Shortcut. Sets the window as scroll container.
     *
     * @public
     * @param option
     * @returns {*}
     */
    $.ias = function (option) {
      const $window = $(window)

      return $window.ias.apply($window, arguments)
    }

    /**
     * jQuery plugin initialization
     *
     * @public
     * @param option
     * @returns {*} the last IAS instance will be returned
     */
    $.fn.ias = function (option) {
      const args = Array.prototype.slice.call(arguments)
      let retval = this

      this.each(function () {
        const $this = $(this)
        let data = $this.data('ias')
        const options = $.extend(
          {},
          $.fn.ias.defaults,
          $this.data(),
          typeof option == 'object' && option
        )
        // set a new instance as data
        if (!data) {
          $this.data('ias', (data = new IAS($this, options)))

          $(document).ready($.proxy(data.initialize, data))
        }

        // when the plugin is called with a method
        if (typeof option === 'string') {
          if (typeof data[option] !== 'function') {
            throw new Error('There is no method called "' + option + '"')
          }

          args.shift() // remove first argument ('option')
          data[option].apply(data, args)

          if (option === 'destroy') {
            $this.data('ias', null)
          }
        }

        retval = $this.data('ias')
      })

      return retval
    }

    /**
     * Plugin defaults
     *
     * @public
     * @type {object}
     */
    $.fn.ias.defaults = {
      item: '.item',
      container: '.listing',
      next: '.next',
      pagination: false,
      delay: 600,
      negativeMargin: 10
    }
  })(jQuery)
})
if (typeof IASHistoryExtension == 'undefined') {
  /**
   * IAS History Extension
   * An IAS extension to enable browser history
   * http://infiniteajaxscroll.com
   *
   * This file is part of the Infinite AJAX Scroll package
   *
   * Copyright 2014 Webcreate (Jeroen Fiege)
   */

  var IASHistoryExtension = function (options) {
    options = jQuery.extend({}, this.defaults, options)

    this.ias = null
    this.prevSelector = options.prev
    this.prevUrl = null
    this.listeners = {
      prev: new IASCallbacks()
    }

    /**
     * @private
     * @param pageNum
     * @param scrollOffset
     * @param url
     */
    this.onPageChange = function (pageNum, scrollOffset, url) {
      const state = {}

      if (!window.history || !window.history.replaceState) {
        return
      }

      history.replaceState(state, document.title, url)
    }

    /**
     * @private
     * @param currentScrollOffset
     * @param scrollThreshold
     */
    this.onScroll = function (currentScrollOffset, scrollThreshold) {
      const firstItemScrollThreshold = this.getScrollThresholdFirstItem()

      if (!this.prevUrl) {
        return
      }

      currentScrollOffset -= this.ias.$scrollContainer.height()

      if (currentScrollOffset <= firstItemScrollThreshold) {
        this.prev()
      }
    }

    /**
     * Returns the url for the next page
     *
     * @private
     */
    this.getPrevUrl = function (container) {
      if (!container) {
        container = this.ias.$container
      }

      // always take the last matching item
      let prev_url = jQuery(this.prevSelector, container).last().attr('href')
      if (typeof prev_url != 'undefined') {
        prev_url += '&ajaxscroll=1'
      } else {
        prev_url = ''
      }
      return prev_url
    }

    /**
     * Returns scroll threshold. This threshold marks the line from where
     * IAS should start loading the next page.
     *
     * @private
     * @return {number}
     */
    this.getScrollThresholdFirstItem = function () {
      let $firstElement

      $firstElement = this.ias.getFirstItem()

      // if the don't have a first element, the DOM might not have been loaded,
      // or the selector is invalid
      if ($firstElement.size() === 0) {
        return -1
      }

      return $firstElement.offset().top
    }

    /**
     * Renders items
     *
     * @private
     * @param items
     * @param callback
     */
    this.renderBefore = function (items, callback) {
      const ias = this.ias
      const $firstItem = ias.getFirstItem()
      let count = 0

      ias.fire('render', [items])

      jQuery(items).hide() // at first, hide it so we can fade it in later

      $firstItem.before(items)

      jQuery(items).fadeIn(400, function () {
        if (++count < items.length) {
          return
        }

        ias.fire('rendered', [items])

        if (callback) {
          callback()
        }
      })
    }

    return this
  }

  /**
   * @public
   */
  IASHistoryExtension.prototype.initialize = function (ias) {
    const self = this

    this.ias = ias

    // expose the extensions listeners
    jQuery.extend(ias.listeners, this.listeners)

    // expose prev method
    ias.prev = function () {
      return self.prev()
    }

    this.prevUrl = this.getPrevUrl()
  }

  /**
   * Bind to events
   *
   * @public
   * @param ias
   */
  IASHistoryExtension.prototype.bind = function (ias) {
    const self = this

    ias.on('pageChange', jQuery.proxy(this.onPageChange, this))
    ias.on('scroll', jQuery.proxy(this.onScroll, this))
    ias.on('ready', function () {
      let currentScrollOffset = ias.getCurrentScrollOffset(
        ias.$scrollContainer
      )
      const firstItemScrollThreshold = self.getScrollThresholdFirstItem()

      currentScrollOffset -= ias.$scrollContainer.height()

      if (currentScrollOffset <= firstItemScrollThreshold) {
        self.prev()
      }
    })
  }

  /**
   * Load the prev page
   *
   * @public
   */
  IASHistoryExtension.prototype.prev = function () {
    const url = this.prevUrl
    const self = this
    const ias = this.ias

    if (!url) {
      return false
    }

    ias.unbind()

    const promise = ias.fire('prev', [url])

    promise.done(function () {
      ias.load(url, function (data, items) {
        self.renderBefore(items, function () {
          self.prevUrl = self.getPrevUrl(data)

          ias.bind()

          if (self.prevUrl) {
            self.prev()
          }
        })
      })
    })

    promise.fail(function () {
      ias.bind()
    })

    return true
  }

  /**
   * @public
   */
  IASHistoryExtension.prototype.defaults = {
    prev: '.prev'
  }
}
if (typeof IASNoneLeftExtension == 'undefined') {
  /**
   * IAS None Left Extension
   * An IAS extension to show a message when there are no more pages te load
   * http://infiniteajaxscroll.com
   *
   * This file is part of the Infinite AJAX Scroll package
   *
   * Copyright 2014 Webcreate (Jeroen Fiege)
   */

  var IASNoneLeftExtension = function (options) {
    options = jQuery.extend({}, this.defaults, options)

    this.ias = null
    this.uid = new Date().getTime()
    this.html = options.html.replace('{text}', options.text)

    /**
     * Shows none left message
     */
    this.showNoneLeft = function () {
      const $element = jQuery(this.html).attr('id', 'ias_noneleft_' + this.uid)
      const $lastItem = this.ias.getLastItem()

      $lastItem.after($element)
      $element.fadeIn()
    }

    return this
  }

  /**
   * @public
   */
  IASNoneLeftExtension.prototype.bind = function (ias) {
    this.ias = ias

    ias.on('noneLeft', jQuery.proxy(this.showNoneLeft, this))
  }

  /**
   * @public
   */
  IASNoneLeftExtension.prototype.defaults = {
    text: 'You reached the end.',
    html: '<div class="ias-noneleft" style="text-align: center;">{text}</div>'
  }
}
if (typeof IASPagingExtension == 'undefined') {
  /**
   * IAS Paging Extension
   * An IAS extension providing additional events
   * http://infiniteajaxscroll.com
   *
   * This file is part of the Infinite AJAX Scroll package
   *
   * Copyright 2014 Webcreate (Jeroen Fiege)
   */

  var IASPagingExtension = function () {
    this.ias = null
    this.pagebreaks = [[0, document.location.toString()]]
    this.lastPageNum = 1
    this.enabled = true
    this.listeners = {
      pageChange: new IASCallbacks()
    }

    /**
     * Fires pageChange event
     *
     * @param currentScrollOffset
     * @param scrollThreshold
     */
    this.onScroll = function (currentScrollOffset, scrollThreshold) {
      if (!this.enabled) {
        return
      }

      const ias = this.ias
      const currentPageNum = this.getCurrentPageNum(currentScrollOffset)
      const currentPagebreak = this.getCurrentPagebreak(currentScrollOffset)
      let urlPage

      if (this.lastPageNum !== currentPageNum) {
        urlPage = currentPagebreak[1]

        ias.fire('pageChange', [currentPageNum, currentScrollOffset, urlPage])
      }

      this.lastPageNum = currentPageNum
    }

    /**
     * Keeps track of pagebreaks
     *
     * @param url
     */
    this.onNext = function (url) {
      const currentScrollOffset = this.ias.getCurrentScrollOffset(
        this.ias.$scrollContainer
      )

      this.pagebreaks.push([currentScrollOffset, url])

      // trigger pageChange and update lastPageNum
      const currentPageNum = this.getCurrentPageNum(currentScrollOffset) + 1

      this.ias.fire('pageChange', [currentPageNum, currentScrollOffset, url])

      this.lastPageNum = currentPageNum
    }

    /**
     * Keeps track of pagebreaks
     *
     * @param url
     */
    this.onPrev = function (url) {
      const self = this
      const ias = self.ias
      const currentScrollOffset = ias.getCurrentScrollOffset(ias.$scrollContainer)
      const prevCurrentScrollOffset =
          currentScrollOffset - ias.$scrollContainer.height()
      const $firstItem = ias.getFirstItem()

      this.enabled = false

      this.pagebreaks.unshift([0, url])

      ias.one('rendered', function () {
        // update pagebreaks
        for (let i = 1, l = self.pagebreaks.length; i < l; i++) {
          self.pagebreaks[i][0] =
            self.pagebreaks[i][0] + $firstItem.offset().top
        }

        // trigger pageChange and update lastPageNum
        const currentPageNum =
          self.getCurrentPageNum(prevCurrentScrollOffset) + 1

        ias.fire('pageChange', [currentPageNum, prevCurrentScrollOffset, url])

        self.lastPageNum = currentPageNum

        self.enabled = true
      })
    }

    return this
  }

  /**
   * @public
   */
  IASPagingExtension.prototype.initialize = function (ias) {
    this.ias = ias

    // expose the extensions listeners
    jQuery.extend(ias.listeners, this.listeners)
  }

  /**
   * @public
   */
  IASPagingExtension.prototype.bind = function (ias) {
    try {
      ias.on('prev', jQuery.proxy(this.onPrev, this), this.priority)
    } catch (exception) {}

    ias.on('next', jQuery.proxy(this.onNext, this), this.priority)
    ias.on('scroll', jQuery.proxy(this.onScroll, this), this.priority)
  }

  /**
   * Returns current page number based on scroll offset
   *
   * @param {number} scrollOffset
   * @returns {number}
   */
  IASPagingExtension.prototype.getCurrentPageNum = function (scrollOffset) {
    for (let i = this.pagebreaks.length - 1; i > 0; i--) {
      if (scrollOffset > this.pagebreaks[i][0]) {
        return i + 1
      }
    }

    return 1
  }

  /**
   * Returns current pagebreak information based on scroll offset
   *
   * @param {number} scrollOffset
   * @returns {number}|null
   */
  IASPagingExtension.prototype.getCurrentPagebreak = function (scrollOffset) {
    for (let i = this.pagebreaks.length - 1; i >= 0; i--) {
      if (scrollOffset > this.pagebreaks[i][0]) {
        return this.pagebreaks[i]
      }
    }

    return null
  }

  /**
   * @public
   * @type {number}
   */
  IASPagingExtension.prototype.priority = 500
}
if (typeof IASSpinnerExtension == 'undefined') {
  /**
   * IAS Spinner Extension
   * An IAS extension to show a spinner when loading
   * http://infiniteajaxscroll.com
   *
   * This file is part of the Infinite AJAX Scroll package
   *
   * Copyright 2014 Webcreate (Jeroen Fiege)
   */

  var IASSpinnerExtension = function (options) {
    options = jQuery.extend({}, this.defaults, options)

    this.ias = null
    this.uid = new Date().getTime()
    this.src = options.src
    this.html = options.html.replace('{src}', this.src)

    /**
     * Shows spinner
     */
    this.showSpinner = function () {
      const $spinner = this.getSpinner() || this.createSpinner()
      const $lastItem = this.ias.getLastItem()

      $lastItem.after($spinner)
      $spinner.fadeIn()
    }

    /**
     * Shows spinner
     */
    this.showSpinnerBefore = function () {
      const $spinner = this.getSpinner() || this.createSpinner()
      const $firstItem = this.ias.getFirstItem()

      $firstItem.before($spinner)
      $spinner.fadeIn()
    }

    /**
     * Removes spinner
     */
    this.removeSpinner = function () {
      if (this.hasSpinner()) {
        this.getSpinner().remove()
      }
    }

    /**
     * @returns {jQuery|boolean}
     */
    this.getSpinner = function () {
      const $spinner = jQuery('#ias_spinner_' + this.uid)

      if ($spinner.size() > 0) {
        return $spinner
      }

      return false
    }

    /**
     * @returns {boolean}
     */
    this.hasSpinner = function () {
      const $spinner = jQuery('#ias_spinner_' + this.uid)

      return $spinner.size() > 0
    }

    /**
     * @returns {jQuery}
     */
    this.createSpinner = function () {
      const $spinner = jQuery(this.html).attr('id', 'ias_spinner_' + this.uid)

      $spinner.hide()

      return $spinner
    }

    return this
  }

  /**
   * @public
   */
  IASSpinnerExtension.prototype.bind = function (ias) {
    this.ias = ias

    ias.on('next', jQuery.proxy(this.showSpinner, this))

    try {
      ias.on('prev', jQuery.proxy(this.showSpinnerBefore, this))
    } catch (exception) {}

    ias.on('render', jQuery.proxy(this.removeSpinner, this))
  }

  /**
   * @public
   */
  IASSpinnerExtension.prototype.defaults = {
    src: 'data:image/gif;base64,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',
    html: '<div class="ias-spinner" style="text-align: center;"><img src="{src}"/></div>'
  }
}
if (typeof IASTriggerExtension == 'undefined') {
  /**
   * IAS Trigger Extension
   * An IAS extension to show a trigger link to load the next page
   * http://infiniteajaxscroll.com
   *
   * This file is part of the Infinite AJAX Scroll package
   *
   * Copyright 2014 Webcreate (Jeroen Fiege)
   */

  var IASTriggerExtension = function (options) {
    options = jQuery.extend({}, this.defaults, options)

    this.ias = null
    this.html = options.html.replace('{text}', options.text)
    this.htmlPrev = options.htmlPrev.replace('{text}', options.textPrev)
    this.enabled = true
    this.count = 0
    this.offset = options.offset
    this.$triggerNext = null
    this.$triggerPrev = null

    /**
     * Shows trigger for next page
     */
    this.showTriggerNext = function () {
      if (!this.enabled) {
        return true
      }

      if (this.offset === false || ++this.count < this.offset) {
        return true
      }

      const $trigger =
        this.$triggerNext ||
        (this.$triggerNext = this.createTrigger(this.next, this.html))
      const $lastItem = this.ias.getLastItem()

      $lastItem.after($trigger)
      $trigger.fadeIn()

      return false
    }

    /**
     * Shows trigger for previous page
     */
    this.showTriggerPrev = function () {
      if (!this.enabled) {
        return true
      }

      const $trigger =
        this.$triggerPrev ||
        (this.$triggerPrev = this.createTrigger(this.prev, this.htmlPrev))
      const $firstItem = this.ias.getFirstItem()

      $firstItem.before($trigger)
      $trigger.fadeIn()

      return false
    }

    /**
     * @param clickCallback
     * @returns {*|jQuery}
     * @param {string} html
     */
    this.createTrigger = function (clickCallback, html) {
      const uid = new Date().getTime()
      let $trigger

      html = html || this.html
      $trigger = jQuery(html).attr('id', 'ias_trigger_' + uid)

      $trigger.hide()
      $trigger.on('click', jQuery.proxy(clickCallback, this))

      return $trigger
    }

    return this
  }

  /**
   * @public
   * @param {object} ias
   */
  IASTriggerExtension.prototype.bind = function (ias) {
    const self = this

    this.ias = ias

    try {
      ias.on('prev', jQuery.proxy(this.showTriggerPrev, this), this.priority)
    } catch (exception) {}

    ias.on('next', jQuery.proxy(this.showTriggerNext, this), this.priority)
    ias.on(
      'rendered',
      function () {
        self.enabled = true
      },
      this.priority
    )
  }

  /**
   * @public
   */
  IASTriggerExtension.prototype.next = function () {
    this.enabled = false
    this.ias.unbind()

    if (this.$triggerNext) {
      this.$triggerNext.remove()
      this.$triggerNext = null
    }

    this.ias.next()
  }

  /**
   * @public
   */
  IASTriggerExtension.prototype.prev = function () {
    this.enabled = false
    this.ias.unbind()

    if (this.$triggerPrev) {
      this.$triggerPrev.remove()
      this.$triggerPrev = null
    }

    this.ias.prev()
  }

  /**
   * @public
   */
  IASTriggerExtension.prototype.defaults = {
    text: 'Load more items',
    html: '<div class="ias-trigger ias-trigger-next" style="text-align: center; cursor: pointer;"><a>{text}</a></div>',
    textPrev: 'Load previous items',
    htmlPrev:
      '<div class="ias-trigger ias-trigger-prev" style="text-align: center; cursor: pointer;"><a>{text}</a></div>',
    offset: 0
  }

  /**
   * @public
   * @type {number}
   */
  IASTriggerExtension.prototype.priority = 1000
}
