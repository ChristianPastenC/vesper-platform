require "json"

package = JSON.parse(File.read(File.join(__dir__, "../package.json")))

Pod::Spec.new do |s|
  s.name         = "SovereignSecureClient"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/Sovereign/sovereign-core-platform"
  s.license      = package["license"]
  s.authors      = "Sovereign"

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/Sovereign/sovereign-core-platform.git", :tag => "#{s.version}" }

  s.source_files = "../cpp/**/*.{h,hpp,cpp,m,mm}"

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
  }

  install_modules_dependencies(s)
end
