import { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { admin } from "better-auth/plugins";
import { openAPI } from "better-auth/plugins";
import { db } from "../db";

export const auth = betterAuth({
	basePath: "/auth",
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	trustedOrigins: [process.env.CORS_ORIGIN || ""],
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
		organization({
			allowUserToCreateOrganization: true,
			allowUserToCreateRole: true,
		}),
		admin(),
		openAPI(),
	],
});

export const authPlugin = new Elysia({ name: 'auth' })
	.mount(auth.handler)
	.decorate('getAuth', async (headers: Headers) => {
		const session = await auth.api.getSession({ headers });
		return session;
	})
	.macro({
		auth: {
			async resolve({ status, request: { headers }, getAuth }) {
				const session = await getAuth(headers);
				if (!session) return status(401);
				return {
					user: session.user,
					session: session.session,
				};
			},
		},
		admin: {
			async resolve({ status, request: { headers }, getAuth }) {
				const session = await getAuth(headers);
				if (!session) return status(401);
				if (session.user.role !== "admin") return status(403);
				return {
					user: session.user,
					session: session.session,
				};
			},
		},
	});

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema())

export const OpenAPI = {
    getPaths: (prefix = '/auth') =>
        getSchema().then(({ paths }) => {
            const reference: typeof paths = Object.create(null)

            for (const path of Object.keys(paths)) {
                const key = prefix + path
                reference[key] = paths[path]

                for (const method of Object.keys(paths[path])) {
                    const operation = (reference[key] as any)[method]
                    operation.tags = ['Better Auth']
                }
            }

            return reference
        }) as Promise<any>,
    components: getSchema().then(({ components }) => components) as Promise<any>
} as const