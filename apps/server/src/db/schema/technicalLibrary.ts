import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Technical library files table
export const technicalLibraryFiles = pgTable("technical_library_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileKey: text("file_key").notNull(), // S3 key
  category: text("category").notNull(), // company-document, caan-document, manufacturers-document, etc.
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  remarks: text("remarks"),
  organizationId: text("organization_id").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  status: boolean("status").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const technicalLibraryFilesRelations = relations(
  technicalLibraryFiles,
  ({ one }) => ({
    // Organization relationship is handled by Better Auth
  })
);
