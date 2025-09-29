import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { systemConfig } from "../db/schema/rbac";

export class SystemConfigService {
  // System Configuration Management
  static async createSystemConfig(data: {
    key: string;
    value: any;
    description?: string;
  }) {
    const result = await db.insert(systemConfig).values(data).returning();
    return result;
  }

  static async getSystemConfig(key: string) {
    const result = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key));

    return result[0] || null;
  }

  static async updateSystemConfig(key: string, value: any) {
    await db
      .update(systemConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemConfig.key, key));
    return await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key));
  }
}
