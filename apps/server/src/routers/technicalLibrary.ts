import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { technicalLibraryFiles } from "../db/schema";
import { checkTechnicalLibraryPermission } from "../lib/access-control";
import { authPlugin } from "../lib/auth";
import { sanitizeFilename, validateFile } from "../lib/file-security";
import { getMimeType, s3Client } from "../lib/s3";

export const technicalLibraryRouter = new Elysia({
  prefix: "/technical-library",
})
  .use(authPlugin)
  .post(
    "/upload",
    async ({ body, user, session, set }) => {
      try {
        const { file, filename, category, remarks } = body;

        if (!(file && filename && category)) {
          set.status = 400;
          return {
            success: false,
            error: "File, filename, and category are required",
          };
        }

        // Check admin permission for upload
        const organizationId = session.activeOrganizationId || "";
        const permissionCheck = checkTechnicalLibraryPermission(
          "write",
          user.role || "user",
          organizationId,
          organizationId
        );

        if (!permissionCheck.hasAccess) {
          set.status = 403;
          return { success: false, error: permissionCheck.error };
        }

        // Validate file security
        const validation = await validateFile(file);
        if (!validation.isValid) {
          set.status = 400;
          return {
            success: false,
            error: validation.error,
          };
        }

        // Generate secure file key with organization prefix
        const sanitizedFilename = sanitizeFilename(filename);
        const fileKey = `technical-library/${session.activeOrganizationId}/${category}/${Date.now()}_${sanitizedFilename}`;

        // Upload to S3
        await s3Client.write(fileKey, file, {
          type: validation.mimeType || file.type,
          acl: "private",
        });

        // Save to database
        const result = await db
          .insert(technicalLibraryFiles)
          .values({
            filename: sanitizedFilename,
            originalFilename: filename,
            fileKey,
            category,
            fileSize: file.size,
            mimeType:
              validation.mimeType ||
              getMimeType(filename.split(".").pop() || ""),
            remarks: remarks || null,
            organizationId,
            uploadedBy: user.id,
          })
          .returning();

        return {
          success: true,
          data: {
            id: result[0].id,
            filename: sanitizedFilename,
            originalFilename: filename,
            fileKey,
            category,
            size: file.size,
            mimeType: validation.mimeType,
            remarks,
            uploadedAt: new Date().toISOString(),
          },
        };
      } catch (_error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to upload file",
        };
      }
    },
    {
      auth: true,
      body: t.Object({
        file: t.File(),
        filename: t.String(),
        category: t.String(),
        remarks: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Technical Library"],
        summary: "Upload a file to technical library",
        description:
          "Upload a file to the technical library with category and remarks (admin only)",
      },
    }
  )
  .get(
    "/files",
    async ({ query, user, session, set }) => {
      try {
        const { category } = query;

        // Check permission for listing
        const organizationId = session.activeOrganizationId || "";
        const permissionCheck = checkTechnicalLibraryPermission(
          "list",
          user.role || "user",
          organizationId,
          organizationId
        );

        if (!permissionCheck.hasAccess) {
          set.status = 403;
          return { success: false, error: permissionCheck.error };
        }

        // Build query
        const whereConditions = [
          eq(technicalLibraryFiles.organizationId, organizationId),
        ];
        if (category) {
          whereConditions.push(eq(technicalLibraryFiles.category, category));
        }
        const whereClause = and(...whereConditions);

        const files = await db
          .select()
          .from(technicalLibraryFiles)
          .where(whereClause)
          .orderBy(technicalLibraryFiles.createdAt);

        return {
          success: true,
          data: {
            files: files.map((file) => ({
              id: file.id,
              filename: file.filename,
              originalFilename: file.originalFilename,
              category: file.category,
              fileSize: file.fileSize,
              mimeType: file.mimeType,
              remarks: file.remarks,
              uploadedBy: file.uploadedBy,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt,
            })),
            count: files.length,
          },
        };
      } catch (_error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to list files",
        };
      }
    },
    {
      auth: true,
      query: t.Object({
        category: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Technical Library"],
        summary: "List technical library files",
        description:
          "List files in the technical library, optionally filtered by category",
      },
    }
  )
  .get(
    "/download/:id",
    async ({ params, user, session, set }) => {
      try {
        const { id } = params;

        // Get file metadata
        const organizationId = session.activeOrganizationId || "";
        const fileRecord = await db
          .select()
          .from(technicalLibraryFiles)
          .where(
            and(
              eq(technicalLibraryFiles.id, Number.parseInt(id, 10)),
              eq(technicalLibraryFiles.organizationId, organizationId)
            )
          )
          .limit(1);

        if (!fileRecord.length) {
          set.status = 404;
          return { success: false, error: "File not found" };
        }

        const file = fileRecord[0];

        // Check permission for download
        const permissionCheck = checkTechnicalLibraryPermission(
          "read",
          user.role || "user",
          organizationId,
          organizationId
        );

        if (!permissionCheck.hasAccess) {
          set.status = 403;
          return { success: false, error: permissionCheck.error };
        }

        // Get file from S3
        const s3File = s3Client.file(file.fileKey);
        const fileData = await s3File.arrayBuffer();

        // Set appropriate headers
        set.headers = {
          "Content-Type": file.mimeType,
          "Content-Length": file.fileSize.toString(),
          "Content-Disposition": `attachment; filename="${file.originalFilename}"`,
          "Cache-Control": "private, max-age=3600",
        };

        return new Response(fileData);
      } catch (_error) {
        set.status = 500;
        return { success: false, error: "Failed to download file" };
      }
    },
    {
      auth: true,
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Technical Library"],
        summary: "Download a technical library file",
        description: "Download a file from the technical library",
      },
    }
  )
  .delete(
    "/files/:id",
    async ({ params, user, session, set }) => {
      try {
        const { id } = params;

        // Check admin permission for delete
        const organizationId = session.activeOrganizationId || "";
        const permissionCheck = checkTechnicalLibraryPermission(
          "delete",
          user.role || "user",
          organizationId,
          organizationId
        );

        if (!permissionCheck.hasAccess) {
          set.status = 403;
          return { success: false, error: permissionCheck.error };
        }

        // Get file metadata
        const fileRecord = await db
          .select()
          .from(technicalLibraryFiles)
          .where(
            and(
              eq(technicalLibraryFiles.id, Number.parseInt(id, 10)),
              eq(technicalLibraryFiles.organizationId, organizationId)
            )
          )
          .limit(1);

        if (!fileRecord.length) {
          set.status = 404;
          return { success: false, error: "File not found" };
        }

        const file = fileRecord[0];

        // Delete from S3
        await s3Client.delete(file.fileKey);

        // Delete from database
        await db
          .delete(technicalLibraryFiles)
          .where(eq(technicalLibraryFiles.id, Number.parseInt(id, 10)));

        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (_error) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to delete file",
        };
      }
    },
    {
      auth: true,
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Technical Library"],
        summary: "Delete a technical library file",
        description: "Delete a file from the technical library (admin only)",
      },
    }
  );
