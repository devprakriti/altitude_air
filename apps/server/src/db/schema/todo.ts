import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const todo = pgTable("todo", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false).notNull(),
  user: text("user").references(() => user.id),
});
