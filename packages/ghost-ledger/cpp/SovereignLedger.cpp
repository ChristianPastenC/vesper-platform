#include "SovereignLedger.h"
#include "CryptoUtils.h"
#include <algorithm>

#if defined(_WIN32) || defined(_WIN64)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
inline bool lock_memory_pages_ledger(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::VirtualLock(ptr, size) != 0;
}
inline bool unlock_memory_pages_ledger(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::VirtualUnlock(ptr, size) != 0;
}
#else
#include <sys/mman.h>
inline bool lock_memory_pages_ledger(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::mlock(ptr, size) == 0;
}
inline bool unlock_memory_pages_ledger(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::munlock(ptr, size) == 0;
}
#endif

namespace sovereign::secure {

TransactionBlock SovereignLedger::enqueue(
    const std::string& id,
    const std::vector<uint8_t>& serializedRequest,
    uint64_t timestamp,
    double ttl
) {
    std::vector<uint8_t> prevHash = resolvePreviousHash();
    std::vector<uint8_t> currentHash = computeBlockHash(serializedRequest, prevHash, timestamp);

    TransactionBlock block{id, serializedRequest, timestamp, ttl, prevHash, currentHash, false};
    
    // Lock physical memory page to prevent swap / zRAM paging to flash storage (PCI-DSS v4.0 Req 3.2)
    if (!block.serializedRequest.empty()) {
        lock_memory_pages_ledger(block.serializedRequest.data(), block.serializedRequest.size());
    }

    queue_.push_back(block);
    id_to_index_[id] = queue_.size() - 1;
    
    return block;
}

bool SovereignLedger::dequeueAndZeroize(const std::string& id) {
    auto it = id_to_index_.find(id);
    if (it == id_to_index_.end()) {
        return false;
    }

    zeroizeBlock(queue_[it->second]);
    queue_.erase(queue_.begin() + it->second);
    rechainLedger();
    return true;
}

void SovereignLedger::clearAll() {
    for (auto& block : queue_) {
        zeroizeBlock(block);
    }
    queue_.clear();
    id_to_index_.clear();
}

bool SovereignLedger::verifyIntegrity() const {
    std::vector<uint8_t> expectedPrevHash(32, 0);

    for (const auto& block : queue_) {
        if (!crypto::constantTimeEqual(block.previousHash, expectedPrevHash)) {
            return false;
        }
        if (!block.isZeroized) {
            std::vector<uint8_t> recomputed = computeBlockHash(block.serializedRequest, block.previousHash, block.timestamp);
            if (!crypto::constantTimeEqual(block.currentHash, recomputed)) {
                return false;
            }
        }
        expectedPrevHash = block.currentHash;
    }
    return true;
}

std::vector<std::string> SovereignLedger::getIds() const {
    std::vector<std::string> ids;
    ids.reserve(queue_.size());
    for (const auto& block : queue_) {
        ids.push_back(block.id);
    }
    return ids;
}

const TransactionBlock* SovereignLedger::getBlock(const std::string& id) const {
    auto it = id_to_index_.find(id);
    if (it != id_to_index_.end()) {
        return &queue_[it->second];
    }
    return nullptr;
}

void SovereignLedger::zeroizeBlock(TransactionBlock& block) {
    // Active Byte-Level Zeroization using secure_zero and memory page unlocking
    if (!block.serializedRequest.empty()) {
        crypto::secure_zero(block.serializedRequest.data(), block.serializedRequest.size());
        unlock_memory_pages_ledger(block.serializedRequest.data(), block.serializedRequest.size());
    }
    if (!block.previousHash.empty()) {
        crypto::secure_zero(block.previousHash.data(), block.previousHash.size());
    }
    if (!block.currentHash.empty()) {
        crypto::secure_zero(block.currentHash.data(), block.currentHash.size());
    }
    if (!block.id.empty()) {
        crypto::secure_zero(block.id.data(), block.id.size());
        block.id.clear();
    }
    block.isZeroized = true;
}

std::vector<uint8_t> SovereignLedger::computeBlockHash(
    const std::vector<uint8_t>& serializedRequest,
    const std::vector<uint8_t>& previousHash,
    uint64_t timestamp
) const {
    std::vector<uint8_t> preImage;
    preImage.reserve(serializedRequest.size() + previousHash.size() + 32);
    preImage.insert(preImage.end(), serializedRequest.begin(), serializedRequest.end());
    preImage.insert(preImage.end(), previousHash.begin(), previousHash.end());
    std::string ts_str = std::to_string(timestamp);
    preImage.insert(preImage.end(), ts_str.begin(), ts_str.end());
    return crypto::sha256(preImage);
}

std::vector<uint8_t> SovereignLedger::resolvePreviousHash() const {
    if (queue_.empty()) return std::vector<uint8_t>(32, 0);
    return queue_.back().currentHash;
}

void SovereignLedger::rechainLedger() {
    std::vector<uint8_t> runningPrevHash(32, 0);
    id_to_index_.clear();
    for (size_t i = 0; i < queue_.size(); ++i) {
        queue_[i].previousHash = runningPrevHash;
        if (!queue_[i].isZeroized) {
            queue_[i].currentHash = computeBlockHash(
                queue_[i].serializedRequest,
                queue_[i].previousHash,
                queue_[i].timestamp
            );
        }
        runningPrevHash = queue_[i].currentHash;
        id_to_index_[queue_[i].id] = i;
    }
}

} // namespace sovereign::secure
