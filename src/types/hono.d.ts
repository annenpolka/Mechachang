import type { Context as HonoContext } from 'hono';

export type Context<E = any> = HonoContext<{
  Bindings: E;
  Variables: {};
}>;