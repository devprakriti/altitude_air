import { eq } from "drizzle-orm";
import { db } from "../db";
import { userProfiles } from "../db/schema/rbac";

export class UserProfileService {
  // Extended User Profile Management (for custom fields beyond Better Auth)
  static async createUserProfile(
    userId: string,
    fullName: string,
    phone?: string
  ) {
    await db.insert(userProfiles).values({
      userId,
      fullName,
      phone,
    });
    return await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
  }

  static async getUserProfile(userId: string) {
    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return result[0] || null;
  }

  static async updateUserProfile(
    userId: string,
    data: Partial<typeof userProfiles.$inferInsert>
  ) {
    await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
    return await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
  }
}
