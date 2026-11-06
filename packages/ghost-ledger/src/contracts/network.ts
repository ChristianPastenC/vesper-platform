export interface GhostAdapterRequest {
  method: string;
  url: string;
  encodedHeaders?: Uint8Array;
  /** @deprecated Use encodedHeaders instead. */
  headers?: Record<string, string>;
  body?: Uint8Array | null;
  signal?: AbortSignal | null;
  timeoutMs?: number;
}

export interface GhostAdapterResponse<T = unknown> {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly data: T;
}

export interface IGhostNetworkAdapter {
  request<T = unknown>(config: GhostAdapterRequest): Promise<GhostAdapterResponse<T>>;
}

export interface IGhostNetworkAdapterFactory<TOptions = Record<string, unknown>> {
  create(options: TOptions): IGhostNetworkAdapter;
}
