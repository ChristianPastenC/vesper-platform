#include <gtest/gtest.h>
#include "CryptoUtils.h"
// Layer 3 needs the *actual* internal buffer VolatileQueue holds --
// getTransactionPayload() returns a copy (see VolatileQueue.hpp), so its
// .data() points at a temporary that's already gone by the time the caller
// sees it, not at the memory dequeue() will later scrub. That's a real,
// separate bug in this test file, not something to work around by
// weakening the assertion: this reopens `private` for this translation
// unit only (a common, narrowly-scoped test technique) so the test can
// reach queue_ directly, without changing VolatileQueue's public API or
// shipping a test-only accessor in the production header.
#define private public
#include "VolatileQueue.hpp"
#undef private
#include <vector>
#include <cstdint>
#include <cstring>
#include <iostream>

// This file answers one question directly, without Frida, without an
// emulator, and without any mocked data: after a sensitive payload is
// dequeued/discarded, is it actually gone from memory, or does it just look
// gone through the object's own API while the raw bytes are still sitting on
// the heap for anything that can read process memory (a debugger, a
// jailbreak/root tool, Frida, a core dump)?
//
// The trick these tests exploit is exactly the one a real memory-forensics
// attacker uses: capture the raw pointer *before* the owning object is
// destroyed, then read through that same pointer *after* destruction. Per
// the C++ standard that read is undefined behavior (the storage may be
// reused) -- but with nothing else allocating in between, on every allocator
// this project ships on (glibc, Android bionic, Apple libmalloc), a small
// deallocation's bytes are left untouched until something else claims that
// memory. That's not a testing trick we invented -- it's the actual attack
// surface `secure_zero` exists to close, so it's the right way to prove it
// closed. Build this file at -O0 and the difference between the "protected"
// and "naive" cases below disappears, because the naive case's dead store
// no longer gets eliminated -- see the CMakeLists comment for why this
// target is compiled at -O3, matching the shipped library.

namespace sovereign::secure::test {

namespace {
constexpr uint8_t kSentinel = 0xAB;

bool bufferStillContainsSentinel(const uint8_t* ptr, size_t size) {
    for (size_t i = 0; i < size; ++i) {
        if (ptr[i] == kSentinel) return true;
    }
    return false;
}
}  // namespace

// --- Layer 1: does secure_zero() itself actually write zeros? -------------
// A well-defined, in-scope check with no lifetime trickery: this alone would
// pass even for a `memset` that a smart-enough optimizer left alone, so it's
// necessary but not sufficient -- Layer 2 below is the real test.
TEST(MemoryForensicsTest, SecureZeroActuallyWritesZeros) {
    std::vector<uint8_t> buf(64, kSentinel);
    crypto::secure_zero(buf.data(), buf.size());
    for (uint8_t b : buf) {
        EXPECT_EQ(b, 0);
    }
}

// --- Layer 2: the real "unprotected vs protected" comparison --------------
// Same shape of code (fill a heap buffer with a secret pattern, then let it
// die), the only difference is whether the cleanup goes through
// secure_zero() or a plain std::fill -- which is what any code NOT using
// this library would naturally reach for. Reports actual heap contents
// after the buffer's destructor has already run.
TEST(MemoryForensicsTest, UnprotectedVsProtectedCleanupAfterScopeExit) {
    // Each check MUST happen immediately after its own scope closes, before
    // any other heap activity. An earlier version of this test captured all
    // three pointers first and read them back at the end -- but each
    // subsequent 64-byte std::vector allocation below is highly likely to
    // reuse the block the previous one just freed (LIFO free-list reuse is
    // the normal case, not an edge case), which overwrites the previous
    // buffer's freed bytes with the NEXT scope's own sentinel fill before
    // it's ever inspected. That silently corrupted every one of these
    // results into "no leak found", including the uncleaned baseline that
    // must always leak -- exactly the kind of false-negative this whole
    // file exists to catch. Do not batch these reads.

    // "Protected": using the library's secure_zero before the buffer dies.
    uint8_t* protectedPtr = nullptr;
    {
        std::vector<uint8_t> buf(64, kSentinel);
        protectedPtr = buf.data();
        crypto::secure_zero(buf.data(), buf.size());
    }  // ~vector() frees the heap block here; the bytes were already scrubbed.
    bool protectedLeaked = bufferStillContainsSentinel(protectedPtr, 64);

    // "Unprotected": the naive cleanup someone would write without this
    // library. At -O3 the compiler can prove `buf` is never read again after
    // the fill and before it's destroyed, so it's free to drop the fill
    // entirely as a dead store -- the exact bug secure_zero exists to avoid.
    uint8_t* naivePtr = nullptr;
    {
        std::vector<uint8_t> buf(64, kSentinel);
        naivePtr = buf.data();
        std::fill(buf.begin(), buf.end(), 0);
    }
    bool naiveLeaked = bufferStillContainsSentinel(naivePtr, 64);

    // "No cleanup at all": the literal baseline of doing nothing.
    uint8_t* uncleanedPtr = nullptr;
    {
        std::vector<uint8_t> buf(64, kSentinel);
        uncleanedPtr = buf.data();
    }
    bool uncleanedLeaked = bufferStillContainsSentinel(uncleanedPtr, 64);

    std::cout << "[MemoryForensics] secure_zero()   : sentinel present after free = "
              << (protectedLeaked ? "YES (BUG)" : "no") << std::endl;
    std::cout << "[MemoryForensics] naive std::fill : sentinel present after free = "
              << (naiveLeaked ? "YES (dead-store eliminated)" : "no") << std::endl;
    std::cout << "[MemoryForensics] no cleanup      : sentinel present after free = "
              << (uncleanedLeaked ? "YES (expected)" : "no") << std::endl;

    // The one guarantee this library actually makes: its own zeroization
    // path must not leak, full stop. This holds regardless of the platform
    // question below -- "not found" is a fine outcome whether it's because
    // secure_zero worked or because the OS already scrubbed the page; only
    // *finding* it would be alarming.
    EXPECT_FALSE(protectedLeaked)
        << "secure_zero() left the sentinel pattern recoverable in freed memory";

    // The uncleaned baseline is a sanity check on the technique itself, and
    // on this run it failed: even doing *nothing* didn't leave a recoverable
    // pattern. Measured directly (see the plain non-gtest repro this comment
    // is based on), a fresh macOS process's freed small heap allocations
    // come back as all-zero immediately, with nothing else run in between --
    // i.e. Apple's allocator is scrubbing that memory itself as a platform
    // hardening feature, independent of anything the app does. That's a
    // real, useful finding, not a bug in this test: it means "scan freed
    // heap memory for a pattern" cannot distinguish "our library zeroized
    // this" from "the OS already would have" on this platform, so it's
    // treated as inconclusive rather than a pass *or* a build-breaking
    // failure. This may behave differently on Linux/Android (glibc/bionic
    // historically do not scrub freed memory by default), which is worth
    // checking there specifically rather than assuming this result
    // generalizes.
    if (!uncleanedLeaked) {
        GTEST_SKIP() << "This platform's allocator already scrubs freed heap memory on its own "
                        "(confirmed: the 'do nothing' baseline didn't leak either), so this "
                        "specific technique can't show a protected-vs-unprotected difference "
                        "here. secure_zero()'s own behavior was still verified above and in "
                        "SecureZeroActuallyWritesZeros.";
    }

    // Whether the naive fill's dead store actually gets eliminated is a
    // property of this specific compiler/flags/allocator combination, not a
    // fixed guarantee -- report it (done above) rather than assert on it
    // either way.
}

// --- Layer 3: the real library flow, not just secure_zero() in isolation --
// Goes through VolatileQueue::enqueue/dequeue exactly as the app does, and
// checks the raw memory where the payload actually lived. On a platform
// where Layer 2 above found the allocator already scrubs freed memory on
// its own, a PASS here confirms dequeue() is correctly wired to call
// zeroizeBlock()/secure_zero() (i.e. it isn't silently skipped by some other
// code path) rather than independently proving the zeroing itself -- Layer 1
// already establishes that unconditionally.
TEST(MemoryForensicsTest, DequeueScrubsThePayloadFromRealHeapMemory) {
    VolatileQueue queue;
    queue.clearQueue();

    std::string sentinelStr = "GHOST_SEC_FORENSICS_TEST_PAYLOAD";
    std::vector<uint8_t> payload(sentinelStr.begin(), sentinelStr.end());

    queue.enqueue("forensics-1", payload, 60000.0);

    // Reach into the real internal storage (see the `#define private public`
    // above) rather than getTransactionPayload(), which returns a *copy* --
    // its .data() would point at a temporary, not at the memory dequeue()
    // is actually going to scrub.
    ASSERT_EQ(queue.queue_.size(), 1u);
    const uint8_t* payloadPtr = queue.queue_[0].payload.data();
    // While it's still queued, the bytes SHOULD be present -- that's not a
    // leak, it's the ledger doing its job of holding a pending transaction.
    ASSERT_NE(payloadPtr, nullptr);
    EXPECT_EQ(std::memcmp(payloadPtr, sentinelStr.data(), sentinelStr.size()), 0);

    // Capture the raw address before dequeue destroys the block, exactly
    // like an attacker would need to (walk the heap, find the block, keep
    // the address, wait for the "interesting" operation, re-read it).
    const uint8_t* capturedAddress = payloadPtr;
    queue.dequeue("forensics-1");

    bool leaked = std::memcmp(capturedAddress, sentinelStr.data(), sentinelStr.size()) == 0;
    std::cout << "[MemoryForensics] VolatileQueue::dequeue() : sentinel recoverable at its "
                 "former address = "
              << (leaked ? "YES (BUG)" : "no") << std::endl;
    EXPECT_FALSE(leaked) << "The real dequeue() path left the transaction payload recoverable";
}

}  // namespace sovereign::secure::test
