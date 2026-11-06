cmake_minimum_required(VERSION 3.9)
project(GhostSecureClient)

# Set the standard compiler version to C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------------------------------------
# Target 1: GhostSecureCore (Pure C++ Standalone Static Library)
# ---------------------------------------------------------------------------
add_library(GhostSecureCore STATIC
    cpp/CryptoUtils.cpp
    cpp/CryptoUtils.h
    cpp/GhostTypes.h
    cpp/GhostLedger.cpp
    cpp/GhostLedger.h
    cpp/GhostSecureCore.cpp
    cpp/GhostSecureCore.h
    cpp/GhostTelemetryEngine.cpp
    cpp/GhostTelemetryEngine.h
    cpp/MmapTelemetryStorage.cpp
    cpp/MmapTelemetryStorage.h
)

# Configure include search paths for the static library
target_include_directories(GhostSecureCore PUBLIC
    cpp
)

# Standard C++ optimization flags
target_compile_options(GhostSecureCore PRIVATE
    -Wall
    -Werror
    -O3
)

if (WIN32)
    target_link_libraries(GhostSecureCore PUBLIC bcrypt)
endif()

# ---------------------------------------------------------------------------
# Target 2: GhostSecureClient (Conditional JSI Wrapper Shared Library)
# ---------------------------------------------------------------------------
# Only compile the JSI wrapper if building for Android (NDK) or iOS/macOS (Apple targets)
if (ANDROID OR APPLE)
    add_library(GhostSecureClient SHARED
        cpp/GhostSecureClient.cpp
        cpp/GhostSecureClient.hpp
    )

    # Configure include search paths for JSI wrapper
    target_include_directories(GhostSecureClient PUBLIC
        cpp
    )

    # Link JSI wrapper against the pure C++ static library core
    target_link_libraries(GhostSecureClient PRIVATE
        GhostSecureCore
    )

    # Mobile compiler settings requiring exception handling and RTTI
    target_compile_options(GhostSecureClient PRIVATE
        -Wall
        -Werror
        -O3
        -fexceptions
        -frtti
    )

    # Nitrogen's Android autolinking pulls in fbjni, an Android-only (NDK)
    # dependency -- CMake can't resolve it on a plain Apple/macOS host, so
    # this must stay gated on ANDROID specifically rather than the broader
    # `if (ANDROID OR APPLE)` this block is already inside.
    if (ANDROID AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/nitrogen/generated/android/GhostSecureClient+autolinking.cmake")
        include("${CMAKE_CURRENT_SOURCE_DIR}/nitrogen/generated/android/GhostSecureClient+autolinking.cmake")
    endif()
endif()

# ---------------------------------------------------------------------------
# Target 3: Tests (Google Test)
# ---------------------------------------------------------------------------
option(BUILD_TESTING "Build the testing tree" OFF)

if (BUILD_TESTING)
    include(FetchContent)
    FetchContent_Declare(
        googletest
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG        release-1.12.1
    )
    # For Windows: Prevent overriding the parent project's compiler/linker settings
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)

    enable_testing()

    add_executable(GhostSecureCoreTests
        cpp/tests/GhostSecureCoreTests.cpp
        cpp/tests/GhostLedgerTests.cpp
        cpp/tests/CryptoUtilsTests.cpp
        cpp/tests/VolatileQueueTests.cpp
        cpp/tests/MemoryForensicsTests.cpp
    )

    target_include_directories(GhostSecureCoreTests PRIVATE cpp)

    # MemoryForensicsTests.cpp specifically demonstrates that secure_zero()
    # survives dead-store elimination where a naive std::fill doesn't -- that
    # difference only exists under optimization (matching the -O3 the real
    # library ships with above).
    target_compile_options(GhostSecureCoreTests PRIVATE -O3)

    target_link_libraries(GhostSecureCoreTests
        PRIVATE
        GhostSecureCore
        GTest::gtest_main
    )

    include(GoogleTest)
    gtest_discover_tests(GhostSecureCoreTests)
endif()
