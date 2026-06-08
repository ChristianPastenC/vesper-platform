#pragma once

#include <vector>
#include <string>
#include <unordered_map>
#include <mutex>

namespace sovereign::secure {

/**
 * CoreQueueStatus
 * Standard JSI-independent status representation.
 */
struct CoreQueueStatus {
    size_t size;
    bool isLocked;
    bool isIntegrityCompromised;
};

/**
 * TransactionBlock
 * Immutable data structure for transaction enqueuing.
 */
struct TransactionBlock {
    std::string id;
    std::vector<uint8_t> serializedRequest;
    uint64_t timestamp;
    double ttl;
    std::vector<uint8_t> previousHash;
    std::vector<uint8_t> currentHash;
    bool isZeroized;
};

/**
 * SovereignSecureCore
 * Pure C++ implementation of the memory ledger and hashing watchdog.
 */
class SovereignSecureCore {
public:
    SovereignSecureCore();
    ~SovereignSecureCore();

    // Core execution operations
    bool executeTransaction(
        const std::string& id,
        const std::vector<uint8_t>& serializedRequest,
        double ttl
    );

    CoreQueueStatus getQueueStatus();
    void toggleNetworkSim(bool online);
    void dequeueTransaction(const std::string& id);
    bool verifyIntegrity();
    void clearQueue();
    void zeroize(const std::string& id);
    std::vector<std::string> getQueueIds();
    std::vector<uint8_t> getTransactionPayload(const std::string& id);

private:
    void ZeroizeBlock(TransactionBlock& block);

    std::vector<uint8_t> ComputeBlockHash(
        const std::vector<uint8_t>& serializedRequest,
        const std::vector<uint8_t>& previousHash,
        uint64_t timestamp
    );
    bool ConstantTimeEqual(const std::vector<uint8_t>& a, const std::vector<uint8_t>& b);
    std::vector<uint8_t> ResolvePreviousHash();
    void RechainLedger();

    // Internal state members
    std::vector<TransactionBlock> queue_;
    std::unordered_map<std::string, size_t> id_to_index_;
    std::mutex queue_mutex_;
    bool is_locked_;
    bool is_integrity_compromised_;
    bool is_online_;
};

} // namespace sovereign::secure
