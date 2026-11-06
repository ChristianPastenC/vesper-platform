#pragma once

#include <memory>
#include <variant>
#include <NitroModules/ArrayBuffer.hpp>
#include <NitroModules/Null.hpp>
#include "HybridGhostSecureClientSpec.hpp"
#include "QueueStatus.hpp"
#include "VolatileQueue.hpp"

namespace vesper::ghost {

using namespace margelo::nitro;
using namespace margelo::nitro::secureclient;

/**
 * GhostSecureClient
 * Native C++ implementation of the HybridObject using VolatileQueue.
 */
class GhostSecureClient : public HybridGhostSecureClientSpec {
public:
    GhostSecureClient();
    virtual ~GhostSecureClient() = default;

    bool executeTransaction(
        const std::string& id,
        const std::shared_ptr<ArrayBuffer>& serializedRequest,
        double ttl
    ) override;

    QueueStatus getQueueStatus() override;
    void toggleNetworkSim(bool online) override;
    void dequeueTransaction(const std::string& id) override;
    bool verifyIntegrity() override;
    void clearQueue() override;
    void zeroize(const std::string& id) override;
    std::vector<std::string> getQueueIds() override;
    std::variant<NullType, std::shared_ptr<ArrayBuffer>> getTransactionPayload(const std::string& id) override;
    std::string base64UrlEncode(const std::shared_ptr<ArrayBuffer>& data) override;
    std::shared_ptr<ArrayBuffer> getTelemetrySnapshot() override;

private:
    VolatileQueue queue_;
    bool is_online_;
};

} // namespace vesper::ghost

namespace margelo::nitro::secureclient {
  // Nitrogen's generated autolinking glue expects the implementation class to be
  // reachable as `GhostSecureClient` from this namespace (via `using namespace`).
  using GhostSecureClient = ::vesper::ghost::GhostSecureClient;
}
