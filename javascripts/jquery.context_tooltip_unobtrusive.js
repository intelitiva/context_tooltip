/* Global functions to ease access to jQuery functionality. */
function addContextTooltip(tooltip_elements_matcher, options) {
  jQuery.context_tooltips.add(tooltip_elements_matcher, options);
}

function closeContextTooltip(tooltip_element_id) {
  jQuery.context_tooltips.close(tooltip_element_id);
}

function initUnobtrusiveContextTooltip() {
  addContextTooltip('.contextTooltip');
}

/* jQuery specific code */
(function($){

  /* Holds references to context tooltips. */
  $.context_tooltips = new Object;
  $.context_tooltips._tooltips = new Object;

  /* Default options for context tooltips. */
  $.context_tooltips.defaults = {
    debug: false, // Log events in console (using console.log function)
    onWindowLoad: true, // Whether the tooltip should be loaded now or when the window is loaded (document is ready).
    displayWhenClicked: false, // Whether the tooltip should be displayed when hovered or when the container is clicked.
    delayWhenDisplaying: true, // Whether we should add a delay before showing the tooltip.
    delayWhenHiding: true, // Whether we should add a delay before hiding the tooltip.
    displayDelay: 0.2, // The amount of time to wait before showing the tooltip (in seconds).
    hideDelay: 0.2, // The amount of time to wait before hiding the tooltip (in seconds).
    contextClick: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip when the context is clicked.
    click: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip on click.
    displayEffect: 'appear', // Possible values: appear, none;
    displayEffectOptions: { duration: 0.5 }, // The options for the display effect.
    hideEffect: 'fade', // Possible values: fade, none;
    hideEffectOptions: { duration: 0.5 }, // The options for the hide effect.
    contextElement: null, // The context element to be used instead of the direct parent.
    position: 'none', // Enter values like: top-left, bottom-right, or just top, right, bottom, left.
    horizontalOffset: 0, // A horizontal offset used for positioned tooltips.
    verticalOffset: 0, // A vertical offset used for positioned tooltips.
    remoteUrlOptions: false, // Ajax options to be used when loading tooltip contents.
    additionalClasses: '' // Additional classes to be added to the tooltip element.
  };

  $.extend($.context_tooltips, {
    get: function(identifier) {
      return $.context_tooltips._tooltips[identifier];
    },

    set: function(identifier, contextTooltip) {
      $.context_tooltips._tooltips[identifier] = contextTooltip;
    },

    add: function(tooltipElementsMatcher, options) {
      $(tooltipElementsMatcher).context_tooltip(options);
    },

    close: function(tooltipElementId) {
      $.context_tooltips.get(tooltipElementId).close();
    },

    toId: function(value) {
      if (value && value.split) {
        return value.replace(/[.#\[\]=]/g, '').replace(/ /g, '_');
      }
      return null;
    }
  });

  function ContextTooltip(tooltipElement, options) {
    this.options = $.extend({}, $.context_tooltips.defaults, options);

    this.rawTooltipElementId = $.context_tooltips.toId(tooltipElement);
    this.tooltipElement = $(tooltipElement);

    this.contextElement = this.options.contextElement ? $("#" + this.options.contextElement) : this.tooltipElement.parent();

    // Initializing some utility flags.
    this.isContextBeingGrabbed = false;

    // Used to hold current mouse position.
    this.currentMouseX = 0;
    this.currentMouseY = 0;

    this.createBoundedMethods();
    this.initializeTooltipDelayedIfNecessary();
  }

  $.extend(ContextTooltip.prototype, {
    createBoundedMethods: function() {
      this.createBoundedMethod('display');
      this.createBoundedMethod('displayWithoutCheck');
      this.createBoundedMethod('displayByClick');
      this.createBoundedMethod('hide');
      this.createBoundedMethod('hideByClick');
      this.createBoundedMethod('close');
      this.createBoundedMethod('contextGrabbedEvent');
      this.createBoundedMethod('contextReleasedEvent');
      this.createBoundedMethod('updateCurrentMousePosition');
      this.createBoundedMethod('updateTooltipContents');
      this.createBoundedMethod('createAndInitializeTooltip');
      this.createBoundedMethod('initializeTooltip');
    },

    initializeTooltipDelayedIfNecessary: function() {
      if (this.options.displayWhenClicked) {
        this.registerClickedContextMouseEvents();
      }

      if (this.options.onWindowLoad) {
        if (this.hasTooltipElement()) {
          this.log('It has a tooltip element, it will be initialized when the page is loaded.');
          this.initializeTooltipWhenWindowIsLoaded();

        } else {
          this.log("It doesn't have a tooltip element, one will be created and initialized when the page is loaded.");
          this.createAndInitializeTooltipWhenWindowIsLoaded();
        }
      } else {
        if (this.hasTooltipElement()) {
          this.log('It has a tooltip element, it will be initialized now.');
          this.initializeTooltip();
        } else {
          this.log("It doesn't have a tooltip element, one will be created and initialized now.");
          this.createAndInitializeTooltip();
        }
      }
    },

    createAndInitializeTooltipWhenWindowIsLoaded: function() {
      $(document).ready(this.createAndInitializeTooltipBounded);
    },

    initializeTooltipWhenWindowIsLoaded: function() {
      $(document).ready(this.initializeTooltipBounded);
    },

    createAndInitializeTooltip: function() {
      this.createTooltip();
      this.initializeTooltip();
    },

    createTooltip: function() {
      var tooltip_element = $('#' + this.rawTooltipElementId)
      if (this.elementExists(tooltip_element)) {
        this.log("Tooltip element already created, just using it.");
        this.tooltipElement = tooltip_element;
      } else {
        this.log("Creating tooltip");
        $("body").append('<div id="' + this.rawTooltipElementId + '"></div>')
        this.tooltipElement = $('#' + this.rawTooltipElementId);
        this.log("Tooltip created");
      }
    },

    initializeTooltip: function() {
      this.log("Initializing tooltip");
      this.tooltipElement.addClass(this.options.additionalClasses);
      this.tooltipElement.hide();
      this.registerMouseEvents();
      this.log("Tooltip initialized");
    },

    hasTooltipElement: function() {
      return this.elementExists(this.tooltipElement);
    },

    elementExists: function(element) {
      return !(element == null || element.size() == 0 || element.attr('id') == "");
    },

    registerMouseEvents: function() {
      this.log("Registering mouse events.");
      this.registerExtraMouseEvents();
      this.registerTooltipMouseEvents();
      this.registerContextMouseEvents();
      this.log("Mouse events registered.");
    },

    registerExtraMouseEvents: function() {
      // It is not necessary to update the current mouse position for tooltips
      // which are displayed only when clicked.
      if (!this.options.displayWhenClicked) {
        // We need the current mouse position, so we observe each mouse move event
        // on the document and update the mouse position accordingly.
        $(document).mousemove(this.updateCurrentMousePositionBounded);
      }
    },

    registerTooltipMouseEvents: function() {
      if (!this.options.remoteUrlOptions) {
        this.registerCloseTooltipEvents();
      }

      if (!this.options.displayWhenClicked) {
        // Hovering out from the tooltip element should hide it if necessary.
        this.tooltipElement.mouseout(this.hideBounded);

        if (this.options.click == 'hide') {
          this.log("Clicking on the tooltip will hide it.");
          this.tooltipElement.mousedown(this.hideByClickBounded);
        } else {
          this.log("Clicking on the tooltip will keep it visible.");
        }
      }
    },

    registerContextMouseEvents: function() {
      if (!this.options.displayWhenClicked) {
        this.log("Tooltip will be displayed when hovered.");

        // The show/hide events are binded to the mouse over and mouse out,
        // respectively, for the context element.
        this.contextElement.mouseover(this.displayBounded);
        this.contextElement.mouseout(this.hideBounded);

        // Triggering context grabbed and released events on clicks.
        this.contextElement.mousedown(this.contextGrabbedEventeBounded);
        this.contextElement.mouseup(this.contextReleasedEventBounded);

        if (this.options.contextClick == 'hide') {
          this.log("Clicking on the context will hide the tooltip.");
          this.contextElement.mousedown(this.hideByClickBounded);
        }
        else {
          this.log("Clicking on the context will keep the tooltip visible.");
        }
      }
    },

    registerClickedContextMouseEvents: function() {
      this.log("Tooltip will be displayed when clicked.");
      this.contextElement.click(this.displayWithoutCheckBounded);
    },

    registerCloseTooltipEvents: function() {
      // Elements with a "close" class inside tooltips will close the tooltip when clicked.
      this.log("Registering close events for elements with 'close' class.")
      this.tooltipElement.find('.close').click(this.closeBounded);
    },

    display: function(event) {
      if (this.options.delayWhenDisplaying) {
        this.displayDelayed(null);
      } else {
        // We always need to delay the show/hide event a little bit, because the
        // mouseover event is fired when the user passes its mouse over the first
        // pixel of the element. Unfortunately, browsers do not return the
        // position of elements with accuracy, so we delay the call for 50ms.
        this.displayDelayed(0.05);
      }
    },

    displayDelayed: function(delay) {
      this.callDelayed(delay || this.options.displayDelay, "displayNow");
    },

    displayNow: function() {
      if (this.shouldDisplay()) {
        this.log("Displaying tooltip.");
        this.displayWithoutCheck();
      }
    },

    displayByClick: function(event) {
      if (this.shouldDisplayByClick(event)) {
        this.log("Displaying tooltip by click event.");
        this.displayWithoutCheck();
      }
    },

    displayWithoutCheck: function() {
      if (this.options.remoteUrlOptions) {
        this.tooltipElement.html('') // emptying the tooltip element.
      }

      if (this.options.position != 'none') {
        this.make_positioned();
      }

      if (this.options.remoteUrlOptions) {
        this.loadTooltipContents();
      } else {
        this.displayWithEffect();
      }
    },

    displayWithEffect: function() {
      if (this.options.displayEffect == 'appear') {
        this.tooltipElement.fadeIn(this.options.displayEffectOptions.duration * 1000);
      } else {
        this.tooltipElement.show();
      }
    },

    loadTooltipContents: function() {
      var defaultUrlOptions = {
        dataType: 'html',
        type: 'get',
        success: this.updateTooltipContentsBounded
      }

      $.ajax($.extend(defaultUrlOptions, this.options.remoteUrlOptions));
    },

    updateTooltipContents: function(html){
      this.tooltipElement.html(html);
      if (this.options.position != 'none') {
        this.make_positioned();
      }
      this.registerCloseTooltipEvents();
      this.displayWithEffect();
    },

    make_positioned: function() {
      var contextElementOffset = this.contextElement.offset();
      var contextElementWidth = this.contextElement.outerWidth();
      var contextElementHeight = this.contextElement.outerHeight();
      var tooltipElementWidth = this.tooltipElement.outerWidth();
      var tooltipElementHeight = this.tooltipElement.outerHeight();

      var top = contextElementOffset.top;
      var left = contextElementOffset.left;

      var parsed_position = this.parse_position();
      for (var index = 0; index < parsed_position.length; index++) {
        var position = parsed_position[index];
        switch (position) {
          case 'right':
            left = (contextElementOffset.left + contextElementWidth);
            break;
          case 'left':
            left = (contextElementOffset.left - tooltipElementWidth);
            break;
          case 'top':
            top = (contextElementOffset.top - tooltipElementHeight);
            break;
          case 'bottom':
            top = (contextElementOffset.top + contextElementHeight);
            break;
          default:
            // do nothing, tooltip will be positioned by CSS.
            break;
        }
      }

      this.tooltipElement.css({
        'position': 'absolute',
        'top': top + this.options.verticalOffset,
        'left': left + this.options.horizontalOffset
      });
    },

    parse_position: function() {
      return this.options.position.split('-');
    },

    shouldDisplay: function() {
      return (!this.tooltipElement.is(':visible') && !this.isContextBeingGrabbed && this.mouseInContextOrTooltip());
    },

    shouldDisplayByClick: function(event) {
      return this.mouseInContext();
    },

    hide: function(event) {
      if (this.options.delayWhenHiding) {
        this.hideDelayed(event, null);
      } else {
        // We always need to delay the show/hide event a little bit, because the
        // mouseover event is fired when the user passes its mouse over the first
        // pixel of the element. Unfortunately, browsers do not return the
        // position of elements with accuracy, so we delay the call for 50ms.
        this.hideDelayed(event, 0.05);
      }
    },

    hideDelayed: function(event, delay) {
      this.callDelayed(delay || this.options.hideDelay, "hideNow", event);
    },

    hideNow: function() {
      if (this.shouldHide()) {
        this.log("Hiding tooltip.");
        this.hideWithoutCheck();
      }
    },

    hideWithoutCheck: function() {
      if (this.options.hideEffect == 'fade') {
        this.tooltipElement.fadeOut(this.options.hideEffectOptions.duration * 1000);
      } else {
        this.tooltipElement.hide();
      }
    },

    hideByClick: function(event) {
      if (this.shouldHideByClick(event)) {
        this.log("Hiding tooltip by click event.");
        this.hideWithoutCheck();
      }
    },

    close: function() {
      this.hideWithoutCheck();
    },

    shouldHide: function() {
      return (this.tooltipElement.is(':visible') && !this.mouseInContextOrTooltip());
    },

    shouldHideByClick: function(event) {
      return this.shouldHideByTooltipClick(event) || this.shouldHideByContextClick(event);
    },

    shouldHideByTooltipClick: function(event) {
      return this.options.click == 'hide' && this.tooltipClicked(event)
    },

    shouldHideByContextClick: function(event) {
      return this.options.contextClick == 'hide' && this.contextClicked(event)
    },

    isContained: function(object, x, y) {
      var offset = object.offset();
      var objectX = offset.left;
      var objectY = offset.top;
      var objectWidth = object.width();
      var objectHeight = object.height();
      return (x >= objectX && x < (objectX + objectWidth) && y >= objectY && y < (objectY + objectHeight));
    },

    isContainedByEvent: function(object, event) {
      return this.isContained(object, event.pageX, event.pageY);
    },

    contextGrabbedEvent: function(event) {
      if (this.isContainedByEvent(this.contextElement, event)) {
        this.log("Context grabbed.");
        this.isContextBeingGrabbed = true;
      }
    },

    contextReleasedEvent: function(event) {
      if (this.isContextBeingGrabbed) {
        this.log("Context released.");
        this.isContextBeingGrabbed = false;
      }
    },

    contextClicked: function(event) {
      // Just check if the click happened over the context element.
      return this.isContainedByEvent(this.contextElement, event);
    },

    tooltipClicked: function(event) {
      // Either the tooltip element was clicked or one of his descendants.
      return event.target == this.tooltipElement || this.tooltipElement.find(event.target).length > 0;
    },

    mouseInContextOrTooltip: function() {
      return this.mouseInContext() || this.mouseInTooltip();
    },

    mouseInContext: function() {
      return this.isContained(this.contextElement, this.currentMouseX, this.currentMouseY);
    },

    mouseInTooltip: function() {
      return this.isContained(this.tooltipElement, this.currentMouseX, this.currentMouseY);
    },

    updateCurrentMousePosition: function(event) {
      this.currentMouseX = event.pageX;
      this.currentMouseY = event.pageY;
    },

    log: function(message) {
      if (this.options.debug) {
        var tooltipElementId = this.hasTooltipElement() ? this.tooltipElement.attr('id') : this.rawTooltipElementId;
        console.log(Date() + " " + message + " [" + tooltipElementId + "/" + this.contextElement.attr('id') + "]");
      }
    },

    createBoundedMethod: function(methodName) {
      var self = this;
      self[methodName + "Bounded"] = function(event) {
        return self[methodName].apply(self, [event || window.event].concat(arguments));
      }
    },

    callDelayed: function(delay, methodName, event) {
      var self = this;
      return window.setTimeout(function() {
        self[methodName].apply(self, [event || window.event]);
      }, delay * 1000);
    }
  });

  /* jQuery plugin. */
  $.fn.context_tooltip = function(options) {
    if (this.size() > 0) {
      return this.each(function() {
        $.context_tooltips.set($(this).attr('id'), new ContextTooltip($(this), options));
      });
    } else {
      $.context_tooltips.set($.context_tooltips.toId(this.selector), new ContextTooltip(this.selector, options));
      return this;
    }
  }

})(jQuery);

$(document).ready(initUnobtrusiveContextTooltip);
