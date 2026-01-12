import {test, describe} from 'node:test';
import assert from 'node:assert';
import {errorHandler} from '../../src/middleware/error-handler.ts';
import {
  createTestContext,
  createSpyNext,
} from '../utils/create-test-context.ts';

void describe('errorHandler middleware', () => {
  void test('should pass through successful requests', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const next = createSpyNext();

    await middleware(ctx, next);

    assert.strictEqual(next.called, true);
    // Context status should remain unchanged from initial value
    assert.ok(ctx.response.status === 200 || ctx.status === 200);
  });

  void test('should catch errors and set status to 500 by default', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const error = new Error('Test error');
    const next = async () => {
      throw error;
    };

    await middleware(ctx, next);

    assert.strictEqual(ctx.status, 500);
    assert.strictEqual(ctx.body, error);
  });

  void test('should respect custom status codes from error.status', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const error = new Error('Not found') as Error & {status: number};
    error.status = 404;
    const next = async () => {
      throw error;
    };

    await middleware(ctx, next);

    assert.strictEqual(ctx.status, 404);
    assert.strictEqual(ctx.body, error);
  });

  void test('should respect custom status codes from error.statusCode', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const error = new Error('Bad request') as Error & {statusCode: number};
    error.statusCode = 400;
    const next = async () => {
      throw error;
    };

    await middleware(ctx, next);

    assert.strictEqual(ctx.status, 400);
    assert.strictEqual(ctx.body, error);
  });

  void test('should handle non-Error objects with status', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const errorObject = {message: 'Custom error object', status: 403};
    const next = async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw errorObject;
    };

    await middleware(ctx, next);

    assert.strictEqual(ctx.status, 403);
    assert.strictEqual(ctx.body, errorObject);
  });

  void test('should handle string errors with default 500 status', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const next = async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'String error';
    };

    await middleware(ctx, next);

    assert.strictEqual(ctx.status, 500);
    assert.strictEqual(ctx.body, 'String error');
  });
});
