import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { technicalLibraryFiles } from "../db/schema";
import { authPlugin } from "../lib/auth";
import { sanitizeFilename, validateFile } from "../lib/file-security";
import { generatePresignedUrl, getMimeType, s3Client } from "../lib/s3";

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

        // Permission check is handled by the autoAccess macro

        // Validate file security
        const validation = await validateFile(file);
        if (!validation.isValid) {
          set.status = 400;
          return {
            success: false,
            error: validation.error,
          };
        }

        // Generate secure file key
        const sanitizedFilename = sanitizeFilename(filename);
        const fileKey = `technical-library/${category}/${Date.now()}_${sanitizedFilename}`;

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

        // Permission check is handled by the autoAccess macro

        // Build query
        const whereConditions = [];
        if (category) {
          whereConditions.push(eq(technicalLibraryFiles.category, category));
        }
        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        const dbQuery = db
          .select()
          .from(technicalLibraryFiles);
        
        const files = await (whereClause ? dbQuery.where(whereClause) : dbQuery)
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
        const fileRecord = await db
          .select()
          .from(technicalLibraryFiles)
          .where(eq(technicalLibraryFiles.id, Number.parseInt(id, 10)))
          .limit(1);

        if (!fileRecord.length) {
          set.status = 404;
          return { success: false, error: "File not found" };
        }

        const file = fileRecord[0];

        // Permission check is handled by the autoAccess macro

        // Generate presigned URL for direct S3 download
        const presignedUrl = await generatePresignedUrl(
          file.fileKey,
          3600, // 1 hour expiration
          file.originalFilename
        );

        return {
          success: true,
          data: {
            downloadUrl: presignedUrl,
            filename: file.originalFilename,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
          },
        };
      } catch (_error) {
        set.status = 500;
        return { success: false, error: "Failed to generate download URL" };
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

        // Permission check is handled by the autoAccess macro

        // Get file metadata
        const fileRecord = await db
          .select()
          .from(technicalLibraryFiles)
          .where(eq(technicalLibraryFiles.id, Number.parseInt(id, 10)))
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
