#!/usr/bin/env node
/**
 * ============================================================================
 * V.E.S.P.E.R. Platform — Published NPM Package Stability & Integrity Test
 * ============================================================================
 * Repeatedly downloads and installs `@vesper-core/ghost-ledger` from the npm
 * registry in isolated temporary workspaces (bypassing the shared npm cache)
 * to verify:
 *   1. Registry download reliability and latency across N iterations
 *   2. Tarball SHA-512 integrity consistency across all downloads
 *   3. Package exports resolution (main entry + `/dpop` + `/adapters` subpaths)
 *   4. Runtime functional stability (binary encoding roundtrip & RAM queue)
 *
 * Usage:
 *   node scripts/test_npm_package_stability.mjs [--iterations 5] [--package @vesper-core/ghost-ledger@latest]
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {
    pkg: process.env.NPM_PACKAGE || '@vesper-core/ghost-ledger',
    iterations: Number.parseInt(process.env.ITERATIONS || '16', 10),
    delayMs: Number.parseInt(process.env.DELAY_MS || '500', 10),
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--iterations' || arg === '-n') && argv[i + 1]) {
      args.iterations = Number.parseInt(argv[++i], 10);
    } else if ((arg === '--package' || arg === '-p') && argv[i + 1]) {
      args.pkg = argv[++i];
    } else if ((arg === '--delay' || arg === '-d') && argv[i + 1]) {
      args.delayMs = Number.parseInt(argv[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/test_npm_package_stability.mjs [options]

Options:
  -n, --iterations <number>   Number of fresh download/test cycles (default: 5)
  -p, --package <spec>        NPM package spec to test (default: @vesper-core/ghost-ledger)
  -d, --delay <ms>            Delay in ms between iterations (default: 500)
  -h, --help                  Show this help message
`);
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.iterations) || args.iterations < 1) {
    throw new Error(`Invalid --iterations value: ${args.iterations}`);
  }
  return args;
}

const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpm(npmArgs, cwd) {
  return execFileSync(NPM_CMD, npmArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Smoke Test Script Executed Inside Each Isolated Workspace
// ---------------------------------------------------------------------------
const SMOKE_TEST_SOURCE = `
import assert from 'node:assert/strict';

// 1. Verify root entrypoint exports
const rootMod = await import('@vesper-core/ghost-ledger');
assert.equal(typeof rootMod.SovereignMemoryQueue, 'function', 'SovereignMemoryQueue should be exported');
assert.equal(typeof rootMod.SovereignClientCore, 'function', 'SovereignClientCore should be exported');
assert.equal(typeof rootMod.SovereignHttpError, 'function', 'SovereignHttpError should be exported');
assert.equal(typeof rootMod.IntegrityBreachError, 'function', 'IntegrityBreachError should be exported');
assert.equal(typeof rootMod.encodeJsonBody, 'function', 'encodeJsonBody should be exported');
assert.equal(typeof rootMod.decodeBody, 'function', 'decodeBody should be exported');
assert.equal(typeof rootMod.serializeAdapterRequest, 'function', 'serializeAdapterRequest should be exported');
assert.equal(typeof rootMod.deserializeAdapterRequest, 'function', 'deserializeAdapterRequest should be exported');

// 2. Verify subpath exports (/dpop and /adapters)
const dpopMod = await import('@vesper-core/ghost-ledger/dpop');
assert.equal(typeof dpopMod.DPoPSigner, 'function', 'DPoPSigner should be exported from /dpop');
assert.equal(typeof dpopMod.withDPoP, 'function', 'withDPoP should be exported from /dpop');

const adaptersMod = await import('@vesper-core/ghost-ledger/adapters');
assert.equal(typeof adaptersMod.FetchAdapter, 'function', 'FetchAdapter should be exported from /adapters');
assert.equal(typeof adaptersMod.AxiosAdapter, 'function', 'AxiosAdapter should be exported from /adapters');
assert.equal(typeof adaptersMod.GraphQLAdapter, 'function', 'GraphQLAdapter should be exported from /adapters');

// 3. Functional check: Binary serialization + zeroization
const payload = rootMod.encodeJsonBody({ transactionId: 'tx-stability-01', amount: 1500 });
const serialized = rootMod.serializeAdapterRequest({
  method: 'POST',
  url: 'https://api.vesper.internal/v1/ledger',
  headers: { 'x-sovereign-test': 'true' },
  body: payload,
  timeoutMs: 3000,
});
const deserialized = rootMod.deserializeAdapterRequest(serialized);
assert.ok(deserialized, 'Deserialized request should not be null');
assert.equal(deserialized.method, 'POST');
assert.equal(deserialized.url, 'https://api.vesper.internal/v1/ledger');
assert.equal(deserialized.timeoutMs, 3000);
const decodedBody = JSON.parse(rootMod.decodeBody(deserialized.body));
assert.equal(decodedBody.transactionId, 'tx-stability-01');

// 4. Functional check: SovereignMemoryQueue fallback lifecycle
const queue = rootMod.SovereignMemoryQueue.getInstance();
queue.clearAll();
queue.toggleNetworkSim(false);
try {
  assert.equal(queue.size, 0, 'Queue should start empty');

  const mockCryptoProvider = {
    sha256: async (data) => new Uint8Array(32).fill(1),
    generateRandomBytes: (len) => new Uint8Array(len).fill(2),
  };

  await queue.enqueue(mockCryptoProvider, 'block-1', serialized, 60000, () => {});
  assert.equal(queue.size, 1, 'Queue size should be 1 after enqueue');
  const isIntact = await queue.verifyLedgerIntegrity(mockCryptoProvider);
  assert.equal(isIntact, true, 'Ledger integrity should be valid');
  await queue.dequeue(mockCryptoProvider, 'block-1');
  assert.equal(queue.size, 0, 'Queue size should be 0 after dequeue');
} finally {
  queue.toggleNetworkSim(true);
  queue.clearAll();
}

console.log('SMOKE_TEST_OK');
`;

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------
async function main() {
  const { pkg, iterations, delayMs } = parseArgs(process.argv);

  console.log('======================================================================');
  console.log(' V.E.S.P.E.R. — NPM Published Library Stability & Integrity Runner');
  console.log('======================================================================');
  console.log(`Target Package : ${pkg}`);
  console.log(`Iterations     : ${iterations}`);
  console.log(`Inter-run Delay: ${delayMs}ms`);
  console.log('----------------------------------------------------------------------\n');

  const results = [];
  const hashes = new Set();

  for (let i = 1; i <= iterations; i++) {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `vesper-npm-stability-${i}-`));
    const cacheDir = path.join(workDir, '.npm-cache');
    const packDir = path.join(workDir, 'tarballs');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(packDir, { recursive: true });

    const iterStart = performance.now();
    try {
      console.log(`[Run ${i}/${iterations}] Downloading ${pkg} from npm registry (fresh cache)...`);

      // 1. Download tarball freshly from npm registry using isolated cache
      const downloadStart = performance.now();
      const packOut = runNpm(
        [
          'pack',
          pkg,
          '--pack-destination',
          packDir,
          '--cache',
          cacheDir,
          '--prefer-online',
          '--fetch-retries=1',
          '--fetch-retry-mintimeout=1000',
          '--fetch-retry-maxtimeout=3000',
        ],
        workDir,
      ).trim();
      const downloadMs = Math.round(performance.now() - downloadStart);

      const tarballName = packOut.split(/\r?\n/).pop().trim();
      const tarballPath = path.join(packDir, tarballName);
      if (!fs.existsSync(tarballPath)) {
        throw new Error(`Tarball not found at expected path: ${tarballPath}`);
      }

      // Compute SHA-512 of downloaded tarball
      const tarballBytes = fs.readFileSync(tarballPath);
      const sha512 = createHash('sha512').update(tarballBytes).digest('base64');
      hashes.add(sha512);

      // 2. Initialize isolated test consumer project and install the tarball
      fs.writeFileSync(
        path.join(workDir, 'package.json'),
        JSON.stringify(
          {
            name: `vesper-stability-consumer-${i}`,
            version: '1.0.0',
            private: true,
            type: 'module',
          },
          null,
          2,
        ),
      );

      const installStart = performance.now();
      runNpm(
        [
          'install',
          tarballPath,
          '--no-save',
          '--no-audit',
          '--no-fund',
          '--cache',
          cacheDir,
          '--prefer-online',
        ],
        workDir,
      );
      const installMs = Math.round(performance.now() - installStart);

      // 3. Execute ESM smoke & runtime stability test
      const smokeScriptPath = path.join(workDir, 'smoke.mjs');
      fs.writeFileSync(smokeScriptPath, SMOKE_TEST_SOURCE, 'utf8');

      const smokeStart = performance.now();
      const smokeOutput = execFileSync(process.execPath, [smokeScriptPath], {
        cwd: workDir,
        encoding: 'utf8',
      }).trim();
      const smokeMs = Math.round(performance.now() - smokeStart);

      if (!smokeOutput.includes('SMOKE_TEST_OK')) {
        throw new Error(`Unexpected smoke test output: ${smokeOutput}`);
      }

      const totalMs = Math.round(performance.now() - iterStart);
      console.log(
        `  -> PASS | download: ${downloadMs}ms | install: ${installMs}ms | runtime check: ${smokeMs}ms | size: ${(tarballBytes.length / 1024).toFixed(1)} KB`,
      );

      results.push({
        iteration: i,
        success: true,
        downloadMs,
        installMs,
        smokeMs,
        totalMs,
        sizeBytes: tarballBytes.length,
        sha512,
      });
    } catch (err) {
      const totalMs = Math.round(performance.now() - iterStart);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  -> FAIL (${totalMs}ms): ${message}`);
      results.push({
        iteration: i,
        success: false,
        totalMs,
        error: message,
      });
    } finally {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on Windows file locks
      }
    }

    if (i < iterations && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  const passed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const integrityConsistent = hashes.size <= 1;

  console.log('\n======================================================================');
  console.log(' Stability Test Summary');
  console.log('======================================================================');
  console.log(`Total Runs           : ${results.length}`);
  console.log(`Passed               : ${passed.length}`);
  console.log(`Failed               : ${failed.length}`);
  console.log(
    `Tarball Integrity    : ${
      hashes.size === 1
        ? `CONSISTENT (sha512-${[...hashes][0].slice(0, 24)}...)`
        : hashes.size === 0
          ? 'N/A (no successful downloads)'
          : `MISMATCH (${hashes.size} distinct hashes detected!)`
    }`,
  );

  if (passed.length > 0) {
    const avgDownload = Math.round(
      passed.reduce((acc, r) => acc + r.downloadMs, 0) / passed.length,
    );
    const avgInstall = Math.round(
      passed.reduce((acc, r) => acc + r.installMs, 0) / passed.length,
    );
    const avgSmoke = Math.round(passed.reduce((acc, r) => acc + r.smokeMs, 0) / passed.length);
    console.log(`Avg Download Latency : ${avgDownload}ms`);
    console.log(`Avg Install Time     : ${avgInstall}ms`);
    console.log(`Avg Smoke Test Time  : ${avgSmoke}ms`);
  }
  console.log('======================================================================');

  if (failed.length > 0 || !integrityConsistent) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in stability runner:', err);
  process.exit(1);
});
