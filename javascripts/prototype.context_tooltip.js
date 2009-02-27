function addContextTooltip(tooltip_elements, options) {
  $$(tooltip_elements).each(function(element) {
    new ContextTooltip(element, options);
  })
}

var ContextTooltip = Class.create({
  initialize: function(tooltipElement, options) {
    this.tooltipElement = $(tooltipElement);
    this.contextElement = this.tooltipElement.up();
    
    // Hiding the tooltip element.
    this.tooltipElement.hide();

    this.keepVisibleTimeout = false;
    this.isContextBeingGrabbed = false;

    this.options = {
      onWindowLoad: true,
      delayed: true,
      delay: 0.2,
      contextClick: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip when the context is clicked.
      click: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip on click.
      hover: 'keep', // Possible values: hide, keep; Hides or keeps the tooltip on hover.
      displayEffect: 'appear', // Possible values: appear, none;
      displayEffectOptions: { duration: 0.2 },
      hideEffect: 'fade', // Possible values: fade, none;
      hideEffectOptions: { duration: 0.2 }
    };
    Object.extend(this.options, options || { });
    
    // If an element with this id is set, we will update it every time a log
    // is added.
    this._logger = $('javascript-log');

    this.createBoundedMethods();
    this.registerMouseEventsDelayedIfNecessary();
  },
  
  log: function(msg) {
    if (this._logger != null) {
      this._logger.insert("<p>" + Date() + " " + msg + " [" + this.tooltipElement.id + "/" + this.contextElement.id + "]" + "</p>");
      this._logger.scrollTop = this._logger.scrollHeight;
    }
  },
  
  createBoundedMethods: function() {
    this.createBoundedMethod('display');
    this.createBoundedMethod('hide');
    this.createBoundedMethod('keepVisible');
    this.createBoundedMethod('contextGrabbedEvent');
    this.createBoundedMethod('contextReleasedEvent');
    this.createBoundedMethod('registerMouseEvents');
    this.createBoundedMethod('log');
    this.createBoundedMethod('hideWithoutEffect');
  },
  
  createBoundedMethod: function(methodName) {
    this[methodName + "Bounded"] = this[methodName].bindAsEventListener(this)
  },
  
  registerMouseEventsDelayedIfNecessary: function() {
    // Checking if we need to wait for the whole window document to be loaded
    // before registering the events.
    if (this.options.onWindowLoad) {
      this.log("Registering events on window load.");
      Event.observe(window, 'load', this.registerMouseEventsBounded);
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
      this.tooltipElement.observe('mousedown', this.hideWithoutEffectBounded);
    }
    else {
      this.log("Clicking on the tooltip will keep it visible.");
    }
  },

  registerContextMouseEvents: function() {
    // The show/hide events are binded to the mouse over and mouse out,
    // respectively, for the context element.
    this.contextElement.observe('mouseover', this.displayBounded);
    this.contextElement.observe('mouseout', this.hideBounded);

    // Triggering context grabbed and released events on clicks.
    this.contextElement.observe('mousedown', this.contextGrabbedEventBounded);
    this.contextElement.observe('mouseup', this.contextReleasedEventBounded);

    if (this.options.contextClick == 'hide') {
      this.log("Clicking on the context will hide the tooltip.");
      this.contextElement.observe('mousedown', this.hideWithoutEffectBounded);
    }
    else {
      this.log("Clicking on the context will keep the tooltip visible.");
    }
  },
  
  display: function(event) {
    if (!this.tooltipElement.visible() && !this.isContextBeingGrabbed) {
      this.log("Displaying tooltip.");
      
      var displayEffect = this.displayEffect();
      if (displayEffect == null) {
        this.tooltipElement.show();
      }
      else {
        new displayEffect(this.tooltipElement, this.options.displayEffectOptions);
      }
    }
  },

  displayEffect: function() {
    if (this.options.displayEffect == 'appear') {
      return Effect.Appear;
    }
    else {
      return null;
    }
  },
  
  hide: function(event) {
    if (this.options.delayed) {
      this.keepVisibleTimeout = this._hide.delay(this.options.delay, this);
      if (this.options.hover == 'keep') {
        this.tooltipElement.observe('mouseover', this.keepVisibleBounded);
      }
      
      if (this.isContainedByEvent(this.contextElement, event)) {
        this.contextElement.observe('mouseover', this.keepVisibleBounded);
      }
      else if (this.options.hover != 'keep') {
        this.contextElement.stopObserving('mouseover', this.keepVisibleBounded);
      }
    }
    else {
      this._hide(this);
    }
  },
  
  _hide: function(object) {
    if (object.tooltipElement.visible()) {
      object.log("Hiding tooltip.");

      var hideEffect = object.hideEffect();
      if (hideEffect == null) {
        object.tooltipElement.hide();
      }
      else {
        new hideEffect(object.tooltipElement, object.options.hideEffectOptions);
      }
      
      if (object.options.hover == 'keep') {
        object.tooltipElement.stopObserving('mouseover', object.keepVisibleBounded);
      }
      object.contextElement.stopObserving('mouseover', object.keepVisibleBounded);
    }
  },

  hideEffect: function() {
    if (this.options.hideEffect == 'fade') {
      return Effect.Fade;
    }
    else {
      return null;
    }
  },
  
  hideWithoutEffect: function(event) {
    if ((this.options.contextClick == 'hide' && this.isContainedByEvent(this.contextElement, event)) ||
        (this.options.click == 'hide' && event.element().descendantOf(this.tooltipElement))) {
      this.log("Hiding tooltip without effect.");
      this.tooltipElement.hide();
    }
  },
  
  isContainedByEvent: function(object, event) {
    return Position.within(object, event.pointerX(), event.pointerY());
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
  
  keepVisible: function(event) {
    if (!this.isContextBeingGrabbed && this.keepVisibleTimeout) {
      this.log("Keeping tooltip visible.");
      window.clearTimeout(this.keepVisibleTimeout)
      this.keepVisibleTimeout = false;
    }
  }
});

function init_unobtrusive_context_tooltip() {
  $$('.tooltip').each(function(element) {
    new ContextTooltip(element, { onWindowLoad: false });
  })
}