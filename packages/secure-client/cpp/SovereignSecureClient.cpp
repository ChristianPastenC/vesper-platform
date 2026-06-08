#include "SovereignSecureClient.h"

namespace sovereign::secure {

SovereignSecureClient::SovereignSecureClient()
    : HybridSovereignSecureClientSpec() {}

bool SovereignSecureClient::executeTransaction(
    const std::string& id,
    const std::shared_ptr<ArrayBuffer>& serializedRequest,
    double ttl
) {
    const uint8_t* data_ptr = serializedRequest->data();
    size_t data_size = serializedRequest->size();
    std::vector<uint8_t> payload(data_ptr, data_ptr + data_size);

    return core_.executeTransaction(id, payload, ttl);
}

QueueStatus SovereignSecureClient::getQueueStatus() {
    CoreQueueStatus status = core_.getQueueStatus();
    return QueueStatus{
        static_cast<double>(status.size),
        status.isLocked,
        status.isIntegrityCompromised
    };
}

void SovereignSecureClient::toggleNetworkSim(bool online) {
    core_.toggleNetworkSim(online);
}

void SovereignSecureClient::dequeueTransaction(const std::string& id) {
    core_.dequeueTransaction(id);
}

bool SovereignSecureClient::verifyIntegrity() {
    return core_.verifyIntegrity();
}

void SovereignSecureClient::clearQueue() {
    core_.clearQueue();
}

void SovereignSecureClient::zeroize(const std::string& id) {
    core_.zeroize(id);
}

std::vector<std::string> SovereignSecureClient::getQueueIds() {
    return core_.getQueueIds();
}

std::shared_ptr<ArrayBuffer> SovereignSecureClient::getTransactionPayload(const std::string& id) {
    std::vector<uint8_t> payload = core_.getTransactionPayload(id);
    if (payload.empty()) {
        return nullptr;
    }
    return ArrayBuffer::copy(payload.data(), payload.size());
}

} // namespace sovereign::secure
