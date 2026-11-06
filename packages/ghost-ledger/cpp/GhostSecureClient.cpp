#include "GhostSecureClient.hpp"
#include "CryptoUtils.h"
#include <NitroModules/ArrayBuffer.hpp>
#include "GhostTelemetryEngine.h"

namespace vesper::ghost {

using namespace margelo::nitro;

GhostSecureClient::GhostSecureClient()
    // HybridObject is a virtual base of HybridGhostSecureClientSpec, so the
    // most-derived class (this one) must initialize it explicitly with TAG,
    // otherwise C++ silently default-constructs it instead.
    : HybridObject(TAG), HybridGhostSecureClientSpec(), is_online_(true) {}

bool GhostSecureClient::executeTransaction(
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

QueueStatus GhostSecureClient::getQueueStatus() {
    return QueueStatus{
        static_cast<double>(queue_.size()),
        queue_.isLocked(),
        queue_.isIntegrityCompromised()
    };
}

void GhostSecureClient::toggleNetworkSim(bool online) {
    is_online_ = online;
}

void GhostSecureClient::dequeueTransaction(const std::string& id) {
    queue_.dequeue(id);
}

bool GhostSecureClient::verifyIntegrity() {
    return queue_.verifyIntegrity();
}

void GhostSecureClient::clearQueue() {
    queue_.clearQueue();
}

void GhostSecureClient::zeroize(const std::string& id) {
    queue_.zeroize(id);
}

std::vector<std::string> GhostSecureClient::getQueueIds() {
    return queue_.getQueueIds();
}

std::variant<NullType, std::shared_ptr<ArrayBuffer>> GhostSecureClient::getTransactionPayload(const std::string& id) {
    std::vector<uint8_t> payload = queue_.getTransactionPayload(id);
    if (payload.empty()) {
        return NullType();
    }
    return ArrayBuffer::copy(payload.data(), payload.size());
}

std::string GhostSecureClient::base64UrlEncode(const std::shared_ptr<ArrayBuffer>& data) {
    const uint8_t* data_ptr = data->data();
    size_t data_size = data->size();
    std::vector<uint8_t> vec(data_ptr, data_ptr + data_size);
    return crypto::base64UrlEncode(vec);
}

std::shared_ptr<ArrayBuffer> GhostSecureClient::getTelemetrySnapshot() {
    std::vector<TelemetryEvent> snapshot = GhostTelemetryEngine::getInstance().getSnapshotAndClear();
    if (snapshot.empty()) {
        uint8_t dummy = 0;
        return ArrayBuffer::copy(&dummy, 0);
    }
    const uint8_t* data = reinterpret_cast<const uint8_t*>(snapshot.data());
    size_t sizeInBytes = snapshot.size() * sizeof(TelemetryEvent);
    return ArrayBuffer::copy(data, sizeInBytes);
}

} // namespace vesper::ghost
