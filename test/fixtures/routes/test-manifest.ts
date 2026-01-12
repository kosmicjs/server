import type {Middleware} from 'koa';

export const get: Middleware = async (ctx) => {
  ctx.body = {
    hasManifest: ctx.state.manifest !== undefined,
    manifest: ctx.state.manifest,
  };
};
