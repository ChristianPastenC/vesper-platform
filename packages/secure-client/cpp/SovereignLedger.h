#pragma once

#include <vector>
#include <string>
#include <unordered_map>
#include "SovereignTypes.h"

namespace sovereign::secure {

class SovereignLedger {
public:
    SovereignLedger() = default;
    ~SovereignLedger() = default;

    /**
     * Appends a new block to the ledger.
     * @return the newly appended block.
     */
    TransactionBlock enqueue(
        const std::string& id,
        const std::vector<uint8_t>& serializedRequest,
        uint64_t timestamp,
        double ttl
    );

    /**
     * Finds and zeroizes a block by ID, then removes it, and rechains the ledger.
     * @return true if found and removed, false otherwise.
     */
    bool dequeueAndZeroize(const std::string& id);

    /**
     * Clears all blocks, zeroizing their memory first.
     */
    void clearAll();

    /**
     * Recomputes hashes and verifies chain integrity.
     * @return true if valid, false if tampered.
     */
    bool verifyIntegrity() const;

    size_t size() const { return queue_.size(); }
    bool isEmpty() const { return queue_.empty(); }

    std::vector<std::string> getIds() const;
    const TransactionBlock* getBlock(const std::string& id) const;

private:
    void zeroizeBlock(TransactionBlock& block);
    std::vector<uint8_t> computeBlockHash(
        const std::vector<uint8_t>& serializedRequest,
        const std::vector<uint8_t>& previousHash,
        uint64_t timestamp
    ) const;
    std::vector<uint8_t> resolvePreviousHash() const;
    void rechainLedger();

    std::vector<TransactionBlock> queue_;
    std::unordered_map<std::string, size_t> id_to_index_;
};

} // namespace sovereign::secure
