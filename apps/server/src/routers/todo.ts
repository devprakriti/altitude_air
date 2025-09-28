import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { todo } from "../db/schema/todo";
import { authPlugin } from "../lib/auth";
import { commonErrors } from "../lib/error-handler";

export const todoRouter = new Elysia({
  prefix: "/todos",
  detail: {
    tags: ["Todos"],
  },
})
  .use(authPlugin)
  .get(
    "/",
    async () => {
      return await db.select().from(todo);
    },
    {
      auth: true,
      response: {
        200: t.Array(
          t.Object({
            id: t.Number(),
            text: t.String(),
            completed: t.Boolean(),
          })
        ),
        ...commonErrors,
      },
      detail: {
        summary: "Get all todos",
        description:
          "Retrieve a list of all todos in the system. Requires authentication.",
      },
    }
  )
  .post(
    "/",
    async ({ body, user }) => {
      const result = await db
        .insert(todo)
        .values({ text: body.text, user: user.id })
        .returning();
      // ensure user is always string, never null
      return result.map(({ user, ...rest }) => ({
        ...rest,
        user: user ?? "",
      }));
    },
    {
      auth: true,
      body: t.Object({ text: t.String() }),
      response: {
        200: t.Array(
          t.Object({
            id: t.Number(),
            text: t.String(),
            completed: t.Boolean(),
            user: t.String(),
          })
        ),
        ...commonErrors,
      },
      detail: {
        summary: "Create a new todo",
        description:
          "Create a new todo item with the provided text. Requires authentication.",
      },
    }
  )
  .put(
    "/:id/toggle",
    async ({ params, body }) => {
      return await db
        .update(todo)
        .set({ completed: body.completed })
        .where(eq(todo.id, Number(params.id)))
        .returning();
    },
    {
      auth: true,
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({ completed: t.Boolean() }),
      response: {
        200: t.Array(
          t.Object({
            id: t.Number(),
            text: t.String(),
            completed: t.Boolean(),
          })
        ),
        ...commonErrors,
      },
      detail: {
        summary: "Toggle todo completion status",
        description:
          "Update the completion status of a specific todo. Requires authentication.",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      return await db
        .delete(todo)
        .where(eq(todo.id, Number(params.id)))
        .returning();
    },
    {
      admin: true,
      params: t.Object({ id: t.Numeric() }),
      response: {
        200: t.Array(
          t.Object({
            id: t.Number(),
            text: t.String(),
            completed: t.Boolean(),
          })
        ),
        ...commonErrors,
      },
      detail: {
        summary: "Delete a todo (Admin only)",
        description:
          "Delete a specific todo by its ID. Requires admin role only.",
      },
    }
  );
