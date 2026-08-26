export type ErrorCode =
  | "NOT_FOUND"
  | "EXPIRED"
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "TOO_LARGE"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  EXPIRED: 404,
  RATE_LIMITED: 429,
  INVALID_INPUT: 400,
  TOO_LARGE: 400,
  INTERNAL: 500,
};

export class BeamError extends Error {
  code: ErrorCode;
  retryable: boolean;
  status: number;

  constructor(code: ErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "BeamError";
    this.code = code;
    this.retryable = retryable;
    this.status = STATUS_BY_CODE[code];
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
      },
    };
  }
}
