#include "SovereignTelemetryEngine.h"
#include "MmapTelemetryStorage.h"
#include <chrono>
#include <cstdlib>
#include <random>

namespace sovereign::secure {

namespace {
// A bare relative filename resolves against the process's current working
// directory, which on iOS/Android app sandboxes is not writable. TMPDIR is
// guaranteed to be set to a writable, app-private directory on those
// platforms; fall back to the bare filename elsewhere (e.g. desktop/CI tests).
std::string defaultTelemetryFilePath() {
    if (const char* tmpDir = std::getenv("TMPDIR")) {
        std::string dir(tmpDir);
        if (!dir.empty() && dir.back() != '/') dir += '/';
        return dir + "sovereign_telemetry.bin";
    }
    return "sovereign_telemetry.bin";
}
}

SovereignTelemetryEngine::SovereignTelemetryEngine() {
    storage_ = std::make_unique<MmapTelemetryStorage>();
    std::random_device rd;
    std::vector<uint8_t> default_key(32);
    for (int i = 0; i < 32; ++i) default_key[i] = static_cast<uint8_t>(rd());
    storage_->init(defaultTelemetryFilePath(), default_key);
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
