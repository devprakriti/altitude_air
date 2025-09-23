import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { openapi } from '@elysiajs/openapi'
import { OpenAPI, authPlugin } from "./lib/auth";
import { todoRouter } from "./routers/todo";
import { monitoringRouter } from "./routers/monitoring";
import { manualsRouter } from "./routers/manuals";
import { filesRouter } from "./routers/files";
import { dailyLogRouter } from "./routers/dailyLog";
import { inspectionRouter } from "./routers/inspection";
import { fromTypes } from '@elysiajs/openapi/gen'
import { helmet } from 'elysia-helmet';

const app = new Elysia()
  .use(cors({
    origin: process.env.CORS_ORIGIN || "",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }))
  .use(openapi({
    references: fromTypes(
      process.env.NODE_ENV === 'production'
        ? 'dist/index.d.ts'
        : 'src/index.ts'
    ),
    documentation: {
      info: {
        title: "Heli API",
        version: "1.0.0",
        description: "API documentation for Heli application including Better Auth endpoints",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local Development",
        },
      ],
      tags: [
        { name: "Health", description: "Health check and monitoring endpoints" },
        { name: "Todos", description: "Todo management endpoints" },
        { name: "Monitoring", description: "Monitoring charts and analytics endpoints" },
        { name: "Manuals", description: "Company manual management endpoints" },
        { name: "Files", description: "File upload, download, and management endpoints" },
        { name: "Daily Logs", description: "Aircraft daily log management endpoints" },
        { name: "Inspections", description: "Out-of-phase inspection management endpoints" },
        { name: "Auth", description: "Authentication and authorization endpoints" },
      ],
      components: await OpenAPI.components,
      paths: await OpenAPI.getPaths(),
    }
  }))
  .use(helmet())
  .use(authPlugin)
  .use(todoRouter)
  .use(monitoringRouter)
  .use(manualsRouter)
  .use(filesRouter)
  .use(dailyLogRouter)
  .use(inspectionRouter)
  .get("/health", () => "OK")
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log(`Let's go! 🚁`);
  });

export type App = typeof app; 