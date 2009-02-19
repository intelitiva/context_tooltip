require 'rake/testtask'
require 'rake/rdoctask'

desc 'Default: run unit tests.'
task :default => :test

desc 'Test the contexttooltip plugin.'
Rake::TestTask.new(:test) do |t|
  t.libs << 'lib'
  t.pattern = 'test/**/*_test.rb'
  t.verbose = true
end

desc 'Generate documentation for the context_tooltip plugin.'
Rake::RDocTask.new(:rdoc) do |rdoc|
  rdoc.rdoc_dir = 'rdoc'
  rdoc.title    = 'ContextTooltip'
  rdoc.options << '--line-numbers' << '--inline-source'
  rdoc.rdoc_files.include('README')
  rdoc.rdoc_files.include('lib/**/*.rb')
end

desc "Generates unobtrusive versions of libraries"
task :generate_unobtrusive => [] do |t|
  require File.expand_path(File.join(File.dirname(__FILE__), 'lib', 'context_tooltip_utils'))
  ContextTooltipUtils.generate_unobtrusive('prototype')
  ContextTooltipUtils.generate_unobtrusive('jquery')
  puts "Unobtrusive versions of libraries generated."
end

desc "Update contexttooltip javascript files"
task :update_scripts => [] do |t| 
  context_tooltip_dir = File.expand_path(".")
  root_dir = File.join(context_tooltip_dir, '..', '..', '..')
  File.copy File.join(context_tooltip_dir, 'javascripts', 'context_tooltip.js'), File.join(root_dir, 'public', 'javascripts', 'context_tooltip.js')
  puts "Updated Scripts." 
end


