#pragma once

#include <vector>
#include <cstdint>
#include <string>

namespace sovereign::secure::crypto {

/**
 * Computes the SHA-256 hash of the input data.
 * @param data The input binary data.
 * @return A 32-byte vector containing the SHA-256 hash.
 */
std::vector<uint8_t> sha256(const std::vector<uint8_t>& data);

/**
 * Encodes binary data to Base64Url format without padding.
 * @param data The input binary data.
 * @return Base64Url encoded string.
 */
std::string base64UrlEncode(const std::vector<uint8_t>& data);

/**
 * Compares two byte arrays in constant time to prevent timing attacks.
 * @param a First byte array
 * @param b Second byte array
 * @return True if both arrays are strictly equal, false otherwise.
 */
bool constantTimeEqual(const std::vector<uint8_t>& a, const std::vector<uint8_t>& b);

} // namespace sovereign::secure::crypto
