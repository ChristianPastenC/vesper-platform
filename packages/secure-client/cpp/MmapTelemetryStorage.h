#pragma once

#include <string>
#include <vector>
#include <cstdint>
#include <stdexcept>
#include "SovereignTelemetryEngine.h" // For TelemetryEvent definition

namespace sovereign::secure {

class MmapTelemetryStorage {
public:
    MmapTelemetryStorage();
    ~MmapTelemetryStorage();

    void init(const std::string& filepath, const std::vector<uint8_t>& sessionKey);
    
    void writeEvent(const TelemetryEvent& event);
    std::vector<TelemetryEvent> readAllAndClear();
    
    // Total capacity in bytes (5MB)
    static constexpr size_t MAX_FILE_SIZE = 5 * 1024 * 1024;
    static constexpr size_t HEADER_SIZE = 64;
    static constexpr size_t MAX_EVENTS = (MAX_FILE_SIZE - HEADER_SIZE) / sizeof(TelemetryEvent);

private:
    void openAndMapFile(const std::string& filepath);
    void unmapFile();
    void formatNewFile();
    
    TelemetryEvent readEvent(size_t index);
    void writeEventInternal(size_t index, const TelemetryEvent& event);
    std::vector<uint8_t> generateKeystream(size_t index);

    std::string filepath_;
    std::vector<uint8_t> session_key_;
    
    uint8_t* mapped_data_;
    size_t file_size_;

#ifdef _WIN32
    void* file_handle_;
    void* mapping_handle_;
#else
    int fd_;
#endif
    
    // Pointers to mapped header fields
    uint64_t* head_index_;
    uint64_t* count_;
    uint8_t* iv_;
    
    bool is_initialized_;
};

} // namespace sovereign::secure
