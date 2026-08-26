#include "MmapTelemetryStorage.h"
#include "CryptoUtils.h"
#include <cstring>
#include <random>
#include <iostream>

#ifdef _WIN32
#include <windows.h>
#else
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#endif

namespace sovereign::secure {

static const uint32_t MAGIC_SIG = 0x54454C4D; // "TELM"
static const uint32_t VERSION = 1;

MmapTelemetryStorage::MmapTelemetryStorage()
    : mapped_data_(nullptr), file_size_(0),
#ifdef _WIN32
      file_handle_(INVALID_HANDLE_VALUE), mapping_handle_(NULL),
#else
      fd_(-1),
#endif
      head_index_(nullptr), count_(nullptr), iv_(nullptr), is_initialized_(false) {
}

MmapTelemetryStorage::~MmapTelemetryStorage() {
    unmapFile();
}

void MmapTelemetryStorage::init(const std::string& filepath, const std::vector<uint8_t>& sessionKey) {
    if (is_initialized_) return;
    
    filepath_ = filepath;
    session_key_ = sessionKey;
    if (session_key_.size() < 32) {
        session_key_.resize(32, 0); // Pad with zeroes if too short
    }

    openAndMapFile(filepath_);
    is_initialized_ = true;
}

void MmapTelemetryStorage::openAndMapFile(const std::string& filepath) {
    bool is_new_file = false;

#ifdef _WIN32
    file_handle_ = CreateFileA(filepath.c_str(), GENERIC_READ | GENERIC_WRITE,
        0, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    
    if (file_handle_ == INVALID_HANDLE_VALUE) {
        throw std::runtime_error("Failed to open file for mmap");
    }
    
    LARGE_INTEGER li;
    GetFileSizeEx(file_handle_, &li);
    if (li.QuadPart < static_cast<LONGLONG>(MAX_FILE_SIZE)) {
        is_new_file = true;
        // Truncate to size
        li.QuadPart = MAX_FILE_SIZE;
        SetFilePointerEx(file_handle_, li, NULL, FILE_BEGIN);
        SetEndOfFile(file_handle_);
    }
    
    mapping_handle_ = CreateFileMappingA(file_handle_, NULL, PAGE_READWRITE, 0, 0, NULL);
    if (mapping_handle_ == NULL) {
        CloseHandle(file_handle_);
        throw std::runtime_error("Failed to create file mapping");
    }
    
    mapped_data_ = static_cast<uint8_t*>(MapViewOfFile(mapping_handle_, FILE_MAP_ALL_ACCESS, 0, 0, MAX_FILE_SIZE));
    if (mapped_data_ == nullptr) {
        CloseHandle(mapping_handle_);
        CloseHandle(file_handle_);
        throw std::runtime_error("Failed to map view of file");
    }
#else
    fd_ = open(filepath.c_str(), O_RDWR | O_CREAT, S_IRUSR | S_IWUSR);
    if (fd_ == -1) {
        throw std::runtime_error("Failed to open file for mmap");
    }
    
    struct stat st;
    fstat(fd_, &st);
    if (st.st_size < static_cast<off_t>(MAX_FILE_SIZE)) {
        is_new_file = true;
        if (ftruncate(fd_, MAX_FILE_SIZE) == -1) {
            close(fd_);
            throw std::runtime_error("Failed to resize mmap file");
        }
    }
    
    mapped_data_ = static_cast<uint8_t*>(mmap(NULL, MAX_FILE_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd_, 0));
    if (mapped_data_ == MAP_FAILED) {
        close(fd_);
        throw std::runtime_error("Failed to mmap file");
    }
#endif

    // Map header pointers
    uint32_t* magic = reinterpret_cast<uint32_t*>(mapped_data_);
    head_index_ = reinterpret_cast<uint64_t*>(mapped_data_ + 8);
    count_ = reinterpret_cast<uint64_t*>(mapped_data_ + 16);
    iv_ = mapped_data_ + 24;

    if (is_new_file || *magic != MAGIC_SIG) {
        formatNewFile();
    }
}

void MmapTelemetryStorage::unmapFile() {
    if (mapped_data_ != nullptr) {
#ifdef _WIN32
        UnmapViewOfFile(mapped_data_);
        CloseHandle(mapping_handle_);
        CloseHandle(file_handle_);
#else
        munmap(mapped_data_, MAX_FILE_SIZE);
        close(fd_);
#endif
        mapped_data_ = nullptr;
    }
}

void MmapTelemetryStorage::formatNewFile() {
    std::memset(mapped_data_, 0, MAX_FILE_SIZE);
    uint32_t* magic = reinterpret_cast<uint32_t*>(mapped_data_);
    uint32_t* version = reinterpret_cast<uint32_t*>(mapped_data_ + 4);
    
    *magic = MAGIC_SIG;
    *version = VERSION;
    *head_index_ = 0;
    *count_ = 0;
    
    // Generate IV (using std::random_device for simplicity)
    std::random_device rd;
    for (int i = 0; i < 32; ++i) {
        iv_[i] = static_cast<uint8_t>(rd());
    }
}

std::vector<uint8_t> MmapTelemetryStorage::generateKeystream(size_t index) {
    std::vector<uint8_t> preImage = session_key_;
    preImage.insert(preImage.end(), iv_, iv_ + 32);
    
    uint64_t idx = static_cast<uint64_t>(index);
    uint8_t* idx_ptr = reinterpret_cast<uint8_t*>(&idx);
    preImage.insert(preImage.end(), idx_ptr, idx_ptr + sizeof(uint64_t));
    
    return crypto::sha256(preImage);
}

void MmapTelemetryStorage::writeEventInternal(size_t index, const TelemetryEvent& event) {
    auto keystream = generateKeystream(index);
    uint8_t* target = mapped_data_ + HEADER_SIZE + (index * sizeof(TelemetryEvent));
    
    const uint8_t* event_ptr = reinterpret_cast<const uint8_t*>(&event);
    for (size_t i = 0; i < sizeof(TelemetryEvent); ++i) {
        target[i] = event_ptr[i] ^ keystream[i % keystream.size()];
    }
}

TelemetryEvent MmapTelemetryStorage::readEvent(size_t index) {
    auto keystream = generateKeystream(index);
    const uint8_t* source = mapped_data_ + HEADER_SIZE + (index * sizeof(TelemetryEvent));
    
    TelemetryEvent event;
    uint8_t* event_ptr = reinterpret_cast<uint8_t*>(&event);
    for (size_t i = 0; i < sizeof(TelemetryEvent); ++i) {
        event_ptr[i] = source[i] ^ keystream[i % keystream.size()];
    }
    return event;
}

void MmapTelemetryStorage::writeEvent(const TelemetryEvent& event) {
    if (!is_initialized_) return;
    
    size_t write_idx = *head_index_;
    writeEventInternal(write_idx, event);
    
    *head_index_ = (*head_index_ + 1) % MAX_EVENTS;
    if (*count_ < MAX_EVENTS) {
        (*count_)++;
    }
}

std::vector<TelemetryEvent> MmapTelemetryStorage::readAllAndClear() {
    std::vector<TelemetryEvent> result;
    if (!is_initialized_) return result;
    
    size_t current_count = *count_;
    result.reserve(current_count);
    
    if (current_count > 0) {
        size_t start = (current_count == MAX_EVENTS) ? *head_index_ : 0;
        for (size_t i = 0; i < current_count; ++i) {
            result.push_back(readEvent((start + i) % MAX_EVENTS));
        }
    }
    
    *head_index_ = 0;
    *count_ = 0;
    
    return result;
}

} // namespace sovereign::secure
