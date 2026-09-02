cmake_minimum_required(VERSION 3.9)
project(SovereignSecureClient)

# Set the standard compiler version to C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------------------------------------
# Target 1: SovereignSecureCore (Pure C++ Standalone Static Library)
# ---------------------------------------------------------------------------
add_library(SovereignSecureCore STATIC
    cpp/CryptoUtils.cpp
    cpp/CryptoUtils.h
    cpp/SovereignTypes.h
    cpp/SovereignLedger.cpp
    cpp/SovereignLedger.h
    cpp/SovereignSecureCore.cpp
    cpp/SovereignSecureCore.h
    cpp/SovereignTelemetryEngine.cpp
    cpp/SovereignTelemetryEngine.h
    cpp/MmapTelemetryStorage.cpp
    cpp/MmapTelemetryStorage.h
)

# Configure include search paths for the static library
target_include_directories(SovereignSecureCore PUBLIC
    cpp
)

# Standard C++ optimization flags
target_compile_options(SovereignSecureCore PRIVATE
    -Wall
    -Werror
    -O3
)

if (WIN32)
    target_link_libraries(SovereignSecureCore PUBLIC bcrypt)
endif()

# ---------------------------------------------------------------------------
# Target 2: SovereignSecureClient (Conditional JSI Wrapper Shared Library)
# ---------------------------------------------------------------------------
# Only compile the JSI wrapper if building for Android (NDK) or iOS/macOS (Apple targets)
if (ANDROID OR APPLE)
    add_library(SovereignSecureClient SHARED
        cpp/SovereignSecureClient.cpp
        cpp/SovereignSecureClient.hpp
    )

    # Configure include search paths for JSI wrapper
    target_include_directories(SovereignSecureClient PUBLIC
        cpp
    )

    # Link JSI wrapper against the pure C++ static library core
    target_link_libraries(SovereignSecureClient PRIVATE
        SovereignSecureCore
    )

    # Mobile compiler settings requiring exception handling and RTTI
    target_compile_options(SovereignSecureClient PRIVATE
        -Wall
        -Werror
        -O3
        -fexceptions
        -frtti
    )

    # Nitrogen's Android autolinking pulls in fbjni, an Android-only (NDK)
    # dependency -- CMake can't resolve it on a plain Apple/macOS host, so
    # this must stay gated on ANDROID specifically rather than the broader
    # `if (ANDROID OR APPLE)` this block is already inside. Previously this
    # ran unconditionally whenever the file existed, which is always true
    # once codegen has run once, breaking `cmake -S .` on macOS entirely
    # (including for `yarn test:cpp`, which never runs on Apple hosts in CI
    # and so never caught this).
    if (ANDROID AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/nitrogen/generated/android/SovereignSecureClient+autolinking.cmake")
        include("${CMAKE_CURRENT_SOURCE_DIR}/nitrogen/generated/android/SovereignSecureClient+autolinking.cmake")
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

    add_executable(SovereignSecureCoreTests
        cpp/tests/SovereignSecureCoreTests.cpp
        cpp/tests/SovereignLedgerTests.cpp
        cpp/tests/CryptoUtilsTests.cpp
        cpp/tests/VolatileQueueTests.cpp
        cpp/tests/MemoryForensicsTests.cpp
    )

    target_include_directories(SovereignSecureCoreTests PRIVATE cpp)

    # MemoryForensicsTests.cpp specifically demonstrates that secure_zero()
    # survives dead-store elimination where a naive std::fill doesn't -- that
    # difference only exists under optimization (matching the -O3 the real
    # library ships with above). Without this, the test would be comparing
    # two calls that both survive because nothing was eliminated, which
    # proves nothing.
    target_compile_options(SovereignSecureCoreTests PRIVATE -O3)

    target_link_libraries(SovereignSecureCoreTests
        PRIVATE
        SovereignSecureCore
        GTest::gtest_main
    )

    include(GoogleTest)
    gtest_discover_tests(SovereignSecureCoreTests)
endif()
