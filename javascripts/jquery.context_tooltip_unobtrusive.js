var context_tooltips = new Array();

function createTooltipElement(tooltip_element_id) {
  tooltip_element_id = tooltip_element_id.replace(/[.#\[\]=]/g, '').replace(/ /g, '_')
  $("body").append("<div id='" + tooltip_element_id + "' style='display:none;'></div>")
  return "#" + tooltip_element_id;
}

function addContextTooltip(tooltip_elements, options) {
  if ($(tooltip_elements).length == 0) {
    tooltip_elements = createTooltipElement(tooltip_elements);
  }

  $(tooltip_elements).context_tooltip(options);
}

function findContextTooltip(tooltip_element_id) {
  var tooltipElement = $("#" + tooltip_element_id);
  var selected_context_tooltip = null;
  context_tooltips.forEach(function(context_tooltip) {
    if (context_tooltip.tooltipElement.attr('id') == tooltipElement.attr('id')) {
      selected_context_tooltip = context_tooltip;
    }
  });
  return selected_context_tooltip;
}

function closeContextTooltip(tooltip_element_id) {
  var context_tooltip = findContextTooltip(tooltip_element_id);
  context_tooltip.hideWithoutCheck();
}

function ContextTooltip(tooltipElement, options) {
  this.rawTooltipElement = tooltipElement;
  this.tooltipElement = $(tooltipElement);
  
  // Initializing some utility flags.
  this.isContextBeingGrabbed = false;

  // Used to hold current mouse position.
  this.currentMouseX = 0;
  this.currentMouseY = 0;

  // Setting options based on the given options and the defaults.
  this.defaults = {
    onWindowLoad: true,
    displayWhenClicked: false,
    delayWhenDisplaying: true,
    delayWhenHiding: true,
    displayDelay: 0.2,
    hideDelay: 0.2,
    contextClick: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip when the context is clicked.
    click: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip on click.
    displayEffect: 'appear', // Possible values: appear, none;
    displayEffectOptions: { duration: 0.5 },
    hideEffect: 'fade', // Possible values: fade, none;
    hideEffectOptions: { duration: 0.5 },
    contextElement: null, // The context element to be used instead of the direct parent.
    position: 'none', // Enter values like: top-left, bottom-right, or just top, right, bottom, left.
    horizontalOffset: 0, // A horizontal offset used for positioned tooltips.
    verticalOffset: 0, // A vertical offset used for positioned tooltips.
    remoteUrlOptions: false, // Ajax options to be used when loading tooltip contents.
    additionalClasses: '' // Additional classes to be added to the tooltip element.
  }
  this.options = $.extend(this.defaults, options);

  this.tooltipElement.toggleClass(this.options.additionalClasses, true);

  this.contextElement = this.options.contextElement ? $("#" + this.options.contextElement) : this.tooltipElement.parent();

  // If an element with this id is set, we will update it every time a log
  // is added.
  this._logger = $('#javascript-log');

  this.createBoundedMethods();
  this.tooltipElement.hide();
  this.registerMouseEventsDelayedIfNecessary();
}

ContextTooltip.prototype = {
  log: function(msg) {
    if (this._logger != null) {
      this._logger.append("<p>" + Date() + " " + msg + " [" + this.tooltipElement.attr('id') + "/" + this.contextElement.attr('id') + "]" + "</p>");
      this._logger.attr('scrollTop', this._logger.attr('scrollHeight'));
    }
  },
  
  createBoundedMethods: function() {
    this.createBoundedMethod('display');
    this.createBoundedMethod('hide');
    this.createBoundedMethod('displayWithoutCheck');
    this.createBoundedMethod('hideWithoutCheck');
    this.createBoundedMethod('contextGrabbedEvent');
    this.createBoundedMethod('contextReleasedEvent');
    this.createBoundedMethod('registerMouseEvents');
    this.createBoundedMethod('updateCurrentMousePosition');
    this.createBoundedMethod('log');
    this.createBoundedMethod('displayByClick');
    this.createBoundedMethod('hideByClick');
  },

  createBoundedMethod: function(methodName) {
    var self = this;
    self[methodName + "Bounded"] = function(event) {
      return self[methodName].apply(self, [event || window.event].concat(arguments));
    }
  },

  registerMouseEventsDelayedIfNecessary: function() {
    // Checking if we need to wait for the whole window document to be loaded
    // before registering the events.
    if (this.options.onWindowLoad) {
      this.log("Registering events on window load.");
      $(document).ready(this.registerMouseEventsBounded);
    }
    else {
      // Registering the events right away (useful when adding tooltips after
      // the page is loaded, i.e., ajax calls).
      this.log("Registering events right now.");
      this.registerMouseEvents();
    }
  },

  registerMouseEvents: function() {
    this.log("Registering mouse events.");
    this.registerExtraMouseEvents();
    this.registerTooltipMouseEvents();
    this.registerContextMouseEvents();
    this.log("Mouse events registered.");
  },

  registerExtraMouseEvents: function() {
    // We need the current mouse position, so we observe each mouse move event
    // on the document and update the mouse position accordingly.
    $(document).mousemove(this.updateCurrentMousePositionBounded);
  },

  registerTooltipMouseEvents: function() {
    if (this.options.displayWhenClicked) {
      var self = this;
      $('.tooltip .close').each(function() {
        $(this).click(self.hideByClickBounded);
      });
    }
    else {
      // Hovering out from the tooltip element should hide it if necessary.
      this.tooltipElement.mouseout(this.hideBounded);

      if (this.options.click == 'hide') {
        this.log("Clicking on the tooltip will hide it.");
        this.tooltipElement.mousedown(this.hideByClickBounded);
      }
      else {
        this.log("Clicking on the tooltip will keep it visible.");
      }
    }
  },

  registerContextMouseEvents: function() {
    if (this.options.displayWhenClicked) {
      this.log("Tooltip will be displayed when clicked.");
      this.contextElement.click(this.displayByClickBounded);
    }
    else {
      this.log("Tooltip will be displayed when hovered.");
      
      // The show/hide events are binded to the mouse over and mouse out,
      // respectively, for the context element.
      this.contextElement.mouseover(this.displayBounded);
      this.contextElement.mouseout(this.hideBounded);

      // Triggering context grabbed and released events on clicks.
      this.contextElement.mousedown(this.contextGrabbedBounded);
      this.contextElement.mouseup(this.contextReleasedBounded);

      if (this.options.contextClick == 'hide') {
        this.log("Clicking on the context will hide the tooltip.");
        this.contextElement.mousedown(this.hideByClickBounded);
      }
      else {
        this.log("Clicking on the context will keep the tooltip visible.");
      }
    }
  },

  display: function(event) {
    if (this.options.delayWhenDisplaying) {
      this.displayDelayed(null);
    }
    else {
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
    
    if (this.options.displayEffect == 'appear') {
      this.tooltipElement.fadeIn(this.options.displayEffectOptions.duration * 1000);
    }
    else {
      this.tooltipElement.show();
    }

    if (this.options.remoteUrlOptions) {
      this.loadTooltipContents();
    }
  },

  loadTooltipContents: function() {
    var self = this;
    var defaultUrlOptions = {
      dataType: 'html',
      type: 'get',
      success: function(html){
        self.tooltipElement.append(html);
      }
    }

    var remoteUrlOptions = $.extend(defaultUrlOptions, this.options.remoteUrlOptions);
    $.ajax(remoteUrlOptions);
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
    }
    else {
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
    }
    else {
      this.tooltipElement.hide();
    }
  },

  hideByClick: function(event) {
    if (this.shouldHideByClick(event)) {
      this.log("Hiding tooltip by click event.");
      this.hideWithoutCheck();
    }
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
    return event.target == this.tooltipElement || this.tooltipElement.children(event.target).length > 0;
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

  callDelayed: function(delay, methodName, event) {
    var self = this;
    return window.setTimeout(function() {
      self[methodName].apply(self, [event || window.event]);
    }, delay * 1000);
  }
};

(function($){
  $.fn.context_tooltip = function(options) {
    return this.each(function() {
      context_tooltips.push(new ContextTooltip($(this), options));
    });
  };
})(jQuery);

function init_unobtrusive_context_tooltip() {
  $('.tooltip').context_tooltip();
}

$(document).ready(init_unobtrusive_context_tooltip);
