module ContextTooltipHelper

  def context_tooltip_javascript_file(options = {})
    options.reverse_merge!({
      :library => default_library, # Options here are 'prototype' and 'jquery'
      :unobtrusive => false, # If true then an unobtrusive version of the javascript library is used.
    })

    "#{options[:library]}.context_tooltip#{unobtrusive_suffix(options[:unobtrusive])}"
  end

  def context_tooltip_include_tag(options = {})
    javascript_include_tag(options)
  end

  def context_tooltip(tooltip_id, options = {})
    javascript_tag do
      "addContextTooltip('#{tooltip_id}', #{options_for_javascript(options)});"
    end
  end
  
  protected
    def options_for_javascript(options)
      converted_options = options.map do |k, v|
        if v.kind_of?(Hash) then
          "#{k}:#{options_for_javascript(v)}"
        elsif v.kind_of?(String) then
          "#{k}:'#{v}'"
        else
          "#{k}:#{v}"
        end
      end

      "{ #{converted_options.sort.join(', ')} }"
    end

    def unobtrusive_suffix(unobtrusive)
      unobtrusive ? "_unobtrusive" : ""
    end

    def default_library
      (has_jquery?) ? 'jquery' : 'prototype'
    end

    def has_jquery?
      ActionView::Helpers::AssetTagHelper::JAVASCRIPT_DEFAULT_SOURCES.include?('jquery')
    end
end
