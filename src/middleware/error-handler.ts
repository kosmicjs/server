import type {Middleware, Next, Context} from 'koa';

export function errorHandler(): Middleware {
  async function middleware(ctx: Context, next: Next) {
    try {
      await next();
    } catch (error) {
      // Respect custom status codes if provided
      if (error && typeof error === 'object' && 'status' in error) {
        ctx.status = (error as {status: number}).status;
      } else if (error && typeof error === 'object' && 'statusCode' in error) {
        ctx.status = (error as {statusCode: number}).statusCode;
      } else {
        ctx.status = 500;
      }

      ctx.body = error;
    }
  }

  return middleware;
}
