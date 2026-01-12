/* eslint-disable @typescript-eslint/only-throw-error */
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

  void test('should catch errors and set status to 500', async () => {
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

  void test('should handle errors with custom status codes', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const error: any = new Error('Not found');
    error.status = 404;
    const next = async () => {
      throw error;
    };

    await middleware(ctx, next);

    // Error handler sets status to 500 regardless
    assert.strictEqual(ctx.status, 500);
    assert.strictEqual(ctx.body, error);
  });

  void test('should handle non-Error throws', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const errorObject = {message: 'Custom error object'};
    const next = async () => {
      throw errorObject;
    };

    await middleware(ctx, next);

    assert.strictEqual(ctx.status, 500);
    assert.strictEqual(ctx.body, errorObject);
  });

  void test('should handle string errors', async () => {
    const middleware = errorHandler();
    const ctx = createTestContext();
    const next = async () => {
      throw 'String error';
    };

    await middleware(ctx, next);

    assert.strictEqual(ctx.status, 500);
    assert.strictEqual(ctx.body, 'String error');
  });
});
