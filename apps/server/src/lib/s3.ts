import { S3Client } from "bun";

export const s3Client = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  bucket: process.env.S3_BUCKET_NAME!,
  endpoint: process.env.S3_ENDPOINT || "https://s3.amazonaws.com",
  acl: (process.env.S3_DEFAULT_ACL as "private" | "public-read") || "private",
});

export const generateFileKey = (
  userId: string,
  originalName: string
): string => {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `uploads/${userId}/${timestamp}_${sanitizedName}.${extension}`;
};

export const getFileExtension = (filename: string): string => {
  return filename.split(".").pop()?.toLowerCase() || "";
};

export const getMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    zip: "application/zip",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };
  return mimeTypes[extension] || "application/octet-stream";
};

export const generatePresignedUrl = async (
  fileKey: string,
  expiresIn: number = 3600, // 1 hour default
  filename?: string
): Promise<string> => {
  try {
    // Generate presigned URL for download
    const presignedUrl = await s3Client.presign(fileKey, {
      expiresIn,
      method: "GET"
    });
    
    return presignedUrl;
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    throw new Error("Failed to generate download URL");
  }
};
