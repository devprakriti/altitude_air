import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { openapi } from '@elysiajs/openapi'
import { auth, OpenAPI } from "./lib/auth";
import { todoRouter } from "./routers/todo";
import { monitoringRouter } from "./routers/monitoring";
import { manualsRouter } from "./routers/manuals";
import { allModels } from "./models";
import logixlysia from 'logixlysia'

// Better Auth middleware for authentication
const betterAuth = new Elysia({ name: 'better-auth' })
    .mount(auth.handler)
    .macro({
        auth: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({
                    headers
                })

                if (!session) return status(401)

                return {
                    user: session.user,
                    session: session.session
                }
            }
        }
    })

const app = new Elysia()
  .model(allModels)
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .use(logixlysia(
    {
      config: {
        showStartupMessage: true,
        startupMessageFormat: "banner",
        timestamp: {
          translateTime: "yyyy-mm-dd HH:MM:ss",
        },
        logFilePath: "./logs/app.log",
        logRotation: {
          maxSize: 10,
          compress: true,
        },
        ip: true,
      }
    }
  ))
  .use(betterAuth)
  .use(openapi({
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
        { name: "Auth", description: "Authentication and authorization endpoints" },
      ],
		components: await OpenAPI.components,
        paths: await OpenAPI.getPaths(),
    }
  }))

  .use(todoRouter)
  .use(monitoringRouter)
  .use(manualsRouter)
  // Health check endpoints
  .get("/health", () => "OK", {
    detail: {
      summary: "Health check endpoint",
      description: "Returns OK if the server is running",
      tags: ["Health"]
    }
  })
  .get("/metrics", () => ({
    uptime: process.uptime(),
  }), {
    detail: {
      summary: "Server metrics",
      description: "Returns server uptime and performance metrics",
      tags: ["Health"]
    }
  })
  .get("/", () => "OK", {
    detail: {
      summary: "Root endpoint",
      description: "Returns OK if the server is running",
      tags: ["Health"]
    }
  })
  .listen(3000, () => {
    console.log(`Let's go! 🚁`);
  });

export type App = typeof app; 