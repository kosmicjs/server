/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {Middleware} from 'koa';

// Middleware that runs for all methods on /users and child routes
export const use: Middleware = async (ctx, next) => {
  ctx.state.authenticated = true;
  await next();
};

export const get: Middleware = async (ctx) => {
  ctx.body = {
    users: ['alice', 'bob'],
    authenticated: ctx.state.authenticated,
  };
};

export const post: Middleware = async (ctx) => {
  ctx.body = {created: true, authenticated: ctx.state.authenticated};
  ctx.status = 201;
};
