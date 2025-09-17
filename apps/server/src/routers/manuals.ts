import { Elysia, t } from "elysia";
import { OrganizationService } from "../lib/organization";
import { manualModels, commonModels } from "../models";

export const manualsRouter = new Elysia({ 
	prefix: "/manuals",
	detail: {
		tags: ["Manuals"],
		security: [{ bearerAuth: [] }]
	}
})
	.guard({
		detail: {
			description: "Requires authentication"
		}
	})
	.post("/", async ({ body, ...context }) => {
		// Better Auth handles authorization through session context
		const user = (context as any).user;
		return await OrganizationService.createCompanyManual({
			title: body.title,
			description: body.description || undefined,
			filePath: body.filePath,
			fileType: body.fileType,
			fileSize: body.fileSize || undefined,
			organizationId: body.organizationId,
			uploadedBy: user?.id || "",
		});
	}, {
		auth: true,
		body: manualModels.CreateCompanyManual,
		response: {
			200: manualModels.CompanyManualArray,
			400: commonModels.Error,
			401: commonModels.Error
		},
		detail: {
			summary: "Create a company manual",
			description: "Upload and create a new company manual document",
		}
	})
	.get("/", async ({ query }) => {
		// Better Auth handles authorization through session context
		return await OrganizationService.getCompanyManuals(
			query.organizationId,
			query.page || 1,
			query.pageSize || 10,
			query.search
		);
	}, {
		auth: true,
		query: t.Object({
			organizationId: t.String({ description: "Organization ID" }),
			page: t.Optional(t.Numeric({ minimum: 1, description: "Page number" })),
			pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, description: "Number of items per page" })),
			search: t.Optional(t.String({ description: "Search term for filtering manuals" })),
		}, { description: "Query parameters for pagination and search" }),
		response: {
			200: manualModels.CompanyManualsResponse,
			400: commonModels.Error,
			401: commonModels.Error
		},
		detail: {
			summary: "Get company manuals",
			description: "Retrieve company manuals for an organization with pagination and search",
		}
	})
	.put("/:id", async ({ params, body }) => {
		// Better Auth handles authorization through session context
		const { id, organizationId, ...updateData } = { ...body, id: params.id };
		return await OrganizationService.updateCompanyManual(id, updateData);
	}, {
		auth: true,
		params: t.Object({
			id: t.Numeric({ description: "Manual ID" })
		}, { description: "Manual identifier" }),
		body: manualModels.UpdateCompanyManual,
		response: {
			200: manualModels.CompanyManualArray,
			400: commonModels.Error,
			401: commonModels.Error,
			404: commonModels.Error
		},
		detail: {
			summary: "Update a company manual",
			description: "Update an existing company manual document",
		}
	})
	.delete("/:id", async ({ params, query }) => {
		// Better Auth handles authorization through session context
		return await OrganizationService.deleteCompanyManual(params.id);
	}, {
		auth: true,
		params: t.Object({
			id: t.Numeric({ description: "Manual ID" })
		}, { description: "Manual identifier" }),
		query: t.Object({
			organizationId: t.String({ description: "Organization ID" })
		}, { description: "Organization identifier" }),
		response: {
			200: manualModels.CompanyManualArray,
			401: commonModels.Error,
			404: commonModels.Error
		},
		detail: {
			summary: "Delete a company manual",
			description: "Delete a company manual document by its ID",
		}
	});
