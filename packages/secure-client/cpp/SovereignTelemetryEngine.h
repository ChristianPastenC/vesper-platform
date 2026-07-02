#pragma once

#include <vector>
#include <mutex>
#include <cstdint>
#include <array>

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

class SovereignTelemetryEngine {
public:
    static SovereignTelemetryEngine& getInstance() {
        static SovereignTelemetryEngine instance;
        return instance;
    }

    void recordEvent(TelemetryEventType type, double value = 1.0);
    std::vector<TelemetryEvent> getSnapshotAndClear();

private:
    SovereignTelemetryEngine() : head_(0), count_(0) {}
    ~SovereignTelemetryEngine() = default;

    SovereignTelemetryEngine(const SovereignTelemetryEngine&) = delete;
    SovereignTelemetryEngine& operator=(const SovereignTelemetryEngine&) = delete;

    static constexpr size_t MAX_EVENTS = 1024;
    std::array<TelemetryEvent, MAX_EVENTS> buffer_;
    size_t head_;
    size_t count_;
    std::mutex mutex_;
};

} // namespace sovereign::secure
