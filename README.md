# Heli Monorepo

A modern full-stack application built with TypeScript, featuring a Vue.js frontend and Elysia backend API. This project provides a comprehensive dashboard for managing inspections, daily logs, todos, and file operations.

## Features

- **TypeScript** - Full type safety across frontend and backend
- **Nuxt 4** - Vue.js framework with server-side rendering
- **Nuxt UI** - Modern UI component library with Tailwind CSS
- **Elysia** - High-performance TypeScript-first web framework
- **Better-Auth** - Secure authentication system
- **Drizzle ORM** - Type-safe database operations
- **PostgreSQL** - Robust relational database
- **Bun** - Fast JavaScript runtime and package manager
- **Turborepo** - Optimized monorepo build system
- **Biome** - Lightning-fast linter and formatter
- **OpenAPI** - Auto-generated API documentation

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.2.20+)
- PostgreSQL database

### Installation

0. Install Bun (If not available)

```bash
curl -fsSL https://bun.sh/install | bash
```

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd heli-monorepo
bun install
```

2. Set up environment variables:

Create `.env` files in both `apps/server/` and `apps/web/` directories with your configuration.

3. Set up the database:

```bash

# Generate database migrations (if needed)
bun db:generate

# Run migrations
bun db:migrate
```

4. Start the development servers:

```bash
# Start both frontend and backend
bun dev

# Or start individually
bun dev:web    # Frontend only (http://localhost:3001)
bun dev:server # Backend only (http://localhost:3000)
```

### Access Points

- **Frontend**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:3000/api](http://localhost:3000/api)
- **Database Studio**: Run `bun db:studio` to open Drizzle Studio

## Project Structure

```
heli-monorepo/
├── apps/
│   ├── web/                    # Frontend application (Nuxt 4)
│   │   ├── app/
│   │   │   ├── components/     # Vue components
│   │   │   ├── pages/          # Application pages
│   │   │   ├── layouts/        # Layout components
│   │   │   ├── composables/    # Vue composables
│   │   │   ├── stores/         # Pinia stores
│   │   │   └── plugins/        # Nuxt plugins
│   │   └── server/             # Server-side API routes
│   └── server/                 # Backend API (Elysia)
│       ├── src/
│       │   ├── routers/        # API route handlers
│       │   ├── db/             # Database schema and migrations
│       │   ├── lib/            # Utility libraries
│       │   └── services/       # Business logic services
│       └── drizzle.config.ts   # Database configuration
├── biome.json                  # Linting and formatting config
├── turbo.json                  # Turborepo configuration
└── package.json                # Root package configuration
```

## Application Features

### Frontend (Nuxt 4)

- **Dashboard**: Home page with stats, charts, and sales data
- **Customer Management**: Add, edit, and manage customers
- **Inbox**: Mail management system
- **Todo Management**: Task tracking and organization
- **Settings**: User preferences, members, notifications, and security
- **Authentication**: Secure login and user management

### Backend (Elysia)

- **Authentication**: Better-Auth integration with secure sessions
- **File Management**: Upload, download, and file operations
- **Inspection System**: Comprehensive inspection tracking
- **Daily Logs**: Activity logging and reporting
- **Todo API**: Task management endpoints
- **Manual Management**: Document and manual handling
- **Monitoring**: Health checks and system monitoring

## Available Scripts

### Development

- `bun dev` - Start all applications in development mode
- `bun dev:web` - Start only the frontend application
- `bun dev:server` - Start only the backend server

### Building

- `bun build` - Build all applications for production
- `bun check-types` - Check TypeScript types across all apps

### Database

- `bun db:push` - Push schema changes to database
- `bun db:generate` - Generate database migrations
- `bun db:migrate` - Run database migrations
- `bun db:studio` - Open Drizzle Studio for database management

### Code Quality

- `bun check` - Run Biome linter and formatter

### Authentication

- `bun auth:generate` - Generate authentication types

## Deployment

### Cloudflare Workers (Frontend)

```bash
cd apps/web
bun deploy
```

### Server Deployment

The server can be deployed to any Node.js-compatible platform or compiled to a binary using Bun's compile feature:

```bash
cd apps/server
bun run compile
```

## Development Workflow

1. **Code Quality**: The project uses Biome for linting and formatting with Ultracite rules
2. **Type Safety**: Full TypeScript coverage with strict type checking
3. **API Documentation**: Auto-generated OpenAPI documentation available at `/api`
4. **Database**: Drizzle ORM with PostgreSQL for type-safe database operations
5. **Authentication**: Better-Auth for secure user management and sessions
