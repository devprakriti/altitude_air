import { t } from 'elysia'

// Common error response models
export const errorModels = {
  Error: t.Object({
    error: t.String(),
    message: t.String(),
    statusCode: t.Number()
  }),
  
  Success: t.Object({
    success: t.Boolean(),
    message: t.String()
  })
}

// Error handler utility
export const createErrorResponse = (statusCode: number, message: string, error: string = "Error") => ({
  error,
  message,
  statusCode
})

// Common error responses
export const commonErrors = {
  400: errorModels.Error,
  401: errorModels.Error,
  403: errorModels.Error,
  404: errorModels.Error,
  500: errorModels.Error
}
