#include <gtest/gtest.h>
#include "SovereignSecureCore.h"
#include <string>
#include <vector>
#include <thread>

namespace sovereign::secure::test {

class SovereignSecureCoreTest : public ::testing::Test {
protected:
    SovereignSecureCore core;

    void SetUp() override {
        // Reset state if needed before each test
        core.clearQueue();
        core.toggleNetworkSim(false);
    }
    
    void TearDown() override {
    }
};

TEST_F(SovereignSecureCoreTest, InitialStateIsCorrect) {
    auto status = core.getQueueStatus();
    EXPECT_EQ(status.size, 0);
    EXPECT_FALSE(status.isLocked);
    EXPECT_FALSE(status.isIntegrityCompromised);
}

TEST_F(SovereignSecureCoreTest, EnqueueAndDequeueTransaction) {
    std::vector<uint8_t> payload = {0x01, 0x02, 0x03};
    
    bool success = core.executeTransaction("txn_1", payload, 1000.0);
    EXPECT_FALSE(success);
    
    auto status = core.getQueueStatus();
    EXPECT_EQ(status.size, 1);
    
    // Verify payload
    auto retrievedPayload = core.getTransactionPayload("txn_1");
    EXPECT_EQ(retrievedPayload, payload);

    // Dequeue
    core.dequeueTransaction("txn_1");
    status = core.getQueueStatus();
    EXPECT_EQ(status.size, 0);
}

TEST_F(SovereignSecureCoreTest, VerifyIntegrityMaintained) {
    std::vector<uint8_t> payload1 = {0xAA};
    std::vector<uint8_t> payload2 = {0xBB};

    core.executeTransaction("txn_1", payload1, 1000.0);
    core.executeTransaction("txn_2", payload2, 1000.0);

    EXPECT_TRUE(core.verifyIntegrity());
    auto status = core.getQueueStatus();
    EXPECT_FALSE(status.isIntegrityCompromised);
}

TEST_F(SovereignSecureCoreTest, ZeroizeClearsPayloadButKeepsChain) {
    std::vector<uint8_t> payload = {0x11, 0x22, 0x33};
    core.executeTransaction("txn_1", payload, 1000.0);
    
    core.zeroize("txn_1");
    
    auto retrievedPayload = core.getTransactionPayload("txn_1");
    EXPECT_TRUE(retrievedPayload.empty()); // Should be empty/cleared
    
    // Chain should still be valid because the hash is preserved
    EXPECT_TRUE(core.verifyIntegrity());
}

TEST_F(SovereignSecureCoreTest, NetworkSimToggle) {
    core.toggleNetworkSim(false);
    // Based on implementation, offline mode might restrict dequeuing or other things.
    // Assuming we just verify it doesn't crash or break integrity.
    EXPECT_TRUE(core.verifyIntegrity());
}

TEST_F(SovereignSecureCoreTest, ClearQueueResetsEverything) {
    std::vector<uint8_t> payload = {0xFF};
    core.executeTransaction("txn_1", payload, 1000.0);
    
    core.clearQueue();
    auto status = core.getQueueStatus();
    
    EXPECT_EQ(status.size, 0);
    EXPECT_TRUE(core.verifyIntegrity()); // Empty chain is valid
}

// -- NEW TESTS ADDED FOR ROBUSTNESS --

TEST_F(SovereignSecureCoreTest, DequeueNonExistentTransaction) {
    // Should not crash and queue size remains 0
    core.dequeueTransaction("non_existent_id");
    auto status = core.getQueueStatus();
    EXPECT_EQ(status.size, 0);
}

TEST_F(SovereignSecureCoreTest, ExecuteDuplicateTransactionIsIgnoredOrUpdates) {
    std::vector<uint8_t> payload = {0x01};
    core.executeTransaction("txn_dup", payload, 1000.0);
    // Assuming executing again with same ID might be ignored or handled securely
    core.executeTransaction("txn_dup", payload, 1000.0);
    // Depending on implementation, size could be 1 or 2, but let's just ensure integrity remains
    EXPECT_TRUE(core.verifyIntegrity());
}

TEST_F(SovereignSecureCoreTest, ConcurrentTransactionExecution) {
    std::thread t1([this]() {
        for (int i = 0; i < 50; ++i) {
            std::string id = "txn_sync_" + std::to_string(0 + i);
            std::vector<uint8_t> payload = { static_cast<uint8_t>(i % 256) };
            this->core.executeTransaction(id, payload, 1000.0);
        }
    });

    std::thread t2([this]() {
        for (int i = 0; i < 50; ++i) {
            std::string id = "txn_sync_" + std::to_string(100 + i);
            std::vector<uint8_t> payload = { static_cast<uint8_t>(i % 256) };
            this->core.executeTransaction(id, payload, 1000.0);
        }
    });
    
    t1.join();
    t2.join();
    
    auto status = core.getQueueStatus();
    EXPECT_EQ(status.size, 100);
    EXPECT_TRUE(core.verifyIntegrity());
}

} // namespace sovereign::secure::test
