#include "SovereignTelemetryEngine.h"
#include <chrono>

namespace sovereign::secure {

void SovereignTelemetryEngine::recordEvent(TelemetryEventType type, double value) {
    auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();

    std::lock_guard<std::mutex> lock(mutex_);
    
    buffer_[head_] = TelemetryEvent{type, static_cast<uint64_t>(now), value};
    head_ = (head_ + 1) % MAX_EVENTS;
    if (count_ < MAX_EVENTS) {
        count_++;
    }
}

std::vector<TelemetryEvent> SovereignTelemetryEngine::getSnapshotAndClear() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<TelemetryEvent> snapshot;
    snapshot.reserve(count_);

    if (count_ > 0) {
        size_t start = (count_ == MAX_EVENTS) ? head_ : 0;
        for (size_t i = 0; i < count_; ++i) {
            snapshot.push_back(buffer_[(start + i) % MAX_EVENTS]);
        }
    }

    head_ = 0;
    count_ = 0;

    return snapshot;
}

} // namespace sovereign::secure
