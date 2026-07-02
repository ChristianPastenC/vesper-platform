#include "SovereignTelemetryEngine.h"
#include "MmapTelemetryStorage.h"
#include <chrono>
#include <random>

namespace sovereign::secure {

SovereignTelemetryEngine::SovereignTelemetryEngine() {
    storage_ = std::make_unique<MmapTelemetryStorage>();
    std::random_device rd;
    std::vector<uint8_t> default_key(32);
    for (int i = 0; i < 32; ++i) default_key[i] = static_cast<uint8_t>(rd());
    storage_->init("sovereign_telemetry.bin", default_key);
}

SovereignTelemetryEngine::~SovereignTelemetryEngine() = default;

void SovereignTelemetryEngine::init(const std::string& filepath, const std::vector<uint8_t>& sessionKey) {
    std::lock_guard<std::mutex> lock(mutex_);
    storage_ = std::make_unique<MmapTelemetryStorage>();
    storage_->init(filepath, sessionKey);
}

void SovereignTelemetryEngine::recordEvent(TelemetryEventType type, double value) {
    auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();

    std::lock_guard<std::mutex> lock(mutex_);
    TelemetryEvent event{type, static_cast<uint64_t>(now), value};
    storage_->writeEvent(event);
}

std::vector<TelemetryEvent> SovereignTelemetryEngine::getSnapshotAndClear() {
    std::lock_guard<std::mutex> lock(mutex_);
    return storage_->readAllAndClear();
}

} // namespace sovereign::secure
