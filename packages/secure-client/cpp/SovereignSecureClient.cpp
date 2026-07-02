#include "SovereignSecureClient.hpp"
#include "CryptoUtils.h"
#include <NitroModules/ArrayBuffer.hpp>
#include "SovereignTelemetryEngine.h"

namespace sovereign::secure {

using namespace margelo::nitro;

SovereignSecureClient::SovereignSecureClient()
    : HybridSovereignSecureClientSpec(), is_online_(true) {}

bool SovereignSecureClient::executeTransaction(
    const std::string& id,
    const std::shared_ptr<ArrayBuffer>& serializedRequest,
    double ttl
) {
    if (is_online_) {
        return true;
    }

    const uint8_t* data_ptr = serializedRequest->data();
    size_t data_size = serializedRequest->size();
    std::vector<uint8_t> payload(data_ptr, data_ptr + data_size);

    queue_.enqueue(id, payload, ttl);
    return false;
}

QueueStatus SovereignSecureClient::getQueueStatus() {
    return QueueStatus{
        static_cast<double>(queue_.size()),
        queue_.isLocked(),
        queue_.isIntegrityCompromised()
    };
}

void SovereignSecureClient::toggleNetworkSim(bool online) {
    is_online_ = online;
}

void SovereignSecureClient::dequeueTransaction(const std::string& id) {
    queue_.dequeue(id);
}

bool SovereignSecureClient::verifyIntegrity() {
    return queue_.verifyIntegrity();
}

void SovereignSecureClient::clearQueue() {
    queue_.clearQueue();
}

void SovereignSecureClient::zeroize(const std::string& id) {
    queue_.zeroize(id);
}

std::vector<std::string> SovereignSecureClient::getQueueIds() {
    return queue_.getQueueIds();
}

std::shared_ptr<ArrayBuffer> SovereignSecureClient::getTransactionPayload(const std::string& id) {
    std::vector<uint8_t> payload = queue_.getTransactionPayload(id);
    if (payload.empty()) {
        return nullptr;
    }
    return ArrayBuffer::copy(payload.data(), payload.size());
}

std::string SovereignSecureClient::base64UrlEncode(const std::shared_ptr<ArrayBuffer>& data) {
    const uint8_t* data_ptr = data->data();
    size_t data_size = data->size();
    std::vector<uint8_t> vec(data_ptr, data_ptr + data_size);
    return crypto::base64UrlEncode(vec);
}

std::shared_ptr<ArrayBuffer> SovereignSecureClient::getTelemetrySnapshot() {
    std::vector<TelemetryEvent> snapshot = SovereignTelemetryEngine::getInstance().getSnapshotAndClear();
    if (snapshot.empty()) {
        uint8_t dummy = 0;
        return ArrayBuffer::copy(&dummy, 0);
    }
    const uint8_t* data = reinterpret_cast<const uint8_t*>(snapshot.data());
    size_t sizeInBytes = snapshot.size() * sizeof(TelemetryEvent);
    return ArrayBuffer::copy(data, sizeInBytes);
}

} // namespace sovereign::secure