#pragma once

#include <vector>
#include <cstdint>
#include <string>
#include <cstring>

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
 * Securely zeroes a region of memory.
 *
 * Unlike std::fill or memset, this function writes through a volatile pointer,
 * which prevents the compiler from eliding the operation as a "dead write"
 * even when the buffer goes out of scope immediately after.
 *
 * Equivalent to explicit_bzero(3) / SecureZeroMemory on platforms that support it,
 * but implemented portably via the volatile-pointer idiom (C++11 and later).
 *
 * @param ptr  Pointer to the beginning of the region.
 * @param size Number of bytes to overwrite with zero.
 */
inline void secure_zero(void* ptr, size_t size) noexcept {
    volatile uint8_t* p = static_cast<volatile uint8_t*>(ptr);
    for (size_t i = 0; i < size; ++i) {
        p[i] = 0;
    }
}

} // namespace sovereign::secure::crypto
