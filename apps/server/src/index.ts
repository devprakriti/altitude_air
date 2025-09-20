import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { openapi } from '@elysiajs/openapi'
import { auth, OpenAPI } from "./lib/auth";
import { todoRouter } from "./routers/todo";
import { monitoringRouter } from "./routers/monitoring";
import { manualsRouter } from "./routers/manuals";
import { fromTypes } from '@elysiajs/openapi/gen'
import { helmet } from 'elysia-helmet';

// Auth middleware with macros for easy usage
const authMiddleware = new Elysia({ name: 'auth' })
    .mount(auth.handler)
    .macro({
        auth: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({ headers })
                if (!session) return status(401, { error: "Unauthorized", message: "Authentication required" })
                return { user: session.user, session: session.session }
            }
        },
        admin: {
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({ headers })
                if (!session) return status(401, { error: "Unauthorized", message: "Authentication required" })
                if (session.user.role !== "admin") return status(403, { error: "Forbidden", message: "Admin access required" })
                return { user: session.user, session: session.session }
            }
        }
    })

const app = new Elysia()
  .use(cors({
    origin: process.env.CORS_ORIGIN || "",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }))
  .use(helmet())
  .use(authMiddleware)
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
        { name: "Auth", description: "Authentication and authorization endpoints" },
      ],
      components: await OpenAPI.components,
      paths: await OpenAPI.getPaths(),
    }
  }))
  .use(todoRouter)
  .use(monitoringRouter)
  .use(manualsRouter)
  .get("/health", () => "OK")
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log(`Let's go! 🚁`);
  });

export type App = typeof app; 