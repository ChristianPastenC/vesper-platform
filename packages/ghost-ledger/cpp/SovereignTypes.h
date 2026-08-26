#pragma once

#include <vector>
#include <string>
#include <cstdint>

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

} // namespace sovereign::secure
