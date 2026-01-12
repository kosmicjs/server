import type {Middleware} from 'koa';
import {getCtx} from '../../../src/index.ts';

export const get: Middleware = async () => {
  // Test that getCtx works during request handling
  const ctx = getCtx();
  ctx.body = {
    hasContext: true,
    path: ctx.path,
    method: ctx.method,
  };
};
