// This globar variable holds a reference for each tooltip added, keyed by its
// HTML ID.
var context_tooltips = $H();

function addContextTooltip(tooltip_elements, options) {
  if ($$(tooltip_elements).size() > 0) {
    $$(tooltip_elements).each(function(element) {
      context_tooltips.set(element.id, new ContextTooltip(element, options));
    });
  } else {
    new ContextTooltip(tooltip_elements, options);
  }
}

function closeContextTooltip(tooltip_element_id) {
  var context_tooltip = context_tooltips.get(tooltip_element_id);
  context_tooltip.hideWithoutCheck();
}

function initUnobtrusiveContextTooltip() {
  $$('.contextTooltip').each(function(element) {
    context_tooltips.set(element.id, new ContextTooltip(element));
  })
}

var ContextTooltip = Class.create({
  initialize: function(tooltipElement, options) {
    this.rawTooltipElementId = this.toId(tooltipElement);
    this.tooltipElement = $(tooltipElement);

    // Initializing some utility flags.
    this.isContextBeingGrabbed = false;

    // Used to hold current mouse position.
    this.currentMouseX = 0;
    this.currentMouseY = 0;

    this.options = {
      debug: false,
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
    };
    Object.extend(this.options, options || { });

    this.contextElement = this.options.contextElement ? $(this.options.contextElement) : this.tooltipElement.up();

    this.clearScrollOffset();

    this.createBoundedMethods();
    this.initializeTooltipDelayedIfNecessary();
  },

  log: function(msg) {
    if (this.options.debug) {
      var tooltipElementId = this.hasTooltipElement() ? this.tooltipElement.id : this.rawTooltipElementId;
      console.log(Date() + " " + msg + " [" + tooltipElementId + "/" + this.contextElement.id + "]");
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
    this.createBoundedMethod('createAndInitializeTooltip');
    this.createBoundedMethod('initializeTooltip');
    this.createBoundedMethod('log');
    this.createBoundedMethod('hideByClick');
    this.createBoundedMethod('hideWithoutCheck');
  },

  createBoundedMethod: function(methodName) {
    this[methodName + "Bounded"] = this[methodName].bindAsEventListener(this)
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
    Event.observe(window, 'load', this.createAndInitializeTooltipBounded);
  },

  initializeTooltipWhenWindowIsLoaded: function() {
    Event.observe(window, 'load', this.initializeTooltipBounded);
  },

  createAndInitializeTooltip: function() {
    this.createTooltip();
    this.initializeTooltip();
  },

  initializeTooltip: function() {
    this.log("Initializing tooltip");
    this.tooltipElement.addClassName(this.options.additionalClasses);
    this.tooltipElement.hide();
    this.registerMouseEvents();
    this.log("Tooltip initialized");
  },

  createTooltip: function() {
    var tooltip_element = $(this.rawTooltipElementId);
    if (this.elementExists(tooltip_element)) {
      this.log("Tooltip element already created, just using it.");
      this.tooltipElement = tooltip_element;
    } else {
      this.log("Creating tooltip");
      var self = this;
      $$("body").each(function(element) {
        var tooltip = document.createElement('div');
        tooltip.id = self.rawTooltipElementId;
        self.tooltipElement = $(tooltip);
        element.insert(self.tooltipElement);
        context_tooltips.set(self.tooltipElement.id, self);
      });
      this.log("Tooltip created");
    }
  },

  hasTooltipElement: function() {
    return this.elementExists(this.tooltipElement);
  },

  elementExists: function(element) {
    return !(element == null || element.id == "");
  },

  registerMouseEvents: function() {
    this.log("Registering mouse events.");
    this.registerExtraMouseEvents();
    this.registerTooltipMouseEvents();
    this.registerContextMouseEvents();
    this.log("Mouse events registered.");
  },

  registerExtraMouseEvents: function() {
    if (!this.options.displayWhenClicked) {
      // We need the current mouse position, so we observe each mouse move event
      // on the document and update the mouse position accordingly.
      document.observe('mousemove', this.updateCurrentMousePositionBounded);
    }
  },

  registerTooltipMouseEvents: function() {
    if (!this.options.remoteUrlOptions) {
      this.registerCloseTooltipEvents();
    }

    if (!this.options.displayWhenClicked) {
      // Hovering out from the tooltip element should hide it if necessary.
      this.tooltipElement.observe('mouseout', this.hideBounded);

      if (this.options.click == 'hide') {
        this.log("Clicking on the tooltip will hide it.");
        this.tooltipElement.observe('mousedown', this.hideByClickBounded);
      } else {
        this.log("Clicking on the tooltip will keep it visible.");
      }
    }
  },

  registerCloseTooltipEvents: function() {
    // Elements with a "close" class inside tooltips will close the tooltip when clicked.
    if (this.tooltipElement.id) {
      $$('#' + this.tooltipElement.id + ' .close').invoke('observe', 'click', this.hideWithoutCheckBounded);
    } else {
      // Case the tooltip doesn't have an id.
      this.tooltipElement.down('.close').invoke('observe', 'click', this.hideWithoutCheckBounded);
    }
  },

  registerContextMouseEvents: function() {
    if (!this.options.displayWhenClicked) {
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
      } else {
        this.log("Clicking on the context will keep the tooltip visible.");
      }
    }
  },

  registerClickedContextMouseEvents: function() {
    this.log("Tooltip will be displayed when clicked.");
    this.contextElement.observe('click', this.displayWithoutCheckBounded);
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

  displayWithoutCheck: function() {
    if (this.options.remoteUrlOptions) {
      this.tooltipElement.update('') // emptying the tooltip element.
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

  displayEffect: function() {
    if (this.options.displayEffect == 'appear') {
      return Effect.Appear;
    } else {
      return null;
    }
  },

  displayWithEffect: function() {
    var displayEffect = this.displayEffect();
    if (displayEffect == null) {
      this.tooltipElement.show();
    } else {
      new displayEffect(this.tooltipElement, this.options.displayEffectOptions);
    }
  },

  loadTooltipContents: function() {
    var self = this;
    var defaultUrlOptions = {
      method: 'get',
      onSuccess: function(transport){
        self.tooltipElement.update(transport.responseText);
        if (self.options.position != 'none') {
          self.make_positioned();
        }
        self.registerCloseTooltipEvents();
        self.displayWithEffect();
      }
    }

    var remoteUrlOptions = Object.extend(defaultUrlOptions, this.options.remoteUrlOptions);
    new Ajax.Request(this.options.remoteUrlOptions.url, remoteUrlOptions);
  },

  make_positioned: function() {
    var contextElementOffset = this.contextElement.cumulativeOffset();
    var contextElementWidth = this.contextElement.getWidth();
    var contextElementHeight = this.contextElement.getHeight();
    var tooltipElementWidth = this.tooltipElement.getWidth();
    var tooltipElementHeight = this.tooltipElement.getHeight();

    contextElementOffset.left += this.scrollOffsetX;
    contextElementOffset.top += this.scrollOffsetY;

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

    this.tooltipElement.setStyle({
      'position': 'absolute',
      'top': top + this.options.verticalOffset + 'px',
      'left': left + this.options.horizontalOffset + 'px'
    });
  },

  parse_position: function() {
    return this.options.position.split('-');
  },

  shouldDisplay: function() {
    return (!this.tooltipElement.visible() && !this.isContextBeingGrabbed && this.mouseInContextOrTooltip());
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
    this.log('hiding without check')
    var hideEffect = this.hideEffect();
    if (hideEffect == null) {
      this.tooltipElement.hide();
    } else {
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
    } else {
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
    this.calculateScrollOffset(object);

    var offset = object.cumulativeOffset();
    var objectX = offset.left + this.scrollOffsetX;
    var objectY = offset.top + this.scrollOffsetY;
    var dimensions = object.getDimensions();
    var objectWidth = dimensions.width;
    var objectHeight = dimensions.height;

    return this.checkContainment(x, y, objectX, objectY, objectWidth, objectHeight);
  },

  checkContainment: function(x, y, objectX, objectY, objectWidth, objectHeight) {
    return (x >= objectX && x < (objectX + objectWidth) && y >= objectY && y < (objectY + objectHeight));
  },

  calculateScrollOffset: function(object) {
    var deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    var deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;

    var scrollOffset = object.cumulativeScrollOffset();
    this.scrollOffsetX = deltaX - scrollOffset.left;
    this.scrollOffsetY = deltaY - scrollOffset.top;
  },

  clearScrollOffset: function() {
    this.scrollOffsetX = 0;
    this.scrollOffsetY = 0;
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
  },

  toId: function(value) {
    if (value.split) {
      return value.replace(/[.#\[\]=]/g, '').replace(/ /g, '_');
    }
    return null;
  }
});