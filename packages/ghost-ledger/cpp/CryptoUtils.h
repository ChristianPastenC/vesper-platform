#pragma once

#include <vector>
#include <cstdint>
#include <string>
#include <cstring>

#if defined(_WIN32) || defined(_WIN64)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#endif

namespace sovereign::secure::crypto {

/**
 * SHA-256 implementation (pure C++17)
 */
std::vector<uint8_t> sha256(const std::vector<uint8_t>& data);

/**
 * URL-safe Base64 encoding without padding
 */
std::string base64UrlEncode(const std::vector<uint8_t>& data);

/**
 * Constant-time comparison for cryptographic hashes/keys
 * Returns true if equal, false otherwise
 * Time taken depends only on length, not on contents
 */
bool constantTimeEqual(const std::vector<uint8_t>& a, const std::vector<uint8_t>& b);

/**
 * Securely zeroes a region of memory (Active Byte-Level Zeroization).
 *
 * Compliant with NIST SP 800-88 Rev. 1 and Philippe et al. (2023) research
 * to defeat compiler Dead Store Elimination (DSE) across Clang, GCC, and MSVC.
 *
 * Priority order:
 * 1. memset_s (C11 Annex K if __STDC_LIB_EXT1__ is supported)
 * 2. SecureZeroMemory (Windows / MSVC)
 * 3. explicit_bzero (POSIX / glibc / Apple / bionic)
 * 4. Volatile-pointer write loop with inline assembly memory barrier
 *
 * @param ptr  Pointer to the beginning of the region.
 * @param size Number of bytes to overwrite with zero.
 */
inline void secure_zero(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return;

#if defined(__STDC_WANT_LIB_EXT1__) || (defined(__STDC_LIB_EXT1__) && __STDC_LIB_EXT1__ >= 201112L)
    memset_s(ptr, size, 0, size);
#elif defined(_MSC_VER)
    SecureZeroMemory(ptr, size);
#elif defined(__APPLE__) || (defined(__GLIBC__) && (__GLIBC__ > 2 || (__GLIBC__ == 2 && __GLIBC_MINOR__ >= 25)))
    explicit_bzero(ptr, size);
#else
    volatile uint8_t* p = static_cast<volatile uint8_t*>(ptr);
    for (size_t i = 0; i < size; ++i) {
        p[i] = 0;
    }
    #if defined(__GNUC__) || defined(__clang__)
    __asm__ __volatile__("" : : "r"(ptr) : "memory");
    #endif
#endif
}

} // namespace sovereign::secure::crypto
