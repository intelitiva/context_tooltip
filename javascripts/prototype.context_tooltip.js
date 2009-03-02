// This globar variable holds a reference for each tooltip added, keyed by its
// HTML ID.
var context_tooltips = $H();

function addContextTooltip(tooltip_elements, options) {
  $$(tooltip_elements).each(function(element) {
    context_tooltips.set(element.id, new ContextTooltip(element, options));
  })
}

function closeTooltip(tooltip_element_id) {
  var context_tooltip = context_tooltips.get(tooltip_element_id);
  context_tooltip.hideWithoutCheck();
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

    this.currentMouseX = 0;
    this.currentMouseY = 0;

    this.options = {
      onWindowLoad: true,
      displayWhenClicked: false,
      delayWhenDisplaying: true,
      delayWhenHiding: true,
      displayDelay: 0.2,
      hideDelay: 0.2,
      contextClick: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip when the context is clicked.
      click: 'hide', // Possible values: hide, keep; Hides or keeps the tooltip on click.
      hover: 'keep', // Possible values: hide, keep; Hides or keeps the tooltip on hover.
      displayEffect: 'appear', // Possible values: appear, none;
      displayEffectOptions: { duration: 0.5 },
      hideEffect: 'fade', // Possible values: fade, none;
      hideEffectOptions: { duration: 0.5 }
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
    this.createBoundedMethod('displayWithoutCheck');
    this.createBoundedMethod('hideWithoutCheck');
    this.createBoundedMethod('contextGrabbedEvent');
    this.createBoundedMethod('contextReleasedEvent');
    this.createBoundedMethod('registerMouseEvents');
    this.createBoundedMethod('updateCurrentMousePosition');
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
    this.registerExtraMouseEvents();
    this.registerTooltipMouseEvents();
    this.registerContextMouseEvents();
    this.log("Mouse events registered.");
  },

  registerExtraMouseEvents: function() {
    // We need the current mouse position, so we observe each mouse move event
    // on the document and update the mouse position accordingly.
    document.observe('mousemove', this.updateCurrentMousePositionBounded);
  },

  registerTooltipMouseEvents: function() {
    if (this.options.displayWhenClicked) {
      $$('.tooltip .close').invoke('observe', 'click', this.hideByClickBounded);
    }
    else {
      if (this.options.click == 'hide') {
        this.log("Clicking on the tooltip will hide it.");
        this.tooltipElement.observe('mousedown', this.hideByClickBounded);
      }
      else {
        this.log("Clicking on the tooltip will keep it visible.");
      }
    }
  },

  registerContextMouseEvents: function() {
    if (this.options.displayWhenClicked) {
      this.log("Tooltip will be displayed when clicked.");
      this.contextElement.observe('click', this.displayWithoutCheckBounded);
    }
    else {
      this.log("Tooltip will be displayed when hovered.");

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
    }
  },
  
  display: function(event) {
    if (this.options.delayWhenDisplaying) {
      this.displayDelayed();
    }
    else {
      this.displayNow();
    }
  },

  displayDelayed: function() {
    this.callDelayed(this.options.displayDelay, "displayNow");
  },

  displayNow: function() {
    if (this.shouldDisplay()) {
      this.log("Displaying tooltip.");
      this.displayWithoutCheck();
    }
  },

  displayWithoutCheck: function() {
    var displayEffect = this.displayEffect();
    if (displayEffect == null) {
      this.tooltipElement.show();
    }
    else {
      new displayEffect(this.tooltipElement, this.options.displayEffectOptions);
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

  shouldDisplay: function() {
    return (!this.tooltipElement.visible() && !this.isContextBeingGrabbed && this.mouseInContextOrTooltip());
  },
  
  hide: function(event) {
    if (this.options.delayWhenHiding) {
      this.hideDelayed(event);
    }
    else {
      this.hideNow();
    }
  },

  hideDelayed: function(event) {
    this.callDelayed(this.options.hideDelay, "hideNow", event);
  },
  
  hideNow: function() {
    if (this.shouldHide()) {
      this.log("Hiding tooltip.");
      this.hideWithoutCheck();
    }
  },

  hideWithoutCheck: function() {
    var hideEffect = this.hideEffect();
    if (hideEffect == null) {
      this.tooltipElement.hide();
    }
    else {
      new hideEffect(this.tooltipElement, this.options.hideEffectOptions);
    }
  },

  hideByClick: function(event) {
    if (this.shouldHideByClick(event)) {
      this.log("Hiding tooltip by click event.");
      this.hideWithoutCheck();
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

  shouldHide: function() {
    return (this.tooltipElement.visible() && !this.mouseInContextOrTooltip());
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
    return Position.within(object, x, y);
  },
  
  isContainedByEvent: function(object, event) {
    return this.isContained(object, event.pointerX(), event.pointerY());
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
    return event.element() == this.tooltipElement || event.element().descendantOf(this.tooltipElement);
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
    this.currentMouseX = event.pointerX();
    this.currentMouseY = event.pointerY();
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
    context_tooltips.set(element.id, new ContextTooltip(element, { onWindowLoad: false }));
  })
}