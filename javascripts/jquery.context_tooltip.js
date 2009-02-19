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
      obj = $(this);
      
    });
  };
})(jQuery);
