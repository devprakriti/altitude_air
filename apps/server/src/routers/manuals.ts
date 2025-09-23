import { Elysia, t } from "elysia";
import { ManualService } from "../services/manualService";
import { FileImportService } from "../services/fileImportService";
import { commonErrors } from "../lib/error-handler";
import { authPlugin } from "../lib/auth";

export const manualsRouter = new Elysia({ 
	prefix: "/manuals",
	detail: {
		tags: ["Manuals"]
	}
})
	.use(authPlugin)
	// Basic CRUD operations
	.post("/", async ({body, user, session}) => {
		return await ManualService.createCompanyManual({
			title: body.title,
			description: body.description,
			filePath: body.filePath,
			fileType: body.fileType,
			fileSize: body.fileSize,
			organizationId: session.activeOrganizationId || 'default',
			uploadedBy: user.id,
		});
	}, {
		auth: true,
		body: t.Object({
			title: t.String(),
			description: t.Optional(t.String()),
			filePath: t.String(),
			fileType: t.String(),
			fileSize: t.Optional(t.Number()),
		}),
		response: {
			200: t.Array(t.Object({
				id: t.Number(),
				title: t.String(),
				description: t.Union([t.String(), t.Null()]),
				filePath: t.String(),
				fileType: t.String(),
				fileSize: t.Union([t.Number(), t.Null()]),
				organizationId: t.String(),
				uploadedBy: t.String(),
				status: t.Boolean(),
				createdAt: t.Date(),
				updatedAt: t.Date()
			})),
			...commonErrors
		},
		detail: {
			summary: "Create a company manual",
			description: "Upload and create a new company manual document",
		}
	})
	.get("/", async ({ query, user, session }) => {
		return await ManualService.getCompanyManuals(
			session.activeOrganizationId || 'default',
			query.page || 1,
			query.pageSize || 10,
			query.search
		);
	}, {
		auth: true,
		query: t.Object({
			page: t.Optional(t.Numeric()),
			pageSize: t.Optional(t.Numeric()),
			search: t.Optional(t.String())
		}),
		response: {
			200: t.Object({
				manuals: t.Array(t.Object({
					id: t.Number(),
					title: t.String(),
					description: t.Union([t.String(), t.Null()]),
					filePath: t.String(),
					fileType: t.String(),
					fileSize: t.Union([t.Number(), t.Null()]),
					organizationId: t.String(),
					uploadedBy: t.String(),
					status: t.Boolean(),
					createdAt: t.Date(),
					updatedAt: t.Date()
				})),
				totalCount: t.Number(),
				totalPages: t.Number()
			}),
			...commonErrors
		},
		detail: {
			summary: "Get company manuals",
			description: "Retrieve company manuals for an organization with pagination and search",
		}
	})
	.put("/:id", async ({ params, body, user, session }) => {
		return await ManualService.updateCompanyManual(params.id, body);
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		body: t.Object({
			title: t.Optional(t.String()),
			description: t.Optional(t.String()),
			filePath: t.Optional(t.String()),
			fileType: t.Optional(t.String()),
			fileSize: t.Optional(t.Number()),
		}),
		response: {
			200: t.Array(t.Object({
				id: t.Number(),
				title: t.String(),
				description: t.Union([t.String(), t.Null()]),
				filePath: t.String(),
				fileType: t.String(),
				fileSize: t.Union([t.Number(), t.Null()]),
				organizationId: t.String(),
				uploadedBy: t.String(),
				status: t.Boolean(),
				createdAt: t.Date(),
				updatedAt: t.Date()
			})),
			...commonErrors
		},
		detail: {
			summary: "Update a company manual",
			description: "Update an existing company manual document",
		}
	})
	.delete("/:id", async ({ params, user, session }) => {
		return await ManualService.deleteCompanyManual(params.id);
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		response: {
			200: t.Array(t.Object({
				id: t.Number(),
				title: t.String(),
				description: t.Union([t.String(), t.Null()]),
				filePath: t.String(),
				fileType: t.String(),
				fileSize: t.Union([t.Number(), t.Null()]),
				organizationId: t.String(),
				uploadedBy: t.String(),
				status: t.Boolean(),
				createdAt: t.Date(),
				updatedAt: t.Date()
			})),
			...commonErrors
		},
		detail: {
			summary: "Delete a company manual",
			description: "Delete a company manual document by its ID",
		}
	})
	// File upload and import endpoints
	.post("/upload", async ({ body, user, session }) => {
		const { file } = body as { file: File };
		
		if (!file) {
			throw new Error("No file provided");
		}

		const result = await ManualService.processFileUpload(
			file,
			session.activeOrganizationId || 'default',
			user.id
		);

		return {
			success: true,
			message: `Successfully imported ${result.items.length} items`,
			items: result.items,
			documentId: result.documentId
		};
	}, {
		auth: true,
		body: t.Object({
			file: t.File()
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				message: t.String(),
				items: t.Array(t.Object({
					sn: t.Optional(t.String()),
					name: t.Optional(t.String()),
					issueDate: t.Optional(t.String()),
					issueNo: t.Optional(t.String()),
					revDate: t.Optional(t.String()),
					revNo: t.Optional(t.String()),
					location: t.Optional(t.String())
				})),
				documentId: t.Number()
			}),
			...commonErrors
		},
		detail: {
			summary: "Upload and import Excel/CSV file",
			description: "Upload an Excel or CSV file and import manual items",
		}
	})
	// Static document endpoints
	.post("/static/:key/upload", async ({ params, body, user, session }) => {
		const { key } = params;
		const { file } = body as { file: File };
		
		if (!file) {
			throw new Error("No file provided");
		}

		// Check if static document already exists
		const existing = await ManualService.getStaticDocumentByKey(key, session.activeOrganizationId || 'default');
		if (existing) {
			throw new Error("Static document already exists. Use update endpoint instead.");
		}

		// Save file to S3
		const buffer = await file.arrayBuffer();
		const timestamp = Date.now();
		const sanitizedFilename = file.name.replace(/[^\w.\-]/g, '_');
		const savedFilename = `${timestamp}__static__${key}__${sanitizedFilename}`;
		const fileKey = `uploads/${user.id}/${savedFilename}`;

		// Upload to S3
		const { s3Client } = await import("../lib/s3");
		await s3Client.write(fileKey, Buffer.from(buffer), {
			type: file.type,
			acl: 'private'
		});

		// Create document record
		const [document] = await ManualService.createCompanyManual({
			title: key,
			description: `Static document: ${key}`,
			filePath: fileKey,
			fileType: file.type,
			fileSize: file.size,
			organizationId: session.activeOrganizationId || 'default',
			uploadedBy: user.id
		});

		return {
			success: true,
			key,
			documentId: document.id
		};
	}, {
		auth: true,
		params: t.Object({ key: t.String() }),
		body: t.Object({
			file: t.File()
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				key: t.String(),
				documentId: t.Number()
			}),
			...commonErrors
		},
		detail: {
			summary: "Upload static document",
			description: "Upload a static document by key",
		}
	})
	.patch("/static/:key/data", async ({ params, body, user, session }) => {
		const { key } = params;
		
		// Get existing static document
		const existing = await ManualService.getStaticDocumentByKey(key, session.activeOrganizationId || 'default');
		if (!existing) {
			throw new Error("Static document not found. Upload first.");
		}

		// Generate PDF based on key and data
		const result = await ManualService.generateStaticPDF(
			key,
			body,
			session.activeOrganizationId || 'default',
			user.id
		);

		return {
			success: true,
			key,
			documentId: result.documentId,
			fileKey: result.fileKey
		};
	}, {
		auth: true,
		params: t.Object({ key: t.String() }),
		body: t.Object({
			title: t.Optional(t.String()),
			bodyText: t.Optional(t.String()),
			rows: t.Optional(t.Array(t.Object({
				name: t.String(),
				jan: t.Optional(t.Union([t.String(), t.Number()])),
				feb: t.Optional(t.Union([t.String(), t.Number()])),
				mar: t.Optional(t.Union([t.String(), t.Number()])),
				apr: t.Optional(t.Union([t.String(), t.Number()])),
				may: t.Optional(t.Union([t.String(), t.Number()])),
				jun: t.Optional(t.Union([t.String(), t.Number()])),
				jul: t.Optional(t.Union([t.String(), t.Number()])),
				aug: t.Optional(t.Union([t.String(), t.Number()])),
				sep: t.Optional(t.Union([t.String(), t.Number()])),
				oct: t.Optional(t.Union([t.String(), t.Number()])),
				nov: t.Optional(t.Union([t.String(), t.Number()])),
				dec: t.Optional(t.Union([t.String(), t.Number()]))
			}))),
			asOfDate: t.Optional(t.String()),
			year: t.Optional(t.String()),
			legend: t.Optional(t.Array(t.String()))
		}),
		response: {
			200: t.Object({
				success: t.Boolean(),
				key: t.String(),
				documentId: t.Number(),
				fileKey: t.String()
			}),
			...commonErrors
		},
		detail: {
			summary: "Update static document data",
			description: "Update static document data and regenerate PDF",
		}
	})
	.get("/static/:key/meta", async ({ params, user, session }) => {
		const { key } = params;
		
		const document = await ManualService.getStaticDocumentByKey(key, session.activeOrganizationId || 'default');
		if (!document) {
			throw new Error("Static document not found");
		}

		let data = null;
		try {
			data = document.description ? JSON.parse(document.description) : null;
		} catch {
			// Ignore JSON parse errors
		}

		return {
			id: document.id,
			documentName: document.title,
			fileKey: document.filePath,
			lastUpdated: document.updatedAt || document.createdAt,
			updatedBy: document.uploadedBy,
			data
		};
	}, {
		auth: true,
		params: t.Object({ key: t.String() }),
		response: {
			200: t.Object({
				id: t.Number(),
				documentName: t.String(),
				fileKey: t.String(),
				lastUpdated: t.Date(),
				updatedBy: t.String(),
				data: t.Union([t.Any(), t.Null()])
			}),
			...commonErrors
		},
		detail: {
			summary: "Get static document metadata",
			description: "Get metadata for a static document",
		}
	})
	// File download endpoints
	.get("/download/:id", async ({ params, user, session, set }) => {
		const document = await ManualService.getManualById(params.id);
		if (!document) {
			set.status = 404;
			return { success: false, error: "Document not found" };
		}

		// Check if user has access to this document
		if (document.organizationId !== (session.activeOrganizationId || 'default')) {
			set.status = 403;
			return { success: false, error: "Access denied" };
		}

		// Get file from S3
		const fileBuffer = await ManualService.getFileFromS3(document.filePath);
		if (!fileBuffer) {
			set.status = 404;
			return { success: false, error: "File not found" };
		}

		// Set appropriate headers
		set.headers = {
			"Content-Type": document.fileType || "application/octet-stream",
			"Content-Length": fileBuffer.length.toString(),
			"Content-Disposition": `attachment; filename="${document.title}"`,
			"Cache-Control": "private, max-age=3600"
		};

		return new Response(new Uint8Array(fileBuffer));
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		detail: {
			summary: "Download document",
			description: "Download a document by its ID",
		}
	})
	.get("/preview/:id", async ({ params, user, session, set }) => {
		const document = await ManualService.getManualById(params.id);
		if (!document) {
			set.status = 404;
			return { success: false, error: "Document not found" };
		}

		// Check if user has access to this document
		if (document.organizationId !== (session.activeOrganizationId || 'default')) {
			set.status = 403;
			return { success: false, error: "Access denied" };
		}

		// Get file from S3
		const fileBuffer = await ManualService.getFileFromS3(document.filePath);
		if (!fileBuffer) {
			set.status = 404;
			return { success: false, error: "File not found" };
		}

		// Set appropriate headers for preview
		set.headers = {
			"Content-Type": document.fileType || "application/octet-stream",
			"Content-Length": fileBuffer.length.toString(),
			"Content-Disposition": `inline; filename="${document.title}"`,
			"Cache-Control": "private, max-age=3600"
		};

		return new Response(new Uint8Array(fileBuffer));
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		detail: {
			summary: "Preview document",
			description: "Preview a document by its ID",
		}
	})
	// Template download endpoints
	.get("/templates/csv", async ({ set }) => {
		const csvContent = FileImportService.generateSampleCSV();
		
		set.headers = {
			"Content-Type": "text/csv",
			"Content-Disposition": "attachment; filename=manual_items_template.csv"
		};

		return csvContent;
	}, {
		auth: true,
		detail: {
			summary: "Download CSV template",
			description: "Download a CSV template for manual items import",
		}
	})
	.get("/templates/excel", async ({ set }) => {
		const excelBuffer = FileImportService.generateSampleExcel();
		
		set.headers = {
			"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Length": excelBuffer.length.toString(),
			"Content-Disposition": "attachment; filename=manual_items_template.xlsx"
		};

		return new Response(new Uint8Array(excelBuffer));
	}, {
		auth: true,
		detail: {
			summary: "Download Excel template",
			description: "Download an Excel template for manual items import",
		}
	});