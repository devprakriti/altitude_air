import { and, desc, eq, like } from "drizzle-orm";
import { db } from "../db";
import { companyManuals } from "../db/schema/rbac";

export class ManualService {
  /**
   * Create a new company manual
   */
  static async createCompanyManual(data: {
    title: string;
    description?: string;
    filePath: string;
    fileType: string;
    fileSize?: number;
    uploadedBy: string;
  }) {
    const result = await db.insert(companyManuals).values(data).returning();
    return result[0];
  }

  /**
   * Get company manuals with pagination
   */
  static async getCompanyManuals(
    page = 1,
    pageSize = 10,
    search?: string
  ) {
    const limit = pageSize;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any[] = [eq(companyManuals.status, true)];

    if (search) {
      whereConditions.push(like(companyManuals.title, `%${search}%`));
    }

    const manuals = await db
      .select()
      .from(companyManuals)
      .where(and(...whereConditions))
      .orderBy(desc(companyManuals.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      manuals,
      page,
      pageSize: limit,
      total: manuals.length,
    };
  }

  /**
   * Get a company manual by ID
   */
  static async getCompanyManualById(id: number) {
    const result = await db
      .select()
      .from(companyManuals)
      .where(eq(companyManuals.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update a company manual
   */
  static async updateCompanyManual(
    id: number,
    data: Partial<{
      title: string;
      description: string;
      filePath: string;
      fileType: string;
      fileSize: number;
    }>
  ) {
    const result = await db
      .update(companyManuals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companyManuals.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Delete a company manual (soft delete)
   */
  static async deleteCompanyManual(id: number) {
    const result = await db
      .update(companyManuals)
      .set({ status: false, updatedAt: new Date() })
      .where(eq(companyManuals.id, id))
      .returning();

    return result[0] || null;
  }
}