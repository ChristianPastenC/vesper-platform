#pragma once

#include <vector>
#include <string>
#include <mutex>
#include "SovereignTypes.h"
#include "SovereignLedger.h"

namespace sovereign::secure {

/**
 * SovereignSecureCore
 * Thread-safe facade implementation of the memory ledger and hashing watchdog.
 */
class SovereignSecureCore {
public:
    SovereignSecureCore();
    ~SovereignSecureCore();

    // Core execution operations
    bool executeTransaction(
        const std::string& id,
        const std::vector<uint8_t>& serializedRequest,
        double ttl
    );

    CoreQueueStatus getQueueStatus();
    void toggleNetworkSim(bool online);
    void dequeueTransaction(const std::string& id);
    bool verifyIntegrity();
    void clearQueue();
    void zeroize(const std::string& id);
    std::vector<std::string> getQueueIds();
    std::vector<uint8_t> getTransactionPayload(const std::string& id);

private:
    SovereignLedger ledger_;
    std::mutex queue_mutex_;
    bool is_locked_;
    bool is_integrity_compromised_;
    bool is_online_;
};

} // namespace sovereign::secure
