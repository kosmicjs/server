import type {Middleware, Next, Context} from 'koa';

export function errorHandler(): Middleware {
  async function middleware(ctx: Context, next: Next) {
    try {
      await next();
    } catch (error) {
      ctx.status = 500;
      ctx.body = error;
    }
  }

  return middleware;
}
