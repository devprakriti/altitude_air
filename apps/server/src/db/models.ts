import { t } from 'elysia'
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { todo } from './schema/todo'
import { monitoringCharts, companyManuals, userProfiles, systemConfig } from './schema/rbac'
import { spreads } from './utils'

// Create table singleton for easy access
export const table = {
    todo,
    monitoringCharts,
    companyManuals,
    userProfiles,
    systemConfig
} as const

// Create database models with drizzle-typebox integration
export const db = {
    insert: spreads({
        todo: table.todo,
        monitoringCharts: table.monitoringCharts,
        companyManuals: table.companyManuals,
        userProfiles: table.userProfiles,
        systemConfig: table.systemConfig,
    }, 'insert'),
    select: spreads({
        todo: table.todo,
        monitoringCharts: table.monitoringCharts,
        companyManuals: table.companyManuals,
        userProfiles: table.userProfiles,
        systemConfig: table.systemConfig,
    }, 'select')
} as const

// Refined schemas for specific use cases
export const todoSchemas = {
    // For creating todos (exclude auto-generated fields)
    create: t.Object({
        text: t.String({ minLength: 1 })
    }),
    // For updating todos (make all fields optional except id)
    update: t.Object({
        text: t.Optional(t.String({ minLength: 1 })),
        completed: t.Optional(t.Boolean())
    }),
    // For selecting todos (include all fields)
    select: t.Object({
        id: t.Number(),
        text: t.String(),
        completed: t.Boolean()
    }),
    // For array responses (returning operations)
    selectArray: t.Array(t.Object({
        id: t.Number(),
        text: t.String(),
        completed: t.Boolean()
    }))
} as const

export const monitoringSchemas = {
    // For creating monitoring charts (exclude auto-generated fields)
    create: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        chartType: t.String({ minLength: 1 }),
        config: t.Any(),
        organizationId: t.String()
    }),
    // For updating monitoring charts (make all fields optional except id)
    update: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        chartType: t.Optional(t.String({ minLength: 1 })),
        config: t.Optional(t.Any()),
        organizationId: t.String()
    }),
    // For selecting monitoring charts (include all fields)
    select: t.Object({
        id: t.Number(),
        name: t.String(),
        description: t.Union([t.String(), t.Null()]),
        chartType: t.String(),
        config: t.Any(),
        organizationId: t.String(),
        status: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date()
    }),
    // For array responses (returning operations)
    selectArray: t.Array(t.Object({
        id: t.Number(),
        name: t.String(),
        description: t.Union([t.String(), t.Null()]),
        chartType: t.String(),
        config: t.Any(),
        organizationId: t.String(),
        status: t.Boolean(),
        createdAt: t.Date(),
        updatedAt: t.Date()
    })),
    // For paginated responses
    paginatedResponse: t.Object({
        charts: t.Array(t.Object({
            id: t.Number(),
            name: t.String(),
            description: t.Union([t.String(), t.Null()]),
            chartType: t.String(),
            config: t.Any(),
            organizationId: t.String(),
            status: t.Boolean(),
            createdAt: t.Date(),
            updatedAt: t.Date()
        })),
        totalCount: t.Number(),
        totalPages: t.Number()
    })
} as const

export const manualSchemas = {
    // For creating company manuals (exclude auto-generated fields)
    create: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        filePath: t.String({ minLength: 1 }),
        fileType: t.String({ minLength: 1 }),
        fileSize: t.Optional(t.Number()),
        organizationId: t.String()
    }),
    // For updating company manuals (make all fields optional except id)
    update: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        filePath: t.Optional(t.String({ minLength: 1 })),
        fileType: t.Optional(t.String({ minLength: 1 })),
        fileSize: t.Optional(t.Number()),
        organizationId: t.String()
    }),
    // For selecting company manuals (include all fields)
    select: t.Object({
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
    }),
    // For array responses (returning operations)
    selectArray: t.Array(t.Object({
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
    // For paginated responses
    paginatedResponse: t.Object({
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
    })
} as const
