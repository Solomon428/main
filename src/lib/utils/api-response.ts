import { NextResponse } from 'next/server';

export type ApiSuccess<T> = {
  ok: true;
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  ok: false;
  success: false;
  error: string;
  details?: unknown;
};

export function ok<T>(data: T, init?: ResponseInit & { meta?: Record<string, unknown> }): NextResponse<ApiSuccess<T>> {
  const { meta, ...rest } = init || {};
  const response: ApiSuccess<T> = { 
    ok: true, 
    success: true, 
    data 
  };
  // Only add meta if it's defined
  if (meta !== undefined) {
    response.meta = meta;
  }
  return NextResponse.json(response, rest);
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json<ApiError>({ ok: false, success: false, error: message, details }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized'): NextResponse<ApiError> {
  return NextResponse.json<ApiError>({ ok: false, success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden'): NextResponse<ApiError> {
  return NextResponse.json<ApiError>({ ok: false, success: false, error: message }, { status: 403 });
}

export function notFound(message = 'Not Found'): NextResponse<ApiError> {
  return NextResponse.json<ApiError>({ ok: false, success: false, error: message }, { status: 404 });
}

export function unprocessable(message = 'Unprocessable Entity', details?: unknown): NextResponse<ApiError> {
  return NextResponse.json<ApiError>({ ok: false, success: false, error: message, details }, { status: 422 });
}

export function serverError(message = 'Internal Server Error', details?: unknown): NextResponse<ApiError> {
  return NextResponse.json<ApiError>({ ok: false, success: false, error: message, details }, { status: 500 });
}
