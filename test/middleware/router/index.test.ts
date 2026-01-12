import {test, describe} from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Koa from 'koa';
import createFsRouter from '../../../src/middleware/router/index.ts';
import type {RouteDefinition} from '../../../src/middleware/router/types.ts';
import {
  createTestContext,
  createSpyNext,
} from '../../utils/create-test-context.ts';
import {createTestServer, request} from '../../utils/create-test-server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../../fixtures/routes');

// Helper to create test context with specific path
function createContextWithPath(method: string, urlPath: string) {
  const ctx = createTestContext();
  ctx.method = method;
  ctx.url = urlPath;
  ctx.path = urlPath;
  ctx.request.method = method;
  ctx.request.url = urlPath;
  ctx.request.path = urlPath;
  // Set originalUrl property - needed for routing
  Object.defineProperty(ctx, 'originalUrl', {
    value: urlPath,
    writable: true,
  });
  return ctx;
}

void describe('File-System Router', () => {
  void describe('Unit Tests - createFsRouter', () => {
    void test('should discover and load routes from directory', async () => {
      const {routes, middleware} = await createFsRouter(fixturesDir);

      assert.ok(routes.length > 0, 'Should discover routes');
      assert.strictEqual(
        typeof middleware,
        'function',
        'Should return middleware',
      );

      // Check that specific routes exist
      const routePaths = new Set(routes.map((r) => r.uriPath));

      // Root route is represented as empty string
      assert.ok(
        routePaths.has('') || routePaths.has('/'),
        'Should have root route',
      );
      assert.ok(routePaths.has('/users'), 'Should have /users route');
      assert.ok(routePaths.has('/users/:id'), 'Should have /users/:id route');
      assert.ok(routePaths.has('/api/health'), 'Should have /api/health route');
    });

    void test('should convert file paths to URI paths correctly', async () => {
      const {routes} = await createFsRouter(fixturesDir);

      const routeMap = new Map(routes.map((r) => [r.uriPath, r.filePath]));

      // Check dynamic parameter conversion
      const userIdRoute = routes.find((r) => r.uriPath === '/users/:id');
      assert.ok(userIdRoute, 'Should have /users/:id route');
      assert.ok(
        userIdRoute.filePath.includes('[id]'),
        'File path should contain [id]',
      );

      // Check nested dynamic params
      const commentRoute = routes.find(
        (r) => r.uriPath === '/posts/:postId/comments/:commentId',
      );
      assert.ok(commentRoute, 'Should have nested dynamic route');
    });

    void test('should handle index files correctly', async () => {
      const {routes} = await createFsRouter(fixturesDir);

      // Root route is represented as empty string
      const rootRoute = routes.find(
        (r) => r.uriPath === '' || r.uriPath === '/',
      );
      assert.ok(rootRoute, 'Should have root route from index.ts');

      const usersRoute = routes.find((r) => r.uriPath === '/users');
      assert.ok(usersRoute, 'Should have /users route from users/index.ts');
    });

    void test('should load module exports correctly', async () => {
      const {routes} = await createFsRouter(fixturesDir);

      const usersRoute = routes.find((r) => r.uriPath === '/users');
      assert.ok(usersRoute, 'Should have /users route');
      assert.ok(usersRoute.module.get, 'Should have GET handler');
      assert.ok(usersRoute.module.post, 'Should have POST handler');
      assert.ok(usersRoute.module.use, 'Should have use middleware');
    });

    void test('should handle del export as delete', async () => {
      const {routes} = await createFsRouter(fixturesDir);

      const userIdRoute = routes.find((r) => r.uriPath === '/users/:id');
      assert.ok(userIdRoute, 'Should have /users/:id route');
      assert.ok(userIdRoute.module.del, 'Should have del handler');
    });

    void test('should sort routes by specificity', async () => {
      const {routes} = await createFsRouter(fixturesDir);

      // Static routes should come before dynamic routes at the same level
      const usersIndex = routes.findIndex((r) => r.uriPath === '/users');
      const usersId = routes.findIndex((r) => r.uriPath === '/users/:id');

      assert.ok(
        usersIndex < usersId,
        'Static route /users should come before dynamic route /users/:id',
      );
    });

    void test('should pre-compose middleware chains', async () => {
      const {routes} = await createFsRouter(fixturesDir);

      const userIdRoute = routes.find((r) => r.uriPath === '/users/:id');
      assert.ok(userIdRoute, 'Should have /users/:id route');

      // Check that composed handlers exist
      assert.ok(userIdRoute.get, 'Should have composed GET handler');
      assert.ok(userIdRoute.put, 'Should have composed PUT handler');

      // Check that middleware was collected
      assert.ok(
        userIdRoute.collectedMiddleware,
        'Should have collected middleware',
      );
    });

    void test('should emit router:loaded event with routes', async () => {
      const app = new Koa();
      type RouterEventData = {
        routes: Array<{method: string; path: string}>;
      };
      let receivedData: unknown = null;

      app.on('router:loaded', (data: unknown) => {
        receivedData = data;
      });

      await createFsRouter(fixturesDir, app);

      // Type guard and assertion
      assert.ok(receivedData, 'Should emit router:loaded event');

      const eventData = receivedData as RouterEventData;
      assert.ok(
        Array.isArray(eventData.routes),
        'Event should have routes array',
      );
      assert.ok(eventData.routes.length > 0, 'Should have routes in event');

      // Check route format
      const firstRoute = eventData.routes[0];
      if (!firstRoute) {
        throw new Error('Route should exist');
      }

      assert.ok(firstRoute.method, 'Route should have method');
      assert.ok(firstRoute.path, 'Route should have path');
    });

    void test('should match routes and extract params at runtime', async () => {
      const {middleware} = await createFsRouter(fixturesDir);
      const ctx = createContextWithPath('GET', '/users/123');
      const next = createSpyNext();

      await middleware(ctx, next);

      assert.ok(ctx.params, 'Should have params');
      assert.strictEqual(ctx.params.id, '123', 'Should extract id param');
      assert.ok(ctx.request.params, 'Should attach params to request');
      assert.strictEqual(ctx.request.params?.id, '123');
    });

    void test('should call next when no route matches', async () => {
      const {middleware} = await createFsRouter(fixturesDir);
      const ctx = createContextWithPath('GET', '/nonexistent');
      const next = createSpyNext();

      await middleware(ctx, next);

      assert.strictEqual(
        next.called,
        true,
        'Should call next for unknown routes',
      );
    });

    void test('should call next when method does not match', async () => {
      const {middleware} = await createFsRouter(fixturesDir);
      const ctx = createContextWithPath('PATCH', '/api/health');
      const next = createSpyNext();

      await middleware(ctx, next);

      assert.strictEqual(
        next.called,
        true,
        'Should call next when method not supported',
      );
    });

    void test('should handle query strings in URLs', async () => {
      const {middleware} = await createFsRouter(fixturesDir);
      const ctx = createContextWithPath('GET', '/users/123');
      // Override url to include query string, but path remains without it
      ctx.url = '/users/123?foo=bar';
      ctx.request.url = '/users/123?foo=bar';
      Object.defineProperty(ctx, 'originalUrl', {
        value: '/users/123?foo=bar',
        writable: true,
      });
      const next = createSpyNext();

      await middleware(ctx, next);

      assert.ok(ctx.params, 'Should have params');
      assert.strictEqual(
        ctx.params.id,
        '123',
        'Should extract id param despite query string',
      );
    });

    void test('should handle nested dynamic parameters', async () => {
      const {middleware} = await createFsRouter(fixturesDir);
      const ctx = createContextWithPath('GET', '/posts/456/comments/789');
      const next = createSpyNext();

      await middleware(ctx, next);

      assert.ok(ctx.params, 'Should have params');
      assert.strictEqual(ctx.params.postId, '456', 'Should extract postId');
      assert.strictEqual(
        ctx.params.commentId,
        '789',
        'Should extract commentId',
      );
    });
  });

  void describe('Integration Tests - with HTTP server', () => {
    void test('should handle root route', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        const response = await request(`${server.baseUrl}/`);

        assert.strictEqual(response.status, 200);
        const body = response.json() as {message: string};
        assert.strictEqual(body.message, 'Root route');
      } finally {
        await server.close();
      }
    });

    void test('should handle GET /users with middleware', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        const response = await request(`${server.baseUrl}/users`);

        assert.strictEqual(response.status, 200);
        const body = response.json() as {
          users: string[];
          authenticated: boolean;
        };
        assert.deepStrictEqual(body.users, ['alice', 'bob']);
        assert.strictEqual(body.authenticated, true, 'Middleware should run');
      } finally {
        await server.close();
      }
    });

    void test('should handle POST /users with middleware', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        const response = await request(`${server.baseUrl}/users`, {
          method: 'POST',
        });

        assert.strictEqual(response.status, 201);
        const body = response.json() as {
          created: boolean;
          authenticated: boolean;
        };
        assert.strictEqual(body.created, true);
        assert.strictEqual(
          body.authenticated,
          true,
          'Parent middleware should run',
        );
      } finally {
        await server.close();
      }
    });

    void test('should handle dynamic route params', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        const response = await request(`${server.baseUrl}/users/42`);

        assert.strictEqual(response.status, 200);
        const body = response.json() as {
          id: string;
          name: string;
          authenticated: boolean;
        };
        assert.strictEqual(body.id, '42');
        assert.strictEqual(body.name, 'User 42');
        assert.strictEqual(
          body.authenticated,
          true,
          'Parent middleware should apply to child routes',
        );
      } finally {
        await server.close();
      }
    });

    void test('should handle nested dynamic params', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        const response = await request(
          `${server.baseUrl}/posts/123/comments/456`,
        );

        assert.strictEqual(response.status, 200);
        const body = response.json() as {
          postId: string;
          commentId: string;
          text: string;
        };
        assert.strictEqual(body.postId, '123');
        assert.strictEqual(body.commentId, '456');
        assert.strictEqual(body.text, 'Comment 456 on post 123');
      } finally {
        await server.close();
      }
    });

    void test('should handle DELETE method via del export', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        const response = await request(`${server.baseUrl}/users/42`, {
          method: 'DELETE',
        });

        assert.strictEqual(response.status, 204);
      } finally {
        await server.close();
      }
    });

    void test('should apply UseObject middleware correctly', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        // GET should have corsEnabled but not validated
        const getResponse = await request(`${server.baseUrl}/posts`);
        assert.strictEqual(getResponse.status, 200);
        const getBody = getResponse.json() as {
          corsEnabled: boolean;
          validated?: boolean;
        };
        assert.strictEqual(getBody.corsEnabled, true);
        assert.strictEqual(getBody.validated, undefined);

        // POST should have both corsEnabled and validated
        const postResponse = await request(`${server.baseUrl}/posts`, {
          method: 'POST',
        });
        assert.strictEqual(postResponse.status, 201);
        const postBody = postResponse.json() as {
          corsEnabled: boolean;
          validated: boolean;
        };
        assert.strictEqual(postBody.corsEnabled, true);
        assert.strictEqual(postBody.validated, true);

        // PUT should have both corsEnabled and validated
        const putResponse = await request(`${server.baseUrl}/posts`, {
          method: 'PUT',
        });
        assert.strictEqual(putResponse.status, 200);
        const putBody = putResponse.json() as {
          corsEnabled: boolean;
          validated: boolean;
        };
        assert.strictEqual(putBody.corsEnabled, true);
        assert.strictEqual(putBody.validated, true);
      } finally {
        await server.close();
      }
    });

    void test('should return 404 for unknown routes', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      // Add 404 handler
      app.use(async (ctx) => {
        ctx.status = 404;
        ctx.body = {error: 'Not Found'};
      });

      const server = await createTestServer({app});

      try {
        const response = await request(`${server.baseUrl}/nonexistent`);
        assert.strictEqual(response.status, 404);
      } finally {
        await server.close();
      }
    });

    void test('should handle multiple HTTP methods on same route', async () => {
      const app = new Koa();
      const {middleware} = await createFsRouter(fixturesDir);
      app.use(middleware);

      const server = await createTestServer({app});

      try {
        // GET
        const getResponse = await request(`${server.baseUrl}/users/99`);
        assert.strictEqual(getResponse.status, 200);

        // PUT
        const putResponse = await request(`${server.baseUrl}/users/99`, {
          method: 'PUT',
        });
        assert.strictEqual(putResponse.status, 200);
        const putBody = putResponse.json() as {updated: boolean};
        assert.strictEqual(putBody.updated, true);
      } finally {
        await server.close();
      }
    });
  });
});
