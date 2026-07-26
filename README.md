# `@lucid-softworks/http-rate-limit`

Exact sliding-window rate limiting middleware.

```ts
import { httpRateLimit } from "@lucid-softworks/http-rate-limit";

const middleware = httpRateLimit({ limit: 100, window: 60_000 });
```

Keys default to `X-Forwarded-For` or `anonymous` and are customizable.
Responses include limit and remaining headers; blocked requests receive `429`
and `Retry-After`.
