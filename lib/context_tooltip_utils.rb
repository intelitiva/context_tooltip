class ContextTooltipUtils
  class << self
    def generate_unobtrusive(library)
      library_contents = File.read(context_tooltip_javascript_library_path(library))
      library_contents << "\n\n"
      library_contents << send("#{library}_unobtrusive") << "\n"
      File.open(context_tooltip_javascript_library_path(library, '_unobtrusive'), 'w') do |file|
        file.write library_contents
      end
    end

    protected
      def prototype_unobtrusive
        "Event.observe(window, 'load', initUnobtrusiveContextTooltip);"
      end

      def jquery_unobtrusive
        "$(document).ready(initUnobtrusiveContextTooltip);"
      end

      def context_tooltip_javascript_library_path(library, suffix = "")
        File.join(context_tooltip_path, 'javascripts', "#{library}.context_tooltip#{suffix}.js")
      end

      def context_tooltip_path
        File.expand_path(File.join(File.dirname(__FILE__), '..'))
      end

      def public_javascript_path
        File.join(Rails.root, 'public', 'javascripts')
      end
  end
end
