# Agent Guidelines for spence-s-starter-template

This document provides coding agents with essential information about this codebase's structure, conventions, and tooling.

## Project Overview

A TypeScript Node.js Koa server template using ESM modules, native Node.js type stripping, and a file-system-based router. Node.js >=22 required.

## Build, Lint, and Test Commands

### Building

```bash
npm run build          # Clean build to dist/ directory
npm run check          # Type-check without building
npm run dev            # Run in watch mode with native type stripping
npm start              # Run built JS from dist/
```

### Linting

```bash
npm run lint           # Run xo linter and type checker
xo --fix              # Auto-fix linting issues
```

### Testing

```bash
npm test                           # Run all tests
node --test                        # Run tests only (no lint)
node --test --watch                # Watch mode
npm run test:coverage              # With coverage report
node --test test/path/file.test.ts # Run single test file
```

**Important**: Test files must use `.test.ts` suffix and live in the `test/` directory. Node.js native test runner is used (not Jest/Mocha).

## Code Style Guidelines

### Module System

- **Pure ESM only** - no CommonJS support
- Use `"type": "module"` in package.json
- All imports/exports use ESM syntax

### Imports

- **Always include `.ts` extension** for local imports (required for native type stripping)
  ```typescript
  import { helmetMiddleware } from "./middleware/helmet.ts";
  import { createTestContext } from "../../utils/create-test-context.ts";
  ```
- Never use `.js` extensions in `.ts` files
- No `.d.ts` file extensions in imports
- Use `type` imports for types:
  ```typescript
  import type { Middleware, Context } from "koa";
  import type { Logger } from "pino";
  ```
- Import from `node:` protocol for built-ins:
  ```typescript
  import process from "node:process";
  import path from "node:path";
  import { test, describe } from "node:test";
  import assert from "node:assert";
  ```

### TypeScript Configuration

- **Strict mode enabled** with additional strictness:
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `verbatimModuleSyntax: true`
  - `erasableSyntaxOnly: true` - Only erasable syntax allowed (no enums, namespaces, parameter properties)
- Target: `es2023`
- Module: `node20`
- Use `type` imports/exports exclusively for types
- Always provide explicit return types for exported functions

### Formatting

- **2 spaces** for indentation (not tabs)
- Prettier integration via xo
- Single quotes for strings (Prettier default)
- Trailing commas in multiline (Prettier default)

### Naming Conventions

- **camelCase** for variables, functions, properties
- **PascalCase** for types, interfaces, classes
- **UPPER_CASE** for constants (optional, not strictly enforced)
- File names: **kebab-case** (e.g., `error-handler.ts`, `pino-http.ts`)
- Test files: `*.test.ts` suffix
- Route files: Use `[paramName].ts` for dynamic params (e.g., `[id].ts`, `[postId].ts`)
  - Note: unicorn/filename-case is disabled for route parameter files

### Type Definitions

- Prefer `type` over `interface` (no enforcement, but `@typescript-eslint/consistent-type-definitions` is disabled)
- Use utility types from `type-fest` when available
- Extend Koa types via module augmentation:
  ```typescript
  declare module "koa" {
    interface DefaultContext {
      id: number | string;
      log: Logger;
    }
  }
  ```

### Functions

- Prefer async/await over promises
- Use arrow functions for simple callbacks
- Named function declarations for complex logic:
  ```typescript
  export function errorHandler(): Middleware {
    async function middleware(ctx: Context, next: Next) {
      // implementation
    }
    return middleware;
  }
  ```

### Error Handling

- Use try/catch for async operations
- Set appropriate HTTP status codes on `ctx.status`
- Attach errors to `ctx.body`
- Example pattern:
  ```typescript
  try {
    await next();
  } catch (error) {
    ctx.status = 500;
    ctx.body = error;
  }
  ```

### Testing Patterns

- Use Node.js native test runner (`node:test`)
- Structure: `describe()` for grouping, `test()` for individual tests
- Use `void` prefix for describe/test to satisfy xo:
  ```typescript
  void describe("Feature", () => {
    void test("should do something", async () => {
      // test implementation
    });
  });
  ```
- Use `node:assert` for assertions
- Test utilities in `test/utils/`:
  - `createTestContext()` - Mock Koa context
  - `createTestServer()` - HTTP server for integration tests
  - `request()` - HTTP client for tests

### Comments

- Capitalized comments not enforced (`capitalized-comments: off`)
- Use JSDoc for exported functions and types
- Keep inline comments concise

### Disabled Rules

- `@typescript-eslint/naming-convention` - Flexible naming
- `@typescript-eslint/unified-signatures` - Allow separate signatures
- `@typescript-eslint/consistent-type-definitions` - type vs interface flexible

## Git Conventions

### Commits

- **Conventional Commits** required (enforced by commitlint)
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `style`, `perf`
- Examples:
  - `feat: add user authentication middleware`
  - `fix: resolve race condition in router`
  - `docs: update API documentation`
  - `chore: update dependencies`

### Hooks

- **pre-commit**: Runs lint-staged (formats and lints staged files)
- **commit-msg**: Validates commit message format
- Lint-staged config (`.lintstagedrc.cjs`):
  - Markdown files: prettier
  - package.json: prettier with plugin
  - JS/TS files: xo --fix

## Project Structure

```
src/
  middleware/
    router/          # File-system-based router
      index.ts       # Main router logic
      types.ts       # Type definitions
      schema.ts      # Runtime validation
    error-handler.ts
    helmet.ts
    pino-http.ts
  index.ts           # Server setup and exports

test/
  middleware/        # Mirror src/ structure
  fixtures/
    routes/          # Test route files
  utils/             # Test utilities
```

## Key Dependencies

- **koa**: Web framework
- **pino**: Logging
- **helmet**: Security headers
- **path-to-regexp**: Route matching
- **xo**: Linter (ESLint + plugins)
- **prettier**: Code formatter
- **typescript**: Type checking
- **husky**: Git hooks
- **lint-staged**: Pre-commit linting
- **commitlint**: Commit message validation

## Notes for Agents

- Never create `.d.ts` files - types are generated by tsc
- Don't use enums, namespaces, or parameter properties (erasableSyntaxOnly)
- When adding routes, follow file-system convention: `routes/path/[param].ts`
- Export handlers as `get`, `post`, `put`, `patch`, `delete` (or `del` for delete)
- Route-specific middleware via `use` export (can be array, object, or single middleware)
- Always run `npm run lint` before committing
- Test changes with `npm test` (includes linting + tests)
