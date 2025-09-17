import { t } from 'elysia'
import { todoSchemas, monitoringSchemas, manualSchemas } from '../db/models'

// Common response models
export const commonModels = {
  Error: t.Object({
    error: t.String(),
    message: t.String(),
    statusCode: t.Number()
  }),
  
  Success: t.Object({
    success: t.Boolean(),
    message: t.String()
  }),
  
  Pagination: t.Object({
    page: t.Number(),
    pageSize: t.Number(),
    totalCount: t.Number(),
    totalPages: t.Number()
  })
}

// Todo models - using Drizzle-generated schemas
export const todoModels = {
  Todo: todoSchemas.select,
  TodoArray: todoSchemas.selectArray,
  CreateTodo: todoSchemas.create,
  UpdateTodo: todoSchemas.update
}

// Monitoring models - using Drizzle-generated schemas
export const monitoringModels = {
  MonitoringChart: monitoringSchemas.select,
  MonitoringChartArray: monitoringSchemas.selectArray,
  CreateMonitoringChart: monitoringSchemas.create,
  UpdateMonitoringChart: monitoringSchemas.update,
  MonitoringChartsResponse: monitoringSchemas.paginatedResponse
}

// Manuals models - using Drizzle-generated schemas
export const manualModels = {
  CompanyManual: manualSchemas.select,
  CompanyManualArray: manualSchemas.selectArray,
  CreateCompanyManual: manualSchemas.create,
  UpdateCompanyManual: manualSchemas.update,
  CompanyManualsResponse: manualSchemas.paginatedResponse
}

// Auth models
export const authModels = {
  SignInRequest: t.Object({
    email: t.String({ format: "email", description: "User email address" }),
    password: t.String({ minLength: 6, description: "User password" })
  }),
  SignUpRequest: t.Object({
    email: t.String({ format: "email", description: "User email address" }),
    password: t.String({ minLength: 6, description: "User password" }),
    name: t.String({ minLength: 1, description: "User full name" })
  }),
  SessionResponse: t.Object({
    user: t.Object({
      id: t.String(),
      email: t.String(),
      name: t.String(),
      emailVerified: t.Boolean(),
      image: t.Union([t.String(), t.Null()]),
      createdAt: t.Date(),
      updatedAt: t.Date()
    }),
    session: t.Object({
      id: t.String(),
      expiresAt: t.Date(),
      token: t.String(),
      createdAt: t.Date(),
      updatedAt: t.Date(),
      ipAddress: t.Union([t.String(), t.Null()]),
      userAgent: t.Union([t.String(), t.Null()]),
      userId: t.String()
    })
  }),
  AuthResponse: t.Object({
    user: t.Object({
      id: t.String(),
      email: t.String(),
      name: t.String(),
      emailVerified: t.Boolean(),
      image: t.Union([t.String(), t.Null()]),
      createdAt: t.Date(),
      updatedAt: t.Date()
    }),
    session: t.Object({
      id: t.String(),
      expiresAt: t.Date(),
      token: t.String(),
      createdAt: t.Date(),
      updatedAt: t.Date(),
      ipAddress: t.Union([t.String(), t.Null()]),
      userAgent: t.Union([t.String(), t.Null()]),
      userId: t.String()
    })
  })
}

// Combine all models
export const allModels = {
  ...commonModels,
  ...todoModels,
  ...monitoringModels,
  ...manualModels,
  ...authModels
}
