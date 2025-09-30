import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, openAPI } from "better-auth/plugins";
import { Elysia } from "elysia";
import { db } from "../db";
import {
  checkAccess,
  autoAccessControl,
  type AccessContext,
  type UserRole,
  type ResourceType,
  type Operation,
} from "./access-control";

export const auth = betterAuth({
  basePath: "/server/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  trustedOrigins: [
    process.env.CORS_ORIGIN ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3001" : ""),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [
    admin(),
    openAPI({
      path: "/docs",
    }),
  ],
});

export const authPlugin = new Elysia({ name: "auth" })
  .mount(auth.handler)
  .decorate("getAuth", async (headers: Headers) => {
    const session = await auth.api.getSession({ headers });
    return session;
  })
  .macro({
    auth: {
      async resolve({ status, request, getAuth }) {
        const session = await getAuth(request.headers);
        if (!session) {
          return status(401);
        }

        // Apply automatic access control by default
        const accessResult = autoAccessControl({
          user: {
            id: session.user.id,
            role: (session.user.role as UserRole) || "user",
          },
          request: {
            method: request.method,
            url: request.url,
          },
        });

        if (!accessResult.hasAccess) {
          return status(403, { error: accessResult.error || "Access denied" });
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>;
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema());

export const OpenAPI = {
  getPaths: (prefix = "/server/auth") =>
    getSchema().then(({ paths }) => {
      const reference: typeof paths = Object.create(null);

      for (const path of Object.keys(paths)) {
        const key = prefix + path;
        reference[key] = paths[path];

        for (const method of Object.keys(paths[path])) {
          const operation = (reference[key] as any)[method];
          operation.tags = ["Better Auth"];
        }
      }

      return reference;
    }) as Promise<any>,
  components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;
