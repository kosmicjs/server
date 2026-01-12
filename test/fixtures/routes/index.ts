import type {Middleware} from 'koa';

export const get: Middleware = async (ctx) => {
  ctx.body = {message: 'Root route'};
};
