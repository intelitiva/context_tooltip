function addContextTooltip(tooltip_elements, options) {
  $(tooltip_elements).context_tooltip(options);
}

function ContextTooltip(tooltipElement, contextElement, options) {
  this.tooltipElement = tooltipElement;
  this.contextElement = contextElement;

  this.tooltipElement.hide();

  this.keepVisibleTimeout = false;

  this.enabled = true;

  this.isContextBeingGrabbed = false;

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

  this.createBoundedMethods();

  this.registerMouseEvents();
}

ContextTooltip.prototype = {
  createBoundedMethods: function() {
    this.createBoundedMethod('_registerMouseEvents');
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

  registerMouseEvents: function() {
    if (this.options.onWindowLoad) {
      $(document).ready(this._registerMouseEventsBounded);
    }
    else {
      this._registerMouseEvents();
    }
  },

  _registerMouseEvents: function() {
    this.registerTooltipMouseEvents();
    this.registerContextMouseEvents();
  },

  registerTooltipMouseEvents: function() {
    if (this.options.click == 'hide') {
      this.tooltipElement.mousedown(this.hideWithoutEffectBounded);
    }
  },

  registerContextMouseEvents: function() {
    this.contextElement.mouseover(this.displayBounded)
    this.contextElement.mouseout(this.hideBounded)

    if (this.options.contextClick == 'hide') {
      this.contextElement.mousedown(this.contextGrabbedBounded);
      this.contextElement.mousedown(this.hideWithoutEffectBounded);
      this.contextElement.mouseup(this.contextReleasedBounded);
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
      new ContextTooltip($(this), $(this).parent(), options);
    });
  };
})(jQuery);

function init_unobtrusive_context_tooltip() {
  $('.tooltip').context_tooltip();
}