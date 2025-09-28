import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Aircraft Maintenance Program table
export const aircraftMaintenanceProgram = pgTable(
  "aircraft_maintenance_program",
  {
    id: serial("id").primaryKey(),
    aircraftId: text("aircraft_id").notNull(), // Aircraft identifier
    programName: text("program_name").notNull(),
    description: text("description"),
    organizationId: text("organization_id").notNull(), // References Better Auth organization
    status: boolean("status").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// Out of Phase Inspection table
export const outOfPhaseInspection = pgTable("out_of_phase_inspection", {
  id: serial("id").primaryKey(),
  programId: integer("program_id")
    .notNull()
    .references(() => aircraftMaintenanceProgram.id),
  sn: integer("sn").notNull(), // Serial Number
  inspection: text("inspection").notNull(), // Inspection type/name
  intervalText: text("interval_text"), // Human readable interval
  intervalValue: integer("interval_value"), // Numeric interval value
  intervalUnit: text("interval_unit"), // Hours, Days, Months, Years
  inspectionCoDate: date("inspection_co_date"), // Inspection completed date
  inspectionCoHrs: decimal("inspection_co_hrs", { precision: 10, scale: 2 }), // Hours when completed
  inspectionDueDate: date("inspection_due_date"), // Next due date
  inspectionDueHrs: decimal("inspection_due_hrs", { precision: 10, scale: 2 }), // Hours when due
  daysRemaining: integer("days_remaining"), // Days until due
  hoursRemaining: decimal("hours_remaining", { precision: 10, scale: 2 }), // Hours until due
  remarks: text("remarks"),
  organizationId: text("organization_id").notNull(), // References Better Auth organization
  createdBy: text("created_by").notNull(), // User who created the record
  status: boolean("status").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const aircraftMaintenanceProgramRelations = relations(
  aircraftMaintenanceProgram,
  ({ many }) => ({
    outOfPhaseInspections: many(outOfPhaseInspection),
  })
);

export const outOfPhaseInspectionRelations = relations(
  outOfPhaseInspection,
  ({ one }) => ({
    program: one(aircraftMaintenanceProgram, {
      fields: [outOfPhaseInspection.programId],
      references: [aircraftMaintenanceProgram.id],
    }),
  })
);
