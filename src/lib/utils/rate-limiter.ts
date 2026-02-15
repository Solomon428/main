import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key]?.resetTime < now) {
      delete store[key];
    }
  });
}, 60000);

export class RateLimiter {
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0]?.trim() || realIP || 'unknown';
  }

  static async limit(
    request: NextRequest,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const identifier = this.getClientIP(request);
    const key = `${request.method}:${request.nextUrl.pathname}:${identifier}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + config.windowMs
      };
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: store[key].resetTime
      };
    }

    store[key].count++;
    const remaining = Math.max(0, config.maxRequests - store[key].count);

    return {
      allowed: store[key].count <= config.maxRequests,
      remaining,
      resetTime: store[key].resetTime
    };
  }
}

interface RateLimiterFunction {
  (identifier: string): { allowed: boolean; remaining: number; resetTime: number };
}

// Create rate limiter functions
function createRateLimiter(windowMs: number, maxRequests: number): RateLimiterFunction {
  const limiterStore: RateLimitStore = {};
  
  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    Object.keys(limiterStore).forEach(key => {
      if (limiterStore[key]?.resetTime < now) {
        delete limiterStore[key];
      }
    });
  }, 60000);
  
  return (identifier: string) => {
    const now = Date.now();
    const store = limiterStore;
    
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 1,
        resetTime: now + windowMs
      };
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: store[identifier].resetTime
      };
    }
    
    store[identifier].count++;
    const remaining = Math.max(0, maxRequests - store[identifier].count);
    
    return {
      allowed: store[identifier].count <= maxRequests,
      remaining,
      resetTime: store[identifier].resetTime
    };
  };
}

export const rateLimiters = {
  auth: createRateLimiter(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  api: createRateLimiter(60 * 1000, 100),     // 100 requests per minute
  general: createRateLimiter(60 * 1000, 1000), // 1000 requests per minute
  upload: createRateLimiter(60 * 1000, 10)    // 10 uploads per minute
};
