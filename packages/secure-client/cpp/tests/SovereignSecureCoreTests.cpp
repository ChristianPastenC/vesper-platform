#include <gtest/gtest.h>
#include "SovereignSecureCore.h"
#include <string>
#include <vector>
#include <thread>
#include <atomic>

namespace sovereign::secure::test {

class SovereignSecureCoreTest : public ::testing::Test {
protected:
    SovereignSecureCore core;

    void SetUp() override {
        core.clearQueue();
        core.toggleNetworkSim(false);
    }
};

TEST_F(SovereignSecureCoreTest, NetworkSimToggle) {
    core.toggleNetworkSim(true);
    // Since it's online, executing a transaction should return true (executed immediately, not queued)
    std::vector<uint8_t> payload = {0x11, 0x22};
    bool success = core.executeTransaction("txn_online", payload, 1000.0);
    EXPECT_TRUE(success);
    
    // Queue should remain empty
    EXPECT_EQ(core.getQueueStatus().size, 0);

    core.toggleNetworkSim(false);
    // Now offline, should return false (enqueued)
    bool successOffline = core.executeTransaction("txn_offline", payload, 1000.0);
    EXPECT_FALSE(successOffline);
    EXPECT_EQ(core.getQueueStatus().size, 1);
}

TEST_F(SovereignSecureCoreTest, ConcurrentTransactionExecution) {
    std::atomic<int> successCount{0};
    std::atomic<int> queueCount{0};

    // Thread 1: Execute transactions
    std::thread t1([this, &queueCount]() {
        for (int i = 0; i < 50; ++i) {
            std::string id = "txn_sync_" + std::to_string(0 + i);
            std::vector<uint8_t> payload = { static_cast<uint8_t>(i % 256) };
            if (!this->core.executeTransaction(id, payload, 1000.0)) {
                queueCount++;
            }
        }
    });

    // Thread 2: Execute more transactions
    std::thread t2([this, &queueCount]() {
        for (int i = 0; i < 50; ++i) {
            std::string id = "txn_sync_" + std::to_string(100 + i);
            std::vector<uint8_t> payload = { static_cast<uint8_t>(i % 256) };
            if (!this->core.executeTransaction(id, payload, 1000.0)) {
                queueCount++;
            }
        }
    });
    
    // Thread 3: Dequeue randomly
    std::thread t3([this]() {
        for (int i = 0; i < 50; ++i) {
            std::string id = "txn_sync_" + std::to_string(0 + i);
            this->core.dequeueTransaction(id);
        }
    });

    t1.join();
    t2.join();
    t3.join();
    
    // Verify integrity is intact after massive multithreading
    EXPECT_TRUE(core.verifyIntegrity());
}

} // namespace sovereign::secure::test