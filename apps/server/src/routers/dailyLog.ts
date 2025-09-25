import { Elysia, t } from "elysia";
import { eq, and, desc, count, gte, lte, like, sql, sum, gt } from "drizzle-orm";
import { db } from "../db";
import { dailyLog } from "../db/schema/dailyLog";
import { commonErrors } from "../lib/error-handler";
import { authPlugin } from "../lib/auth";
import { buildSearchConditions, buildDateRangeConditions } from "../lib/query-optimizer";

// Helper function to convert HH:MM to decimal hours
function timeToDecimal(timeStr: string): number {
	if (!timeStr) return 0;
	const [hours, minutes] = timeStr.split(':').map(Number);
	return hours + (minutes / 60);
}

// Helper function to calculate totals for a given TLP and date
async function calculateTotals(tlpNo: string, recordDate: string, organizationId: string) {
	// Get all logs for this TLP up to and including the record date
	const previousLogs = await db
		.select({
			hoursFlownAirframe: dailyLog.hoursFlownAirframe,
			hoursFlownEngine: dailyLog.hoursFlownEngine,
			landings: dailyLog.landings,
			tc: dailyLog.tc,
			noOfStarts: dailyLog.noOfStarts,
			ggCycle: dailyLog.ggCycle,
			ftCycle: dailyLog.ftCycle,
		})
		.from(dailyLog)
		.where(
			and(
				eq(dailyLog.tlpNo, tlpNo),
				eq(dailyLog.organizationId, organizationId),
				lte(dailyLog.recordDate, recordDate),
				eq(dailyLog.status, true)
			)
		)
		.orderBy(dailyLog.recordDate);

	// Calculate totals
	let totalAirframeHr = 0;
	let totalEngineHrTsn = 0;
	let totalLandings = 0;
	let totalTc = 0;
	let totalNoOfStarts = 0;
	let totalGgCycleTsn = 0;
	let totalFtCycleTsn = 0;

	for (const log of previousLogs) {
		if (log.hoursFlownAirframe) {
			totalAirframeHr += timeToDecimal(log.hoursFlownAirframe);
		}
		if (log.hoursFlownEngine) {
			totalEngineHrTsn += timeToDecimal(log.hoursFlownEngine);
		}
		if (log.landings) {
			totalLandings += log.landings;
		}
		if (log.tc) {
			totalTc += log.tc;
		}
		if (log.noOfStarts) {
			totalNoOfStarts += log.noOfStarts;
		}
		if (log.ggCycle) {
			totalGgCycleTsn += log.ggCycle;
		}
		if (log.ftCycle) {
			totalFtCycleTsn += log.ftCycle;
		}
	}

	return {
		totalAirframeHr: totalAirframeHr.toFixed(2),
		totalEngineHrTsn: totalEngineHrTsn.toFixed(2),
		totalLandings,
		totalTc,
		totalNoOfStarts,
		totalGgCycleTsn,
		totalFtCycleTsn,
	};
}

// Helper function to recalculate totals for all logs after a given date for a specific TLP
async function recalculateTotalsAfterDate(tlpNo: string, recordDate: string, organizationId: string) {
	// Get all logs for this TLP after the given date
	const subsequentLogs = await db
		.select({ id: dailyLog.id, recordDate: dailyLog.recordDate })
		.from(dailyLog)
		.where(
			and(
				eq(dailyLog.tlpNo, tlpNo),
				eq(dailyLog.organizationId, organizationId),
				gt(dailyLog.recordDate, recordDate),
				eq(dailyLog.status, true)
			)
		)
		.orderBy(dailyLog.recordDate);

	// Recalculate totals for each subsequent log
	for (const log of subsequentLogs) {
		const totals = await calculateTotals(tlpNo, log.recordDate, organizationId);
		
		await db
			.update(dailyLog)
			.set({
				totalAirframeHr: totals.totalAirframeHr,
				totalEngineHrTsn: totals.totalEngineHrTsn,
				totalLandings: totals.totalLandings,
				totalTc: totals.totalTc,
				totalNoOfStarts: totals.totalNoOfStarts,
				totalGgCycleTsn: totals.totalGgCycleTsn,
				totalFtCycleTsn: totals.totalFtCycleTsn,
				updatedAt: new Date()
			})
			.where(eq(dailyLog.id, log.id));
	}
}

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
		// Calculate totals based on previous logs
		const totals = await calculateTotals(
			body.tlpNo,
			body.recordDate,
			session.activeOrganizationId || 'default'
		);

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
				totalAirframeHr: totals.totalAirframeHr,
				totalEngineHrTsn: totals.totalEngineHrTsn,
				totalLandings: totals.totalLandings,
				totalTc: totals.totalTc,
				totalNoOfStarts: totals.totalNoOfStarts,
				totalGgCycleTsn: totals.totalGgCycleTsn,
				totalFtCycleTsn: totals.totalFtCycleTsn,
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
		// Get the existing log to determine TLP and date for recalculation
		const existingLog = await db
			.select({ tlpNo: dailyLog.tlpNo, recordDate: dailyLog.recordDate })
			.from(dailyLog)
			.where(
				and(
					eq(dailyLog.id, Number(params.id)),
					eq(dailyLog.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.limit(1);

		if (!existingLog.length) {
			throw new Error("Daily log not found");
		}

		// Use the TLP and date from the existing log or from the body if being updated
		const tlpNo = body.tlpNo || existingLog[0].tlpNo;
		const recordDate = body.recordDate || existingLog[0].recordDate;

		// Calculate totals based on the TLP and date
		const totals = await calculateTotals(
			tlpNo,
			recordDate,
			session.activeOrganizationId || 'default'
		);

		const updated = await db
			.update(dailyLog)
			.set({
				...body,
				totalAirframeHr: totals.totalAirframeHr,
				totalEngineHrTsn: totals.totalEngineHrTsn,
				totalLandings: totals.totalLandings,
				totalTc: totals.totalTc,
				totalNoOfStarts: totals.totalNoOfStarts,
				totalGgCycleTsn: totals.totalGgCycleTsn,
				totalFtCycleTsn: totals.totalFtCycleTsn,
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

		// Recalculate totals for all subsequent logs if date or TLP changed
		if (body.recordDate || body.tlpNo) {
			await recalculateTotalsAfterDate(tlpNo, recordDate, session.activeOrganizationId || 'default');
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
		// Get the log details before deleting to recalculate subsequent logs
		const logToDelete = await db
			.select({ tlpNo: dailyLog.tlpNo, recordDate: dailyLog.recordDate })
			.from(dailyLog)
			.where(
				and(
					eq(dailyLog.id, Number(params.id)),
					eq(dailyLog.organizationId, session.activeOrganizationId || 'default')
				)
			)
			.limit(1);

		if (!logToDelete.length) {
			throw new Error("Daily log not found");
		}

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

		// Recalculate totals for all subsequent logs
		await recalculateTotalsAfterDate(
			logToDelete[0].tlpNo,
			logToDelete[0].recordDate,
			session.activeOrganizationId || 'default'
		);

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
