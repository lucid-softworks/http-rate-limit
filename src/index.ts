import type { HttpMiddleware } from "@lucid-softworks/http-middleware";
import { SlidingWindowRateLimiter } from "@lucid-softworks/sliding-window-rate-limit";

export type HttpRateLimitOptions = Readonly<{
  key?: (request: Request) => string;
  limit: number;
  now?: () => number;
  window: number;
}>;

/** Applies an exact in-memory sliding-window limit and standard response headers. */
export function httpRateLimit(options: HttpRateLimitOptions): HttpMiddleware {
  const limiter = new SlidingWindowRateLimiter<string>(options);
  const key =
    options.key ??
    ((request) => request.headers.get("x-forwarded-for") ?? "anonymous");
  return async (request, _context, next): Promise<Response> => {
    const decision = limiter.take(key(request));
    const headers = new Headers({
      "ratelimit-limit": String(options.limit),
      "ratelimit-remaining": String(decision.remaining),
    });
    if (!decision.allowed) {
      headers.set("retry-after", String(Math.ceil(decision.retryAfter / 1000)));
      return new Response("Too Many Requests", { headers, status: 429 });
    }
    const response = await next();
    headers.forEach((value, name) => response.headers.set(name, value));
    return response;
  };
}
