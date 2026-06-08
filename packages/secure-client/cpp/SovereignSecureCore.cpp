#include "SovereignSecureCore.h"
#include <chrono>
#include <cstring>
#include <algorithm>
#include <stdexcept>

namespace sovereign::secure {

namespace crypto {
    inline uint32_t rotr(uint32_t val, uint32_t shift) {
        return (val >> shift) | (val << (32 - shift));
    }
    inline uint32_t choose(uint32_t x, uint32_t y, uint32_t z) { return (x & y) ^ (~x & z); }
    inline uint32_t majority(uint32_t x, uint32_t y, uint32_t z) { return (x & y) ^ (x & z) ^ (y & z); }
    inline uint32_t sig0(uint32_t x) { return rotr(x, 7) ^ rotr(x, 18) ^ (x >> 3); }
    inline uint32_t sig1(uint32_t x) { return rotr(x, 17) ^ rotr(x, 19) ^ (x >> 10); }
    inline uint32_t sum0(uint32_t x) { return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22); }
    inline uint32_t sum1(uint32_t x) { return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25); }

    const uint32_t K[64] = {
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    };

    std::vector<uint8_t> sha256(const std::vector<uint8_t>& data) {
        uint32_t h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
        uint32_t h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
        std::vector<uint8_t> msg = data;
        uint64_t bit_len = msg.size() * 8;
        msg.push_back(0x80);
        while ((msg.size() + 8) % 64 != 0) msg.push_back(0x00);
        for (int i = 7; i >= 0; --i) msg.push_back(static_cast<uint8_t>((bit_len >> (i * 8)) & 0xff));

        for (size_t chunk = 0; chunk < msg.size() / 64; ++chunk) {
            uint32_t W[64];
            for (int t = 0; t < 16; ++t) {
                size_t idx = chunk * 64 + t * 4;
                W[t] = (msg[idx] << 24) | (msg[idx + 1] << 16) | (msg[idx + 2] << 8) | msg[idx + 3];
            }
            for (int t = 16; t < 64; ++t) W[t] = sig1(W[t - 2]) + W[t - 7] + sig0(W[t - 15]) + W[t - 16];
            uint32_t a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
            for (int t = 0; t < 64; ++t) {
                uint32_t temp1 = h + sum1(e) + choose(e, f, g) + K[t] + W[t];
                uint32_t temp2 = sum0(a) + majority(a, b, c);
                h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
            }
            h0 += a; h1 += b; h2 += c; h3 += d; h4 += e; h5 += f; h6 += g; h7 += h;
        }
        std::vector<uint8_t> hash(32);
        auto write_be = [](std::vector<uint8_t>& out, size_t offset, uint32_t val) {
            out[offset] = (val >> 24) & 0xff; out[offset + 1] = (val >> 16) & 0xff;
            out[offset + 2] = (val >> 8) & 0xff; out[offset + 3] = val & 0xff;
        };
        write_be(hash, 0, h0); write_be(hash, 4, h1); write_be(hash, 8, h2); write_be(hash, 12, h3);
        write_be(hash, 16, h4); write_be(hash, 20, h5); write_be(hash, 24, h6); write_be(hash, 28, h7);
        return hash;
    }
}

SovereignSecureCore::SovereignSecureCore()
    : is_locked_(false),
      is_integrity_compromised_(false),
      is_online_(true) {}

SovereignSecureCore::~SovereignSecureCore() {
    clearQueue();
}

bool SovereignSecureCore::executeTransaction(
    const std::string& id,
    const std::vector<uint8_t>& serializedRequest,
    double ttl
) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    if (is_locked_ || is_integrity_compromised_) {
        throw std::runtime_error("[SovereignCore] Ledger compromised or locked. Execution blocked.");
    }

    auto it = id_to_index_.find(id);
    if (it != id_to_index_.end()) {
        ZeroizeBlock(queue_[it->second]);
        queue_.erase(queue_.begin() + it->second);
        RechainLedger();
    }

    if (is_online_) {
        return true;
    }

    std::vector<uint8_t> prevHash = ResolvePreviousHash();
    uint64_t timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();

    std::vector<uint8_t> currentHash = ComputeBlockHash(serializedRequest, prevHash, timestamp);

    TransactionBlock block{id, serializedRequest, timestamp, ttl, prevHash, currentHash, false};
    queue_.push_back(block);
    id_to_index_[id] = queue_.size() - 1;

    return false;
}

CoreQueueStatus SovereignSecureCore::getQueueStatus() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    return CoreQueueStatus{queue_.size(), is_locked_, is_integrity_compromised_};
}

void SovereignSecureCore::toggleNetworkSim(bool online) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    is_online_ = online;
}

void SovereignSecureCore::dequeueTransaction(const std::string& id) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    if (is_locked_ || is_integrity_compromised_) {
        throw std::runtime_error("[SovereignCore] Ledger compromised or locked. Execution blocked.");
    }

    auto it = id_to_index_.find(id);
    if (it == id_to_index_.end()) return;

    ZeroizeBlock(queue_[it->second]);
    queue_.erase(queue_.begin() + it->second);
    RechainLedger();
}

bool SovereignSecureCore::verifyIntegrity() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    std::vector<uint8_t> expectedPrevHash(32, 0);

    for (auto& block : queue_) {
        if (!ConstantTimeEqual(block.previousHash, expectedPrevHash)) {
            is_locked_ = true;
            is_integrity_compromised_ = true;
            return false;
        }
        if (!block.isZeroized) {
            std::vector<uint8_t> recomputed = ComputeBlockHash(block.serializedRequest, block.previousHash, block.timestamp);
            if (!ConstantTimeEqual(block.currentHash, recomputed)) {
                is_locked_ = true;
                is_integrity_compromised_ = true;
                return false;
            }
        }
        expectedPrevHash = block.currentHash;
    }
    return true;
}

void SovereignSecureCore::clearQueue() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    for (auto& block : queue_) {
        ZeroizeBlock(block);
    }
    queue_.clear();
    id_to_index_.clear();
    is_locked_ = false;
}

void SovereignSecureCore::zeroize(const std::string& id) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    auto it = id_to_index_.find(id);
    if (it == id_to_index_.end()) return;

    ZeroizeBlock(queue_[it->second]);
    queue_.erase(queue_.begin() + it->second);
    RechainLedger();
}

std::vector<std::string> SovereignSecureCore::getQueueIds() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    std::vector<std::string> ids;
    ids.reserve(queue_.size());
    for (const auto& block : queue_) {
        ids.push_back(block.id);
    }
    return ids;
}

std::vector<uint8_t> SovereignSecureCore::getTransactionPayload(const std::string& id) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    auto it = id_to_index_.find(id);
    if (it == id_to_index_.end()) return {};

    const auto& block = queue_[it->second];
    if (block.isZeroized) return {};

    return block.serializedRequest;
}

void SovereignSecureCore::ZeroizeBlock(TransactionBlock& block) {
    std::fill(block.serializedRequest.begin(), block.serializedRequest.end(), 0);
    std::fill(block.previousHash.begin(), block.previousHash.end(), 0);
    std::fill(block.currentHash.begin(), block.currentHash.end(), 0);
    block.isZeroized = true;
}

std::vector<uint8_t> SovereignSecureCore::ComputeBlockHash(
    const std::vector<uint8_t>& serializedRequest,
    const std::vector<uint8_t>& previousHash,
    uint64_t timestamp
) {
    std::vector<uint8_t> preImage;
    preImage.reserve(serializedRequest.size() + previousHash.size() + 32);
    preImage.insert(preImage.end(), serializedRequest.begin(), serializedRequest.end());
    preImage.insert(preImage.end(), previousHash.begin(), previousHash.end());
    std::string ts_str = std::to_string(timestamp);
    preImage.insert(preImage.end(), ts_str.begin(), ts_str.end());
    return crypto::sha256(preImage);
}

bool SovereignSecureCore::ConstantTimeEqual(const std::vector<uint8_t>& a, const std::vector<uint8_t>& b) {
    if (a.size() != b.size()) return false;
    uint8_t diff = 0;
    for (size_t i = 0; i < a.size(); ++i) diff |= a[i] ^ b[i];
    return diff == 0;
}

std::vector<uint8_t> SovereignSecureCore::ResolvePreviousHash() {
    if (queue_.empty()) return std::vector<uint8_t>(32, 0);
    return queue_.back().currentHash;
}

void SovereignSecureCore::RechainLedger() {
    std::vector<uint8_t> runningPrevHash(32, 0);
    id_to_index_.clear();
    for (size_t i = 0; i < queue_.size(); ++i) {
        queue_[i].previousHash = runningPrevHash;
        if (!queue_[i].isZeroized) {
            queue_[i].currentHash = ComputeBlockHash(queue_[i].serializedRequest, queue_[i].previousHash, queue_[i].timestamp);
        }
        runningPrevHash = queue_[i].currentHash;
        id_to_index_[queue_[i].id] = i;
    }
}

} // namespace sovereign::secure
