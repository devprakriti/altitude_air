import { Elysia, t } from "elysia";
import { OrganizationService } from "../services/organization";
import { commonErrors } from "../lib/error-handler";
import { authPlugin } from "../lib/auth";

export const manualsRouter = new Elysia({ 
	prefix: "/manuals",
	detail: {
		tags: ["Manuals"]
	}
})
	.use(authPlugin)
	.post("/", async ({body, user}) => {
		return await OrganizationService.createCompanyManual({
			title: body.title,
			description: body.description,
			filePath: body.filePath,
			fileType: body.fileType,
			fileSize: body.fileSize,
			organizationId: body.organizationId,
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
			organizationId: t.String()
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
	.get("/", async ({ query }) => {
		return await OrganizationService.getCompanyManuals(
			query.organizationId,
			query.page || 1,
			query.pageSize || 10,
			query.search
		);
	}, {
		auth: true,
		query: t.Object({
			organizationId: t.String(),
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
	.put("/:id", async ({ params, body }) => {
		return await OrganizationService.updateCompanyManual(params.id, body);
	}, {
		auth: true,
		params: t.Object({ id: t.Numeric() }),
		body: t.Object({
			title: t.Optional(t.String()),
			description: t.Optional(t.String()),
			filePath: t.Optional(t.String()),
			fileType: t.Optional(t.String()),
			fileSize: t.Optional(t.Number()),
			organizationId: t.String()
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
	.delete("/:id", async ({ params }) => {
		return await OrganizationService.deleteCompanyManual(params.id);
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
	});
