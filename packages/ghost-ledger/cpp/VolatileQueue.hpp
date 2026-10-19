#pragma once

#include <vector>
#include <string>
#include <mutex>
#include <unordered_map>
#include <chrono>
#include <stdexcept>
#include <algorithm>
#include "CryptoUtils.h"
#include "SovereignTelemetryEngine.h"

#if defined(_WIN32) || defined(_WIN64)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
inline bool lock_memory_pages(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::VirtualLock(ptr, size) != 0;
}
inline bool unlock_memory_pages(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::VirtualUnlock(ptr, size) != 0;
}
#else
#include <sys/mman.h>
inline bool lock_memory_pages(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::mlock(ptr, size) == 0;
}
inline bool unlock_memory_pages(void* ptr, size_t size) noexcept {
    if (!ptr || size == 0) return true;
    return ::munlock(ptr, size) == 0;
}
#endif

namespace sovereign::secure {

struct TransactionBlock {
    std::string id;
    std::vector<uint8_t> payload;
    uint64_t timestamp;
    double ttl;
    std::vector<uint8_t> previousHash;
    std::vector<uint8_t> currentHash;
    bool isZeroized;
};

class VolatileQueue {
public:
    VolatileQueue() : is_locked_(false), is_integrity_compromised_(false) {}
    ~VolatileQueue() { clearQueue(); }

    void enqueue(const std::string& id, const std::vector<uint8_t>& serializedRequest, double ttl) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (is_locked_ || is_integrity_compromised_) {
            throw std::runtime_error("[VolatileQueue] Queue compromised or locked.");
        }

        uint64_t timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();

        std::vector<uint8_t> prevHash = resolvePreviousHash();
        std::vector<uint8_t> currentHash = computeBlockHash(serializedRequest, prevHash, timestamp);

        TransactionBlock block{id, serializedRequest, timestamp, ttl, prevHash, currentHash, false};
        
        // Enforce physical RAM page locking (mlock / VirtualLock) to comply with PCI-DSS v4.0 Req. 3.2
        // preventing the kernel from paging sensitive cardholder payloads into flash NAND swap / zRAM
        if (!block.payload.empty()) {
            lock_memory_pages(block.payload.data(), block.payload.size());
        }

        queue_.push_back(block);
        id_to_index_[id] = queue_.size() - 1;
    }

    void dequeue(const std::string& id) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = id_to_index_.find(id);
        if (it != id_to_index_.end()) {
            zeroizeBlock(queue_[it->second]);
            queue_.erase(queue_.begin() + it->second);
            rechain();
        }
    }

    void clearQueue() {
        std::lock_guard<std::mutex> lock(mutex_);
        for (auto& block : queue_) {
            zeroizeBlock(block);
        }
        queue_.clear();
        id_to_index_.clear();
        is_locked_ = false;
        is_integrity_compromised_ = false;
    }

    void zeroize(const std::string& id) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = id_to_index_.find(id);
        if (it != id_to_index_.end()) {
            zeroizeBlock(queue_[it->second]);
            queue_.erase(queue_.begin() + it->second);
            rechain();
        }
    }

    bool verifyIntegrity() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<uint8_t> expectedPrevHash(32, 0);

        for (const auto& block : queue_) {
            if (!crypto::constantTimeEqual(block.previousHash, expectedPrevHash)) {
                is_locked_ = true;
                is_integrity_compromised_ = true;
                SovereignTelemetryEngine::getInstance().recordEvent(TelemetryEventType::INTEGRITY_COMPROMISED);
                return false;
            }
            if (!block.isZeroized) {
                std::vector<uint8_t> recomputed = computeBlockHash(block.payload, block.previousHash, block.timestamp);
                if (!crypto::constantTimeEqual(block.currentHash, recomputed)) {
                    is_locked_ = true;
                    is_integrity_compromised_ = true;
                    SovereignTelemetryEngine::getInstance().recordEvent(TelemetryEventType::INTEGRITY_COMPROMISED);
                    return false;
                }
            }
            expectedPrevHash = block.currentHash;
        }
        return true;
    }

    std::vector<std::string> getQueueIds() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<std::string> ids;
        ids.reserve(queue_.size());
        for (const auto& block : queue_) {
            ids.push_back(block.id);
        }
        return ids;
    }

    std::vector<uint8_t> getTransactionPayload(const std::string& id) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = id_to_index_.find(id);
        if (it != id_to_index_.end() && !queue_[it->second].isZeroized) {
            return queue_[it->second].payload;
        }
        return {};
    }

    size_t size() {
        std::lock_guard<std::mutex> lock(mutex_);
        return queue_.size();
    }

    bool isLocked() {
        std::lock_guard<std::mutex> lock(mutex_);
        return is_locked_;
    }

    bool isIntegrityCompromised() {
        std::lock_guard<std::mutex> lock(mutex_);
        return is_integrity_compromised_;
    }

private:
    void zeroizeBlock(TransactionBlock& block) {
        // Active Byte-Level Zeroization compliant with NIST SP 800-88 Rev. 1 & Philippe et al. (2023)
        if (!block.payload.empty()) {
            crypto::secure_zero(block.payload.data(), block.payload.size());
            unlock_memory_pages(block.payload.data(), block.payload.size());
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
        SovereignTelemetryEngine::getInstance().recordEvent(TelemetryEventType::ZEROIZATION_TRIGGERED);
    }

    std::vector<uint8_t> resolvePreviousHash() {
        if (queue_.empty()) return std::vector<uint8_t>(32, 0);
        return queue_.back().currentHash;
    }

    std::vector<uint8_t> computeBlockHash(
        const std::vector<uint8_t>& payload,
        const std::vector<uint8_t>& previousHash,
        uint64_t timestamp
    ) {
        auto start_time = std::chrono::high_resolution_clock::now();

        std::vector<uint8_t> preImage;
        preImage.reserve(payload.size() + previousHash.size() + 32);
        preImage.insert(preImage.end(), payload.begin(), payload.end());
        preImage.insert(preImage.end(), previousHash.begin(), previousHash.end());
        std::string ts_str = std::to_string(timestamp);
        preImage.insert(preImage.end(), ts_str.begin(), ts_str.end());
        
        auto hash = crypto::sha256(preImage);
        
        auto end_time = std::chrono::high_resolution_clock::now();
        double latency_ms = std::chrono::duration<double, std::milli>(end_time - start_time).count();
        SovereignTelemetryEngine::getInstance().recordEvent(TelemetryEventType::COMPUTE_HASH_LATENCY, latency_ms);
        
        return hash;
    }

    void rechain() {
        std::vector<uint8_t> runningPrevHash(32, 0);
        id_to_index_.clear();
        for (size_t i = 0; i < queue_.size(); ++i) {
            queue_[i].previousHash = runningPrevHash;
            if (!queue_[i].isZeroized) {
                queue_[i].currentHash = computeBlockHash(
                    queue_[i].payload,
                    queue_[i].previousHash,
                    queue_[i].timestamp
                );
            }
            runningPrevHash = queue_[i].currentHash;
            id_to_index_[queue_[i].id] = i;
        }
    }

    std::vector<TransactionBlock> queue_;
    std::unordered_map<std::string, size_t> id_to_index_;
    std::mutex mutex_;
    bool is_locked_;
    bool is_integrity_compromised_;
};

} // namespace sovereign::secure
