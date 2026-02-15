import { NextRequest, NextResponse } from 'next/server';
import { generateSecureToken } from '../../../security/crypto';

/**
 * Generate and attach unique request ID
 */
export function requestIdMiddleware(
  request: NextRequest
): NextRequest {
  // Get request ID from header or generate new one
  const requestId = request.headers.get('x-request-id') || 
                    generateSecureToken(16);

  // Attach to request
  (request as NextRequest & { requestId: string }).requestId = requestId;

  return request;
}

/**
 * Add request ID headers to response
 */
export function addRequestIdHeaders(
  response: NextResponse,
  requestId: string
): NextResponse {
  response.headers.set('x-request-id', requestId);
  return response;
}

// Extend NextRequest type
declare module 'next/server' {
  interface NextRequest {
    requestId?: string;
  }
}
