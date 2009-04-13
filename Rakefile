require 'rake/testtask'
require 'rake/rdoctask'
require 'rubygems'
require 'spec/rake/spectask'

desc 'Default: run specs.'
task :default => :spec

desc "Run all specs in spec directory (excluding plugin specs)"
Spec::Rake::SpecTask.new(:spec) do |t|
  t.spec_opts = ['--options', "\"#{File.dirname(__FILE__)}/spec/spec.opts\""]
  t.spec_files = FileList['spec/**/*/*_spec.rb']
end

namespace :spec do
  desc "Print Specdoc for all specs (excluding plugin specs)"
  Spec::Rake::SpecTask.new(:doc) do |t|
    t.spec_opts = ["--format", "specdoc", "--dry-run"]
    t.spec_files = FileList['spec/**/*/*_spec.rb']
  end
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
  Dir.glob(File.join(File.dirname(__FILE__), 'javascripts', '**', '*.js')) do |file|
    copy_javascript File.basename(file)
  end
  puts "Updated Scripts." 
end

def copy(file_name, from_dir, to_dir)
  FileUtils.mkdir to_dir unless File.exist?(File.expand_path(to_dir))
  from = File.expand_path(File.join(from_dir,file_name))
  to = File.expand_path(File.join(to_dir, file_name))
  FileUtils.cp from, to, :verbose => true unless File.exist?(to)
end

def copy_javascript(file_name)
  plugin_javascripts = File.join(File.dirname(__FILE__), 'javascripts')
  app_javascripts = File.join(RAILS_ROOT, 'public/javascripts')
  copy file_name, plugin_javascripts, app_javascripts
end