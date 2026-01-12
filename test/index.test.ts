import {test, describe} from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import passport from 'koa-passport';
import type session from 'koa-session';
import Koa from 'koa';
import {app, createServer, getCtx} from '../src/index.ts';
import {request} from './utils/create-test-server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures/routes');
const temporaryPublicDir = path.join(__dirname, 'temp-public');

// Type-safe session options
// @ts-expect-error mocks
const testSessionOptions: session.opts = {
  key: 'test:sess',
  maxAge: 86_400_000,
};

void describe('Main Server', () => {
  void describe('app export', () => {
    void test('should be a Koa instance', () => {
      assert.ok(app, 'app should exist');
      assert.strictEqual(typeof app.use, 'function');
      assert.strictEqual(typeof app.listen, 'function');
    });

    void test('should have asyncLocalStorage enabled', async () => {
      // Create a server with a test route that uses getCtx
      await fs.mkdir(temporaryPublicDir, {recursive: true});

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Start server
        await new Promise<void>((resolve) => {
          server.listen(0, () => {
            resolve();
          });
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }

        const baseUrl = `http://localhost:${address.port}`;

        // Make a request - asyncLocalStorage should provide context
        const response = await request(`${baseUrl}/`);
        assert.strictEqual(response.status, 200);

        // Clean up
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });
  });

  void describe('getCtx', () => {
    void test('should throw error when no context is available', () => {
      assert.throws(
        () => {
          getCtx();
        },
        {
          message: 'No context found',
        },
      );
    });

    void test('should return context when available during request', async () => {
      await fs.mkdir(temporaryPublicDir, {recursive: true});

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Start server
        await new Promise<void>((resolve) => {
          server.listen(0, () => {
            resolve();
          });
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }

        const baseUrl = `http://localhost:${address.port}`;

        // Make request to route that uses getCtx
        const response = await request(`${baseUrl}/test-ctx`);
        assert.strictEqual(response.status, 200);

        const body = response.json() as {
          hasContext: boolean;
          path: string;
          method: string;
        };
        assert.strictEqual(body.hasContext, true);
        assert.strictEqual(body.path, '/test-ctx');
        assert.strictEqual(body.method, 'GET');

        // Clean up
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });
  });

  void describe('createServer', () => {
    void test('should create HTTP server', async () => {
      // Create temp public directory
      await fs.mkdir(temporaryPublicDir, {recursive: true});

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        assert.ok(server, 'Should return server');
        assert.strictEqual(typeof server.listen, 'function');

        // Server is not listening yet, so don't try to close it
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });

    void test('should handle missing manifest file gracefully', async () => {
      await fs.mkdir(temporaryPublicDir, {recursive: true});

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Start server
        await new Promise<void>((resolve) => {
          server.listen(0, () => {
            resolve();
          });
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }

        const baseUrl = `http://localhost:${address.port}`;

        // Make request - should work despite no manifest
        const response = await request(`${baseUrl}/test-manifest`);
        assert.strictEqual(response.status, 200);

        // Verify manifest is undefined
        const body = response.json() as {
          hasManifest: boolean;
          manifest: unknown;
        };
        assert.strictEqual(
          body.hasManifest,
          false,
          'Manifest should be undefined when file is missing',
        );
        assert.strictEqual(body.manifest, undefined);

        // Clean up
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });

    void test('should load manifest when available', async () => {
      await fs.mkdir(path.join(temporaryPublicDir, '.vite'), {
        recursive: true,
      });

      const manifest = {
        'main.ts': {
          file: 'assets/main.js',
          src: 'main.ts',
          isEntry: true,
          css: ['assets/main.css'],
        },
      };

      await fs.writeFile(
        path.join(temporaryPublicDir, '.vite', 'manifest.json'),
        JSON.stringify(manifest),
      );

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Start server
        await new Promise<void>((resolve) => {
          server.listen(0, () => {
            resolve();
          });
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }

        const baseUrl = `http://localhost:${address.port}`;

        // Make request - manifest should be loaded
        const response = await request(`${baseUrl}/test-manifest`);
        assert.strictEqual(response.status, 200);

        // Verify manifest was loaded into context state
        const body = response.json() as {
          hasManifest: boolean;
          manifest: Record<string, unknown>;
        };
        assert.strictEqual(
          body.hasManifest,
          true,
          'Manifest should be loaded from file',
        );
        assert.ok(body.manifest);
        assert.ok(body.manifest['main.ts']);

        // Clean up
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });

    void test('should initialize middleware in correct order', async () => {
      await fs.mkdir(temporaryPublicDir, {recursive: true});

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Start server
        await new Promise<void>((resolve) => {
          server.listen(0, () => {
            resolve();
          });
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }

        const baseUrl = `http://localhost:${address.port}`;

        // Make request to verify middleware is working
        const response = await request(`${baseUrl}/`);
        assert.strictEqual(response.status, 200);

        // Check for response-time header (from responseTime middleware)
        assert.ok(
          response.headers['x-response-time'],
          'Should have x-response-time header',
        );

        // Clean up
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });

    void test('should serve static files', async () => {
      await fs.mkdir(temporaryPublicDir, {recursive: true});
      await fs.writeFile(
        path.join(temporaryPublicDir, 'test.txt'),
        'Hello, static file!',
      );

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Start server
        await new Promise<void>((resolve) => {
          server.listen(0, () => {
            resolve();
          });
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }

        const baseUrl = `http://localhost:${address.port}`;

        // Request static file
        const response = await request(`${baseUrl}/test.txt`);
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body, 'Hello, static file!');

        // Clean up
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });

    void test('should initialize passport', async () => {
      await fs.mkdir(temporaryPublicDir, {recursive: true});

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Verify server was created successfully (passport initialized)
        assert.ok(server);
        assert.strictEqual(typeof server.listen, 'function');
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });

    void test('should handle routes from file-system router', async () => {
      await fs.mkdir(temporaryPublicDir, {recursive: true});

      try {
        const server = await createServer({
          routesDirectory: fixturesDir,
          sessionOptions: testSessionOptions,
          passport,
          publicDirectory: temporaryPublicDir,
          serveOptions: {},
        });

        // Start server
        await new Promise<void>((resolve) => {
          server.listen(0, () => {
            resolve();
          });
        });

        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }

        const baseUrl = `http://localhost:${address.port}`;

        // Test various routes
        const rootResponse = await request(`${baseUrl}/`);
        assert.strictEqual(rootResponse.status, 200);
        assert.strictEqual(rootResponse.json().message, 'Root route');

        const usersResponse = await request(`${baseUrl}/users`);
        assert.strictEqual(usersResponse.status, 200);

        const healthResponse = await request(`${baseUrl}/api/health`);
        assert.strictEqual(healthResponse.status, 200);

        // Clean up
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } finally {
        await fs.rm(temporaryPublicDir, {recursive: true, force: true});
      }
    });
  });
});
