import { BeamCliError, type CliErrorCode } from "../errors";

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

export interface BeamClient {
  send(input: {
    text: string;
    views?: number;
    ttl?: number;
  }): Promise<SendResult>;
  get(id: string): Promise<GetResult>;
  info(id: string): Promise<InfoResult>;
}

export interface ClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; retryable?: boolean };
}

const KNOWN_ERROR_CODES: readonly CliErrorCode[] = [
  "NOT_FOUND",
  "EXPIRED",
  "RATE_LIMITED",
  "INVALID_INPUT",
  "TOO_LARGE",
  "INTERNAL",
];

function isCliErrorCode(value: string | undefined): value is CliErrorCode {
  return KNOWN_ERROR_CODES.includes(value as CliErrorCode);
}

export function createClient(options: ClientOptions): BeamClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? 10_000;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey
            ? { Authorization: `Bearer ${options.apiKey}` }
            : {}),
          ...init?.headers,
        },
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new BeamCliError(
        "NETWORK_ERROR",
        `Could not reach ${baseUrl} (${reason})`,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }

    const body = (await response.json().catch(() => null)) as
      (T & ApiErrorBody) | null;

    if (!response.ok) {
      const errorBody = (body as ApiErrorBody | null)?.error;
      const code = isCliErrorCode(errorBody?.code)
        ? errorBody.code
        : "INTERNAL";
      const message =
        errorBody?.message ?? `Request failed with status ${response.status}`;
      throw new BeamCliError(code, message, errorBody?.retryable ?? false);
    }

    if (body === null) {
      throw new BeamCliError("INTERNAL", "Server returned an empty response");
    }

    return body;
  }

  return {
    send: (input) =>
      request<SendResult>("/", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    get: (id) => request<GetResult>(`/${encodeURIComponent(id)}`),
    info: (id) => request<InfoResult>(`/${encodeURIComponent(id)}/info`),
  };
}
