function addContextTooltip(tooltip_elements, options) {
  $(tooltip_elements).context_tooltip(options);
}

function ContextTooltip(tooltipElement, options) {
  this.tooltipElement = $(tooltipElement);
  this.contextElement = this.tooltipElement.parent();

  // Hiding the tooltip element.
  this.tooltipElement.hide();

  // Initializing some utility flags.
  this.keepVisibleTimeout = false;
  this.enabled = true;
  this.isContextBeingGrabbed = false;

  // Setting options based on the given options and the defaults.
  this.defaults = {
    onWindowLoad: true,
    delayed: true,
    delay: 0.2,
    contextClick: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip when the context is clicked.
    click: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip on click.
    hover: 'keep', // Possible values: hide, keep; Hides or keeps the tooltip on hover.
    displayEffect: 'appear',
    displayEffectOptions: { duration: 0.2 },
    hideEffect: 'fade',
    hideEffectOptions: { duration: 0.2 }
  }
  this.options = $.extend(this.defaults, options);

  // If an element with this id is set, we will update it every time a log
  // is added.
  this._logger = $('#javascript-log');

  this.createBoundedMethods();
  this.registerMouseEventsDelayedIfNecessary();
}

ContextTooltip.prototype = {
  log: function(msg) {
    if (this._logger != null) {
      this._logger.append("<p>" + Date() + " " + msg + " [" + this.tooltipElement.attr('id') + "/" + this.contextElement.attr('id') + "]" + "</p>");
      this._logger.scrollTop = this._logger.scrollHeight;
    }
  },
  
  createBoundedMethods: function() {
    this.createBoundedMethod('registerMouseEvents');
    this.createBoundedMethod('display');
    this.createBoundedMethod('hide');
    this.createBoundedMethod('hideWithoutEffect');
    this.createBoundedMethod('keepVisible');
    this.createBoundedMethod('contextGrabbed');
    this.createBoundedMethod('contextReleased');
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
    this.registerTooltipMouseEvents();
    this.registerContextMouseEvents();
    this.log("Mouse events registered.");
  },

  registerTooltipMouseEvents: function() {
    if (this.options.click == 'hide') {
      this.log("Clicking on the tooltip will hide it.");
      this.tooltipElement.mousedown(this.hideWithoutEffectBounded);
    }
    else {
      this.log("Clicking on the tooltip will keep it visible.");
    }
  },

  registerContextMouseEvents: function() {
    // The show/hide events are binded to the mouse over and mouse out,
    // respectively, for the context element.
    this.contextElement.mouseover(this.displayBounded);
    this.contextElement.mouseout(this.hideBounded);

    // Triggering context grabbed and released events on clicks.
    this.contextElement.mousedown(this.contextGrabbedBounded);
    this.contextElement.mouseup(this.contextReleasedBounded);

    if (this.options.contextClick == 'hide') {
      this.log("Clicking on the context will hide the tooltip.");
      this.contextElement.mousedown(this.hideWithoutEffectBounded);
    }
    else {
      this.log("Clicking on the context will keep the tooltip visible.");
    }
  },

  display: function() {
    if (!this.tooltipElement.is(':visible')) {
      if (this.options.displayEffect == 'appear') {
        this.tooltipElement.fadeIn(this.options.displayEffectOptions.duration * 1000);
      }
      else {
        this.tooltipElement.show();
      }
    }
  },

  hide: function() {
    if (this.tooltipElement.is(':visible')) {
      if (this.options.hideEffect == 'fade') {
        this.tooltipElement.fadeOut(this.options.hideEffectOptions.duration * 1000);
      }
      else {
        this.tooltipElement.hide();
      }
    }
  },

  hideWithoutEffect: function() {
    this.tooltipElement.hide();
  },

  keepVisible: function() {
    
  },

  contextGrabbed: function() {

  },

  contextReleased: function() {

  }
};

(function($){
  $.fn.context_tooltip = function(options) {
    return this.each(function() {
      new ContextTooltip($(this), options);
    });
  };
})(jQuery);

function init_unobtrusive_context_tooltip() {
  $('.tooltip').context_tooltip();
}