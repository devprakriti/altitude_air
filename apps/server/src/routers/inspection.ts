import { Elysia, t } from "elysia";
import { eq, and, desc, count, gte, lte, like } from "drizzle-orm";
import { db } from "../db";
import { outOfPhaseInspection, aircraftMaintenanceProgram } from "../db/schema/inspection";
import { commonErrors } from "../lib/error-handler";
import { authPlugin } from "../lib/auth";

export const inspectionRouter = new Elysia({ 
	prefix: "/inspections",
	detail: {
		tags: ["Inspections"]
	}
})
	.use(authPlugin)
	// Aircraft Maintenance Program endpoints
	.get("/programs", async ({ query, user, session }) => {
		const { page = 1, pageSize = 10, search } = query;
		const limit = parseInt(pageSize.toString());
		const offset = (parseInt(page.toString()) - 1) * limit;

		// Build where conditions
		const whereConditions = [eq(aircraftMaintenanceProgram.organizationId, session.activeOrganizationId || 'default')];
		
		if (search) {
			whereConditions.push(like(aircraftMaintenanceProgram.programName, `%${search}%`));
		}

		// Get total count
		const [totalCountResult] = await db
			.select({ count: count() })
			.from(aircraftMaintenanceProgram)
			.where(and(...whereConditions));
		
		const totalCount = totalCountResult.count;
		const totalPages = Math.ceil(totalCount / limit);

		// Get paginated results
		const programs = await db
			.select()
			.from(aircraftMaintenanceProgram)
			.where(and(...whereConditions))
			.orderBy(desc(aircraftMaintenanceProgram.createdAt))
			.limit(limit)
			.offset(offset);

		return {
			success: true,
			programs,
			totalCount,
			totalPages
		};
	}, {
		auth: true,
		query: t.Object({
			page: t.Optional(t.Numeric()),
			pageSize: t.Optional(t.Numeric()),
			search: t.Optional(t.String())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				programs: t.Array(t.Object({
					id: t.Number(),
					aircraftId: t.String(),
					programName: t.String(),
					description: t.Union([t.String(), t.Null()]),
					organizationId: t.String(),
					status: t.Boolean(),
					createdAt: t.Date(),
					updatedAt: t.Date()
				})),
				totalCount: t.Number(),
				totalPages: t.Number()
			}),
			...commonErrors
		},
		detail: {
			summary: "Get aircraft maintenance programs",
			description: "Retrieve aircraft maintenance programs with pagination and search",
		}
	})
	.post("/programs", async ({ body, user, session }) => {
		const created = await db
			.insert(aircraftMaintenanceProgram)
			.values({
				aircraftId: body.aircraftId,
				programName: body.programName,
				description: body.description,
				organizationId: session.activeOrganizationId || 'default',
			})
			.returning();

		if (!created.length) {
			throw new Error("Failed to create aircraft maintenance program");
		}

		return {
			success: true,
			program: created[0]
		};
	}, {
		auth: true,
		body: t.Object({
			aircraftId: t.String(),
			programName: t.String(),
			description: t.Optional(t.String())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				program: t.Object({
					id: t.Number(),
					aircraftId: t.String(),
					programName: t.String(),
					description: t.Union([t.String(), t.Null()]),
					organizationId: t.String(),
					status: t.Boolean(),
					createdAt: t.Date(),
					updatedAt: t.Date()
				})
			}),
			...commonErrors
		},
		detail: {
			summary: "Create aircraft maintenance program",
			description: "Create a new aircraft maintenance program",
		}
	})
	// Out of Phase Inspection endpoints
	.get("/", async ({ query, user, session }) => {
		const { programId, inspection, dateFrom, dateTo, page = 1, pageSize = 10 } = query;
		const limit = parseInt(pageSize.toString());
		const offset = (parseInt(page.toString()) - 1) * limit;

		// Build where conditions
		const whereConditions = [eq(outOfPhaseInspection.organizationId, session.activeOrganizationId || 'default')];
		
		if (programId) {
			whereConditions.push(eq(outOfPhaseInspection.programId, Number(programId)));
		}
		
		if (inspection) {
			whereConditions.push(like(outOfPhaseInspection.inspection, `%${inspection}%`));
		}
		
		if (dateFrom) {
			whereConditions.push(gte(outOfPhaseInspection.inspectionDueDate, dateFrom));
		}
		
		if (dateTo) {
			whereConditions.push(lte(outOfPhaseInspection.inspectionDueDate, dateTo));
		}

		// Get total count
		const [totalCountResult] = await db
			.select({ count: count() })
			.from(outOfPhaseInspection)
			.where(and(...whereConditions));
		
		const totalCount = totalCountResult.count;
		const totalPages = Math.ceil(totalCount / limit);

		// Get paginated results with program details
		const inspections = await db
			.select({
				inspection: outOfPhaseInspection,
				program: aircraftMaintenanceProgram
			})
			.from(outOfPhaseInspection)
			.leftJoin(aircraftMaintenanceProgram, eq(outOfPhaseInspection.programId, aircraftMaintenanceProgram.id))
			.where(and(...whereConditions))
			.orderBy(desc(outOfPhaseInspection.inspectionDueDate), desc(outOfPhaseInspection.createdAt))
			.limit(limit)
			.offset(offset);

		return {
			success: true,
			list: inspections,
			totalCount,
			totalPages
		};
	}, {
		auth: true,
		query: t.Object({
			programId: t.Optional(t.String()),
			inspection: t.Optional(t.String()),
			dateFrom: t.Optional(t.String()),
			dateTo: t.Optional(t.String()),
			page: t.Optional(t.Numeric()),
			pageSize: t.Optional(t.Numeric())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				list: t.Array(t.Object({
					inspection: t.Object({
						id: t.Number(),
						programId: t.Number(),
						sn: t.Number(),
						inspection: t.String(),
						intervalText: t.Union([t.String(), t.Null()]),
						intervalValue: t.Union([t.Number(), t.Null()]),
						intervalUnit: t.Union([t.String(), t.Null()]),
						inspectionCoDate: t.Union([t.String(), t.Null()]),
						inspectionCoHrs: t.Union([t.String(), t.Null()]),
						inspectionDueDate: t.Union([t.String(), t.Null()]),
						inspectionDueHrs: t.Union([t.String(), t.Null()]),
						daysRemaining: t.Union([t.Number(), t.Null()]),
						hoursRemaining: t.Union([t.String(), t.Null()]),
						remarks: t.Union([t.String(), t.Null()]),
						organizationId: t.String(),
						createdBy: t.String(),
						status: t.Boolean(),
						createdAt: t.Date(),
						updatedAt: t.Date()
					}),
					program: t.Union([t.Object({
						id: t.Number(),
						aircraftId: t.String(),
						programName: t.String(),
						description: t.Union([t.String(), t.Null()]),
						organizationId: t.String(),
						status: t.Boolean(),
						createdAt: t.Date(),
						updatedAt: t.Date()
					}), t.Null()])
				})),
				totalCount: t.Number(),
				totalPages: t.Number()
			}),
			...commonErrors
		},
		detail: {
			summary: "Get out-of-phase inspections",
			description: "Retrieve out-of-phase inspections with filtering and pagination",
		}
	})
	.get("/:id", async ({ params, user, session }) => {
		const inspection = await db
			.select({
				inspection: outOfPhaseInspection,
				program: aircraftMaintenanceProgram
			})
			.from(outOfPhaseInspection)
			.leftJoin(aircraftMaintenanceProgram, eq(outOfPhaseInspection.programId, aircraftMaintenanceProgram.id))
			.where(
				and(
					eq(outOfPhaseInspection.id, Number(params.id)),
					eq(outOfPhaseInspection.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.limit(1);

		if (!inspection.length) {
			throw new Error("Inspection not found");
		}

		return {
			success: true,
			data: inspection[0]
		};
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		response: {
			200: t.Object({
				success: t.Boolean(),
				data: t.Object({
					inspection: t.Object({
						id: t.Number(),
						programId: t.Number(),
						sn: t.Number(),
						inspection: t.String(),
						intervalText: t.Union([t.String(), t.Null()]),
						intervalValue: t.Union([t.Number(), t.Null()]),
						intervalUnit: t.Union([t.String(), t.Null()]),
						inspectionCoDate: t.Union([t.String(), t.Null()]),
						inspectionCoHrs: t.Union([t.String(), t.Null()]),
						inspectionDueDate: t.Union([t.String(), t.Null()]),
						inspectionDueHrs: t.Union([t.String(), t.Null()]),
						daysRemaining: t.Union([t.Number(), t.Null()]),
						hoursRemaining: t.Union([t.String(), t.Null()]),
						remarks: t.Union([t.String(), t.Null()]),
						organizationId: t.String(),
						createdBy: t.String(),
						status: t.Boolean(),
						createdAt: t.Date(),
						updatedAt: t.Date()
					}),
					program: t.Union([t.Object({
						id: t.Number(),
						aircraftId: t.String(),
						programName: t.String(),
						description: t.Union([t.String(), t.Null()]),
						organizationId: t.String(),
						status: t.Boolean(),
						createdAt: t.Date(),
						updatedAt: t.Date()
					}), t.Null()])
				})
			}),
			...commonErrors
		},
		detail: {
			summary: "Get inspection by ID",
			description: "Retrieve a specific inspection by its ID",
		}
	})
	.post("/", async ({ body, user, session }) => {
		const created = await db
			.insert(outOfPhaseInspection)
			.values({
				programId: body.programId,
				sn: body.sn,
				inspection: body.inspection,
				intervalText: body.intervalText,
				intervalValue: body.intervalValue,
				intervalUnit: body.intervalUnit,
				inspectionCoDate: body.inspectionCoDate,
				inspectionCoHrs: body.inspectionCoHrs,
				inspectionDueDate: body.inspectionDueDate,
				inspectionDueHrs: body.inspectionDueHrs,
				daysRemaining: body.daysRemaining,
				hoursRemaining: body.hoursRemaining,
				remarks: body.remarks,
				organizationId: session.activeOrganizationId || 'default',
				createdBy: user.id,
			})
			.returning();

		if (!created.length) {
			throw new Error("Failed to create inspection");
		}

		return {
			success: true,
			data: created[0]
		};
	}, {
		auth: true,
		body: t.Object({
			programId: t.Number(),
			sn: t.Number(),
			inspection: t.String(),
			intervalText: t.Optional(t.String()),
			intervalValue: t.Optional(t.Number()),
			intervalUnit: t.Optional(t.String()),
			inspectionCoDate: t.Optional(t.String()),
			inspectionCoHrs: t.Optional(t.String()),
			inspectionDueDate: t.Optional(t.String()),
			inspectionDueHrs: t.Optional(t.String()),
			daysRemaining: t.Optional(t.Number()),
			hoursRemaining: t.Optional(t.String()),
			remarks: t.Optional(t.String())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				data: t.Object({
					id: t.Number(),
					programId: t.Number(),
					sn: t.Number(),
					inspection: t.String(),
					intervalText: t.Union([t.String(), t.Null()]),
					intervalValue: t.Union([t.Number(), t.Null()]),
					intervalUnit: t.Union([t.String(), t.Null()]),
					inspectionCoDate: t.Union([t.String(), t.Null()]),
					inspectionCoHrs: t.Union([t.String(), t.Null()]),
					inspectionDueDate: t.Union([t.String(), t.Null()]),
					inspectionDueHrs: t.Union([t.String(), t.Null()]),
					daysRemaining: t.Union([t.Number(), t.Null()]),
					hoursRemaining: t.Union([t.String(), t.Null()]),
					remarks: t.Union([t.String(), t.Null()]),
					organizationId: t.String(),
					createdBy: t.String(),
					status: t.Boolean(),
					createdAt: t.Date(),
					updatedAt: t.Date()
				})
			}),
			...commonErrors
		},
		detail: {
			summary: "Create out-of-phase inspection",
			description: "Create a new out-of-phase inspection record",
		}
	})
	.put("/:id", async ({ params, body, user, session }) => {
		const updated = await db
			.update(outOfPhaseInspection)
			.set({
				...body,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(outOfPhaseInspection.id, Number(params.id)),
					eq(outOfPhaseInspection.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.returning();

		if (!updated.length) {
			throw new Error("Failed to update inspection or inspection not found");
		}

		return {
			success: true,
			data: updated[0]
		};
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		body: t.Object({
			programId: t.Optional(t.Number()),
			sn: t.Optional(t.Number()),
			inspection: t.Optional(t.String()),
			intervalText: t.Optional(t.String()),
			intervalValue: t.Optional(t.Number()),
			intervalUnit: t.Optional(t.String()),
			inspectionCoDate: t.Optional(t.String()),
			inspectionCoHrs: t.Optional(t.String()),
			inspectionDueDate: t.Optional(t.String()),
			inspectionDueHrs: t.Optional(t.String()),
			daysRemaining: t.Optional(t.Number()),
			hoursRemaining: t.Optional(t.String()),
			remarks: t.Optional(t.String())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				data: t.Object({
					id: t.Number(),
					programId: t.Number(),
					sn: t.Number(),
					inspection: t.String(),
					intervalText: t.Union([t.String(), t.Null()]),
					intervalValue: t.Union([t.Number(), t.Null()]),
					intervalUnit: t.Union([t.String(), t.Null()]),
					inspectionCoDate: t.Union([t.String(), t.Null()]),
					inspectionCoHrs: t.Union([t.String(), t.Null()]),
					inspectionDueDate: t.Union([t.String(), t.Null()]),
					inspectionDueHrs: t.Union([t.String(), t.Null()]),
					daysRemaining: t.Union([t.Number(), t.Null()]),
					hoursRemaining: t.Union([t.String(), t.Null()]),
					remarks: t.Union([t.String(), t.Null()]),
					organizationId: t.String(),
					createdBy: t.String(),
					status: t.Boolean(),
					createdAt: t.Date(),
					updatedAt: t.Date()
				})
			}),
			...commonErrors
		},
		detail: {
			summary: "Update out-of-phase inspection",
			description: "Update an existing out-of-phase inspection record",
		}
	})
	.delete("/:id", async ({ params, user, session }) => {
		const deleted = await db
			.delete(outOfPhaseInspection)
			.where(
				and(
					eq(outOfPhaseInspection.id, Number(params.id)),
					eq(outOfPhaseInspection.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.returning();

		if (!deleted.length) {
			throw new Error("Failed to delete inspection or inspection not found");
		}

		return {
			success: true,
			message: "Inspection deleted successfully"
		};
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		response: {
			200: t.Object({
				success: t.Boolean(),
				message: t.String()
			}),
			...commonErrors
		},
		detail: {
			summary: "Delete out-of-phase inspection",
			description: "Delete an out-of-phase inspection record by its ID",
		}
	});
