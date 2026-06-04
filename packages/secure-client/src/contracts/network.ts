export interface SovereignAdapterRequest {
  method: string;
  url: string;
  encodedHeaders?: Uint8Array;
  /** @deprecated Use encodedHeaders instead. */
  headers?: Record<string, string>;
  body?: Uint8Array | null;
  signal?: AbortSignal | null;
  timeoutMs?: number;
}

export interface SovereignAdapterResponse<T = unknown> {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly data: T;
}

export interface ISovereignNetworkAdapter {
  request<T = unknown>(config: SovereignAdapterRequest): Promise<SovereignAdapterResponse<T>>;
}

export interface ISovereignNetworkAdapterFactory<TOptions = Record<string, unknown>> {
  create(options: TOptions): ISovereignNetworkAdapter;
}
