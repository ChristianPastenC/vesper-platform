#include "MmapTelemetryStorage.h"
#include "CryptoUtils.h"
#include <cstring>
#include <iostream>
#include <stdexcept>

// ── Platform-specific headers ────────────────────────────────────────────────
#ifdef _WIN32
#  include <windows.h>
#  include <bcrypt.h>                    // BCryptGenRandom
#  ifdef _MSC_VER
#    pragma comment(lib, "bcrypt.lib")   // Auto-link on MSVC
#  endif
#else
#  include <sys/mman.h>                 // mmap, munmap, mlock, msync
#  include <sys/stat.h>
#  include <fcntl.h>
#  include <unistd.h>
#  if defined(__APPLE__) || defined(__FreeBSD__)
#    include <stdlib.h>                 // arc4random_buf (Apple/BSD)
#  else
#    include <sys/syscall.h>           // SYS_getrandom — invoked directly below
#  endif
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
    // Zeroize and unlock the session key before any memory is released.
    // This prevents the key from lingering in freed heap pages.
    if (!session_key_.empty()) {
        crypto::secure_zero(session_key_.data(), session_key_.size());
#ifdef _WIN32
        VirtualUnlock(session_key_.data(), session_key_.size());
#else
        munlock(session_key_.data(), session_key_.size());
#endif
        session_key_.clear();
    }
    unmapFile();
}

void MmapTelemetryStorage::init(const std::string& filepath, const std::vector<uint8_t>& sessionKey) {
    if (is_initialized_) return;

    // Reject short keys outright — silent zero-padding produces a weak key.
    if (sessionKey.size() < 32) {
        throw std::invalid_argument(
            "[MmapTelemetryStorage] session_key must be exactly 32 bytes; "
            "got " + std::to_string(sessionKey.size()));
    }

    filepath_ = filepath;
    session_key_ = sessionKey;

    // Attempt to lock the key in RAM so the OS cannot swap it to disk.
    // mlock/VirtualLock may fail on unprivileged processes (e.g. stock Android
    // without CAP_IPC_LOCK). We treat failure as a soft warning — the key is
    // still in memory, just not guaranteed to be non-swappable. The session key
    // is short-lived and ephemeral, so this is an acceptable degradation.
#ifdef _WIN32
    VirtualLock(session_key_.data(), session_key_.size());
#else
    mlock(session_key_.data(), session_key_.size());
#endif

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
    uint32_t* magic   = reinterpret_cast<uint32_t*>(mapped_data_);
    uint32_t* version = reinterpret_cast<uint32_t*>(mapped_data_ + 4);

    *magic        = MAGIC_SIG;
    *version      = VERSION;
    *head_index_  = 0;
    *count_       = 0;

    // Generate IV using a platform CSPRNG.
    //
    // std::random_device is explicitly NOT used here. On MinGW (Windows), it is
    // documented to fall back to a deterministic PRNG when no hardware source is
    // available, producing a predictable IV and a breakable XOR keystream.
    // We use OS-level APIs that are guaranteed to be cryptographically strong:
    //
    //   Windows  → BCryptGenRandom (CNG, kernel CSPRNG)
    //   Apple/BSD → arc4random_buf (ChaCha20 CSPRNG, never fails, no seed needed)
    //   Linux/Android → getrandom(2) with /dev/urandom fallback
    generateSecureRandom(iv_, 32);
}

void MmapTelemetryStorage::generateSecureRandom(uint8_t* buf, size_t size) {
#ifdef _WIN32
    NTSTATUS status = BCryptGenRandom(
        NULL, buf, static_cast<ULONG>(size), BCRYPT_USE_SYSTEM_PREFERRED_RNG);
    if (!BCRYPT_SUCCESS(status)) {
        throw std::runtime_error(
            "[MmapTelemetryStorage] BCryptGenRandom failed — cannot generate secure IV");
    }
#elif defined(__APPLE__) || defined(__FreeBSD__)
    // arc4random_buf is seeded by the kernel; never fails; available on all Apple platforms.
    arc4random_buf(buf, size);
#else
    // Linux / Android: invoke the getrandom(2) syscall directly via syscall(),
    // rather than the libc/bionic wrapper. The wrapper (and its <sys/random.h>
    // declaration) only exists for glibc 2.25+ / Android API 28+, but this
    // package's minSdkVersion is 24 — the kernel syscall itself has been
    // available since Linux 3.17 (Android 5.0 / API 21), so calling it
    // directly keeps older API levels buildable without losing CSPRNG quality.
    // Falls back to /dev/urandom for kernels that lack the syscall entirely.
    long ret = syscall(SYS_getrandom, buf, size, 0);
    if (ret < 0 || static_cast<size_t>(ret) != size) {
        // Fallback: /dev/urandom (always available on Linux/Android)
        int fd = open("/dev/urandom", O_RDONLY | O_CLOEXEC);
        if (fd < 0) {
            throw std::runtime_error(
                "[MmapTelemetryStorage] Cannot open /dev/urandom for IV generation");
        }
        ssize_t n = read(fd, buf, size);
        close(fd);
        if (n < 0 || static_cast<size_t>(n) != size) {
            throw std::runtime_error(
                "[MmapTelemetryStorage] Failed to read entropy from /dev/urandom");
        }
    }
#endif
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

    // Purge the XOR-encrypted event bytes from the mmap region before
    // resetting the counters. Without this step the ciphertext remains on disk
    // even after "clearing" — recoverable by anyone with filesystem access who
    // also obtains the session key (e.g. via a memory dump or crash report).
    //
    // We zero the entire data area (not just the events read) to handle ring-
    // buffer wraparound correctly and to leave no partial ciphertext behind.
    // The header (magic, version, head_index, count, iv) is preserved — only
    // the event data region is wiped.
    if (current_count > 0) {
        crypto::secure_zero(mapped_data_ + HEADER_SIZE, MAX_FILE_SIZE - HEADER_SIZE);
        // Flush to physical storage so the kernel page cache doesn't hold the
        // plaintext after the process exits.
#ifdef _WIN32
        FlushViewOfFile(mapped_data_ + HEADER_SIZE, MAX_FILE_SIZE - HEADER_SIZE);
#else
        msync(mapped_data_ + HEADER_SIZE, MAX_FILE_SIZE - HEADER_SIZE, MS_SYNC);
#endif
    }

    *head_index_ = 0;
    *count_      = 0;

    return result;
}

} // namespace sovereign::secure
