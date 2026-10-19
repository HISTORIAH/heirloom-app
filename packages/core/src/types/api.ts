/** Envelope some endpoints wrap their result in. Others return the resource directly. */
export type ApiSuccess<T> = { data: T };

/** Error body every backend service returns. */
export type ApiErrorBody = { code: string; message: string; details?: Record<string, unknown> };

export type ChallengeResponse = {
  /** SIWS-style message for the wallet to sign. */
  message: string;
};

export type VerifyResponse = { address: string };
