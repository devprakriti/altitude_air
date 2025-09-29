import { and, desc, eq, like } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { companyManuals } from "../db/schema/rbac";
import { authPlugin } from "../lib/auth";
import { commonErrors } from "../lib/error-handler";

export const manualsRouter = new Elysia({
  prefix: "/manuals",
  detail: {
    tags: ["Manuals"],
  },
})
  .use(authPlugin)
  .post(
    "/",
    async ({ body, user }) => {
      const result = await db
        .insert(companyManuals)
        .values({
        title: body.title,
        description: body.description,
        filePath: body.filePath,
        fileType: body.fileType,
        fileSize: body.fileSize,
        uploadedBy: user.id,
        })
        .returning();

      return result[0];
    },
    {
      auth: true,
      body: t.Object({
        title: t.String(),
        description: t.Optional(t.String()),
        filePath: t.String(),
        fileType: t.String(),
        fileSize: t.Optional(t.Number()),
      }),
      response: {
        200: t.Object({
            id: t.Number(),
            title: t.String(),
            description: t.Union([t.String(), t.Null()]),
            filePath: t.String(),
            fileType: t.String(),
            fileSize: t.Union([t.Number(), t.Null()]),
            uploadedBy: t.String(),
            status: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Create a company manual",
        description: "Create a new company manual",
      },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const { page = 1, pageSize = 10, search } = query;
      const limit = Number.parseInt(pageSize.toString(), 10);
      const offset = (Number.parseInt(page.toString(), 10) - 1) * limit;

      const whereConditions = [eq(companyManuals.status, true)];

      if (search) {
        whereConditions.push(like(companyManuals.title, `%${search}%`));
      }

      const manuals = await db
        .select()
        .from(companyManuals)
        .where(and(...whereConditions))
        .orderBy(desc(companyManuals.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        manuals,
        page: Number.parseInt(page.toString(), 10),
        pageSize: limit,
        total: manuals.length,
      };
    },
    {
      auth: true,
      query: t.Object({
        page: t.Optional(t.Numeric()),
        pageSize: t.Optional(t.Numeric()),
        search: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          manuals: t.Array(
            t.Object({
              id: t.Number(),
              title: t.String(),
              description: t.Union([t.String(), t.Null()]),
              filePath: t.String(),
              fileType: t.String(),
              fileSize: t.Union([t.Number(), t.Null()]),
              uploadedBy: t.String(),
              status: t.Boolean(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            })
          ),
          page: t.Number(),
          pageSize: t.Number(),
          total: t.Number(),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Get company manuals",
        description: "Retrieve company manuals with pagination and search",
      },
    }
  )
  .get(
    "/:id",
    async ({ params }) => {
      const manual = await db
        .select()
        .from(companyManuals)
        .where(eq(companyManuals.id, Number(params.id)))
        .limit(1);

      if (!manual.length) {
        throw new Error("Manual not found");
      }

      return manual[0];
    },
    {
      auth: true,
      params: t.Object({ id: t.Numeric() }),
      response: {
        200: t.Object({
          id: t.Number(),
          title: t.String(),
          description: t.Union([t.String(), t.Null()]),
          filePath: t.String(),
          fileType: t.String(),
          fileSize: t.Union([t.Number(), t.Null()]),
          uploadedBy: t.String(),
          status: t.Boolean(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Get a company manual",
        description: "Get a specific company manual by ID",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body }) => {
      const updated = await db
        .update(companyManuals)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(companyManuals.id, Number(params.id)))
        .returning();

      if (!updated.length) {
        throw new Error("Manual not found or failed to update");
      }

      return updated[0];
    },
    {
      auth: true,
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        filePath: t.Optional(t.String()),
        fileType: t.Optional(t.String()),
        fileSize: t.Optional(t.Number()),
      }),
      response: {
        200: t.Object({
            id: t.Number(),
            title: t.String(),
            description: t.Union([t.String(), t.Null()]),
            filePath: t.String(),
            fileType: t.String(),
            fileSize: t.Union([t.Number(), t.Null()]),
            uploadedBy: t.String(),
            status: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Update a company manual",
        description: "Update an existing company manual",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      const deleted = await db
        .update(companyManuals)
        .set({ status: false, updatedAt: new Date() })
        .where(eq(companyManuals.id, Number(params.id)))
        .returning();

      if (!deleted.length) {
        throw new Error("Manual not found or failed to delete");
      }

      return { success: true, message: "Manual deleted successfully" };
    },
    {
      auth: true,
      params: t.Object({ id: t.Numeric() }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Delete a company manual",
        description: "Soft delete a company manual by ID",
      },
    }
  );