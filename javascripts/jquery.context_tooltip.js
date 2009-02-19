function addContextTooltip(tooltip_elements, options) {
  $(tooltip_elements).context_tooltip(options);
}

(function($){
  $.fn.context_tooltip = function(given_options) {

    var defaults = {
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
    };

    var options = $.extend(defaults, given_options);

    return this.each(function() {
      tooltip = $(this);
      context = tooltip.parent();

      initializeContextTooltip(tooltip, context, options);
    });

    function initializeContextTooltip(tooltip, context, options) {
      tooltip.hide();

      if (options.onWindowLoad) {
        $(document).ready(function(){
          registerMouseEvents(tooltip, context, options);
        })
      }
      else {
        registerMouseEvents(tooltip, context, options);
      }
    }

    function registerMouseEvents(tooltip, context, options) {
      registerTooltipMouseEvents(tooltip, context, options);
      registerContextMouseEvents(tooltip, context, options);
    }

    function registerTooltipMouseEvents(tooltip, context, options) {
      if (options.click == 'hide') {
        tooltip.mousedown(function() { hideWithoutEffect(tooltip, context, options) });
      }
    }

    function registerContextMouseEvents(tooltip, context, options) {
      context.mouseover(function() { display(tooltip, context, options); })
      context.mouseout(function() { hide(tooltip, context, options); })

      if (options.contextClick == 'hide') {
        context.mousedown(function() { contextGrabbed(tooltip, context, options) });
        context.mousedown(function() { hideWithoutEffect(tooltip, context, options) });
        context.mouseup(function() { contextReleased(tooltip, context, options) });
      }
    }

    function display(tooltip, context, options) {
      if (!tooltip.is(':visible')) {
        if (options.displayEffect == 'appear') {
          tooltip.fadeIn(options.displayEffectOptions.duration * 1000);
        }
        else {
          tooltip.show();
        }
      }
    }

    function hide(tooltip, context, options) {
      if (tooltip.is(':visible')) {
        if (options.hideEffect == 'fade') {
          tooltip.fadeOut(options.hideEffectOptions.duration * 1000);
        }
        else {
          tooltip.hide();
        }
      }
    }

    function hideWithoutEffect(tooltip, context, options) {
      tooltip.hide();
    }

    function contextGrabbed(tooltip, context, options) {

    }

    function contextReleased(tooltip, context, options) {

    }
  };
})(jQuery);
