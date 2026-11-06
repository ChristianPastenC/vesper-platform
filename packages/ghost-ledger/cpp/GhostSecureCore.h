#pragma once

#include <vector>
#include <string>
#include <mutex>
#include "GhostTypes.h"
#include "GhostLedger.h"

namespace vesper::ghost {

/**
 * GhostSecureCore
 * Thread-safe facade implementation of the memory ledger and hashing watchdog.
 */
class GhostSecureCore {
public:
    GhostSecureCore();
    ~GhostSecureCore();

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
    GhostLedger ledger_;
    std::mutex queue_mutex_;
    bool is_locked_;
    bool is_integrity_compromised_;
    bool is_online_;
};

} // namespace vesper::ghost
