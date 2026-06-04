/**
 * Options accepted by fetchWithTrapping().
 * Extends the standard RequestInit so any option valid for fetch() is valid here.
 */
export interface FetchWithTrappingOptions extends RequestInit {
  fetchImpl?: typeof fetch;
}

/** Construction options for FetchAdapter. */
export interface FetchAdapterOptions {
  fetchImpl?: typeof fetch;
}
