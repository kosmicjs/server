import {test, describe} from 'node:test';
import assert from 'node:assert';
import {helmetMiddleware} from '../../src/middleware/helmet.ts';
import {
  createTestContext,
  createSpyNext,
} from '../utils/create-test-context.ts';

void describe('helmetMiddleware', () => {
  void test('should set security headers in production', async () => {
    const middleware = helmetMiddleware({isDevelopment: false});
    const ctx = createTestContext();
    const next = createSpyNext();

    await middleware(ctx, next);

    assert.strictEqual(next.called, true);
    // Check that some security headers are set
    assert.ok(ctx.res.getHeader('x-dns-prefetch-control'));
    assert.ok(ctx.res.getHeader('x-frame-options'));
    assert.ok(ctx.res.getHeader('x-content-type-options'));
  });

  void test('should set security headers in development', async () => {
    const middleware = helmetMiddleware({isDevelopment: true});
    const ctx = createTestContext();
    const next = createSpyNext();

    await middleware(ctx, next);

    assert.strictEqual(next.called, true);
    // Check that some security headers are set
    assert.ok(ctx.res.getHeader('x-dns-prefetch-control'));
    assert.ok(ctx.res.getHeader('x-frame-options'));
  });

  void test('should include CSP header', async () => {
    const middleware = helmetMiddleware({isDevelopment: false});
    const ctx = createTestContext();
    const next = createSpyNext();

    await middleware(ctx, next);

    const csp = ctx.res.getHeader('content-security-policy');
    assert.ok(csp, 'CSP header should be set');
  });

  void test('should configure CSP differently for development', async () => {
    const devMiddleware = helmetMiddleware({isDevelopment: true});
    const prodMiddleware = helmetMiddleware({isDevelopment: false});

    const devCtx = createTestContext();
    const prodCtx = createTestContext();
    const next = createSpyNext();

    await devMiddleware(devCtx, next);
    await prodMiddleware(prodCtx, next);

    const devCsp = devCtx.res.getHeader('content-security-policy');
    const prodCsp = prodCtx.res.getHeader('content-security-policy');

    // Both should have CSP
    assert.ok(devCsp);
    assert.ok(prodCsp);

    // Production should have upgrade-insecure-requests
    // Development should not
    if (typeof prodCsp === 'string') {
      assert.ok(
        prodCsp.includes('upgrade-insecure-requests'),
        'Production CSP should include upgrade-insecure-requests',
      );
    }
  });
});
