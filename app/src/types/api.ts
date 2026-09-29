export type ApiSuccess<T> = {
  data: T;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
