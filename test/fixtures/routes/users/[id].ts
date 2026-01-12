/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {Middleware} from 'koa';

export const get: Middleware = async (ctx) => {
  const {id} = ctx.params ?? {};
  ctx.body = {
    id,
    name: `User ${id}`,
    authenticated: ctx.state.authenticated,
  };
};

export const put: Middleware = async (ctx) => {
  const {id} = ctx.params ?? {};
  ctx.body = {
    id,
    updated: true,
    authenticated: ctx.state.authenticated,
  };
};

export const del: Middleware = async (ctx) => {
  const {id} = ctx.params ?? {};
  ctx.body = {
    id,
    deleted: true,
    authenticated: ctx.state.authenticated,
  };
  ctx.status = 204;
};
