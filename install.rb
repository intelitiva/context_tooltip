# Install hook code here

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

begin
  Dir.glob(File.join(File.dirname(__FILE__), 'javascripts', '**', '*.js')) do |file|
    copy_javascript File.basename(file)
  end
rescue Exception => e
  puts "There are problems copying assets to you app: #{e.message}"
end
