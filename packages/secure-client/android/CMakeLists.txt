cmake_minimum_required(VERSION 3.9.0)

project(SovereignSecureClient)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(
  SovereignSecureClient
  SHARED
  ../cpp/SovereignSecureClient.cpp
  ../cpp/SovereignSecureCore.cpp
  ../cpp/SovereignLedger.cpp
  ../cpp/CryptoUtils.cpp
  ../cpp/SovereignTelemetryEngine.cpp
  ../cpp/MmapTelemetryStorage.cpp
  # Real JNI_OnLoad entry point — registers the HybridObject when the JVM
  # loads this library. See src/main/cpp/cpp-adapter.cpp for why this is
  # needed in addition to the nitrogen-generated OnLoad sources below.
  src/main/cpp/cpp-adapter.cpp
)

target_include_directories(
  SovereignSecureClient
  PUBLIC
  ../cpp
  src/main/cpp
)

# Adds the nitrogen-generated spec sources/headers, and links fbjni, JSI and
# react-native-nitro-modules onto the SovereignSecureClient target declared above.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/SovereignSecureClient+autolinking.cmake)
