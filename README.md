# @kosmic/server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![npm version](https://img.shields.io/npm/v/@kosmic/server.svg)](https://www.npmjs.com/package/@kosmic/server)
[![npm downloads](https://img.shields.io/npm/dm/@kosmic/server.svg)](https://www.npmjs.com/package/@kosmic/server)

A production-ready [Koa](https://koajs.com/) server with TypeScript, file-system-based routing, and modern Node.js features.

## Features

- **File-System-Based Router**: Automatic route discovery based on file structure
- **TypeScript Native**: Built with TypeScript and native Node.js type stripping
- **Pure ESM**: Modern ES modules only
- **Production-Ready Middleware**: Includes Helmet, Pino logging, response time tracking, and more
- **Type-Safe**: Full TypeScript support with strict mode enabled
- **Modern Node.js**: Leverages Node.js >=22 features including native test runner and watch mode
- **Developer Experience**: Hot reload in development with native watch mode
- **Comprehensive Testing**: Built-in test utilities and Node.js native test runner
- **Code Quality**: Pre-configured with xo linting, prettier formatting, and git hooks

## Prerequisites

- [Node.js](https://nodejs.org) version 22 or higher

## Installation

```bash
npm install @kosmic/server
```

## Quick Start

```typescript
import { createServer } from "@kosmic/server";

const app = createServer({
  routesDir: "./routes",
  logger: true,
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

## File-System-Based Routing

Routes are automatically discovered based on your file structure. Create files in your `routes` directory:

```
routes/
  index.ts          # GET /
  users/
    index.ts        # GET /users
    [id].ts         # GET /users/:id
  posts/
    [postId].ts     # GET /posts/:postId
```

### Route Handler Example

```typescript
// routes/users/[id].ts
import type { Context } from "koa";

export async function get(ctx: Context) {
  const { id } = ctx.params;
  ctx.body = { user: id };
}

export async function put(ctx: Context) {
  const { id } = ctx.params;
  ctx.body = { updated: id };
}

export async function del(ctx: Context) {
  const { id } = ctx.params;
  ctx.status = 204;
}
```

### Route-Specific Middleware

```typescript
// routes/admin/index.ts
import type { Middleware } from "koa";

// Middleware runs before route handlers
export const use: Middleware = async (ctx, next) => {
  // Auth check
  if (!ctx.state.isAdmin) {
    ctx.status = 403;
    return;
  }
  await next();
};

export async function get(ctx) {
  ctx.body = { admin: true };
}
```

## Development

### Building

```bash
npm run build          # Clean build to dist/ directory
npm run check          # Type-check without building
npm run dev            # Run in watch mode with native type stripping
npm start              # Run built JS from dist/
```

### Testing

```bash
npm test               # Run linter and tests
node --test            # Run tests only
node --test --watch    # Watch mode
npm run test:coverage  # With coverage report
```

### Linting

```bash
npm run lint           # Run xo linter and type checker
xo --fix              # Auto-fix linting issues
```

## Middleware

The server comes pre-configured with production-ready middleware:

- **Helmet**: Security headers
- **Pino Logger**: Fast JSON logging with request context
- **Response Time**: Tracks response time in headers
- **Body Parser**: Parses JSON and form data
- **Conditional GET**: ETag support for caching
- **Error Handler**: Centralized error handling

### Custom Context

The Koa context is extended with useful properties:

```typescript
import type { Context } from "koa";

export async function get(ctx: Context) {
  ctx.id; // Request ID (string | number)
  ctx.log; // Pino logger instance scoped to this request

  ctx.log.info("Processing request");
  ctx.body = { success: true };
}
```

## Configuration

### TypeScript

The project uses strict TypeScript with additional safety:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `verbatimModuleSyntax: true`
- `erasableSyntaxOnly: true` - Only erasable syntax (no enums, namespaces, parameter properties)

### Code Style

- **2 spaces** for indentation
- **ESM only** - No CommonJS support
- **`.ts` extensions** required for local imports
- **`node:` protocol** for built-in imports
- **Type imports** use `import type` syntax

## API Reference

For detailed API documentation and advanced usage, see the [API docs](./docs/api.md).

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/). When making commits, please follow the format:

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `style`, `perf`

Examples:

- `feat: add user authentication middleware`
- `fix: resolve race condition in router`
- `docs: update API documentation`

Pre-commit hooks automatically lint and format staged files.

## TypeScript Support

The project is configured for Node.js native type stripping using the `erasableSyntaxOnly` option, which means not all TypeScript features are supported. This design choice enables better DX with native Node.js features while maintaining production builds as pure JavaScript.

**Unsupported TypeScript features:**

- Enums
- Namespaces
- Parameter properties

**Learn more:**

- [TypeScript Modules in Node.js](https://nodejs.org/api/typescript.html)
- [Erasable Syntax Only Reference](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly)

## License

MIT © [Spencer Snyder](https://spencersnyder.io)
