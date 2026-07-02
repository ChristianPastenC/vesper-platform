#pragma once

#include <vector>
#include <mutex>
#include <cstdint>
#include <string>
#include <memory>

namespace sovereign::secure {

enum class TelemetryEventType : uint8_t {
    ZEROIZATION_TRIGGERED = 1,
    INTEGRITY_COMPROMISED = 2,
    COMPUTE_HASH_LATENCY = 3
};

#pragma pack(push, 1)
struct TelemetryEvent {
    TelemetryEventType type;
    uint64_t timestamp;
    double value;
};
#pragma pack(pop)

class MmapTelemetryStorage;

class SovereignTelemetryEngine {
public:
    static SovereignTelemetryEngine& getInstance() {
        static SovereignTelemetryEngine instance;
        return instance;
    }

    void init(const std::string& filepath, const std::vector<uint8_t>& sessionKey);

    void recordEvent(TelemetryEventType type, double value = 1.0);
    std::vector<TelemetryEvent> getSnapshotAndClear();

private:
    SovereignTelemetryEngine();
    ~SovereignTelemetryEngine();

    SovereignTelemetryEngine(const SovereignTelemetryEngine&) = delete;
    SovereignTelemetryEngine& operator=(const SovereignTelemetryEngine&) = delete;

    std::unique_ptr<MmapTelemetryStorage> storage_;
    std::mutex mutex_;
};

} // namespace sovereign::secure
