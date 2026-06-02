import axios, { AxiosInstance } from 'axios';

export const CLIENT_VERSION = '0.1.0';

export interface HandshakeResponse {
  status:    string;
  message:   string;
  timestamp: string;
}

export function createClient(baseUrl: string): AxiosInstance {
  return axios.create({ baseURL: baseUrl, timeout: 8000 });
}

export async function handshake(baseUrl: string): Promise<HandshakeResponse> {
  console.log('[SecureClient] handshake ->', baseUrl);
  const { data } = await createClient(baseUrl).get<HandshakeResponse>('/api/handshake');
  return data;
}