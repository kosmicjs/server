import {test, describe} from 'node:test';
import assert from 'node:assert';
import type {Middleware} from 'koa';
import {
  isMiddleware,
  isMiddlewareArray,
  isMiddlewareOrArray,
  isUseObject,
  isUse,
  isRouteModule,
  assertRouteModule,
  RouteModuleValidationError,
} from '../../../src/middleware/router/schema.ts';

void describe('Router Schema Validation', () => {
  // Helper functions
  const mockMiddleware: Middleware = async (ctx, next) => {
    await next();
  };

  const mockMiddleware2: Middleware = async (ctx, next) => {
    await next();
  };

  void describe('isMiddleware', () => {
    void test('should return true for functions', () => {
      assert.strictEqual(isMiddleware(mockMiddleware), true);
      assert.strictEqual(
        isMiddleware(() => {
          // Mock function
        }),
        true,
      );
      assert.strictEqual(
        isMiddleware(async () => {
          // Mock async function
        }),
        true,
      );
    });

    void test('should return false for non-functions', () => {
      assert.strictEqual(isMiddleware(null), false);
      assert.strictEqual(isMiddleware(undefined), false);
      assert.strictEqual(isMiddleware({}), false);
      assert.strictEqual(isMiddleware([]), false);
      assert.strictEqual(isMiddleware('function'), false);
      assert.strictEqual(isMiddleware(42), false);
    });
  });

  void describe('isMiddlewareArray', () => {
    void test('should return true for arrays of functions', () => {
      assert.strictEqual(isMiddlewareArray([mockMiddleware]), true);
      assert.strictEqual(
        isMiddlewareArray([mockMiddleware, mockMiddleware2]),
        true,
      );
      assert.strictEqual(isMiddlewareArray([]), true);
    });

    void test('should return false for non-arrays', () => {
      assert.strictEqual(isMiddlewareArray(mockMiddleware), false);
      assert.strictEqual(isMiddlewareArray(null), false);
      assert.strictEqual(isMiddlewareArray({}), false);
    });

    void test('should return false for arrays with non-functions', () => {
      assert.strictEqual(isMiddlewareArray([mockMiddleware, null]), false);
      assert.strictEqual(isMiddlewareArray([mockMiddleware, 'string']), false);
      assert.strictEqual(isMiddlewareArray([mockMiddleware, {}]), false);
    });
  });

  void describe('isMiddlewareOrArray', () => {
    void test('should return true for single middleware', () => {
      assert.strictEqual(isMiddlewareOrArray(mockMiddleware), true);
    });

    void test('should return true for middleware arrays', () => {
      assert.strictEqual(isMiddlewareOrArray([mockMiddleware]), true);
      assert.strictEqual(
        isMiddlewareOrArray([mockMiddleware, mockMiddleware2]),
        true,
      );
    });

    void test('should return false for invalid values', () => {
      assert.strictEqual(isMiddlewareOrArray(null), false);
      assert.strictEqual(isMiddlewareOrArray({}), false);
      assert.strictEqual(isMiddlewareOrArray([mockMiddleware, null]), false);
    });
  });

  void describe('isUseObject', () => {
    void test('should return true for valid UseObjects', () => {
      assert.strictEqual(isUseObject({get: mockMiddleware}), true);
      assert.strictEqual(isUseObject({post: mockMiddleware}), true);
      assert.strictEqual(
        isUseObject({get: mockMiddleware, post: mockMiddleware2}),
        true,
      );
      assert.strictEqual(isUseObject({all: mockMiddleware}), true);
      assert.strictEqual(isUseObject({get: [mockMiddleware]}), true);
    });

    void test('should return true for UseObjects with undefined values', () => {
      assert.strictEqual(isUseObject({get: undefined}), true);
      assert.strictEqual(
        isUseObject({get: mockMiddleware, post: undefined}),
        true,
      );
    });

    void test('should return false for non-objects', () => {
      assert.strictEqual(isUseObject(null), false);
      assert.strictEqual(isUseObject(undefined), false);
      assert.strictEqual(isUseObject([]), false);
      assert.strictEqual(isUseObject(mockMiddleware), false);
    });

    void test('should return false for objects with invalid keys', () => {
      assert.strictEqual(isUseObject({GET: mockMiddleware}), false);
      assert.strictEqual(isUseObject({invalid: mockMiddleware}), false);
      // 'delete' is actually valid in UseObject (it's in HttpVerb)
      assert.strictEqual(isUseObject({delete: mockMiddleware}), true);
    });

    void test('should return false for objects with invalid values', () => {
      assert.strictEqual(isUseObject({get: 'not a function'}), false);
      assert.strictEqual(isUseObject({get: null}), false);
      assert.strictEqual(isUseObject({get: {}}), false);
    });
  });

  void describe('isUse', () => {
    void test('should return true for undefined', () => {
      assert.strictEqual(isUse(undefined), true);
    });

    void test('should return true for single middleware', () => {
      assert.strictEqual(isUse(mockMiddleware), true);
    });

    void test('should return true for middleware arrays', () => {
      assert.strictEqual(isUse([mockMiddleware]), true);
      assert.strictEqual(isUse([mockMiddleware, mockMiddleware2]), true);
      assert.strictEqual(isUse([]), true);
    });

    void test('should return true for UseObjects', () => {
      assert.strictEqual(isUse({get: mockMiddleware}), true);
      assert.strictEqual(
        isUse({get: mockMiddleware, post: mockMiddleware2}),
        true,
      );
    });

    void test('should return true for arrays of UseObjects', () => {
      assert.strictEqual(isUse([{get: mockMiddleware}]), true);
      assert.strictEqual(
        isUse([{get: mockMiddleware}, {post: mockMiddleware2}]),
        true,
      );
    });

    void test('should return false for invalid values', () => {
      assert.strictEqual(isUse(null), false);
      assert.strictEqual(isUse('string'), false);
      assert.strictEqual(isUse(42), false);
      assert.strictEqual(isUse({GET: mockMiddleware}), false);
      assert.strictEqual(isUse([mockMiddleware, null]), false);
      assert.strictEqual(isUse([{get: mockMiddleware}, null]), false);
    });
  });

  void describe('isRouteModule', () => {
    void test('should return true for valid RouteModules', () => {
      assert.strictEqual(isRouteModule({get: mockMiddleware}), true);
      assert.strictEqual(
        isRouteModule({get: mockMiddleware, post: mockMiddleware2}),
        true,
      );
      assert.strictEqual(isRouteModule({del: mockMiddleware}), true);
      assert.strictEqual(
        isRouteModule({get: mockMiddleware, use: mockMiddleware2}),
        true,
      );
      assert.strictEqual(isRouteModule({use: {get: mockMiddleware}}), true);
    });

    void test('should return true for RouteModules with undefined handlers', () => {
      assert.strictEqual(isRouteModule({get: undefined}), true);
      assert.strictEqual(
        isRouteModule({get: mockMiddleware, post: undefined}),
        true,
      );
    });

    void test('should return false for non-objects', () => {
      assert.strictEqual(isRouteModule(null), false);
      assert.strictEqual(isRouteModule(undefined), false);
      assert.strictEqual(isRouteModule([]), false);
    });

    void test('should return false for objects with invalid keys', () => {
      assert.strictEqual(isRouteModule({GET: mockMiddleware}), false);
      assert.strictEqual(isRouteModule({invalid: mockMiddleware}), false);
    });

    void test('should return false for objects with invalid HTTP verb values', () => {
      assert.strictEqual(isRouteModule({get: 'not a function'}), false);
      assert.strictEqual(isRouteModule({post: null}), false);
      assert.strictEqual(isRouteModule({put: {}}), false);
    });

    void test('should return false for objects with invalid use values', () => {
      assert.strictEqual(isRouteModule({use: 'not valid'}), false);
      assert.strictEqual(isRouteModule({use: null}), false);
      assert.strictEqual(isRouteModule({use: {GET: mockMiddleware}}), false);
    });
  });

  void describe('assertRouteModule', () => {
    void test('should not throw for valid RouteModules', () => {
      assert.doesNotThrow(() => {
        assertRouteModule({get: mockMiddleware}, '/test/route.ts');
      });
      assert.doesNotThrow(() => {
        assertRouteModule(
          {get: mockMiddleware, post: mockMiddleware2},
          '/test/route.ts',
        );
      });
      assert.doesNotThrow(() => {
        assertRouteModule({use: mockMiddleware}, '/test/route.ts');
      });
    });

    void test('should throw RouteModuleValidationError for non-objects', () => {
      assert.throws(
        () => {
          assertRouteModule(null, '/test/route.ts');
        },
        (error: any) => {
          assert.ok(error instanceof RouteModuleValidationError);
          assert.ok(error.message.includes('RouteModule object'));
          assert.strictEqual(error.filePath, '/test/route.ts');
          return true;
        },
      );
    });

    void test('should throw for objects with invalid keys', () => {
      assert.throws(
        () => {
          assertRouteModule({GET: mockMiddleware}, '/test/route.ts');
        },
        (error: any) => {
          assert.ok(error instanceof RouteModuleValidationError);
          assert.ok(error.message.includes('GET'));
          return true;
        },
      );

      assert.throws(() => {
        assertRouteModule({invalid: mockMiddleware}, '/test/route.ts');
      }, RouteModuleValidationError);
    });

    void test('should throw for invalid HTTP verb handlers', () => {
      assert.throws(
        () => {
          assertRouteModule({get: 'not a function'}, '/test/route.ts');
        },
        (error: any) => {
          assert.ok(error instanceof RouteModuleValidationError);
          assert.ok(error.message.includes('module.get'));
          return true;
        },
      );
    });

    void test('should throw for invalid use property', () => {
      assert.throws(() => {
        assertRouteModule({use: 'invalid'}, '/test/route.ts');
      }, RouteModuleValidationError);

      assert.throws(() => {
        assertRouteModule({use: null}, '/test/route.ts');
      }, RouteModuleValidationError);
    });

    void test('should provide suggestions for common mistakes', () => {
      assert.throws(
        () => {
          assertRouteModule({GET: mockMiddleware}, '/test/route.ts');
        },
        (error: any) => {
          assert.ok(error instanceof RouteModuleValidationError);
          assert.ok(error.suggestions);
          assert.ok(error.suggestions.length > 0);
          // Should suggest lowercase
          const suggestionText = error.suggestions.join(' ');
          assert.ok(suggestionText.includes('lowercase'));
          return true;
        },
      );
    });

    void test('should include helpful error properties', () => {
      try {
        assertRouteModule({get: 'not a function'}, '/test/route.ts');
        assert.fail('Should have thrown');
      } catch (error: any) {
        assert.ok(error instanceof RouteModuleValidationError);
        assert.strictEqual(error.filePath, '/test/route.ts');
        assert.strictEqual(error.propertyPath, 'module.get');
        assert.ok(error.received);
        assert.ok(error.expected);
      }
    });
  });

  void describe('RouteModuleValidationError', () => {
    void test('should have correct name', () => {
      const error = new RouteModuleValidationError(
        'Test message',
        '/test/file.ts',
        'module.get',
        'string',
        'function',
        [],
      );
      assert.strictEqual(error.name, 'RouteModuleValidationError');
    });

    void test('should include all properties', () => {
      const error = new RouteModuleValidationError(
        'Test message',
        '/test/file.ts',
        'module.get',
        'string',
        'function',
        ['suggestion 1', 'suggestion 2'],
      );

      assert.strictEqual(error.message, 'Test message');
      assert.strictEqual(error.filePath, '/test/file.ts');
      assert.strictEqual(error.propertyPath, 'module.get');
      assert.strictEqual(error.received, 'string');
      assert.strictEqual(error.expected, 'function');
      assert.deepStrictEqual(error.suggestions, [
        'suggestion 1',
        'suggestion 2',
      ]);
    });
  });
});
