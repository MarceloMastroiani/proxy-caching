export interface CachedResponse {
  data: any;
  headers: Record<string, string>;
  status: number;
  statusText: string;
  timestamp: number;
}

export interface ProxyRequestOptions {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}
