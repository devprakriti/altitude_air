import { Elysia, t } from "elysia";
import { OrganizationService } from "../lib/organization";
import { monitoringModels, commonModels } from "../models";

export const monitoringRouter = new Elysia({ 
	prefix: "/monitoring",
	detail: {
		tags: ["Monitoring"],
		security: [{ bearerAuth: [] }]
	}
})
	.guard({
		detail: {
			description: "Requires authentication"
		}
	})
	.post("/charts", async ({ body }) => {
		// Better Auth handles authorization through session context
		// Ensure config is always present, even if undefined
		return await OrganizationService.createMonitoringChart({
			name: body.name,
			description: body.description || undefined,
			chartType: body.chartType,
			config: body.config ?? {},
			organizationId: body.organizationId,
		});
	}, {
		auth: true,
		body: monitoringModels.CreateMonitoringChart,
		response: {
			200: monitoringModels.MonitoringChartArray,
			400: commonModels.Error,
			401: commonModels.Error
		},
		detail: {
			summary: "Create a monitoring chart",
			description: "Create a new monitoring chart for an organization",
		}
	})
	.get("/charts", async ({ query }) => {
		// Better Auth handles authorization through session context
		return await OrganizationService.getMonitoringCharts(
			query.organizationId,
			query.page || 1,
			query.pageSize || 10
		);
	}, {
		auth: true,
		query: t.Object({
			organizationId: t.String({ description: "Organization ID" }),
			page: t.Optional(t.Numeric({ minimum: 1, description: "Page number" })),
			pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, description: "Number of items per page" })),
		}, { description: "Query parameters for pagination" }),
		response: {
			200: monitoringModels.MonitoringChartsResponse,
			400: commonModels.Error,
			401: commonModels.Error
		},
		detail: {
			summary: "Get monitoring charts",
			description: "Retrieve monitoring charts for an organization with pagination",
		}
	})
	.put("/charts/:id", async ({ params, body }) => {
		// Better Auth handles authorization through session context
		const { id, organizationId, ...updateData } = { ...body, id: params.id };
		return await OrganizationService.updateMonitoringChart(id, updateData);
	}, {
		auth: true,
		params: t.Object({
			id: t.Numeric({ description: "Chart ID" })
		}, { description: "Chart identifier" }),
		body: monitoringModels.UpdateMonitoringChart,
		response: {
			200: monitoringModels.MonitoringChartArray,
			400: commonModels.Error,
			401: commonModels.Error,
			404: commonModels.Error
		},
		detail: {
			summary: "Update a monitoring chart",
			description: "Update an existing monitoring chart",
		}
	})
	.delete("/charts/:id", async ({ params, query }) => {
		// Better Auth handles authorization through session context
		return await OrganizationService.deleteMonitoringChart(params.id);
	}, {
		auth: true,
		params: t.Object({
			id: t.Numeric({ description: "Chart ID" })
		}, { description: "Chart identifier" }),
		query: t.Object({
			organizationId: t.String({ description: "Organization ID" })
		}, { description: "Organization identifier" }),
		response: {
			200: monitoringModels.MonitoringChartArray,
			401: commonModels.Error,
			404: commonModels.Error
		},
		detail: {
			summary: "Delete a monitoring chart",
			description: "Delete a monitoring chart by its ID",
		}
	});
