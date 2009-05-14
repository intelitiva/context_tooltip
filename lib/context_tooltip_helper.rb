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
    options.reverse_merge!(default_options)
    javascript_tag do
      "addContextTooltip('#{tooltip_id}', #{customized_options_for_javascript(options)});"
    end
  end
  
  protected
    def customized_options_for_javascript(options)
      converted_options = options.map do |key, value|
        "#{key}:#{convert_value_for_javascript(value)}"
      end

      "{#{converted_options.sort.join(', ')}}"
    end

    def convert_value_for_javascript(value)
      if value.kind_of?(Hash) then
        customized_options_for_javascript(value)
      elsif value.kind_of?(Array) then
        "[#{value.collect { |item| convert_value_for_javascript(item) }.join(', ')}]"
      else
        value
      end
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

    def default_options
      return { :onWindowLoad => (not request.xhr?) }
    end
end
