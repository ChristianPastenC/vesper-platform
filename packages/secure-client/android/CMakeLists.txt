cmake_minimum_required(VERSION 3.4.1)

project(SovereignSecureClient)

# Find React Native Nitro Modules
find_package(NitroModules REQUIRED)

add_library(
  SovereignSecureClient
  SHARED
  ../cpp/SovereignSecureClient.cpp
  ../cpp/SovereignSecureCore.cpp
  ../cpp/SovereignLedger.cpp
  ../cpp/CryptoUtils.cpp
)

target_include_directories(
  SovereignSecureClient
  PUBLIC
  ../cpp
)

target_link_libraries(
  SovereignSecureClient
  NitroModules::NitroModules
)
