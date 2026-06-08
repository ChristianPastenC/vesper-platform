#pragma once

#include <memory>
#include <NitroModules/ArrayBuffer.hpp>
#include "HybridSovereignSecureClientSpec.hpp"
#include "QueueStatus.hpp"
#include "SovereignSecureCore.h"

namespace sovereign::secure {

using namespace margelo::nitro;
using namespace margelo::nitro::secureclient;

/**
 * SovereignSecureClient
 * JSI wrapper class mapping JS ArrayBuffers to standard C++ vectors, delegating
 * core domain operations to SovereignSecureCore.
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
    std::shared_ptr<ArrayBuffer> getTransactionPayload(const std::string& id) override;

private:
    SovereignSecureCore core_;
};

} // namespace sovereign::secure
