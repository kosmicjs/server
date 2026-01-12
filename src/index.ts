import http, {type Server} from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import bodyParser from 'koa-bodyparser';
import responseTime from 'koa-response-time';
import session from 'koa-session';
import etag from '@koa/etag';
import conditional from 'koa-conditional-get';
import type _passport from 'koa-passport';
import Koa, {type Context} from 'koa';
import serve from 'koa-static';
import type {Logger} from 'pino';
import {helmetMiddleware} from './middleware/helmet.ts';
import {errorHandler} from './middleware/error-handler.ts';
import createFsRouter from './middleware/router/index.ts';

type Manifest = Record<
  string,
  {
    css: string[];
    file: string;
    isEntry: boolean;
    src: string;
  }
>;
declare module 'koa' {
  interface DefaultContext {
    id: number | string;
    log: Logger;
  }

  interface Request {
    log: Logger;
  }

  interface DefaultState {
    manifest?: Manifest;
  }

  interface Response {
    log: Logger;
  }
}

export const app = new Koa({asyncLocalStorage: true});

export async function createServer({
  routesDirectory,
  sessionOptions,
  passport,
  publicDirectory,
  serveOptions,
}: {
  routesDirectory: string;
  sessionOptions: session.opts;
  passport: typeof _passport;
  publicDirectory: string;
  serveOptions: serve.Options;
}): Promise<Server> {
  // add x-response-time header
  app.use(responseTime());

  // serve static files from public dir
  app.use(serve(publicDirectory, serveOptions));

  app.use(async (ctx, next) => {
    try {
      const manifest = JSON.parse(
        await fs.readFile(
          path.join(publicDirectory, '.vite', 'manifest.json'),
          'utf8',
        ),
      ) as Manifest;
      ctx.state.manifest = manifest;
      await next();
    } catch {
      await next();
    }
  });

  app.use(conditional());
  app.use(etag());
  app.use(bodyParser());
  // error handler
  app.use(errorHandler());

  app.use(session(sessionOptions, app));
  // passport auth
  app.use(passport.initialize({userProperty: 'email'}));
  app.use(passport.session());

  // add fs routes
  const {middleware: fsRouterMiddleware} = await createFsRouter(
    routesDirectory,
    app,
  );

  app.use(fsRouterMiddleware);

  // security headers
  app.use(helmetMiddleware);

  const server: Server = http.createServer(app.callback());

  return server;
}

export const getCtx = () => {
  const ctx = app.currentContext;
  if (!ctx) throw new Error('No context found');
  return ctx as Context;
};
