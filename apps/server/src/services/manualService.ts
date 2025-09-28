import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { companyManuals } from "../db/schema/rbac";
import { generateFileKey, s3Client } from "../lib/s3";
import type { ManualItem } from "./fileImportService";
import { FileImportService } from "./fileImportService";
import type { TechnicalLibraryData, TrainingOverviewData } from "./pdfService";
import { PDFService } from "./pdfService";

// Extended schema for manual items (we'll add this to the database schema)
export type ManualItemRecord = {
  id?: number;
  sn?: string;
  name?: string;
  issueDate?: string;
  issueNo?: string;
  revDate?: string;
  revNo?: string;
  location?: string;
  documentId?: number;
  organizationId: string;
  createdBy: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Static document mapping
export type StaticDocumentMapping = {
  id?: number;
  key: string;
  documentId: number;
  title: string;
  jsonPayload?: any;
  updatedBy: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class ManualService {
  /**
   * Create a company manual
   */
  static async createCompanyManual(data: {
    title: string;
    description?: string;
    filePath: string;
    fileType: string;
    fileSize?: number;
    organizationId: string;
    uploadedBy: string;
  }) {
    return await db
      .insert(companyManuals)
      .values({
        title: data.title,
        description: data.description,
        filePath: data.filePath,
        fileType: data.fileType,
        fileSize: data.fileSize,
        organizationId: data.organizationId,
        uploadedBy: data.uploadedBy,
      })
      .returning();
  }

  /**
   * Get company manuals with pagination
   */
  static async getCompanyManuals(
    organizationId: string,
    page = 1,
    pageSize = 10,
    search?: string
  ) {
    const limit = pageSize;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(companyManuals.organizationId, organizationId)];

    if (search) {
      // Add search condition if needed
      // whereConditions.push(like(companyManuals.title, `%${search}%`));
    }

    // Get total count
    const [totalCountResult] = await db
      .select({ count: count() })
      .from(companyManuals)
      .where(and(...whereConditions));

    const totalCount = totalCountResult.count;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated results
    const manuals = await db
      .select()
      .from(companyManuals)
      .where(and(...whereConditions))
      .orderBy(desc(companyManuals.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      manuals,
      totalCount,
      totalPages,
    };
  }

  /**
   * Update company manual
   */
  static async updateCompanyManual(
    id: number,
    data: Partial<typeof companyManuals.$inferInsert>
  ) {
    return await db
      .update(companyManuals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companyManuals.id, id))
      .returning();
  }

  /**
   * Delete company manual
   */
  static async deleteCompanyManual(id: number) {
    return await db
      .delete(companyManuals)
      .where(eq(companyManuals.id, id))
      .returning();
  }

  /**
   * Get manual by ID
   */
  static async getManualById(id: number) {
    const [manual] = await db
      .select()
      .from(companyManuals)
      .where(eq(companyManuals.id, id))
      .limit(1);

    return manual;
  }

  /**
   * Create static document mapping
   */
  static async createStaticDocumentMapping(data: {
    key: string;
    documentId: number;
    title: string;
    jsonPayload?: any;
    updatedBy: string;
    organizationId: string;
  }) {
    // This would need a separate table for static document mappings
    // For now, we'll store it in the companyManuals table with a special title
    return await db
      .insert(companyManuals)
      .values({
        title: `STATIC_${data.key}`,
        description: JSON.stringify(data.jsonPayload),
        filePath: `static/${data.key}`,
        fileType: "application/pdf",
        organizationId: data.organizationId,
        uploadedBy: data.updatedBy,
      })
      .returning();
  }

  /**
   * Get static document by key
   */
  static async getStaticDocumentByKey(key: string, organizationId: string) {
    const [document] = await db
      .select()
      .from(companyManuals)
      .where(
        and(
          eq(companyManuals.title, `STATIC_${key}`),
          eq(companyManuals.organizationId, organizationId)
        )
      )
      .limit(1);

    return document;
  }

  /**
   * Update static document
   */
  static async updateStaticDocument(
    key: string,
    data: {
      documentId?: number;
      title?: string;
      jsonPayload?: any;
      updatedBy: string;
      organizationId: string;
    }
  ) {
    return await db
      .update(companyManuals)
      .set({
        title: data.title ? `STATIC_${key}` : undefined,
        description: data.jsonPayload
          ? JSON.stringify(data.jsonPayload)
          : undefined,
        uploadedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(companyManuals.title, `STATIC_${key}`),
          eq(companyManuals.organizationId, data.organizationId)
        )
      )
      .returning();
  }

  /**
   * Generate and save PDF for static document
   */
  static async generateStaticPDF(
    key: string,
    data: any,
    organizationId: string,
    userId: string
  ): Promise<{ fileKey: string; documentId: number }> {
    let pdfBuffer: Buffer;

    switch (key) {
      case "training-overview":
        pdfBuffer = await PDFService.generateTrainingOverviewPDF(
          data as TrainingOverviewData
        );
        break;
      case "technical-library":
        pdfBuffer = await PDFService.generateTechnicalLibraryPDF(
          data as TechnicalLibraryData
        );
        break;
      default:
        pdfBuffer = await PDFService.generateSimpleDocumentPDF(
          data.title || key,
          data.bodyText || ""
        );
    }

    // Save PDF to S3
    const { fileKey, size } = await PDFService.savePDFToS3(
      pdfBuffer,
      `${key}.pdf`,
      userId
    );

    // Create or update document record
    const existingDoc = await ManualService.getStaticDocumentByKey(
      key,
      organizationId
    );

    if (existingDoc) {
      // Update existing document
      await ManualService.updateStaticDocument(key, {
        title: `${key}.pdf`,
        jsonPayload: data,
        updatedBy: userId,
        organizationId,
      });

      return { fileKey, documentId: existingDoc.id };
    }
    // Create new document
    const [newDoc] = await ManualService.createCompanyManual({
      title: `${key}.pdf`,
      description: JSON.stringify(data),
      filePath: fileKey,
      fileType: "application/pdf",
      fileSize: size,
      organizationId,
      uploadedBy: userId,
    });

    return { fileKey, documentId: newDoc.id };
  }

  /**
   * Process uploaded Excel/CSV file
   */
  static async processFileUpload(
    file: File,
    organizationId: string,
    userId: string
  ): Promise<{ items: ManualItem[]; documentId: number }> {
    // Validate file type
    const allowedTypes = ["xlsx", "xls", "csv"];
    const fileExtension = FileImportService.getFileExtension(file.name);

    if (!allowedTypes.includes(fileExtension)) {
      throw new Error("Invalid file type. Please upload a CSV or Excel file.");
    }

    // Validate file size (10MB max)
    if (!FileImportService.validateFileSize(file, 10)) {
      throw new Error("File size too large. Maximum size is 10MB.");
    }

    // Parse file based on type
    let items: ManualItem[];

    if (fileExtension === "csv") {
      items = await FileImportService.parseCSVFile(file);
    } else {
      items = await FileImportService.parseExcelFile(file);
    }

    // Save original file to S3
    const buffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^\w.-]/g, "_");
    const savedFilename = `${timestamp}__${sanitizedFilename}`;
    const fileKey = generateFileKey(userId, savedFilename);

    // Upload to S3
    await s3Client.write(fileKey, Buffer.from(buffer), {
      type: file.type,
      acl: "private",
    });

    // Create document record
    const [document] = await ManualService.createCompanyManual({
      title: `Import: ${file.name}`,
      description: `Imported ${items.length} items from ${file.name}`,
      filePath: fileKey,
      fileType: file.type,
      fileSize: file.size,
      organizationId,
      uploadedBy: userId,
    });

    return { items, documentId: document.id };
  }

  /**
   * Get file from S3
   */
  static async getFileFromS3(fileKey: string): Promise<Buffer | null> {
    try {
      const exists = await s3Client.exists(fileKey);
      if (!exists) {
        return null;
      }

      const s3File = s3Client.file(fileKey);
      const arrayBuffer = await s3File.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get file stats from S3
   */
  static async getFileStatsFromS3(
    fileKey: string
  ): Promise<{ size: number; exists: boolean }> {
    try {
      const exists = await s3Client.exists(fileKey);
      if (!exists) {
        return { size: 0, exists: false };
      }

      const stat = await s3Client.stat(fileKey);
      return { size: stat.size, exists: true };
    } catch (_error) {
      return { size: 0, exists: false };
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFileFromS3(fileKey: string): Promise<boolean> {
    try {
      await s3Client.delete(fileKey);
      return true;
    } catch (_error) {
      return false;
    }
  }
}
