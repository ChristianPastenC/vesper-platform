#pragma once

#include <memory>
#include <variant>
#include <NitroModules/ArrayBuffer.hpp>
#include <NitroModules/Null.hpp>
#include "HybridSovereignSecureClientSpec.hpp"
#include "QueueStatus.hpp"
#include "VolatileQueue.hpp"

namespace sovereign::secure {

using namespace margelo::nitro;
using namespace margelo::nitro::secureclient;

/**
 * SovereignSecureClient
 * Native C++ implementation of the HybridObject using VolatileQueue.
 */
class SovereignSecureClient : public HybridSovereignSecureClientSpec {
public:
    SovereignSecureClient();
    virtual ~SovereignSecureClient() = default;

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

} // namespace sovereign::secure

namespace margelo::nitro::secureclient {
  // Nitrogen's generated autolinking glue expects the implementation class to be
  // reachable as `SovereignSecureClient` from this namespace (via `using namespace`).
  using SovereignSecureClient = ::sovereign::secure::SovereignSecureClient;
}
