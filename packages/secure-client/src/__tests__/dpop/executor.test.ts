import { withDPoP } from '../../dpop/executor.js';
import type { DPoPSigner } from '../../dpop/signer.js';
import type { DPoPContextResolver } from '../../dpop/types.js';

describe('DPoP Executor', () => {
  it('should create PendingDPoPContext', () => {
    const mockSigner = {} as DPoPSigner;
    const mockResolver: DPoPContextResolver = jest.fn();
    const context = withDPoP(mockSigner, 'POST', 'https://api.test.com', mockResolver);

    expect(context.signer).toBe(mockSigner);
    expect(context.method).toBe('POST');
    expect(context.url).toBe('https://api.test.com');
    expect(context.contextResolver).toBe(mockResolver);
  });
});
