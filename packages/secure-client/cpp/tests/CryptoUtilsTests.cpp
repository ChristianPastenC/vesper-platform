#include <gtest/gtest.h>
#include "CryptoUtils.h"
#include <vector>
#include <string>

namespace sovereign::secure::crypto::test {

TEST(CryptoUtilsTest, SHA256KnownAnswerTest) {
    // Hash of empty string
    std::vector<uint8_t> empty;
    auto hashEmpty = sha256(empty);
    
    // Expected SHA-256 of empty string: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    std::vector<uint8_t> expectedEmpty = {
        0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14,
        0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9, 0x24,
        0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c,
        0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52, 0xb8, 0x55
    };
    EXPECT_EQ(hashEmpty, expectedEmpty);

    // Hash of "abc"
    std::string msg = "abc";
    std::vector<uint8_t> abc(msg.begin(), msg.end());
    auto hashAbc = sha256(abc);

    // Expected SHA-256 of "abc": ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    std::vector<uint8_t> expectedAbc = {
        0xba, 0x78, 0x16, 0xbf, 0x8f, 0x01, 0xcf, 0xea,
        0x41, 0x41, 0x40, 0xde, 0x5d, 0xae, 0x22, 0x23,
        0xb0, 0x03, 0x61, 0xa3, 0x96, 0x17, 0x7a, 0x9c,
        0xb4, 0x10, 0xff, 0x61, 0xf2, 0x00, 0x15, 0xad
    };
    EXPECT_EQ(hashAbc, expectedAbc);
}

TEST(CryptoUtilsTest, Base64UrlEncodeKnownAnswerTest) {
    // Empty
    EXPECT_EQ(base64UrlEncode({}), "");

    // "f" -> "Zg"
    EXPECT_EQ(base64UrlEncode({'f'}), "Zg");

    // "fo" -> "Zm8"
    EXPECT_EQ(base64UrlEncode({'f', 'o'}), "Zm8");

    // "foo" -> "Zm9v"
    EXPECT_EQ(base64UrlEncode({'f', 'o', 'o'}), "Zm9v");

    // "foob" -> "Zm9vYg"
    EXPECT_EQ(base64UrlEncode({'f', 'o', 'o', 'b'}), "Zm9vYg");

    // Bytes requiring URL-safe alphabet (62 -> '-', 63 -> '_')
    // 0x00, 0x00, 0x3E (62) => A A + -> A A -
    std::vector<uint8_t> specialBytes = { 0x00, 0x00, 0x3E }; 
    EXPECT_EQ(base64UrlEncode({ 0x00, 0x00, 0x3E }), "AAA-");
    EXPECT_EQ(base64UrlEncode({ 0x00, 0x00, 0x3F }), "AAA_");
}

TEST(CryptoUtilsTest, ConstantTimeEqual) {
    std::vector<uint8_t> a = {1, 2, 3, 4};
    std::vector<uint8_t> a_copy = {1, 2, 3, 4};
    std::vector<uint8_t> b = {1, 2, 3, 5};
    std::vector<uint8_t> c = {1, 2, 3};

    EXPECT_TRUE(constantTimeEqual(a, a_copy));
    EXPECT_FALSE(constantTimeEqual(a, b));
    EXPECT_FALSE(constantTimeEqual(a, c)); // Different sizes
}

} // namespace sovereign::secure::crypto::test
