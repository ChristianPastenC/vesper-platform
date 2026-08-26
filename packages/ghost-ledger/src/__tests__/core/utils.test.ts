import { resolveDPoPContext, zeroRequestBuffers } from '../../core/utils.js';
import { encodeHeaders } from '../../binary.js';
import type { SovereignAdapterRequest } from '../../contracts/index.js';
import type { DPoPSigner } from '../../dpop/signer.js';

describe('Core Utils', () => {
  it('should resolve DPoP context from headers', () => {
    const request: SovereignAdapterRequest = {
      method: 'GET',
      url: 'https://api.test.com',
      headers: { Authorization: 'DPoP token123' },
    };

    const mockSigner = {} as DPoPSigner;
    const context = resolveDPoPContext(request, mockSigner);

    expect(context).toBeDefined();
    expect(context?.signer).toBe(mockSigner);
    expect(context?.method).toBe('GET');
    expect(context?.url).toBe('https://api.test.com');
    expect(context?.contextResolver()).toEqual({ accessToken: 'token123' });
  });

  it('should resolve DPoP context with encodedHeaders', () => {
    const request: SovereignAdapterRequest = {
      method: 'POST',
      url: 'https://api.test.com',
      encodedHeaders: encodeHeaders({ 'DPoP': 'true' }),
    };
    const mockSigner = {} as DPoPSigner;
    const context = resolveDPoPContext(request, mockSigner);
    expect(context).toBeDefined();
    expect(context?.method).toBe('POST');
  });

  it('should resolve DPoP context with DPoP header', () => {
    const request: SovereignAdapterRequest = {
      method: 'PUT',
      url: 'https://api.test.com',
      headers: { DPoP: 'true' },
    };
    const mockSigner = {} as DPoPSigner;
    const context = resolveDPoPContext(request, mockSigner);
    expect(context).toBeDefined();
    expect(context?.method).toBe('PUT');
  });

  it('should resolve DPoP context with fallback dpopConfig', () => {
    const request: SovereignAdapterRequest = {
      method: 'PATCH',
      url: 'https://api.test.com',
    };
    const mockSigner = {} as DPoPSigner;
    const mockConfig = { contextResolver: () => ({ accessToken: 'fb' }) };
    const context = resolveDPoPContext(request, mockSigner, mockConfig as never);
    expect(context).toBeDefined();
    expect(context?.method).toBe('PATCH');
  });

  it('should zero request buffers', () => {
    const body = new Uint8Array([1, 2, 3]);
    const headers = new Uint8Array([4, 5, 6]);
    const request = { body, encodedHeaders: headers };

    zeroRequestBuffers(request);

    expect(Array.from(body)).toEqual([0, 0, 0]);
    expect(Array.from(headers)).toEqual([0, 0, 0]);
  });
});
