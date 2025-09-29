import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { monitoringCharts } from "../db/schema/rbac";

export class MonitoringService {
  // Monitoring Charts Management
  static async createMonitoringChart(data: {
    name: string;
    description?: string;
    chartType: string;
    config: any;
  }) {
    const result = await db.insert(monitoringCharts).values(data).returning();
    return result;
  }

  static async getMonitoringCharts(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [charts, totalCount] = await Promise.all([
      db
        .select()
        .from(monitoringCharts)
        .where(eq(monitoringCharts.status, true))
        .orderBy(desc(monitoringCharts.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: count() })
        .from(monitoringCharts)
        .where(eq(monitoringCharts.status, true)),
    ]);

    return {
      charts,
      totalCount: totalCount[0].count,
      totalPages: Math.ceil(totalCount[0].count / pageSize),
    };
  }

  static async updateMonitoringChart(
    id: number,
    data: Partial<typeof monitoringCharts.$inferInsert>
  ) {
    await db
      .update(monitoringCharts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(monitoringCharts.id, id));
    return await db
      .select()
      .from(monitoringCharts)
      .where(eq(monitoringCharts.id, id));
  }

  static async deleteMonitoringChart(id: number) {
    await db
      .update(monitoringCharts)
      .set({ status: false, updatedAt: new Date() })
      .where(eq(monitoringCharts.id, id));
    return await db
      .select()
      .from(monitoringCharts)
      .where(eq(monitoringCharts.id, id));
  }
}
