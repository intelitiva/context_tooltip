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
    this.keepHiddenTimeout = false;
    this.isContextBeingGrabbed = false;

    this.options = {
      onWindowLoad: true,
      delayWhenDisplaying: true,
      delayWhenHiding: true,
      displayDelay: 2,
      hideDelay: 2,
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
    this.createBoundedMethod('hideByClick');
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
      this.tooltipElement.observe('mousedown', this.hideByClickBounded);
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
      this.contextElement.observe('mousedown', this.hideByClickBounded);
    }
    else {
      this.log("Clicking on the context will keep the tooltip visible.");
    }
  },
  
  display: function(event) {
    if (this.options.delayWhenDisplaying) {
      this.displayDelayed(event);
    }
    else {
      this.displayNow(event);
    }
  },

  displayDelayed: function(event) {
    this.callDelayed(this.options.displayDelay, "displayNow", event);
  },

  displayNow: function(event) {
    if (this.shouldDisplay(event)) {
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

  shouldDisplay: function(event) {
    return (!this.tooltipElement.visible() && !this.isContextBeingGrabbed && this.mouseInContextOrTooltip(event));
  },
  
  hide: function(event) {
    if (this.options.delayWhenHiding) {
      this.hideDelayed(event);
    }
    else {
      this.hideNow(event);
    }
  },

  hideDelayed: function(event) {
    this.keepVisibleTimeout = this.callDelayed(this.options.hideDelay, "hideNow", event);
    if (this.options.hover == 'keep') {
      this.tooltipElement.observe('mouseover', this.keepVisibleBounded);
    }

    if (this.isContainedByEvent(this.contextElement, event)) {
      this.contextElement.observe('mouseover', this.keepVisibleBounded);
    }
    else if (this.options.hover != 'keep') {
      this.contextElement.stopObserving('mouseover', this.keepVisibleBounded);
    }
  },
  
  hideNow: function(event) {
    if (this.shouldHide(event)) {
      this.log("Hiding tooltip.");

      var hideEffect = this.hideEffect();
      if (hideEffect == null) {
        this.tooltipElement.hide();
      }
      else {
        new hideEffect(this.tooltipElement, this.options.hideEffectOptions);
      }
      
      if (this.options.hover == 'keep') {
        this.tooltipElement.stopObserving('mouseover', this.keepVisibleBounded);
      }
      this.contextElement.stopObserving('mouseover', this.keepVisibleBounded);
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

  shouldHide: function(event) {
    return (this.tooltipElement.visible() && !this.mouseInContextOrTooltip(event));
  },
  
  hideByClick: function(event) {
    if ((this.options.contextClick == 'hide' && this.isContainedByEvent(this.contextElement, event)) ||
        (this.options.click == 'hide' && (event.element().descendantOf(this.tooltipElement)) || event.element() == this.tooltipElement)) {
      this.log("Hiding tooltip by click event.");
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
  },

  mouseInContextOrTooltip: function(event) {
    // TODO: Get current mouse position using document.observe("mousemove")

    // This code gets the mouse when the event was fired, so it does not works well.
    if (this.isContainedByEvent(this.contextElement, event)) {
      this.log("Mouse over context element.");
      return true;
    }
    else if (this.isContainedByEvent(this.tooltipElement, event)) {
      this.log("Mouse over tooltip element.");
      return true;
    }
    else {
      this.log("Mouse is not over context nor tooltip element.");
      return false;
    }
  },

  callDelayed: function(delay, methodName, event) {
    var self = this;
    return window.setTimeout(function() {
      self[methodName].apply(self, [event || window.event]);
    }, delay * 1000);
  }
});

function init_unobtrusive_context_tooltip() {
  $$('.tooltip').each(function(element) {
    new ContextTooltip(element, { onWindowLoad: false });
  })
}