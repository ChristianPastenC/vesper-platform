#include <gtest/gtest.h>
#include "VolatileQueue.hpp"
#include <vector>
#include <thread>
#include <chrono>

namespace sovereign::secure::test {

class VolatileQueueTest : public ::testing::Test {
protected:
    VolatileQueue queue;

    void SetUp() override {
        queue.clearQueue();
    }
};

TEST_F(VolatileQueueTest, InitialStateIsCorrect) {
    EXPECT_EQ(queue.size(), 0);
    EXPECT_FALSE(queue.isLocked());
    EXPECT_FALSE(queue.isIntegrityCompromised());
    EXPECT_TRUE(queue.verifyIntegrity());
}

TEST_F(VolatileQueueTest, EnqueueAndVerify) {
    std::vector<uint8_t> payload = {0x01, 0x02, 0x03};
    queue.enqueue("txn_1", payload, 5000.0);
    
    EXPECT_EQ(queue.size(), 1);
    
    std::vector<uint8_t> resultPayload = queue.getTransactionPayload("txn_1");
    EXPECT_EQ(resultPayload, payload);

    EXPECT_TRUE(queue.verifyIntegrity());
}

TEST_F(VolatileQueueTest, DequeueAndRechain) {
    std::vector<uint8_t> p1 = {0x11};
    std::vector<uint8_t> p2 = {0x22};
    std::vector<uint8_t> p3 = {0x33};

    queue.enqueue("t1", p1, 5000.0);
    queue.enqueue("t2", p2, 5000.0);
    queue.enqueue("t3", p3, 5000.0);

    EXPECT_EQ(queue.size(), 3);
    EXPECT_TRUE(queue.verifyIntegrity());

    // Dequeue middle element
    queue.dequeue("t2");
    
    EXPECT_EQ(queue.size(), 2);
    
    auto ids = queue.getQueueIds();
    EXPECT_EQ(ids.size(), 2);
    EXPECT_EQ(ids[0], "t1");
    EXPECT_EQ(ids[1], "t3");

    // Important: check if the chain is still mathematically valid
    EXPECT_TRUE(queue.verifyIntegrity());
}

TEST_F(VolatileQueueTest, ZeroizeMaintainsIntegrity) {
    std::vector<uint8_t> p = {0xFF, 0xEE};
    queue.enqueue("tx1", p, 5000.0);

    queue.zeroize("tx1");

    auto resultPayload = queue.getTransactionPayload("tx1");
    EXPECT_TRUE(resultPayload.empty());

    // The chain should still verify properly.
    EXPECT_TRUE(queue.verifyIntegrity());
}

TEST_F(VolatileQueueTest, ThreadSafetyExecution) {
    auto worker = [this](int start, int count) {
        for (int i = start; i < start + count; ++i) {
            std::vector<uint8_t> p = {static_cast<uint8_t>(i)};
            queue.enqueue("txn_" + std::to_string(i), p, 5000.0);
        }
    };

    std::thread t1(worker, 0, 50);
    std::thread t2(worker, 50, 50);

    t1.join();
    t2.join();

    EXPECT_EQ(queue.size(), 100);
    EXPECT_TRUE(queue.verifyIntegrity());
}

} // namespace sovereign::secure::test
