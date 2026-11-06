#include "GhostSecureCore.h"
#include <chrono>
#include <stdexcept>

namespace vesper::ghost {

GhostSecureCore::GhostSecureCore()
    : is_locked_(false),
      is_integrity_compromised_(false),
      is_online_(true) {}

GhostSecureCore::~GhostSecureCore() {
    clearQueue();
}

bool GhostSecureCore::executeTransaction(
    const std::string& id,
    const std::vector<uint8_t>& serializedRequest,
    double ttl
) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    if (is_locked_ || is_integrity_compromised_) {
        throw std::runtime_error("[GhostLedger] Ledger compromised or locked. Execution blocked.");
    }

    // Try to dequeue first if it exists
    ledger_.dequeueAndZeroize(id);

    if (is_online_) {
        return true;
    }

    uint64_t timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();

    ledger_.enqueue(id, serializedRequest, timestamp, ttl);
    return false;
}

CoreQueueStatus GhostSecureCore::getQueueStatus() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    return CoreQueueStatus{ledger_.size(), is_locked_, is_integrity_compromised_};
}

void GhostSecureCore::toggleNetworkSim(bool online) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    is_online_ = online;
}

void GhostSecureCore::dequeueTransaction(const std::string& id) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    if (is_locked_ || is_integrity_compromised_) {
        throw std::runtime_error("[GhostLedger] Ledger compromised or locked. Execution blocked.");
    }

    ledger_.dequeueAndZeroize(id);
}

bool GhostSecureCore::verifyIntegrity() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    bool valid = ledger_.verifyIntegrity();
    if (!valid) {
        is_locked_ = true;
        is_integrity_compromised_ = true;
    }
    return valid;
}

void GhostSecureCore::clearQueue() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    ledger_.clearAll();
    is_locked_ = false;
}

void GhostSecureCore::zeroize(const std::string& id) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    ledger_.dequeueAndZeroize(id);
}

std::vector<std::string> GhostSecureCore::getQueueIds() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    return ledger_.getIds();
}

std::vector<uint8_t> GhostSecureCore::getTransactionPayload(const std::string& id) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    
    const TransactionBlock* block = ledger_.getBlock(id);
    if (!block || block->isZeroized) {
        return {};
    }
    return block->serializedRequest;
}

} // namespace vesper::ghost
