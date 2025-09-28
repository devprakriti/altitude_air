import { Elysia, t } from "elysia";
import { commonErrors } from "../lib/error-handler";
import { OrganizationService } from "../services/organization";

export const monitoringRouter = new Elysia({
  prefix: "/monitoring",
  detail: {
    tags: ["Monitoring"],
  },
})
  .post(
    "/charts",
    async ({ body }) => {
      return await OrganizationService.createMonitoringChart({
        name: body.name,
        description: body.description,
        chartType: body.chartType,
        config: body.config ?? {},
        organizationId: body.organizationId,
      });
    },
    {
      auth: true,
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        chartType: t.String(),
        config: t.Optional(t.Any()),
        organizationId: t.String(),
      }),
      response: {
        200: t.Array(
          t.Object({
            id: t.Number(),
            name: t.String(),
            description: t.Union([t.String(), t.Null()]),
            chartType: t.String(),
            config: t.Any(),
            organizationId: t.String(),
            status: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
          })
        ),
        ...commonErrors,
      },
      detail: {
        summary: "Create a monitoring chart",
        description: "Create a new monitoring chart for an organization",
      },
    }
  )
  .get(
    "/charts",
    async ({ query }) => {
      return await OrganizationService.getMonitoringCharts(
        query.organizationId,
        query.page || 1,
        query.pageSize || 10
      );
    },
    {
      auth: true,
      query: t.Object({
        organizationId: t.String(),
        page: t.Optional(t.Numeric()),
        pageSize: t.Optional(t.Numeric()),
      }),
      response: {
        200: t.Object({
          charts: t.Array(
            t.Object({
              id: t.Number(),
              name: t.String(),
              description: t.Union([t.String(), t.Null()]),
              chartType: t.String(),
              config: t.Any(),
              organizationId: t.String(),
              status: t.Boolean(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            })
          ),
          totalCount: t.Number(),
          totalPages: t.Number(),
        }),
        ...commonErrors,
      },
      detail: {
        summary: "Get monitoring charts",
        description:
          "Retrieve monitoring charts for an organization with pagination",
      },
    }
  )
  .put(
    "/charts/:id",
    async ({ params, body }) => {
      return await OrganizationService.updateMonitoringChart(params.id, body);
    },
    {
      auth: true,
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        chartType: t.Optional(t.String()),
        config: t.Optional(t.Any()),
        organizationId: t.String(),
      }),
      response: {
        200: t.Array(
          t.Object({
            id: t.Number(),
            name: t.String(),
            description: t.Union([t.String(), t.Null()]),
            chartType: t.String(),
            config: t.Any(),
            organizationId: t.String(),
            status: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
          })
        ),
        ...commonErrors,
      },
      detail: {
        summary: "Update a monitoring chart",
        description: "Update an existing monitoring chart",
      },
    }
  )
  .delete(
    "/charts/:id",
    async ({ params }) => {
      return await OrganizationService.deleteMonitoringChart(params.id);
    },
    {
      auth: true,
      params: t.Object({ id: t.Numeric() }),
      response: {
        200: t.Array(
          t.Object({
            id: t.Number(),
            name: t.String(),
            description: t.Union([t.String(), t.Null()]),
            chartType: t.String(),
            config: t.Any(),
            organizationId: t.String(),
            status: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
          })
        ),
        ...commonErrors,
      },
      detail: {
        summary: "Delete a monitoring chart",
        description: "Delete a monitoring chart by its ID",
      },
    }
  );
