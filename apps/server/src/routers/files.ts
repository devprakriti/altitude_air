import { Elysia, t } from "elysia";
import { s3Client, generateFileKey, getFileExtension, getMimeType } from "../lib/s3";
import { authPlugin } from "../lib/auth";

export const filesRouter = new Elysia({ prefix: "/files" })
	.use(authPlugin)
  .post(
    "/upload",
    async ({ body, user }) => {
      try {
        const { file, filename } = body as { file: File; filename: string };
        
        if (!file || !filename) {
          return {
            success: false,
            error: "File and filename are required"
          };
        }

        const fileKey = generateFileKey(user.id, filename);
        const extension = getFileExtension(filename);
        const mimeType = getMimeType(extension);

        // Upload to S3
        await s3Client.write(fileKey, file, {
          type: mimeType,
          acl: "private"
        });

        return {
          success: true,
          data: {
            fileKey,
            filename,
            size: file.size,
            mimeType,
            uploadedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error("Upload error:", error);
        return {
          success: false,
          error: "Failed to upload file"
        };
      }
    },
    {
      auth: true,
      body: t.Object({
        file: t.File(),
        filename: t.String()
      }),
      detail: {
        tags: ["Files"],
        summary: "Upload a file to S3",
        description: "Upload a file to S3 storage with user-specific path"
      }
    }
  )
  .get(
    "/download",
    async ({ query, set }) => {
      try {
        const { fileKey } = query;
        
        if (!fileKey) {
          set.status = 400;
          return { success: false, error: "File key is required" };
        }
        
        // Verify file exists and user has access
        const exists = await s3Client.exists(fileKey);
        if (!exists) {
          set.status = 404;
          return { success: false, error: "File not found" };
        }

        // Get file from S3
        const s3File = s3Client.file(fileKey);
        const fileData = await s3File.arrayBuffer();
        const stat = await s3Client.stat(fileKey);

        // Set appropriate headers
        set.headers = {
          "Content-Type": stat.type || "application/octet-stream",
          "Content-Length": stat.size.toString(),
          "Content-Disposition": `attachment; filename="${fileKey.split('/').pop()}"`,
          "Cache-Control": "private, max-age=3600"
        };

        return new Response(fileData);
      } catch (error) {
        console.error("Download error:", error);
        set.status = 500;
        return { success: false, error: "Failed to download file" };
      }
    },
    {
      auth: true,
      query: t.Object({
        fileKey: t.String()
      }),
      detail: {
        tags: ["Files"],
        summary: "Download a file from S3",
        description: "Download a file from S3 storage"
      }
    }
  )
  .get(
    "/presign",
    async ({ query }) => {
      try {
        const { fileKey, expiresIn = "3600" } = query;

        if (!fileKey) {
          return {
            success: false,
            error: "File key is required"
          };
        }

        // Verify file exists
        const exists = await s3Client.exists(fileKey);
        if (!exists) {
          return {
            success: false,
            error: "File not found"
          };
        }

        // Generate presigned URL
        const s3File = s3Client.file(fileKey);
        const presignedUrl = s3File.presign({
          expiresIn: parseInt(expiresIn as string),
          acl: "private"
        });

        return {
          success: true,
          data: {
            url: presignedUrl,
            expiresIn: parseInt(expiresIn as string),
            fileKey
          }
        };
      } catch (error) {
        console.error("Presign error:", error);
        return {
          success: false,
          error: "Failed to generate presigned URL"
        };
      }
    },
    {
      auth: true,
      query: t.Object({
        fileKey: t.String(),
        expiresIn: t.Optional(t.String())
      }),
      detail: {
        tags: ["Files"],
        summary: "Generate presigned URL for file access",
        description: "Generate a temporary presigned URL for secure file access"
      }
    }
  )
  .get(
    "/list",
    async ({ query, user }) => {
      try {
        const { prefix = `uploads/${user.id}/`, maxKeys = "100" } = query;

        const result = await s3Client.list({
          prefix: prefix as string,
          maxKeys: parseInt(maxKeys as string),
          fetchOwner: true
        });

        return {
          success: true,
          data: {
            files: result.contents?.map(file => ({
              key: file.key,
              size: file.size,
              lastModified: file.lastModified,
              etag: file.eTag
            })) || [],
            isTruncated: result.isTruncated,
            count: result.contents?.length || 0
          }
        };
      } catch (error) {
        console.error("List files error:", error);
        return {
          success: false,
          error: "Failed to list files"
        };
      }
    },
    {
      auth: true,
      query: t.Object({
        prefix: t.Optional(t.String()),
        maxKeys: t.Optional(t.String())
      }),
      detail: {
        tags: ["Files"],
        summary: "List user's files",
        description: "List files uploaded by the authenticated user"
      }
    }
  )
  .delete(
    "/",
    async ({ query }) => {
      try {
        const { fileKey } = query;

        if (!fileKey) {
          return {
            success: false,
            error: "File key is required"
          };
        }

        // Verify file exists and belongs to user
        const exists = await s3Client.exists(fileKey);
        if (!exists) {
          return {
            success: false,
            error: "File not found"
          };
        }

        // Delete file from S3
        await s3Client.delete(fileKey);

        return {
          success: true,
          message: "File deleted successfully"
        };
      } catch (error) {
        console.error("Delete error:", error);
        return {
          success: false,
          error: "Failed to delete file"
        };
      }
    },
    {
      auth: true,
      query: t.Object({
        fileKey: t.String()
      }),
      detail: {
        tags: ["Files"],
        summary: "Delete a file",
        description: "Delete a file from S3 storage"
      }
    }
  );