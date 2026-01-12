/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-empty-function, @typescript-eslint/only-throw-error, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/consistent-type-assertions, unicorn/prevent-abbreviations, unicorn/prefer-event-target */
import {EventEmitter} from 'node:events';
import {IncomingMessage, ServerResponse} from 'node:http';
import {Socket} from 'node:net';
import type {Context, Next} from 'koa';

/**
 * Creates a minimal mock Koa context for testing middleware
 * This is useful for unit testing middleware in isolation without spinning up a server
 */
export function createTestContext(overrides: Partial<Context> = {}): Context {
  // Create mock request and response objects
  const socket = new Socket();
  const request = new IncomingMessage(socket);
  const res = new ServerResponse(request);

  // Set up basic request properties
  request.method = 'GET';
  request.url = '/';
  request.headers = {};

  // Create a minimal Koa-like context
  const ctx: Partial<Context> = {
    app: new EventEmitter() as any,
    req: request,
    res,
    request: {
      method: 'GET',
      url: '/',
      path: '/',
      query: {},
      querystring: '',
      header: {},
      headers: {},
      length: undefined,
      protocol: 'http',
      host: 'localhost',
      hostname: 'localhost',
      origin: 'http://localhost',
      href: 'http://localhost/',
      type: '',
      charset: '',
      accepts: () => false as any,
      acceptsEncodings: () => false as any,
      acceptsCharsets: () => false as any,
      acceptsLanguages: () => false as any,
      is: () => false,
      get: (field: string) => request.headers[field.toLowerCase()] as string,
    } as any,
    response: {
      status: 200,
      message: 'OK',
      body: undefined,
      length: undefined,
      header: {},
      headers: {},
      headerSent: false,
      type: '',
      redirect() {},
      attachment() {},
      set(field: string | Record<string, string>, value?: string) {
        if (typeof field === 'string' && value) {
          res.setHeader(field, value);
        } else if (typeof field === 'object') {
          for (const [k, v] of Object.entries(field)) {
            res.setHeader(k, v);
          }
        }
      },
      append() {},
      remove() {},
      get: (field: string) => res.getHeader(field) as string,
      has: (field: string) => res.hasHeader(field),
      is: () => false,
      lastModified: undefined,
      etag: undefined,
    } as any,
    state: {},
    cookies: {
      get: () => undefined,
      set() {},
    } as any,
    throw: ((...args: any[]) => {
      const error: any = new Error('Error');
      error.status = args[0] || 500;
      throw error;
    }) as any,
    assert: ((...args: any[]) => {
      if (!args[0]) {
        const error: any = new Error('Assertion failed');
        error.status = args[1] || 500;
        throw error;
      }
    }) as any,
    onerror() {},
    toJSON: () => ({}),
    inspect: () => ({}),
  };

  // Set up convenient accessors
  Object.defineProperty(ctx, 'method', {
    get() {
      return this.request.method;
    },
    set(value: string) {
      this.request.method = value;
    },
  });

  Object.defineProperty(ctx, 'url', {
    get() {
      return this.request.url;
    },
    set(value: string) {
      this.request.url = value;
    },
  });

  Object.defineProperty(ctx, 'originalUrl', {
    get() {
      return this.request.url;
    },
  });

  Object.defineProperty(ctx, 'path', {
    get() {
      return this.request.path;
    },
    set(value: string) {
      this.request.path = value;
    },
  });

  Object.defineProperty(ctx, 'status', {
    get() {
      return this.response.status;
    },
    set(value: number) {
      this.response.status = value;
      res.statusCode = value;
    },
  });

  Object.defineProperty(ctx, 'body', {
    get() {
      return this.response.body;
    },
    set(value: any) {
      this.response.body = value;
    },
  });

  // Merge with overrides
  return {...ctx, ...overrides} as Context;
}

/**
 * Creates a no-op next function for testing
 */
export function createNext(): Next {
  return async () => {};
}

/**
 * Creates a next function that tracks if it was called
 */
export function createSpyNext(): Next & {called: boolean; callCount: number} {
  const next: any = async () => {
    next.called = true;
    next.callCount++;
  };

  next.called = false;
  next.callCount = 0;
  return next;
}
