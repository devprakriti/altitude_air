import { and, desc, eq, gt, gte, like, lt, lte, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { dailyLog } from "../db/schema/dailyLog";
import { authPlugin } from "../lib/auth";
import { commonErrors } from "../lib/error-handler";
import {
  buildDateRangeConditions,
  buildSearchConditions,
} from "../lib/query-optimizer";

// Helper function to convert HH:MM to decimal hours
function timeToDecimal(timeStr: string): number {
  if (!timeStr) {
    return 0;
  }
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
}

// Helper function to calculate totals based on previous day's record
async function calculateTotals(
  recordDate: string,
  organizationId: string,
  currentLogData?: any
) {
  // Find the most recent log before the current date
  const previousLog = await db
    .select({
      totalAirframeHr: dailyLog.totalAirframeHr,
      totalEngineHrTsn: dailyLog.totalEngineHrTsn,
      totalLandings: dailyLog.totalLandings,
      totalTc: dailyLog.totalTc,
      totalNoOfStarts: dailyLog.totalNoOfStarts,
      totalGgCycleTsn: dailyLog.totalGgCycleTsn,
      totalFtCycleTsn: dailyLog.totalFtCycleTsn,
    })
    .from(dailyLog)
    .where(
      and(
        eq(dailyLog.organizationId, organizationId),
        lt(dailyLog.recordDate, recordDate),
        eq(dailyLog.status, true)
      )
    )
    .orderBy(desc(dailyLog.recordDate))
    .limit(1);

  // Start with previous totals or zero if no previous log
  let totalAirframeHr = 0;
  let totalEngineHrTsn = 0;
  let totalLandings = 0;
  let totalTc = 0;
  let totalNoOfStarts = 0;
  let totalGgCycleTsn = 0;
  let totalFtCycleTsn = 0;

  if (previousLog.length > 0) {
    const prev = previousLog[0];
    totalAirframeHr = Number.parseFloat(prev.totalAirframeHr || "0");
    totalEngineHrTsn = Number.parseFloat(prev.totalEngineHrTsn || "0");
    totalLandings = prev.totalLandings || 0;
    totalTc = prev.totalTc || 0;
    totalNoOfStarts = prev.totalNoOfStarts || 0;
    totalGgCycleTsn = prev.totalGgCycleTsn || 0;
    totalFtCycleTsn = prev.totalFtCycleTsn || 0;
  }

  // Add current log data if provided
  if (currentLogData) {
    if (currentLogData.hoursFlownAirframe) {
      totalAirframeHr += timeToDecimal(currentLogData.hoursFlownAirframe);
    }
    if (currentLogData.hoursFlownEngine) {
      totalEngineHrTsn += timeToDecimal(currentLogData.hoursFlownEngine);
    }
    if (currentLogData.landings) {
      totalLandings += currentLogData.landings;
    }
    if (currentLogData.tc) {
      totalTc += currentLogData.tc;
    }
    if (currentLogData.noOfStarts) {
      totalNoOfStarts += currentLogData.noOfStarts;
    }
    if (currentLogData.ggCycle) {
      totalGgCycleTsn += currentLogData.ggCycle;
    }
    if (currentLogData.ftCycle) {
      totalFtCycleTsn += currentLogData.ftCycle;
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

// Helper function to recalculate totals for affected logs after a given date
async function recalculateTotalsAfterDate(
  recordDate: string,
  organizationId: string
) {
  // Get all logs after the given date, ordered by date
  const subsequentLogs = await db
    .select({
      id: dailyLog.id,
      recordDate: dailyLog.recordDate,
      hoursFlownAirframe: dailyLog.hoursFlownAirframe,
      hoursFlownEngine: dailyLog.hoursFlownEngine,
      landings: dailyLog.landings,
      tc: dailyLog.tc,
      noOfStarts: dailyLog.noOfStarts,
      ggCycle: dailyLog.ggCycle,
      ftCycle: dailyLog.ftCycle,
      // Current totals for comparison
      totalAirframeHr: dailyLog.totalAirframeHr,
      totalEngineHrTsn: dailyLog.totalEngineHrTsn,
      totalLandings: dailyLog.totalLandings,
      totalTc: dailyLog.totalTc,
      totalNoOfStarts: dailyLog.totalNoOfStarts,
      totalGgCycleTsn: dailyLog.totalGgCycleTsn,
      totalFtCycleTsn: dailyLog.totalFtCycleTsn,
    })
    .from(dailyLog)
    .where(
      and(
        eq(dailyLog.organizationId, organizationId),
        gt(dailyLog.recordDate, recordDate),
        eq(dailyLog.status, true)
      )
    )
    .orderBy(dailyLog.recordDate);

  // Recalculate totals for each subsequent log only if they would change
  for (const log of subsequentLogs) {
    const newTotals = await calculateTotals(
      log.recordDate,
      organizationId,
      log
    );

    // Check if any totals would actually change
    const currentTotals = {
      totalAirframeHr: Number.parseFloat(log.totalAirframeHr || "0"),
      totalEngineHrTsn: Number.parseFloat(log.totalEngineHrTsn || "0"),
      totalLandings: log.totalLandings || 0,
      totalTc: log.totalTc || 0,
      totalNoOfStarts: log.totalNoOfStarts || 0,
      totalGgCycleTsn: log.totalGgCycleTsn || 0,
      totalFtCycleTsn: log.totalFtCycleTsn || 0,
    };

    const newTotalsParsed = {
      totalAirframeHr: Number.parseFloat(newTotals.totalAirframeHr),
      totalEngineHrTsn: Number.parseFloat(newTotals.totalEngineHrTsn),
      totalLandings: newTotals.totalLandings,
      totalTc: newTotals.totalTc,
      totalNoOfStarts: newTotals.totalNoOfStarts,
      totalGgCycleTsn: newTotals.totalGgCycleTsn,
      totalFtCycleTsn: newTotals.totalFtCycleTsn,
    };

    // Only update if totals have changed
    const hasChanges =
      currentTotals.totalAirframeHr !== newTotalsParsed.totalAirframeHr ||
      currentTotals.totalEngineHrTsn !== newTotalsParsed.totalEngineHrTsn ||
      currentTotals.totalLandings !== newTotalsParsed.totalLandings ||
      currentTotals.totalTc !== newTotalsParsed.totalTc ||
      currentTotals.totalNoOfStarts !== newTotalsParsed.totalNoOfStarts ||
      currentTotals.totalGgCycleTsn !== newTotalsParsed.totalGgCycleTsn ||
      currentTotals.totalFtCycleTsn !== newTotalsParsed.totalFtCycleTsn;

    if (hasChanges) {
      await db
        .update(dailyLog)
        .set({
          totalAirframeHr: newTotals.totalAirframeHr,
          totalEngineHrTsn: newTotals.totalEngineHrTsn,
          totalLandings: newTotals.totalLandings,
          totalTc: newTotals.totalTc,
          totalNoOfStarts: newTotals.totalNoOfStarts,
          totalGgCycleTsn: newTotals.totalGgCycleTsn,
          totalFtCycleTsn: newTotals.totalFtCycleTsn,
          updatedAt: new Date(),
        })
        .where(eq(dailyLog.id, log.id));
    }
  }
}

export const dailyLogRouter = new Elysia({
  prefix: "/daily-logs",
  detail: {
    tags: ["Daily Logs"],
  },
})
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user, session }) => {
      const {
        search, // General search across multiple fields
        tlpNo,
        dateFrom,
        dateTo,
        remarks,
        usage,
        // Numeric range filters
        hoursFlownAirframeMin,
        hoursFlownAirframeMax,
        hoursFlownEngineMin,
        hoursFlownEngineMax,
        landingsMin,
        landingsMax,
        tcMin,
        tcMax,
        noOfStartsMin,
        noOfStartsMax,
        ggCycleMin,
        ggCycleMax,
        ftCycleMin,
        ftCycleMax,
        // Total range filters
        totalAirframeHrMin,
        totalAirframeHrMax,
        totalEngineHrTsnMin,
        totalEngineHrTsnMax,
        totalLandingsMin,
        totalLandingsMax,
        // Sorting
        sortBy = "recordDate",
        sortOrder = "desc",
        // Pagination
        page = 1,
        pageSize = 10,
      } = query;

      // Build optimized where conditions
      const whereConditions = [
        eq(dailyLog.organizationId, session.activeOrganizationId || "default"),
      ];

      // General search across multiple fields
      if (search) {
        const searchConditions = [
          like(dailyLog.tlpNo, `%${search}%`),
          like(dailyLog.remarks, `%${search}%`),
          like(dailyLog.usage, `%${search}%`),
        ];
        whereConditions.push(sql`(${searchConditions.join(" OR ")})`);
      }

      // Specific field searches
      if (tlpNo) {
        whereConditions.push(...buildSearchConditions(["tlp_no"], tlpNo));
      }

      if (remarks) {
        whereConditions.push(like(dailyLog.remarks, `%${remarks}%`));
      }

      if (usage) {
        whereConditions.push(like(dailyLog.usage, `%${usage}%`));
      }

      // Date range conditions
      whereConditions.push(
        ...buildDateRangeConditions("record_date", dateFrom, dateTo)
      );

      // Numeric range filters for current values
      if (hoursFlownAirframeMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 2) AS INTEGER)`,
            hoursFlownAirframeMin * 60
          )
        );
      }
      if (hoursFlownAirframeMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 2) AS INTEGER)`,
            hoursFlownAirframeMax * 60
          )
        );
      }

      if (hoursFlownEngineMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 2) AS INTEGER)`,
            hoursFlownEngineMin * 60
          )
        );
      }
      if (hoursFlownEngineMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 2) AS INTEGER)`,
            hoursFlownEngineMax * 60
          )
        );
      }

      if (landingsMin !== undefined) {
        whereConditions.push(gte(dailyLog.landings, landingsMin));
      }
      if (landingsMax !== undefined) {
        whereConditions.push(lte(dailyLog.landings, landingsMax));
      }

      if (tcMin !== undefined) {
        whereConditions.push(gte(dailyLog.tc, tcMin));
      }
      if (tcMax !== undefined) {
        whereConditions.push(lte(dailyLog.tc, tcMax));
      }

      if (noOfStartsMin !== undefined) {
        whereConditions.push(gte(dailyLog.noOfStarts, noOfStartsMin));
      }
      if (noOfStartsMax !== undefined) {
        whereConditions.push(lte(dailyLog.noOfStarts, noOfStartsMax));
      }

      if (ggCycleMin !== undefined) {
        whereConditions.push(gte(dailyLog.ggCycle, ggCycleMin));
      }
      if (ggCycleMax !== undefined) {
        whereConditions.push(lte(dailyLog.ggCycle, ggCycleMax));
      }

      if (ftCycleMin !== undefined) {
        whereConditions.push(gte(dailyLog.ftCycle, ftCycleMin));
      }
      if (ftCycleMax !== undefined) {
        whereConditions.push(lte(dailyLog.ftCycle, ftCycleMax));
      }

      // Total range filters
      if (totalAirframeHrMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(${dailyLog.totalAirframeHr} AS DECIMAL)`,
            totalAirframeHrMin
          )
        );
      }
      if (totalAirframeHrMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(${dailyLog.totalAirframeHr} AS DECIMAL)`,
            totalAirframeHrMax
          )
        );
      }

      if (totalEngineHrTsnMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(${dailyLog.totalEngineHrTsn} AS DECIMAL)`,
            totalEngineHrTsnMin
          )
        );
      }
      if (totalEngineHrTsnMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(${dailyLog.totalEngineHrTsn} AS DECIMAL)`,
            totalEngineHrTsnMax
          )
        );
      }

      if (totalLandingsMin !== undefined) {
        whereConditions.push(gte(dailyLog.totalLandings, totalLandingsMin));
      }
      if (totalLandingsMax !== undefined) {
        whereConditions.push(lte(dailyLog.totalLandings, totalLandingsMax));
      }

      // Build dynamic sorting
      const sortField = sortBy as keyof typeof dailyLog;
      const sortDirection = sortOrder === "asc" ? "asc" : "desc";

      let orderByClause;
      if (
        sortField === "hoursFlownAirframe" ||
        sortField === "hoursFlownEngine"
      ) {
        // Special handling for time fields - convert to minutes for proper sorting
        const timeField =
          sortField === "hoursFlownAirframe"
            ? dailyLog.hoursFlownAirframe
            : dailyLog.hoursFlownEngine;
        orderByClause =
          sortDirection === "asc"
            ? sql`CAST(SPLIT_PART(${timeField}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${timeField}, ':', 2) AS INTEGER) ASC`
            : sql`CAST(SPLIT_PART(${timeField}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${timeField}, ':', 2) AS INTEGER) DESC`;
      } else if (
        sortField === "totalAirframeHr" ||
        sortField === "totalEngineHrTsn"
      ) {
        // Special handling for total decimal fields
        const totalField =
          sortField === "totalAirframeHr"
            ? dailyLog.totalAirframeHr
            : dailyLog.totalEngineHrTsn;
        orderByClause =
          sortDirection === "asc"
            ? sql`CAST(${totalField} AS DECIMAL) ASC`
            : sql`CAST(${totalField} AS DECIMAL) DESC`;
      } else if (dailyLog[sortField]) {
        // Standard field sorting
        orderByClause =
          sortDirection === "asc"
            ? sql`${dailyLog[sortField]} ASC`
            : sql`${dailyLog[sortField]} DESC`;
      } else {
        // Default fallback
        orderByClause = desc(dailyLog.recordDate);
      }

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
          totalCount: sql<number>`count(*) over()`,
        })
        .from(dailyLog)
        .where(and(...whereConditions))
        .orderBy(orderByClause, desc(dailyLog.createdAt))
        .limit(Number.parseInt(pageSize.toString(), 10))
        .offset(
          (Number.parseInt(page.toString(), 10) - 1) *
            Number.parseInt(pageSize.toString(), 10)
        );

      const totalCount = logs.length > 0 ? Number(logs[0].totalCount) : 0;
      const totalPages = Math.ceil(
        totalCount / Number.parseInt(pageSize.toString(), 10)
      );

      // Remove totalCount from data
      const cleanLogs = logs.map(({ totalCount, ...log }) => log);

      return {
        success: true,
        list: cleanLogs,
        totalCount,
        totalPages,
      };
    },
    {
      auth: true,
      query: t.Object({
        // General search
        search: t.Optional(t.String()),
        tlpNo: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        remarks: t.Optional(t.String()),
        usage: t.Optional(t.String()),

        // Numeric range filters for current values
        hoursFlownAirframeMin: t.Optional(t.Numeric()),
        hoursFlownAirframeMax: t.Optional(t.Numeric()),
        hoursFlownEngineMin: t.Optional(t.Numeric()),
        hoursFlownEngineMax: t.Optional(t.Numeric()),
        landingsMin: t.Optional(t.Numeric()),
        landingsMax: t.Optional(t.Numeric()),
        tcMin: t.Optional(t.Numeric()),
        tcMax: t.Optional(t.Numeric()),
        noOfStartsMin: t.Optional(t.Numeric()),
        noOfStartsMax: t.Optional(t.Numeric()),
        ggCycleMin: t.Optional(t.Numeric()),
        ggCycleMax: t.Optional(t.Numeric()),
        ftCycleMin: t.Optional(t.Numeric()),
        ftCycleMax: t.Optional(t.Numeric()),

        // Total range filters
        totalAirframeHrMin: t.Optional(t.Numeric()),
        totalAirframeHrMax: t.Optional(t.Numeric()),
        totalEngineHrTsnMin: t.Optional(t.Numeric()),
        totalEngineHrTsnMax: t.Optional(t.Numeric()),
        totalLandingsMin: t.Optional(t.Numeric()),
        totalLandingsMax: t.Optional(t.Numeric()),

        // Sorting
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),

        // Pagination
        page: t.Optional(t.Numeric()),
        pageSize: t.Optional(t.Numeric()),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          list: t.Array(
            t.Object({
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
              updatedAt: t.Date(),
            })
          ),
          totalCount: t.Number(),
          totalPages: t.Number(),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Get daily logs",
        description: "Retrieve daily logs with filtering and pagination",
      },
    }
  )
  .get(
    "/:id",
    async ({ params, user, session }) => {
      const log = await db
        .select()
        .from(dailyLog)
        .where(
          and(
            eq(dailyLog.id, Number(params.id)),
            eq(
              dailyLog.organizationId,
              session.activeOrganizationId || "default"
            )
          )
        )
        .limit(1);

      if (!log.length) {
        throw new Error("Daily log not found");
      }

      return {
        success: true,
        data: log[0],
      };
    },
    {
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
            updatedAt: t.Date(),
          }),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Get daily log by ID",
        description: "Retrieve a specific daily log by its ID",
      },
    }
  )
  .post(
    "/",
    async ({ body, user, session }) => {
      // Calculate totals based on previous day's record + current log data
      const totals = await calculateTotals(
        body.recordDate,
        session.activeOrganizationId || "default",
        body
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
          organizationId: session.activeOrganizationId || "default",
          createdBy: user.id,
        })
        .returning();

      if (!created.length) {
        throw new Error("Failed to create daily log");
      }

      // Recalculate totals for all logs after this date
      await recalculateTotalsAfterDate(
        body.recordDate,
        session.activeOrganizationId || "default"
      );

      return {
        success: true,
        data: created[0],
      };
    },
    {
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
        remarks: t.Optional(t.String()),
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
            updatedAt: t.Date(),
          }),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Create daily log",
        description: "Create a new daily log entry",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body, user, session }) => {
      // Get the existing log to determine date for recalculation
      const existingLog = await db
        .select({ recordDate: dailyLog.recordDate })
        .from(dailyLog)
        .where(
          and(
            eq(dailyLog.id, Number(params.id)),
            eq(
              dailyLog.organizationId,
              session.activeOrganizationId || "default"
            )
          )
        )
        .limit(1);

      if (!existingLog.length) {
        throw new Error("Daily log not found");
      }

      // Use the date from the existing log or from the body if being updated
      const recordDate = body.recordDate || existingLog[0].recordDate;

      // Calculate totals based on previous day's record + current log data
      const totals = await calculateTotals(
        recordDate,
        session.activeOrganizationId || "default",
        body
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
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dailyLog.id, Number(params.id)),
            eq(
              dailyLog.organizationId,
              session.activeOrganizationId || "default"
            )
          )
        )
        .returning();

      if (!updated.length) {
        throw new Error("Failed to update daily log or log not found");
      }

      // Recalculate totals for all subsequent logs if date changed
      if (body.recordDate) {
        await recalculateTotalsAfterDate(
          recordDate,
          session.activeOrganizationId || "default"
        );
      }

      return {
        success: true,
        data: updated[0],
      };
    },
    {
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
        remarks: t.Optional(t.String()),
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
            updatedAt: t.Date(),
          }),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Update daily log",
        description: "Update an existing daily log entry",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, user, session }) => {
      // Get the log details before deleting to recalculate subsequent logs
      const logToDelete = await db
        .select({ recordDate: dailyLog.recordDate })
        .from(dailyLog)
        .where(
          and(
            eq(dailyLog.id, Number(params.id)),
            eq(
              dailyLog.organizationId,
              session.activeOrganizationId || "default"
            )
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
            eq(
              dailyLog.organizationId,
              session.activeOrganizationId || "default"
            )
          )
        )
        .returning();

      if (!deleted.length) {
        throw new Error("Failed to delete daily log or log not found");
      }

      // Recalculate totals for all subsequent logs
      await recalculateTotalsAfterDate(
        logToDelete[0].recordDate,
        session.activeOrganizationId || "default"
      );

      return {
        success: true,
        message: "Daily log deleted successfully",
      };
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
        summary: "Delete daily log",
        description: "Delete a daily log entry by its ID",
      },
    }
  )
  .get(
    "/export",
    async ({ query, user, session, set }) => {
      // Reuse the same filtering logic as the main GET endpoint
      const {
        search,
        tlpNo,
        dateFrom,
        dateTo,
        remarks,
        usage,
        hoursFlownAirframeMin,
        hoursFlownAirframeMax,
        hoursFlownEngineMin,
        hoursFlownEngineMax,
        landingsMin,
        landingsMax,
        tcMin,
        tcMax,
        noOfStartsMin,
        noOfStartsMax,
        ggCycleMin,
        ggCycleMax,
        ftCycleMin,
        ftCycleMax,
        totalAirframeHrMin,
        totalAirframeHrMax,
        totalEngineHrTsnMin,
        totalEngineHrTsnMax,
        totalLandingsMin,
        totalLandingsMax,
        sortBy = "recordDate",
        sortOrder = "desc",
      } = query;

      // Build the same where conditions as the main endpoint
      const whereConditions = [
        eq(dailyLog.organizationId, session.activeOrganizationId || "default"),
      ];

      // Apply all the same filters (reusing the logic from above)
      if (search) {
        const searchConditions = [
          like(dailyLog.tlpNo, `%${search}%`),
          like(dailyLog.remarks, `%${search}%`),
          like(dailyLog.usage, `%${search}%`),
        ];
        whereConditions.push(sql`(${searchConditions.join(" OR ")})`);
      }

      if (tlpNo) {
        whereConditions.push(...buildSearchConditions(["tlp_no"], tlpNo));
      }

      if (remarks) {
        whereConditions.push(like(dailyLog.remarks, `%${remarks}%`));
      }

      if (usage) {
        whereConditions.push(like(dailyLog.usage, `%${usage}%`));
      }

      whereConditions.push(
        ...buildDateRangeConditions("record_date", dateFrom, dateTo)
      );

      // Add all the numeric range filters (same as above)
      if (hoursFlownAirframeMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 2) AS INTEGER)`,
            hoursFlownAirframeMin * 60
          )
        );
      }
      if (hoursFlownAirframeMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownAirframe}, ':', 2) AS INTEGER)`,
            hoursFlownAirframeMax * 60
          )
        );
      }

      if (hoursFlownEngineMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 2) AS INTEGER)`,
            hoursFlownEngineMin * 60
          )
        );
      }
      if (hoursFlownEngineMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${dailyLog.hoursFlownEngine}, ':', 2) AS INTEGER)`,
            hoursFlownEngineMax * 60
          )
        );
      }

      if (landingsMin !== undefined) {
        whereConditions.push(gte(dailyLog.landings, landingsMin));
      }
      if (landingsMax !== undefined) {
        whereConditions.push(lte(dailyLog.landings, landingsMax));
      }

      if (tcMin !== undefined) {
        whereConditions.push(gte(dailyLog.tc, tcMin));
      }
      if (tcMax !== undefined) {
        whereConditions.push(lte(dailyLog.tc, tcMax));
      }

      if (noOfStartsMin !== undefined) {
        whereConditions.push(gte(dailyLog.noOfStarts, noOfStartsMin));
      }
      if (noOfStartsMax !== undefined) {
        whereConditions.push(lte(dailyLog.noOfStarts, noOfStartsMax));
      }

      if (ggCycleMin !== undefined) {
        whereConditions.push(gte(dailyLog.ggCycle, ggCycleMin));
      }
      if (ggCycleMax !== undefined) {
        whereConditions.push(lte(dailyLog.ggCycle, ggCycleMax));
      }

      if (ftCycleMin !== undefined) {
        whereConditions.push(gte(dailyLog.ftCycle, ftCycleMin));
      }
      if (ftCycleMax !== undefined) {
        whereConditions.push(lte(dailyLog.ftCycle, ftCycleMax));
      }

      if (totalAirframeHrMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(${dailyLog.totalAirframeHr} AS DECIMAL)`,
            totalAirframeHrMin
          )
        );
      }
      if (totalAirframeHrMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(${dailyLog.totalAirframeHr} AS DECIMAL)`,
            totalAirframeHrMax
          )
        );
      }

      if (totalEngineHrTsnMin !== undefined) {
        whereConditions.push(
          gte(
            sql`CAST(${dailyLog.totalEngineHrTsn} AS DECIMAL)`,
            totalEngineHrTsnMin
          )
        );
      }
      if (totalEngineHrTsnMax !== undefined) {
        whereConditions.push(
          lte(
            sql`CAST(${dailyLog.totalEngineHrTsn} AS DECIMAL)`,
            totalEngineHrTsnMax
          )
        );
      }

      if (totalLandingsMin !== undefined) {
        whereConditions.push(gte(dailyLog.totalLandings, totalLandingsMin));
      }
      if (totalLandingsMax !== undefined) {
        whereConditions.push(lte(dailyLog.totalLandings, totalLandingsMax));
      }

      // Build the same sorting logic
      const sortField = sortBy as keyof typeof dailyLog;
      const sortDirection = sortOrder === "asc" ? "asc" : "desc";

      let orderByClause;
      if (
        sortField === "hoursFlownAirframe" ||
        sortField === "hoursFlownEngine"
      ) {
        const timeField =
          sortField === "hoursFlownAirframe"
            ? dailyLog.hoursFlownAirframe
            : dailyLog.hoursFlownEngine;
        orderByClause =
          sortDirection === "asc"
            ? sql`CAST(SPLIT_PART(${timeField}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${timeField}, ':', 2) AS INTEGER) ASC`
            : sql`CAST(SPLIT_PART(${timeField}, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(${timeField}, ':', 2) AS INTEGER) DESC`;
      } else if (
        sortField === "totalAirframeHr" ||
        sortField === "totalEngineHrTsn"
      ) {
        const totalField =
          sortField === "totalAirframeHr"
            ? dailyLog.totalAirframeHr
            : dailyLog.totalEngineHrTsn;
        orderByClause =
          sortDirection === "asc"
            ? sql`CAST(${totalField} AS DECIMAL) ASC`
            : sql`CAST(${totalField} AS DECIMAL) DESC`;
      } else if (dailyLog[sortField]) {
        orderByClause =
          sortDirection === "asc"
            ? sql`${dailyLog[sortField]} ASC`
            : sql`${dailyLog[sortField]} DESC`;
      } else {
        orderByClause = desc(dailyLog.recordDate);
      }

      // Get all matching records (no pagination for export)
      const logs = await db
        .select()
        .from(dailyLog)
        .where(and(...whereConditions))
        .orderBy(orderByClause, desc(dailyLog.createdAt));

      // Generate CSV content
      const headers = [
        "ID",
        "Record Date",
        "TLP No",
        "Hours Flown (Airframe)",
        "Hours Flown (Engine)",
        "Landings",
        "TC",
        "No of Starts",
        "GG Cycle",
        "FT Cycle",
        "Usage",
        "Total Airframe Hr",
        "Total Engine Hr TSN",
        "Total Landings",
        "Total TC",
        "Total No of Starts",
        "Total GG Cycle TSN",
        "Total FT Cycle TSN",
        "Remarks",
        "Status",
        "Created At",
        "Updated At",
      ];

      const csvRows = logs.map((log) => [
        log.id,
        log.recordDate,
        log.tlpNo,
        log.hoursFlownAirframe || "",
        log.hoursFlownEngine || "",
        log.landings || "",
        log.tc || "",
        log.noOfStarts || "",
        log.ggCycle || "",
        log.ftCycle || "",
        log.usage || "",
        log.totalAirframeHr || "",
        log.totalEngineHrTsn || "",
        log.totalLandings || "",
        log.totalTc || "",
        log.totalNoOfStarts || "",
        log.totalGgCycleTsn || "",
        log.totalFtCycleTsn || "",
        `"${(log.remarks || "").replace(/"/g, '""')}"`, // Escape quotes in remarks
        log.status ? "Active" : "Inactive",
        log.createdAt.toISOString(),
        log.updatedAt.toISOString(),
      ]);

      const csvContent = [headers, ...csvRows]
        .map((row) => row.join(","))
        .join("\n");

      // Set response headers for CSV download
      set.headers["Content-Type"] = "text/csv";
      set.headers["Content-Disposition"] =
        `attachment; filename="daily-logs-${new Date().toISOString().split("T")[0]}.csv"`;

      return csvContent;
    },
    {
      auth: true,
      query: t.Object({
        // Same query parameters as the main GET endpoint
        search: t.Optional(t.String()),
        tlpNo: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        remarks: t.Optional(t.String()),
        usage: t.Optional(t.String()),

        hoursFlownAirframeMin: t.Optional(t.Numeric()),
        hoursFlownAirframeMax: t.Optional(t.Numeric()),
        hoursFlownEngineMin: t.Optional(t.Numeric()),
        hoursFlownEngineMax: t.Optional(t.Numeric()),
        landingsMin: t.Optional(t.Numeric()),
        landingsMax: t.Optional(t.Numeric()),
        tcMin: t.Optional(t.Numeric()),
        tcMax: t.Optional(t.Numeric()),
        noOfStartsMin: t.Optional(t.Numeric()),
        noOfStartsMax: t.Optional(t.Numeric()),
        ggCycleMin: t.Optional(t.Numeric()),
        ggCycleMax: t.Optional(t.Numeric()),
        ftCycleMin: t.Optional(t.Numeric()),
        ftCycleMax: t.Optional(t.Numeric()),

        totalAirframeHrMin: t.Optional(t.Numeric()),
        totalAirframeHrMax: t.Optional(t.Numeric()),
        totalEngineHrTsnMin: t.Optional(t.Numeric()),
        totalEngineHrTsnMax: t.Optional(t.Numeric()),
        totalLandingsMin: t.Optional(t.Numeric()),
        totalLandingsMax: t.Optional(t.Numeric()),

        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
      detail: {
        summary: "Export daily logs to CSV",
        description: "Export filtered daily logs to CSV format",
      },
    }
  );
