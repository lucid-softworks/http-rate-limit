import { createHttpContext } from "@lucid-softworks/http-core";
import { describe, expect, it, vi } from "vitest";

import { httpRateLimit } from "../src/index.js";

const emptyNext = async (): Promise<Response> => new Response();

describe("HTTP rate limiting", () => {
  it("allows requests until the limit and then returns 429", async () => {
    let now = 0;
    const middleware = httpRateLimit({
      limit: 1,
      now: () => now,
      window: 1500,
    });
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    const next = vi.fn<() => Promise<Response>>(async () => new Response("ok"));
    const first = await middleware(request.clone(), createHttpContext(), next);
    expect(first.status).toBe(200);
    expect(first.headers.get("ratelimit-limit")).toBe("1");
    expect(first.headers.get("ratelimit-remaining")).toBe("0");
    const blocked = await middleware(
      request.clone(),
      createHttpContext(),
      next,
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("2");
    expect(next).toHaveBeenCalledOnce();
    now = 1501;
    expect((await middleware(request, createHttpContext(), next)).status).toBe(
      200,
    );
  });

  it("uses anonymous and custom keys", async () => {
    const anonymous = httpRateLimit({ limit: 1, window: 1000 });
    await anonymous(
      new Request("https://example.com"),
      createHttpContext(),
      emptyNext,
    );
    expect(
      (
        await anonymous(
          new Request("https://example.com"),
          createHttpContext(),
          emptyNext,
        )
      ).status,
    ).toBe(429);

    const custom = httpRateLimit({
      key: (request) => new URL(request.url).pathname,
      limit: 1,
      window: 1000,
    });
    expect(
      (
        await custom(
          new Request("https://example.com/a"),
          createHttpContext(),
          emptyNext,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await custom(
          new Request("https://example.com/b"),
          createHttpContext(),
          emptyNext,
        )
      ).status,
    ).toBe(200);
  });
});
