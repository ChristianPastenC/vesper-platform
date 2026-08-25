require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "SovereignSecureClient"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/Sovereign/sovereign-core-platform"
  s.license      = package["license"]
  s.authors      = "Sovereign"

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/Sovereign/sovereign-core-platform.git", :tag => "#{s.version}" }

  s.source_files = [
    "cpp/**/*.{h,hpp,cpp,m,mm}",
    "nitrogen/generated/shared/**/*.{h,hpp,c,cpp,swift}",
    "nitrogen/generated/ios/**/*.{h,hpp,c,cpp,mm,swift}",
  ]
  # Standalone GoogleTest suite (run via `npm run test:cpp`), not part of the app build.
  s.exclude_files = "cpp/tests/**/*"
  s.public_header_files = [
    "nitrogen/generated/shared/**/*.{h,hpp}",
    "nitrogen/generated/ios/SovereignSecureClient-Swift-Cxx-Bridge.hpp",
  ]

  s.dependency "NitroModules"

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "SWIFT_OBJC_INTEROP_MODE" => "objcxx",
    "DEFINES_MODULE" => "YES",
    "SWIFT_INSTALL_OBJC_HEADER" => "NO",
  }

  install_modules_dependencies(s)
end
