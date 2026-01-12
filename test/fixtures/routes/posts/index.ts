/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {Middleware} from 'koa';

// Test UseObject pattern with method-specific middleware
export const use = {
  all: (async (ctx, next) => {
    ctx.state.corsEnabled = true;
    await next();
  }) as Middleware,
  post: (async (ctx, next) => {
    ctx.state.validated = true;
    await next();
  }) as Middleware,
  put: (async (ctx, next) => {
    ctx.state.validated = true;
    await next();
  }) as Middleware,
};

export const get: Middleware = async (ctx) => {
  ctx.body = {posts: [], corsEnabled: ctx.state.corsEnabled};
};

export const post: Middleware = async (ctx) => {
  ctx.body = {
    created: true,
    corsEnabled: ctx.state.corsEnabled,
    validated: ctx.state.validated,
  };
  ctx.status = 201;
};

export const put: Middleware = async (ctx) => {
  ctx.body = {
    updated: true,
    corsEnabled: ctx.state.corsEnabled,
    validated: ctx.state.validated,
  };
};
