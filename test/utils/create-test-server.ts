/* eslint-disable @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, unicorn/prevent-abbreviations */
import http, {type Server} from 'node:http';
import Koa from 'koa';

export type TestServerOptions = {
  app?: Koa;
  port?: number;
};

export type TestServer = {
  server: Server;
  app: Koa;
  baseUrl: string;
  port: number;
  close: () => Promise<void>;
};

/**
 * Creates a test HTTP server for integration testing
 * Automatically finds an available port and provides cleanup
 */
export async function createTestServer(
  options: TestServerOptions = {},
): Promise<TestServer> {
  const app = options.app ?? new Koa();
  const server = http.createServer(app.callback());

  // Find an available port
  await new Promise<void>((resolve, reject) => {
    server.listen(options.port ?? 0, () => {
      resolve();
    });
    server.on('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get server address');
  }

  const {port} = address;
  const baseUrl = `http://localhost:${port}`;

  const close = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  return {
    server,
    app,
    baseUrl,
    port,
    close,
  };
}

/**
 * Makes an HTTP request to a test server
 * Simple fetch-like interface without external dependencies
 */
export async function request(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<{
  status: number;
  headers: Record<string, string | string[]>;
  body: string;
  json: () => any;
}> {
  return new Promise((resolve, reject) => {
    const urlObject = new URL(url);
    const request_ = http.request(
      {
        hostname: urlObject.hostname,
        port: urlObject.port,
        path: urlObject.pathname + urlObject.search,
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 500,
            headers: res.headers as Record<string, string | string[]>,
            body,
            json: () => JSON.parse(body),
          });
        });
      },
    );

    request_.on('error', reject);

    if (options.body) {
      request_.write(options.body);
    }

    request_.end();
  });
}
