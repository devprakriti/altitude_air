import { pgTable, text, timestamp, boolean, serial, integer, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Extended user profile table - extends Better Auth user with additional fields
export const userProfiles = pgTable("user_profiles", {
	userId: text("user_id").primaryKey(),
	fullName: text("full_name").notNull(),
	phone: text("phone"),
	status: boolean("status").notNull().default(true),
	lastLoginAt: timestamp("last_login_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Monitoring charts table - linked to organizations via Better Auth
export const monitoringCharts = pgTable("monitoring_charts", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	chartType: text("chart_type").notNull(),
	config: json("config").notNull(),
	organizationId: text("organization_id").notNull(), // References Better Auth organization
	status: boolean("status").notNull().default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Company manuals table - linked to organizations via Better Auth
export const companyManuals = pgTable("company_manuals", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	filePath: text("file_path").notNull(),
	fileType: text("file_type").notNull(),
	fileSize: integer("file_size"),
	organizationId: text("organization_id").notNull(), // References Better Auth organization
	uploadedBy: text("uploaded_by").notNull(),
	status: boolean("status").notNull().default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// System configuration table - linked to organizations via Better Auth
export const systemConfig = pgTable("system_config", {
	id: serial("id").primaryKey(),
	key: text("key").notNull().unique(),
	value: json("value").notNull(),
	description: text("description"),
	organizationId: text("organization_id"), // References Better Auth organization (nullable for global config)
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	// Better Auth handles the user relationship
}));

export const monitoringChartsRelations = relations(monitoringCharts, ({ one }) => ({
	// Organization relationship is handled by Better Auth
}));

export const companyManualsRelations = relations(companyManuals, ({ one }) => ({
	// Organization relationship is handled by Better Auth
}));

export const systemConfigRelations = relations(systemConfig, ({ one }) => ({
	// Organization relationship is handled by Better Auth
}));
