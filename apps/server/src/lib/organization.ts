import { db } from "../db";
import { userProfiles, monitoringCharts, companyManuals, systemConfig } from "../db/schema/rbac";
import { eq, and, desc, like, count, isNull } from "drizzle-orm";

export class OrganizationService {
	// Extended User Profile Management (for custom fields beyond Better Auth)
	static async createUserProfile(userId: string, fullName: string, phone?: string) {
		return await db.insert(userProfiles).values({
			userId,
			fullName,
			phone,
		}).returning();
	}

	static async getUserProfile(userId: string) {
		const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
		return result[0] || null;
	}

	static async updateUserProfile(userId: string, data: Partial<typeof userProfiles.$inferInsert>) {
		return await db.update(userProfiles)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(userProfiles.userId, userId))
			.returning();
	}

	// Monitoring Charts Management
	static async createMonitoringChart(data: {
		name: string;
		description?: string;
		chartType: string;
		config: any;
		organizationId: string;
	}) {
		return await db.insert(monitoringCharts).values(data).returning();
	}

	static async getMonitoringCharts(organizationId: string, page = 1, pageSize = 10) {
		const offset = (page - 1) * pageSize;
		
		const [charts, totalCount] = await Promise.all([
			db.select()
				.from(monitoringCharts)
				.where(and(
					eq(monitoringCharts.organizationId, organizationId),
					eq(monitoringCharts.status, true)
				))
				.orderBy(desc(monitoringCharts.createdAt))
				.limit(pageSize)
				.offset(offset),
			db.select({ count: count() })
				.from(monitoringCharts)
				.where(and(
					eq(monitoringCharts.organizationId, organizationId),
					eq(monitoringCharts.status, true)
				))
		]);

		return {
			charts,
			totalCount: totalCount[0].count,
			totalPages: Math.ceil(totalCount[0].count / pageSize),
		};
	}

	static async updateMonitoringChart(id: number, data: Partial<typeof monitoringCharts.$inferInsert>) {
		return await db.update(monitoringCharts)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(monitoringCharts.id, id))
			.returning();
	}

	static async deleteMonitoringChart(id: number) {
		return await db.update(monitoringCharts)
			.set({ status: false, updatedAt: new Date() })
			.where(eq(monitoringCharts.id, id))
			.returning();
	}

	// Company Manuals Management
	static async createCompanyManual(data: {
		title: string;
		description?: string;
		filePath: string;
		fileType: string;
		fileSize?: number;
		organizationId: string;
		uploadedBy: string;
	}) {
		return await db.insert(companyManuals).values(data).returning();
	}

	static async getCompanyManuals(organizationId: string, page = 1, pageSize = 10, search?: string) {
		const offset = (page - 1) * pageSize;
		
		const whereConditions = [
			eq(companyManuals.organizationId, organizationId),
			eq(companyManuals.status, true)
		];

		if (search) {
			whereConditions.push(like(companyManuals.title, `%${search}%`));
		}

		const [manuals, totalCount] = await Promise.all([
			db.select()
				.from(companyManuals)
				.where(and(...whereConditions))
				.orderBy(desc(companyManuals.createdAt))
				.limit(pageSize)
				.offset(offset),
			db.select({ count: count() })
				.from(companyManuals)
				.where(and(...whereConditions))
		]);

		return {
			manuals,
			totalCount: totalCount[0].count,
			totalPages: Math.ceil(totalCount[0].count / pageSize),
		};
	}

	static async updateCompanyManual(id: number, data: Partial<typeof companyManuals.$inferInsert>) {
		return await db.update(companyManuals)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(companyManuals.id, id))
			.returning();
	}

	static async deleteCompanyManual(id: number) {
		return await db.update(companyManuals)
			.set({ status: false, updatedAt: new Date() })
			.where(eq(companyManuals.id, id))
			.returning();
	}

	// System Configuration Management
	static async createSystemConfig(data: {
		key: string;
		value: any;
		description?: string;
		organizationId?: string;
	}) {
		return await db.insert(systemConfig).values(data).returning();
	}

	static async getSystemConfig(key: string, organizationId?: string) {
		const whereConditions = [eq(systemConfig.key, key)];
		
		if (organizationId) {
			whereConditions.push(eq(systemConfig.organizationId, organizationId));
		} else {
			whereConditions.push(isNull(systemConfig.organizationId));
		}

		const result = await db.select()
			.from(systemConfig)
			.where(and(...whereConditions));
		
		return result[0] || null;
	}

	static async updateSystemConfig(key: string, value: any, organizationId?: string) {
		const whereConditions = [eq(systemConfig.key, key)];
		
		if (organizationId) {
			whereConditions.push(eq(systemConfig.organizationId, organizationId));
		} else {
			whereConditions.push(isNull(systemConfig.organizationId));
		}

		return await db.update(systemConfig)
			.set({ value, updatedAt: new Date() })
			.where(and(...whereConditions))
			.returning();
	}

}
