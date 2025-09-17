import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { todo } from "../db/schema/todo";
import { todoModels, commonModels } from "../models";

export const todoRouter = new Elysia({ 
	prefix: "/todos",
	detail: {
		tags: ["Todos"]
	}
})
	.get("/", async () => {
		return await db.select().from(todo);
	}, {
		response: {
			200: todoModels.TodoArray
		},
		detail: {
			summary: "Get all todos",
			description: "Retrieve a list of all todos in the system",
		}
	})
	.post("/", async ({ body }) => {
		const result = await db.insert(todo).values({
			text: body.text,
		}).returning();
		return result;
	}, {
		body: todoModels.CreateTodo,
		response: {
			200: todoModels.TodoArray,
			400: commonModels.Error
		},
		detail: {
			summary: "Create a new todo",
			description: "Create a new todo item with the provided text",
		}
	})
	.put("/:id/toggle", async ({ params, body }) => {
		const result = await db
			.update(todo)
			.set({ completed: body.completed })
			.where(eq(todo.id, Number(params.id)))
			.returning();
		return result;
	}, {
		params: t.Object({
			id: t.Numeric({ description: "Todo ID" })
		}, { description: "Todo identifier" }),
		body: t.Object({
			completed: t.Boolean({ description: "Todo completion status" })
		}, { description: "Todo completion status" }),
		response: {
			200: todoModels.TodoArray,
			404: commonModels.Error
		},
		detail: {
			summary: "Toggle todo completion status",
			description: "Update the completion status of a specific todo",
		}
	})
	.delete("/:id", async ({ params }) => {
		const result = await db.delete(todo).where(eq(todo.id, Number(params.id))).returning();
		return result;
	}, {
		params: t.Object({
			id: t.Numeric({ description: "Todo ID" })
		}, { description: "Todo identifier" }),
		response: {
			200: todoModels.TodoArray,
			404: commonModels.Error
		},
		detail: {
			summary: "Delete a todo",
				description: "Delete a specific todo by its ID",
				tags: ["Todos"]
		}
	});
