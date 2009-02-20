function addContextTooltip(tooltip_elements, options) {
  $$(tooltip_elements).each(function(element) {
    new ContextTooltip(element, options);
  })
}

var ContextTooltip = Class.create({
  initialize: function(tooltipElement, options) {
    this.tooltipElement = $(tooltipElement);
    this.contextElement = this.tooltipElement.up();
    
    this.keepVisibleTimeout = false;
    this.enabled = true;
    
    this.isContextBeingGrabbed = false;
    
    this.options = {
      onWindowLoad: true,
      delayed: true,
      delay: 0.2,
      contextClick: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip when the context is clicked.
      click: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip on click.
      hover: 'keep', // Possible values: hide, keep; Hides or keeps the tooltip on hover.
      displayEffect: Effect.Appear,
      displayEffectOptions: { duration: 0.2 },
      hideEffect: Effect.Fade,
      hideEffectOptions: { duration: 0.2 }
    };
    Object.extend(this.options, options || { });
    
    // If an element with this id is set, we will update it every time a log
    // is added.
    this._logger = $('javascript-log');
    
    this.bindMethods();
    
    // Hiding the tooltip element.
    this.tooltipElement.hide();
    
    // Registering the mouse events.
    this.registerMouseEvents();
  },
  
  log: function(msg) {
    if (this._logger != null) {
      this._logger.insert("<p>" + Date() + " " + msg + " [" + this.tooltipElement.id + "/" + this.contextElement.id + "]" + "</p>");
      this._logger.scrollTop = this._logger.scrollHeight;
    }
  },
  
  bindMethods: function() {
    this._createBoundedMethod('display');
    this._createBoundedMethod('hide');
    this._createBoundedMethod('keepVisible');
    this._createBoundedMethod('contextGrabbedEvent');
    this._createBoundedMethod('contextReleasedEvent');
    this._createBoundedMethod('enable');
    this._createBoundedMethod('disable');
    this._createBoundedMethod('_registerMouseEvents');
    this._createBoundedMethod('log');
    this._createBoundedMethod('hideWithoutEffect');
  },
  
  _createBoundedMethod: function(methodName) {
    this[methodName + "Bounded"] = this[methodName].bindAsEventListener(this)
  },
  
  registerMouseEvents: function() {
    // Checking if we need to wait for the whole window document to be loaded
    // before registering the events.
    if (this.options.onWindowLoad) {
      this.log("Registering events on window load.");
      Event.observe(window, 'load', this._registerMouseEventsBounded);
    }
    else {
      // Registering the events right away (useful when adding tooltips after
      // the page is loaded, i.e., ajax calls).
      this.log("Registering events right now.");
      this._registerMouseEvents(this);
    }
  },
  
  _registerMouseEvents: function() {
    this.log("Registering mouse events.");
    
    // The show/hide events are binded to the mouse over and mouse out,
    // respectively, for the context element.
    this.contextElement.observe('mouseover', this.displayBounded);
    this.contextElement.observe('mouseout', this.hideBounded);
    
    if (this.options.contextClick == 'hide') {
      this.log("Clicking on the context will hide the tooltip.");
      this.contextElement.observe('mousedown', this.contextGrabbedEventBounded);
      this.contextElement.observe('mousedown', this.hideWithoutEffectBounded);
      this.contextElement.observe('mouseup', this.contextReleasedEventBounded);
    }
    else {
      this.log("Clicking on the context will keep the tooltip visible.");
    }
    
    if (this.options.click == 'hide') {
      this.log("Clicking on the tooltip will hide it.");
      this.tooltipElement.observe('mousedown', this.hideWithoutEffectBounded);
    }
    else {
      this.log("Clicking on the tooltip will keep it visible.");
    }
    
    this.log("Mouse events registered.");
  },
  
  unregisterMouseEvents: function() {
    this.log("Unregistering mouse events.");
    
    this.contextElement.stopObserving('mouseover', this.displayBounded);
    this.contextElement.stopObserving('mouseout', this.hideBounded);
    
    if (this.options.contextClick == 'hide') {
      this.contextElement.stopObserving('mousedown', this.contextGrabbedEventBounded);
      this.contextElement.stopObserving('mousedown', this.hideWithoutEffectBounded);
      this.contextElement.stopObserving('mouseup', this.contextReleasedEventBounded);
    }
    
    if (this.options.click == 'hide') {
      this.tooltipElement.stopObserving('mousedown', this.hideWithoutEffectBounded);
    }
    
    this.log("Mouse events unregistered.");
  },
  
  display: function(event) {
    if (!this.tooltipElement.visible() && this.enabled && !this.isContextBeingGrabbed) {
      this.log("Displaying tooltip.");
      new this.options.displayEffect(this.tooltipElement, this.options.displayEffectOptions);
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
      new object.options.hideEffect(object.tooltipElement, object.options.hideEffectOptions);
      
      if (object.options.hover == 'keep') {
        object.tooltipElement.stopObserving('mouseover', object.keepVisibleBounded);
      }
      object.contextElement.stopObserving('mouseover', object.keepVisibleBounded);
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
  
  disable: function(event) {
    this.log("Disabling tooltip.");
    this.enabled = false;
    
    this.unregisterMouseEvents();
    
    // We force it to hide.
    this._hide(this);
  },
  
  enable: function(event) {
    this.log("Enabling tooltip.");
    if (this.options.onWindowLoad) {
      // The window must have been already loaded by now, so don't want it to
      // only register the events when the window loads, but right now.
      this.options.onWindowLoad = false;
    }
    
    this.registerMouseEvents();
    this.enabled = true;
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