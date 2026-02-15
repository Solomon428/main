import { headers } from 'next/headers';

export interface RequestLogInfo {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId?: string | null;
}

export async function withRequestLogging<T>(
  handler: () => Promise<Response>
): Promise<Response> {
  const start = Date.now();
  const hdrs = headers();
  const requestId = hdrs.get('x-request-id') || hdrs.get('x-correlation-id') || crypto.randomUUID();

  try {
    const res = await handler();
    const durationMs = Date.now() - start;

    // Clone and set request id on response for propagation
    const newHeaders = new Headers(res.headers);
    newHeaders.set('x-request-id', requestId);

    safeLog({
      method: hdrs.get('x-method') || 'UNKNOWN',
      path: hdrs.get('x-pathname') || 'UNKNOWN',
      status: res.status,
      durationMs,
      requestId,
    });

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    const durationMs = Date.now() - start;
    safeLog({
      method: hdrs.get('x-method') || 'UNKNOWN',
      path: hdrs.get('x-pathname') || 'UNKNOWN',
      status: 500,
      durationMs,
      requestId,
    }, err);

    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
      },
    });
  }
}

function safeLog(info: RequestLogInfo, error?: unknown) {
  const base = `[API] ${info.method} ${info.path} ${info.status} ${info.durationMs}ms rid=${info.requestId ?? '-'} `;
  if (error) {
    console.error(base, error);
  } else {
    console.log(base);
  }
}
