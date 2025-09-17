# heli-monorepo

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Nuxt, Elysia, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Nuxt** - The Intuitive Vue Framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Elysia** - Type-safe, high-performance framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
bun db:push
```

Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Deployment (Cloudflare Wrangler)

- Web deploy: cd apps/web && bun deploy

## Project Structure

```
heli-monorepo/
├── apps/
│   ├── web/         # Frontend application (Nuxt)
│   └── server/      # Backend API (Elysia, ORPC)
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI

                                                          │

  │ Next steps │
  │ 1. cd heli-monorepo │
  │ 2. bun run dev │
  │ Your project will be available at: │
  │ • Frontend: http://localhost:3001 │
  │ • Backend API: http://localhost:3000 │
  │ • OpenAPI (Scalar UI): http://localhost:3000/api │
  │ │
  │ Database commands: │
  │ • Apply schema: bun run db:push │
  │ • Database UI: bun run db:studio │
  │ │
  │ Deploy web to Cloudflare Workers: │
  │ • Deploy: cd apps/web && bun run run deploy │
  │ │
  │ Update all dependencies: │
  │ bunx taze -r
