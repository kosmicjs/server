import {promisify} from 'node:util';
import helmet from 'helmet';
import type {Middleware} from 'koa';

export const helmetMiddleware: ({
  isDevelopment,
}: {
  isDevelopment: boolean;
}) => Middleware =
  ({isDevelopment}) =>
  async (ctx, next) => {
    const helmetPromise = promisify(
      helmet({
        contentSecurityPolicy: {
          directives: {
            'upgrade-insecure-requests': isDevelopment ? null : [],
            'script-src': [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              'http://localhost:5173',
            ],
            'connect-src': [
              "'self'",
              'http://127.0.0.1:2222',
              'ws://127.0.0.1:2222',
              'ws://localhost:5173',
            ],
          },
        },
      }),
    );
    await helmetPromise(ctx.req, ctx.res);
    await next();
  };
