import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { fromTypes } from "@elysiajs/openapi/gen";
import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";
import { authPlugin, OpenAPI } from "./lib/auth";
import {
  createGlobalErrorHandler,
  createRateLimitMiddleware,
  createValidationMiddleware,
} from "./lib/error-handler";
import {
  performHealthCheck,
  performSimpleHealthCheck,
} from "./lib/health-check";
import { dailyLogRouter } from "./routers/dailyLog";
import { filesRouter } from "./routers/files";
import { inspectionRouter } from "./routers/inspection";
import { manualsRouter } from "./routers/manuals";
import { monitoringRouter } from "./routers/monitoring";
import { technicalLibraryRouter } from "./routers/technicalLibrary";
import { todoRouter } from "./routers/todo";
import logixlysia from "logixlysia";

const app = new Elysia()
  // Log request origins
  .onRequest(({ request }) => {
    console.log(
      `🌐 ${request.method} ${request.url} Origin: ${request.headers.get("origin") || "none"}`
    );
  })
  // Security first
  .use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.iconify.design"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  )
  .use(
    cors({
      origin:
        process.env.CORS_ORIGIN ||
        (process.env.NODE_ENV === "development" ? "http://localhost:3001" : ""),
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  // Rate limiting and validation
  .use(createRateLimitMiddleware(100, 60_000)) // 100 requests per minute
  .use(createValidationMiddleware())
  .use(createGlobalErrorHandler())
  // Logging
  .use(
    logixlysia({
      config: {
        showStartupMessage: true,
        startupMessageFormat: "simple",
        timestamp: {
          translateTime: "yyyy-mm-dd HH:MM:ss",
        },
        ip: true,
        logFilePath: "./logs/server.log",
        customLogFormat:
          "🚁 {now} {level} {duration} {method} {pathname} {status} {message} {ip} {epoch}",
        logFilter: {
          level: ["ERROR", "WARNING", "INFO"],
          status: [500, 404],
          method: "GET",
        },
      },
    })
  )
  // OpenAPI documentation
  .use(
    openapi({
      references: fromTypes(
        process.env.NODE_ENV === "production"
          ? "dist/index.d.ts"
          : "src/index.ts"
      ),
      path: "/docs",
      documentation: {
        info: {
          title: "Heli API",
          version: "1.0.0",
          description:
            "API documentation for Heli application including Better Auth endpoints",
        },
        servers: [
          {
            url: "http://localhost:3000",
            description: "Local Development",
          },
        ],
        tags: [
          {
            name: "Health",
            description: "Health check and monitoring endpoints",
          },
          { name: "Todos", description: "Todo management endpoints" },
          {
            name: "Monitoring",
            description: "Monitoring charts and analytics endpoints",
          },
          {
            name: "Manuals",
            description: "Company manual management endpoints",
          },
          {
            name: "Files",
            description: "File upload, download, and management endpoints",
          },
          {
            name: "Daily Logs",
            description: "Aircraft daily log management endpoints",
          },
          {
            name: "Inspections",
            description: "Out-of-phase inspection management endpoints",
          },
          {
            name: "Technical Library",
            description: "Technical library file management endpoints",
          },
          {
            name: "Auth",
            description: "Authentication and authorization endpoints",
          },
        ],
        components: await OpenAPI.components,
        paths: await OpenAPI.getPaths(),
      },
    })
  )

  .group("/server", (app) =>
    app
      .use(authPlugin)
      .use(todoRouter)
      .use(monitoringRouter)
      .use(manualsRouter)
      .use(filesRouter)
      .use(dailyLogRouter)
      .use(inspectionRouter)
      .use(technicalLibraryRouter)
  )
  // Static files (after API routes to avoid conflicts)
  // .use(
  //   staticPlugin({
  //     assets: "../web/.output/public",
  //     prefix: "/",
  //     staticLimit: 1024 * 1024 * 10, // 10MB
  //   })
  // )
  .get(
    "/health",
    async ({ set }) => {
      const health = await performHealthCheck();

      // Set appropriate status code based on health
      if (health.status === "unhealthy") {
        set.status = 503; // Service Unavailable
      } else if (health.status === "degraded") {
        set.status = 200; // OK but with warnings
      } else {
        set.status = 200; // OK
      }

      return health;
    },
    {
      detail: {
        tags: ["Health"],
        summary: "Comprehensive health check",
        description: "Check the health status of all services and dependencies",
      },
    }
  )
  .get(
    "/health/simple",
    async ({ set }) => {
      const health = await performSimpleHealthCheck();

      if (health.status === "error") {
        set.status = 503;
      }

      return health;
    },
    {
      detail: {
        tags: ["Health"],
        summary: "Simple health check",
        description: "Basic health check for load balancers",
      },
    }
  )
  .get("/", () => ({
    message: "Heli API Server",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  }))
  .listen(3000, () => {});

export type App = typeof app;
