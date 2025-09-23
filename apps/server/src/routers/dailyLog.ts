import { Elysia, t } from "elysia";
import { eq, and, desc, count, gte, lte, like, sql } from "drizzle-orm";
import { db } from "../db";
import { dailyLog } from "../db/schema/dailyLog";
import { commonErrors } from "../lib/error-handler";
import { authPlugin } from "../lib/auth";
import { buildSearchConditions, buildDateRangeConditions } from "../lib/query-optimizer";

export const dailyLogRouter = new Elysia({ 
	prefix: "/daily-logs",
	detail: {
		tags: ["Daily Logs"]
	}
})
	.use(authPlugin)
	.get("/", async ({ query, user, session }) => {
		const { tlpNo, dateFrom, dateTo, page = 1, pageSize = 10 } = query;

		// Build optimized where conditions
		const whereConditions = [eq(dailyLog.organizationId, session.activeOrganizationId || 'default')];
		
		// Add search conditions
		if (tlpNo) {
			whereConditions.push(...buildSearchConditions(['tlp_no'], tlpNo));
		}
		
		// Add date range conditions
		whereConditions.push(...buildDateRangeConditions('record_date', dateFrom, dateTo));

		// Optimized single query with window function
		const logs = await db
			.select({
				id: dailyLog.id,
				recordDate: dailyLog.recordDate,
				tlpNo: dailyLog.tlpNo,
				hoursFlownAirframe: dailyLog.hoursFlownAirframe,
				hoursFlownEngine: dailyLog.hoursFlownEngine,
				landings: dailyLog.landings,
				tc: dailyLog.tc,
				noOfStarts: dailyLog.noOfStarts,
				ggCycle: dailyLog.ggCycle,
				ftCycle: dailyLog.ftCycle,
				usage: dailyLog.usage,
				totalAirframeHr: dailyLog.totalAirframeHr,
				totalEngineHrTsn: dailyLog.totalEngineHrTsn,
				totalLandings: dailyLog.totalLandings,
				totalTc: dailyLog.totalTc,
				totalNoOfStarts: dailyLog.totalNoOfStarts,
				totalGgCycleTsn: dailyLog.totalGgCycleTsn,
				totalFtCycleTsn: dailyLog.totalFtCycleTsn,
				remarks: dailyLog.remarks,
				organizationId: dailyLog.organizationId,
				createdBy: dailyLog.createdBy,
				status: dailyLog.status,
				createdAt: dailyLog.createdAt,
				updatedAt: dailyLog.updatedAt,
				totalCount: sql<number>`count(*) over()`
			})
			.from(dailyLog)
			.where(and(...whereConditions))
			.orderBy(desc(dailyLog.recordDate), desc(dailyLog.createdAt))
			.limit(parseInt(pageSize.toString()))
			.offset((parseInt(page.toString()) - 1) * parseInt(pageSize.toString()));

		const totalCount = logs.length > 0 ? Number(logs[0].totalCount) : 0;
		const totalPages = Math.ceil(totalCount / parseInt(pageSize.toString()));

		// Remove totalCount from data
		const cleanLogs = logs.map(({ totalCount, ...log }) => log);

		return {
			success: true,
			list: cleanLogs,
			totalCount,
			totalPages
		};
	}, {
		auth: true,
		query: t.Object({
			tlpNo: t.Optional(t.String()),
			dateFrom: t.Optional(t.String()),
			dateTo: t.Optional(t.String()),
			page: t.Optional(t.Numeric()),
			pageSize: t.Optional(t.Numeric())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				list: t.Array(t.Object({
					id: t.Number(),
					recordDate: t.String(),
					tlpNo: t.String(),
					hoursFlownAirframe: t.Union([t.String(), t.Null()]),
					hoursFlownEngine: t.Union([t.String(), t.Null()]),
					landings: t.Union([t.Number(), t.Null()]),
					tc: t.Union([t.Number(), t.Null()]),
					noOfStarts: t.Union([t.Number(), t.Null()]),
					ggCycle: t.Union([t.Number(), t.Null()]),
					ftCycle: t.Union([t.Number(), t.Null()]),
					usage: t.Union([t.String(), t.Null()]),
					totalAirframeHr: t.Union([t.String(), t.Null()]),
					totalEngineHrTsn: t.Union([t.String(), t.Null()]),
					totalLandings: t.Union([t.Number(), t.Null()]),
					totalTc: t.Union([t.Number(), t.Null()]),
					totalNoOfStarts: t.Union([t.Number(), t.Null()]),
					totalGgCycleTsn: t.Union([t.Number(), t.Null()]),
					totalFtCycleTsn: t.Union([t.Number(), t.Null()]),
					remarks: t.Union([t.String(), t.Null()]),
					organizationId: t.String(),
					createdBy: t.String(),
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
			summary: "Get daily logs",
			description: "Retrieve daily logs with filtering and pagination",
		}
	})
	.get("/:id", async ({ params, user, session }) => {
		const log = await db
			.select()
			.from(dailyLog)
			.where(
				and(
					eq(dailyLog.id, Number(params.id)),
					eq(dailyLog.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.limit(1);

		if (!log.length) {
			throw new Error("Daily log not found");
		}

		return {
			success: true,
			data: log[0]
		};
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		response: {
			200: t.Object({
				success: t.Boolean(),
				data: t.Object({
					id: t.Number(),
					recordDate: t.String(),
					tlpNo: t.String(),
					hoursFlownAirframe: t.Union([t.String(), t.Null()]),
					hoursFlownEngine: t.Union([t.String(), t.Null()]),
					landings: t.Union([t.Number(), t.Null()]),
					tc: t.Union([t.Number(), t.Null()]),
					noOfStarts: t.Union([t.Number(), t.Null()]),
					ggCycle: t.Union([t.Number(), t.Null()]),
					ftCycle: t.Union([t.Number(), t.Null()]),
					usage: t.Union([t.String(), t.Null()]),
					totalAirframeHr: t.Union([t.String(), t.Null()]),
					totalEngineHrTsn: t.Union([t.String(), t.Null()]),
					totalLandings: t.Union([t.Number(), t.Null()]),
					totalTc: t.Union([t.Number(), t.Null()]),
					totalNoOfStarts: t.Union([t.Number(), t.Null()]),
					totalGgCycleTsn: t.Union([t.Number(), t.Null()]),
					totalFtCycleTsn: t.Union([t.Number(), t.Null()]),
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
			summary: "Get daily log by ID",
			description: "Retrieve a specific daily log by its ID",
		}
	})
	.post("/", async ({ body, user, session }) => {
		const created = await db
			.insert(dailyLog)
			.values({
				recordDate: body.recordDate,
				tlpNo: body.tlpNo,
				hoursFlownAirframe: body.hoursFlownAirframe,
				hoursFlownEngine: body.hoursFlownEngine,
				landings: body.landings,
				tc: body.tc,
				noOfStarts: body.noOfStarts,
				ggCycle: body.ggCycle,
				ftCycle: body.ftCycle,
				usage: body.usage,
				totalAirframeHr: body.totalAirframeHr,
				totalEngineHrTsn: body.totalEngineHrTsn,
				totalLandings: body.totalLandings,
				totalTc: body.totalTc,
				totalNoOfStarts: body.totalNoOfStarts,
				totalGgCycleTsn: body.totalGgCycleTsn,
				totalFtCycleTsn: body.totalFtCycleTsn,
				remarks: body.remarks,
				organizationId: session.activeOrganizationId || 'default',
				createdBy: user.id,
			})
			.returning();

		if (!created.length) {
			throw new Error("Failed to create daily log");
		}

		return {
			success: true,
			data: created[0]
		};
	}, {
		auth: true,
		body: t.Object({
			recordDate: t.String(),
			tlpNo: t.String(),
			hoursFlownAirframe: t.Optional(t.String()),
			hoursFlownEngine: t.Optional(t.String()),
			landings: t.Optional(t.Number()),
			tc: t.Optional(t.Number()),
			noOfStarts: t.Optional(t.Number()),
			ggCycle: t.Optional(t.Number()),
			ftCycle: t.Optional(t.Number()),
			usage: t.Optional(t.String()),
			totalAirframeHr: t.Optional(t.String()),
			totalEngineHrTsn: t.Optional(t.String()),
			totalLandings: t.Optional(t.Number()),
			totalTc: t.Optional(t.Number()),
			totalNoOfStarts: t.Optional(t.Number()),
			totalGgCycleTsn: t.Optional(t.Number()),
			totalFtCycleTsn: t.Optional(t.Number()),
			remarks: t.Optional(t.String())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				data: t.Object({
					id: t.Number(),
					recordDate: t.String(),
					tlpNo: t.String(),
					hoursFlownAirframe: t.Union([t.String(), t.Null()]),
					hoursFlownEngine: t.Union([t.String(), t.Null()]),
					landings: t.Union([t.Number(), t.Null()]),
					tc: t.Union([t.Number(), t.Null()]),
					noOfStarts: t.Union([t.Number(), t.Null()]),
					ggCycle: t.Union([t.Number(), t.Null()]),
					ftCycle: t.Union([t.Number(), t.Null()]),
					usage: t.Union([t.String(), t.Null()]),
					totalAirframeHr: t.Union([t.String(), t.Null()]),
					totalEngineHrTsn: t.Union([t.String(), t.Null()]),
					totalLandings: t.Union([t.Number(), t.Null()]),
					totalTc: t.Union([t.Number(), t.Null()]),
					totalNoOfStarts: t.Union([t.Number(), t.Null()]),
					totalGgCycleTsn: t.Union([t.Number(), t.Null()]),
					totalFtCycleTsn: t.Union([t.Number(), t.Null()]),
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
			summary: "Create daily log",
			description: "Create a new daily log entry",
		}
	})
	.put("/:id", async ({ params, body, user, session }) => {
		const updated = await db
			.update(dailyLog)
			.set({
				...body,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(dailyLog.id, Number(params.id)),
					eq(dailyLog.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.returning();

		if (!updated.length) {
			throw new Error("Failed to update daily log or log not found");
		}

		return {
			success: true,
			data: updated[0]
		};
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		body: t.Object({
			recordDate: t.Optional(t.String()),
			tlpNo: t.Optional(t.String()),
			hoursFlownAirframe: t.Optional(t.String()),
			hoursFlownEngine: t.Optional(t.String()),
			landings: t.Optional(t.Number()),
			tc: t.Optional(t.Number()),
			noOfStarts: t.Optional(t.Number()),
			ggCycle: t.Optional(t.Number()),
			ftCycle: t.Optional(t.Number()),
			usage: t.Optional(t.String()),
			totalAirframeHr: t.Optional(t.String()),
			totalEngineHrTsn: t.Optional(t.String()),
			totalLandings: t.Optional(t.Number()),
			totalTc: t.Optional(t.Number()),
			totalNoOfStarts: t.Optional(t.Number()),
			totalGgCycleTsn: t.Optional(t.Number()),
			totalFtCycleTsn: t.Optional(t.Number()),
			remarks: t.Optional(t.String())
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				data: t.Object({
					id: t.Number(),
					recordDate: t.String(),
					tlpNo: t.String(),
					hoursFlownAirframe: t.Union([t.String(), t.Null()]),
					hoursFlownEngine: t.Union([t.String(), t.Null()]),
					landings: t.Union([t.Number(), t.Null()]),
					tc: t.Union([t.Number(), t.Null()]),
					noOfStarts: t.Union([t.Number(), t.Null()]),
					ggCycle: t.Union([t.Number(), t.Null()]),
					ftCycle: t.Union([t.Number(), t.Null()]),
					usage: t.Union([t.String(), t.Null()]),
					totalAirframeHr: t.Union([t.String(), t.Null()]),
					totalEngineHrTsn: t.Union([t.String(), t.Null()]),
					totalLandings: t.Union([t.Number(), t.Null()]),
					totalTc: t.Union([t.Number(), t.Null()]),
					totalNoOfStarts: t.Union([t.Number(), t.Null()]),
					totalGgCycleTsn: t.Union([t.Number(), t.Null()]),
					totalFtCycleTsn: t.Union([t.Number(), t.Null()]),
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
			summary: "Update daily log",
			description: "Update an existing daily log entry",
		}
	})
	.delete("/:id", async ({ params, user, session }) => {
		const deleted = await db
			.delete(dailyLog)
			.where(
				and(
					eq(dailyLog.id, Number(params.id)),
					eq(dailyLog.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.returning();

		if (!deleted.length) {
			throw new Error("Failed to delete daily log or log not found");
		}

		return {
			success: true,
			message: "Daily log deleted successfully"
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
			summary: "Delete daily log",
			description: "Delete a daily log entry by its ID",
		}
	});
