import type {Middleware} from 'koa';
import type {
  UseObject,
  Use,
  RouteModule,
  HttpVerb,
  HttpVerbsAll,
} from './types.ts';

// ============================================================================
// Constants
// ============================================================================

const VALID_HTTP_VERBS: readonly HttpVerb[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
] as const;
const VALID_USE_KEYS: readonly HttpVerbsAll[] = [
  ...VALID_HTTP_VERBS,
  'all',
] as const;
const VALID_ROUTE_MODULE_KEYS: readonly string[] = [
  ...VALID_HTTP_VERBS,
  'del',
  'use',
] as const;

// ============================================================================
// Custom Error Class
// ============================================================================

export class RouteModuleValidationError extends Error {
  readonly filePath: string | undefined;
  readonly propertyPath: string | undefined;
  readonly received: string;
  readonly expected: string;
  readonly suggestions: string[] | undefined;

  // eslint-disable-next-line max-params
  constructor(
    message: string,
    filePath: string | undefined,
    propertyPath: string | undefined,
    received: string,
    expected: string,
    suggestions: string[] | undefined,
  ) {
    super(message);
    this.name = 'RouteModuleValidationError';
    this.filePath = filePath;
    this.propertyPath = propertyPath;
    this.received = received;
    this.expected = expected;
    this.suggestions = suggestions;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RouteModuleValidationError);
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets a human-readable description of a value's type
 */
function getTypeDescription(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'empty array';
    return `array (length ${value.length})`;
  }

  if (typeof value === 'object') return 'object';
  if (typeof value === 'function') return 'function';
  if (typeof value === 'string')
    return `string ("${value.length > 50 ? value.slice(0, 50) + '...' : value}")`;
  if (typeof value === 'number') return `number (${value})`;
  if (typeof value === 'boolean') return `boolean (${value})`;
  return typeof value;
}

/**
 * Gets the expected type description for a given property path
 */
function getExpectedTypeForProperty(propertyPath: string): string {
  if (propertyPath === 'module') {
    return 'RouteModule object';
  }

  if (/^module\.(get|post|put|patch|delete)$/.test(propertyPath)) {
    return 'Koa middleware function (optional)';
  }

  if (propertyPath === 'module.use') {
    return 'Middleware, Middleware[], UseObject, or UseObject[] (optional)';
  }

  if (/^module\.use\[\d+]$/.test(propertyPath)) {
    return 'Middleware, Middleware[], or UseObject';
  }

  if (
    /^module\.use(\[\d+])?\.(get|post|put|patch|delete|all)$/.test(propertyPath)
  ) {
    return 'Koa middleware function or array of middleware functions (optional)';
  }

  if (/\[\d+]$/.test(propertyPath)) {
    return 'Koa middleware function';
  }

  return 'valid value';
}

/**
 * Generates context-aware suggestions based on the error
 */
function getSuggestionsForError(
  propertyPath: string,
  received: unknown,
  context?: {invalidKeys?: string[]},
): string[] {
  const suggestions: string[] = [];

  // Suggestions for invalid keys in UseObject
  if (context?.invalidKeys && context.invalidKeys.length > 0) {
    for (const key of context.invalidKeys) {
      const lowerKey = key.toLowerCase();
      if (VALID_USE_KEYS.includes(lowerKey as HttpVerbsAll)) {
        suggestions.push(`Use lowercase '${lowerKey}' instead of '${key}'`);
      } else {
        suggestions.push(
          `Remove invalid key '${key}' (valid keys: ${VALID_USE_KEYS.join(', ')})`,
        );
      }
    }

    return suggestions;
  }

  // Suggestions for wrong type at module level
  if (/^module\.(get|post|put|patch|delete)$/.test(propertyPath)) {
    if (typeof received === 'string') {
      suggestions.push(
        'Did you mean to export a function instead of a string?',
      );
    } else if (typeof received === 'object' && received !== null) {
      suggestions.push(
        'Route handlers must be functions, not objects',
        'Example: export const get = async (ctx, next) => { ... }',
      );
    } else if (received === null) {
      suggestions.push(
        'Did you mean to use undefined instead of null, or remove this export?',
      );
    }
  }

  // Suggestions for module.use errors
  if (propertyPath === 'module.use') {
    if (typeof received === 'string') {
      suggestions.push(
        'Did you mean to export a function instead of a string?',
      );
    } else if (
      typeof received === 'object' &&
      received !== null &&
      !Array.isArray(received)
    ) {
      suggestions.push(
        'If using a UseObject, ensure all keys are lowercase HTTP verbs (get, post, put, patch, delete, all)',
      );
    }
  }

  // Suggestions for undefined in arrays
  if (received === undefined && propertyPath.includes('[')) {
    suggestions.push(
      'Middleware arrays cannot contain undefined values',
      'Check for failed imports or trailing commas creating empty slots',
      'Use conditional logic to filter out undefined middleware',
    );
  }

  // Suggestions for null values
  if (received === null) {
    suggestions.push('Use undefined instead of null for optional values');
  }

  return suggestions;
}

/**
 * Formats a complete validation error message with visual formatting
 */
// eslint-disable-next-line max-params
function formatValidationError(
  filePath: string | undefined,
  propertyPath: string | undefined,
  received: string,
  expected: string,
  suggestions?: string[],
): string {
  const lines: string[] = [];

  lines.push('━'.repeat(60), 'Route Module Validation Error', '');

  if (filePath) {
    lines.push(`File: ${filePath}`);
  }

  if (propertyPath) {
    lines.push(`Property: ${propertyPath}`);
  }

  lines.push(`Expected: ${expected}`, `Received: ${received}`);

  if (suggestions && suggestions.length > 0) {
    lines.push('', 'Suggestions:');
    for (const suggestion of suggestions) {
      lines.push(`  • ${suggestion}`);
    }
  }

  // Add examples for common error cases
  if (propertyPath?.match(/^module\.(get|post|put|patch|delete)$/)) {
    lines.push(
      '',
      'Example of valid route handler:',
      '  export const get = async (ctx, next) => {',
      '    ctx.body = { message: "Hello" };',
      '  };',
    );
  }

  if (
    propertyPath === 'module.use' ||
    propertyPath?.match(/^module\.use\[\d+]$/)
  ) {
    lines.push(
      '',
      'Valid use patterns:',
      '  // Single middleware:',
      '  export const use = authMiddleware;',
      '',
      '  // Array of middleware:',
      '  export const use = [authMiddleware, logMiddleware];',
      '',
      '  // UseObject:',
      '  export const use = {',
      '    get: authMiddleware,',
      '    post: [authMiddleware, validateBody]',
      '  };',
      '',
      '  // Array of UseObjects:',
      '  export const use = [{ all: corsMiddleware }, { post: validateBody }];',
    );
  }

  lines.push('━'.repeat(60));

  return lines.join('\n');
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a Koa middleware function
 */
export function isMiddleware(value: unknown): value is Middleware {
  return typeof value === 'function';
}

/**
 * Type guard to check if a value is an array of middleware functions
 */
export function isMiddlewareArray(value: unknown): value is Middleware[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => isMiddleware(item));
}

/**
 * Type guard to check if a value is middleware or an array of middleware
 */
export function isMiddlewareOrArray(
  value: unknown,
): value is Middleware | Middleware[] {
  return isMiddleware(value) || isMiddlewareArray(value);
}

/**
 * Type guard to check if a value is a valid UseObject
 * Strictly validates that only allowed keys are present
 */
export function isUseObject(value: unknown): value is UseObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object);

  // Check that all keys are valid
  for (const key of keys) {
    if (!VALID_USE_KEYS.includes(key as HttpVerbsAll)) {
      return false;
    }
  }

  // Check that all values are middleware or arrays of middleware
  for (const key of keys) {
    const value_ = object[key];

    // Values can be undefined (optional)
    if (value_ === undefined) {
      continue;
    }

    // Must be middleware or array of middleware
    if (!isMiddlewareOrArray(value_)) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to check if a value is a valid Use type
 * Handles all possible union variants
 */
export function isUse(value: unknown): value is Use {
  // Undefined is valid (use is optional)
  if (value === undefined) {
    return true;
  }

  // Single middleware
  if (isMiddleware(value)) {
    return true;
  }

  // Array: could be middleware[] or UseObject[]
  if (Array.isArray(value)) {
    // Empty array is valid
    if (value.length === 0) {
      return true;
    }

    // Check if it's an array of middleware
    if (value.every((item) => isMiddleware(item))) {
      return true;
    }

    // Check if it's an array of UseObjects
    if (value.every((item) => isUseObject(item))) {
      return true;
    }

    return false;
  }

  // UseObject
  if (isUseObject(value)) {
    return true;
  }

  return false;
}

/**
 * Type guard to check if a value is a valid RouteModule
 * Strictly validates that only allowed keys are present
 */
export function isRouteModule(value: unknown): value is RouteModule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object);

  // Check that all keys are valid
  for (const key of keys) {
    if (!VALID_ROUTE_MODULE_KEYS.includes(key)) {
      return false;
    }
  }

  // Validate HTTP verb handlers (must be middleware functions if present)
  for (const verb of VALID_HTTP_VERBS) {
    const handler = object[verb];
    if (handler !== undefined && !isMiddleware(handler)) {
      return false;
    }
  }

  // Validate 'del' if present (alias for 'delete')
  if (object.del !== undefined && !isMiddleware(object.del)) {
    return false;
  }

  // Validate 'use' if present
  if (object.use !== undefined && !isUse(object.use)) {
    return false;
  }

  return true;
}

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * Asserts that a value is valid middleware, throwing detailed error if not
 */
function assertMiddlewareInternal(
  value: unknown,
  filePath: string | undefined,
  propertyPath: string,
): asserts value is Middleware {
  if (!isMiddleware(value)) {
    const received = getTypeDescription(value);
    const expected = 'Koa middleware function';
    const suggestions = getSuggestionsForError(propertyPath, value);

    const message = formatValidationError(
      filePath,
      propertyPath,
      received,
      expected,
      suggestions,
    );

    throw new RouteModuleValidationError(
      message,
      filePath,
      propertyPath,
      received,
      expected,
      suggestions,
    );
  }
}

/**
 * Asserts that a value is middleware or array of middleware, throwing detailed error if not
 */
function assertMiddlewareOrArrayInternal(
  value: unknown,
  filePath: string | undefined,
  propertyPath: string,
): asserts value is Middleware | Middleware[] {
  if (value === undefined) {
    return; // Optional
  }

  if (isMiddleware(value)) {
    return; // Single middleware is valid
  }

  if (Array.isArray(value)) {
    // Check each item in the array
    for (const [index, element] of value.entries()) {
      assertMiddlewareInternal(element, filePath, `${propertyPath}[${index}]`);
    }

    return;
  }

  // If we get here, it's neither middleware nor an array
  const received = getTypeDescription(value);
  const expected = getExpectedTypeForProperty(propertyPath);
  const suggestions = getSuggestionsForError(propertyPath, value);

  const message = formatValidationError(
    filePath,
    propertyPath,
    received,
    expected,
    suggestions,
  );

  throw new RouteModuleValidationError(
    message,
    filePath,
    propertyPath,
    received,
    expected,
    suggestions,
  );
}

/**
 * Asserts that a value is a valid UseObject, throwing detailed error if not
 */
function assertUseObjectInternal(
  value: unknown,
  filePath: string | undefined,
  propertyPath: string,
): asserts value is UseObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const received = getTypeDescription(value);
    const expected = 'UseObject with keys: get, post, put, patch, delete, all';
    const suggestions = getSuggestionsForError(propertyPath, value);

    const message = formatValidationError(
      filePath,
      propertyPath,
      received,
      expected,
      suggestions,
    );

    throw new RouteModuleValidationError(
      message,
      filePath,
      propertyPath,
      received,
      expected,
      suggestions,
    );
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object);

  // Check for invalid keys
  const invalidKeys = keys.filter(
    (key) => !VALID_USE_KEYS.includes(key as HttpVerbsAll),
  );

  if (invalidKeys.length > 0) {
    const received = `Object with invalid keys: ${invalidKeys.join(', ')}`;
    const expected = `Valid UseObject with keys: ${VALID_USE_KEYS.join(', ')}`;
    const suggestions = getSuggestionsForError(propertyPath, value, {
      invalidKeys,
    });

    const message = formatValidationError(
      filePath,
      propertyPath,
      received,
      expected,
      suggestions,
    );

    throw new RouteModuleValidationError(
      message,
      filePath,
      propertyPath,
      received,
      expected,
      suggestions,
    );
  }

  // Validate each key's value
  for (const key of keys) {
    const value_ = object[key];
    const fullPath = `${propertyPath}.${key}`;
    assertMiddlewareOrArrayInternal(value_, filePath, fullPath);
  }
}

/**
 * Asserts that a value is a valid Use type, throwing detailed error if not
 */
function assertUseInternal(
  value: unknown,
  filePath: string | undefined,
  propertyPath: string,
): asserts value is Use {
  if (value === undefined) {
    return; // Optional
  }

  // Single middleware
  if (isMiddleware(value)) {
    return;
  }

  // Array: could be middleware[] or UseObject[]
  if (Array.isArray(value)) {
    // Empty array is valid
    if (value.length === 0) {
      return;
    }

    // Determine what type of array this should be by checking the first element
    const firstItem = value[0]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment

    if (isMiddleware(firstItem)) {
      // Array of middleware - validate all items
      for (const [index, element] of value.entries()) {
        assertMiddlewareInternal(
          element,
          filePath,
          `${propertyPath}[${index}]`,
        );
      }

      return;
    }

    if (
      typeof firstItem === 'object' &&
      firstItem !== null &&
      !Array.isArray(firstItem)
    ) {
      // Array of UseObjects - validate all items
      for (const [index, element] of value.entries()) {
        assertUseObjectInternal(element, filePath, `${propertyPath}[${index}]`);
      }

      return;
    }

    // Invalid array content
    const received = getTypeDescription(firstItem);
    const expected = 'Middleware function or UseObject';
    const suggestions = getSuggestionsForError(`${propertyPath}[0]`, firstItem);

    const message = formatValidationError(
      filePath,
      `${propertyPath}[0]`,
      received,
      expected,
      suggestions,
    );

    throw new RouteModuleValidationError(
      message,
      filePath,
      `${propertyPath}[0]`,
      received,
      expected,
      suggestions,
    );
  }

  // UseObject
  if (typeof value === 'object' && value !== null) {
    assertUseObjectInternal(value, filePath, propertyPath);
    return;
  }

  // If we get here, it's an invalid type
  const received = getTypeDescription(value);
  const expected = getExpectedTypeForProperty(propertyPath);
  const suggestions = getSuggestionsForError(propertyPath, value);

  const message = formatValidationError(
    filePath,
    propertyPath,
    received,
    expected,
    suggestions,
  );

  throw new RouteModuleValidationError(
    message,
    filePath,
    propertyPath,
    received,
    expected,
    suggestions,
  );
}

/**
 * Main assertion function for validating route modules
 * Entry point with full context tracking
 *
 * @param value - The value to validate as a RouteModule
 * @param filePath - The path to the file being validated (for error messages)
 * @throws {RouteModuleValidationError} If validation fails
 */
export function assertRouteModule(
  value: unknown,
  filePath: string,
): asserts value is RouteModule {
  // First check if it's an object
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const received = getTypeDescription(value);
    const expected = 'RouteModule object';
    const suggestions: string[] = [];

    if (value === null) {
      suggestions.push(
        'Ensure your route file exports route handlers (get, post, etc.) or middleware (use)',
      );
    } else if (Array.isArray(value)) {
      suggestions.push(
        'Route modules should be objects with named exports, not arrays',
      );
    }

    const message = formatValidationError(
      filePath,
      'module',
      received,
      expected,
      suggestions,
    );

    throw new RouteModuleValidationError(
      message,
      filePath,
      'module',
      received,
      expected,
      suggestions,
    );
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object);

  // Check for unexpected keys (strict mode)
  const invalidKeys = keys.filter(
    (key) => !VALID_ROUTE_MODULE_KEYS.includes(key),
  );

  if (invalidKeys.length > 0) {
    const received = `RouteModule with unexpected keys: ${invalidKeys.join(', ')}`;
    const expected = `RouteModule with only valid keys: ${VALID_ROUTE_MODULE_KEYS.join(', ')}`;
    const suggestions: string[] = [];

    for (const key of invalidKeys) {
      const lowerKey = key.toLowerCase();
      if (VALID_HTTP_VERBS.includes(lowerKey as HttpVerb)) {
        suggestions.push(`Use lowercase '${lowerKey}' instead of '${key}'`);
      } else if (key === 'DELETE') {
        suggestions.push(`Use lowercase 'delete' or 'del' instead of '${key}'`);
      } else {
        suggestions.push(`Remove unexpected export '${key}' from route module`);
      }
    }

    const message = formatValidationError(
      filePath,
      'module',
      received,
      expected,
      suggestions,
    );

    throw new RouteModuleValidationError(
      message,
      filePath,
      'module',
      received,
      expected,
      suggestions,
    );
  }

  // Validate HTTP verb handlers
  for (const verb of VALID_HTTP_VERBS) {
    const handler = object[verb];
    if (handler !== undefined) {
      assertMiddlewareInternal(handler, filePath, `module.${verb}`);
    }
  }

  // Validate 'del' if present (alias for 'delete')
  if (object.del !== undefined) {
    assertMiddlewareInternal(object.del as unknown, filePath, 'module.del');
  }

  // Validate 'use' if present
  if (object.use !== undefined) {
    assertUseInternal(object.use, filePath, 'module.use');
  }
}
