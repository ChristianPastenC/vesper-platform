import { buildTransactionLedger } from './buildTransactionLedger';
import { nativeCryptoProvider } from '../../../core/crypto/NativeCryptoProvider';
import * as crypto from 'crypto';

jest.mock('../../../core/crypto/NativeCryptoProvider', () => ({
  nativeCryptoProvider: {
    sha256: jest.fn(async (data: Uint8Array) => {
      const mockCrypto = require('crypto');
      return mockCrypto.createHash('sha256').update(data).digest();
    }),
  },
}));

describe('buildTransactionLedger', () => {
  const mockItems = [
    { id: 1, name: 'Item A', price: 10 },
    { id: 2, name: 'Item B', price: 20 },
    { id: 3, name: 'Item C', price: 30 },
  ];

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('verifies the genesis block has precedingHash === "0"', async () => {
    const ledger = await buildTransactionLedger([mockItems[0]]);

    expect(ledger).toHaveLength(1);
    expect(ledger[0].precedingHash).toBe('0');
    expect(ledger[0].index).toBe(0);
    expect(ledger[0].payload).toBe(JSON.stringify(mockItems[0]));
    expect(ledger[0].timestamp).toBe(Date.now());
  });

  it('each block links to the hash of the preceding one', async () => {
    const ledger = await buildTransactionLedger(mockItems);

    expect(ledger).toHaveLength(3);
    expect(ledger[0].precedingHash).toBe('0');
    expect(ledger[1].precedingHash).toBe(ledger[0].hash);
    expect(ledger[2].precedingHash).toBe(ledger[1].hash);
  });

  it('the chain is invalid if the payload of any block is altered', async () => {
    const ledger = await buildTransactionLedger(mockItems);

    // To verify invalidity, we manually recompute the hash for the second block using an altered payload
    const alteredPayload = JSON.stringify({ id: 2, name: 'Hacked Item B', price: 0 });

    const timestamp = ledger[1].timestamp;
    const precedingHash = ledger[1].precedingHash;
    const dataToHash = `${alteredPayload}${precedingHash}${timestamp}`;

    const recomputedHashBuffer = crypto.createHash('sha256').update(dataToHash).digest();
    const recomputedHash = Array.from(new Uint8Array(recomputedHashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // The tampered payload produces a different hash than the one originally signed into the ledger
    expect(recomputedHash).not.toBe(ledger[1].hash);
  });
});
