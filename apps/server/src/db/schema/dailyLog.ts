import { pgTable, serial, text, timestamp, boolean, integer, decimal, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Daily Log table for aircraft monitoring
export const dailyLog = pgTable("daily_log", {
	id: serial("id").primaryKey(),
	recordDate: date("record_date").notNull(),
	tlpNo: text("tlp_no").notNull(), // Tail Number or Aircraft ID
	hoursFlownAirframe: decimal("hours_flown_airframe", { precision: 10, scale: 2 }),
	hoursFlownEngine: decimal("hours_flown_engine", { precision: 10, scale: 2 }),
	landings: integer("landings"),
	tc: integer("tc"), // Total Cycles
	noOfStarts: integer("no_of_starts"),
	ggCycle: integer("gg_cycle"), // Gas Generator Cycles
	ftCycle: integer("ft_cycle"), // Free Turbine Cycles
	usage: text("usage"), // Flight purpose/usage
	totalAirframeHr: decimal("total_airframe_hr", { precision: 10, scale: 2 }),
	totalEngineHrTsn: decimal("total_engine_hr_tsn", { precision: 10, scale: 2 }),
	totalLandings: integer("total_landings"),
	totalTc: integer("total_tc"),
	totalNoOfStarts: integer("total_no_of_starts"),
	totalGgCycleTsn: integer("total_gg_cycle_tsn"),
	totalFtCycleTsn: integer("total_ft_cycle_tsn"),
	remarks: text("remarks"),
	organizationId: text("organization_id").notNull(), // References Better Auth organization
	createdBy: text("created_by").notNull(), // User who created the record
	status: boolean("status").notNull().default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const dailyLogRelations = relations(dailyLog, ({ one }) => ({
	// Organization relationship is handled by Better Auth
}));
