// A minimal HTTP client for the beam API, scoped to what the MCP tools need.
// Kept independent from packages/cli's client since error handling here maps
// to MCP tool-call errors, not CLI exit codes.

export interface SendResult {
  id: string;
  url: string;
  expires_at: string;
  views_remaining: number;
  created_at: string;
  size_bytes: number;
}

export interface GetResult {
  text: string;
  views_remaining: number;
  created_at: string;
  expires_at: string;
}

export interface InfoResult {
  exists: boolean;
  views_remaining: number;
  expires_at: string;
}

export class BeamApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "BeamApiError";
  }
}

export interface BeamClient {
  send(input: {
    text: string;
    views?: number;
    ttl?: number;
  }): Promise<SendResult>;
  get(id: string): Promise<GetResult>;
  info(id: string): Promise<InfoResult>;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export function createBeamClient(baseUrl: string): BeamClient {
  const base = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new BeamApiError(`Could not reach ${base} (${reason})`, 0);
    }

    const body = (await response.json().catch(() => null)) as
      (T & ApiErrorBody) | null;

    if (!response.ok) {
      const errorBody = (body as ApiErrorBody | null)?.error;
      throw new BeamApiError(
        errorBody?.message ?? `Request failed with status ${response.status}`,
        response.status,
        errorBody?.code,
      );
    }

    if (body === null) {
      throw new BeamApiError("Server returned an empty response", 502);
    }

    return body;
  }

  return {
    send: (input) =>
      request<SendResult>("/", { method: "POST", body: JSON.stringify(input) }),
    get: (id) => request<GetResult>(`/${encodeURIComponent(id)}`),
    info: (id) => request<InfoResult>(`/${encodeURIComponent(id)}/info`),
  };
}
