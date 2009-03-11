require File.expand_path(File.dirname(__FILE__) + '/../spec_helper')
require File.expand_path(File.dirname(__FILE__) + '/../../lib/context_tooltip_helper')

describe ContextTooltipHelper do
  include ActionView::Helpers::TagHelper
  include ActionView::Helpers::JavaScriptHelper
  include ActionView::Helpers::CaptureHelper
  include ContextTooltipHelper

  attr_accessor :output_buffer # needed by #capture

  describe "when rendering a context_tooltip" do
    it "should render a proper javascript tag" do
      context_tooltip('#some_tooltip').should == javascript_tag("addContextTooltip('#some_tooltip', {});")
    end
    
    describe "with options" do
      it "should convert them into json notation" do
        context_tooltip('#some_tooltip', :some_option => "'a string'", :some_other_option => 1).should == javascript_tag("addContextTooltip('#some_tooltip', {some_option:'a string', some_other_option:1});")
      end

      it "should allow array values" do
        context_tooltip('#some_tooltip', :array_option => ["'some value'", 1.1]).should == javascript_tag("addContextTooltip('#some_tooltip', {array_option:['some value', 1.1]});")
      end

      it "should allow hashs inside other hashes" do
        context_tooltip('#some_tooltip', :hash_option => {:foo => {:bar => "'foobar'"}}).should == javascript_tag("addContextTooltip('#some_tooltip', {hash_option:{foo:{bar:'foobar'}}});")
      end
    end
  end
end
