#include <gtest/gtest.h>
#include "SovereignLedger.h"
#include <vector>

namespace sovereign::secure::test {

class SovereignLedgerTest : public ::testing::Test {
protected:
    SovereignLedger ledger;

    void SetUp() override {
        ledger.clearAll();
    }
};

TEST_F(SovereignLedgerTest, InitialStateIsCorrect) {
    EXPECT_EQ(ledger.size(), 0);
    EXPECT_TRUE(ledger.verifyIntegrity());
}

TEST_F(SovereignLedgerTest, EnqueueAndVerify) {
    std::vector<uint8_t> payload = {0x01, 0x02, 0x03};
    ledger.enqueue("txn_1", payload, 1000, 5000.0);
    
    EXPECT_EQ(ledger.size(), 1);
    
    auto block = ledger.getBlock("txn_1");
    ASSERT_NE(block, nullptr);
    EXPECT_EQ(block->serializedRequest, payload);

    EXPECT_TRUE(ledger.verifyIntegrity());
}

TEST_F(SovereignLedgerTest, DequeueAndRechain) {
    std::vector<uint8_t> p1 = {0x11};
    std::vector<uint8_t> p2 = {0x22};
    std::vector<uint8_t> p3 = {0x33};

    ledger.enqueue("t1", p1, 1000, 5000.0);
    ledger.enqueue("t2", p2, 1000, 5000.0);
    ledger.enqueue("t3", p3, 1000, 5000.0);

    EXPECT_EQ(ledger.size(), 3);
    EXPECT_TRUE(ledger.verifyIntegrity());

    // Dequeue middle element
    ledger.dequeueAndZeroize("t2");
    
    EXPECT_EQ(ledger.size(), 2);
    
    auto ids = ledger.getIds();
    EXPECT_EQ(ids.size(), 2);
    EXPECT_EQ(ids[0], "t1");
    EXPECT_EQ(ids[1], "t3");

    // Important: check if the chain is still mathematically valid
    EXPECT_TRUE(ledger.verifyIntegrity());
}

TEST_F(SovereignLedgerTest, ZeroizeMaintainsIntegrity) {
    std::vector<uint8_t> p = {0xFF, 0xEE};
    ledger.enqueue("tx1", p, 1000, 5000.0);

    ledger.dequeueAndZeroize("tx1");

    auto block = ledger.getBlock("tx1");
    EXPECT_EQ(block, nullptr);

    // The chain should still verify properly.
    EXPECT_TRUE(ledger.verifyIntegrity());
}

} // namespace sovereign::secure::test
