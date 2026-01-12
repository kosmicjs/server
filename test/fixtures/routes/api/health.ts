import type {Middleware} from 'koa';

export const get: Middleware = async (ctx) => {
  ctx.body = {status: 'ok', timestamp: Date.now()};
};
