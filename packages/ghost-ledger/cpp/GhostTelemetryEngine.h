#pragma once

#include <vector>
#include <mutex>
#include <cstdint>
#include <string>
#include <memory>

namespace vesper::ghost {

enum class TelemetryEventType : uint8_t {
    ZEROIZATION_TRIGGERED = 1,
    INTEGRITY_COMPROMISED = 2,
    COMPUTE_HASH_LATENCY = 3,

    // Structured Zeroization Reasons (DORA Art. 19 / NIST CSF PR.DS-01)
    ZEROIZATION_REASON_ACK_RECEIVED = 10,
    ZEROIZATION_REASON_TTL_EXPIRED = 11,
    ZEROIZATION_REASON_TAMPER_DETECTED = 12,

    // Hardware Root-of-Trust Status (Blessing et al., 2021)
    HW_STRONGBOX_ENFORCED = 20,
    HW_FALLBACK_BLOCKED = 21,

    // Backend Ingestion & Idempotency Collisions (Wang et al., 2023)
    IDEMPOTENCY_COLLISION_RESOLVED = 30
};

#pragma pack(push, 1)
struct TelemetryEvent {
    TelemetryEventType type;
    uint64_t timestamp;
    double value;
};
#pragma pack(pop)

class MmapTelemetryStorage;

class GhostTelemetryEngine {
public:
    static GhostTelemetryEngine& getInstance() {
        static GhostTelemetryEngine instance;
        return instance;
    }

    void init(const std::string& filepath, const std::vector<uint8_t>& sessionKey);

    void recordEvent(TelemetryEventType type, double value = 1.0);
    std::vector<TelemetryEvent> getSnapshotAndClear();

private:
    GhostTelemetryEngine();
    ~GhostTelemetryEngine();

    GhostTelemetryEngine(const GhostTelemetryEngine&) = delete;
    GhostTelemetryEngine& operator=(const GhostTelemetryEngine&) = delete;

    std::unique_ptr<MmapTelemetryStorage> storage_;
    std::mutex mutex_;
};

} // namespace vesper::ghost
