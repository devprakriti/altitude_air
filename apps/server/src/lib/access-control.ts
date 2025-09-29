import { s3Client } from "./s3";

// User roles
export type UserRole = "admin" | "user";

// Resource types in the system
export type ResourceType = 
  | "daily_logs"
  | "inspections" 
  | "technical_library"
  | "manuals"
  | "monitoring_charts"
  | "files"
  | "users"
  | "system_config";

// Operations that can be performed on resources
export type Operation = "create" | "read" | "update" | "delete" | "list";

// Result of access control check
export type AccessControlResult = {
  hasAccess: boolean;
  error?: string;
};

// Context for access control decisions
export type AccessContext = {
  userId: string;
  userRole: UserRole;
  resourceType: ResourceType;
  operation: Operation;
  resourceId?: string | number;
  additionalData?: Record<string, any>;
};

/**
 * Permission matrix defining what each role can do with each resource
 */
const PERMISSION_MATRIX: Record<UserRole, Record<ResourceType, Operation[]>> = {
  admin: {
    daily_logs: ["create", "read", "update", "delete", "list"],
    inspections: ["create", "read", "update", "delete", "list"],
    technical_library: ["create", "read", "update", "delete", "list"],
    manuals: ["create", "read", "update", "delete", "list"],
    monitoring_charts: ["create", "read", "update", "delete", "list"],
    files: ["create", "read", "update", "delete", "list"],
    users: ["create", "read", "update", "delete", "list"],
    system_config: ["create", "read", "update", "delete", "list"],
  },
  user: {
    daily_logs: ["create", "read", "update", "delete", "list"],
    inspections: ["create", "read", "update", "delete", "list"],
    technical_library: ["read", "list"], // Users can only view technical library
    manuals: ["read", "list"], // Users can only view manuals
    monitoring_charts: ["read", "list"], // Users can only view charts
    files: ["create", "read", "update", "delete", "list"], // Users can manage their own files
    users: [], // Users cannot manage other users
    system_config: [], // Users cannot access system config
  },
};

/**
 * Main access control function - checks if user has permission for operation
 */
export function checkAccess(context: AccessContext): AccessControlResult {
  try {
    const { userRole, resourceType, operation } = context;

    // Check if role exists
    if (!PERMISSION_MATRIX[userRole]) {
      return { 
        hasAccess: false, 
        error: `Invalid user role: ${userRole}` 
      };
    }

    // Check if resource type exists for this role
    if (!PERMISSION_MATRIX[userRole][resourceType]) {
      return { 
        hasAccess: false, 
        error: `Invalid resource type: ${resourceType}` 
      };
    }

    // Check if operation is allowed for this role and resource
    const allowedOperations = PERMISSION_MATRIX[userRole][resourceType];
    if (!allowedOperations.includes(operation)) {
      return { 
        hasAccess: false, 
        error: `Access denied: ${userRole} cannot ${operation} ${resourceType}` 
      };
    }

    // Additional resource-specific checks
    return performResourceSpecificChecks(context);
  } catch (error) {
    return { 
      hasAccess: false, 
      error: "Access control check failed" 
    };
  }
}

/**
 * Perform additional resource-specific access control checks
 */
function performResourceSpecificChecks(context: AccessContext): AccessControlResult {
  const { resourceType, userId, additionalData } = context;

  switch (resourceType) {
    case "files":
      return checkFileResourceAccess(context);
    
    case "users":
      // Only allow users to access their own user record for read operations
      if (context.operation === "read" && context.resourceId === userId) {
        return { hasAccess: true };
      }
      return { hasAccess: false, error: "Can only access own user record" };
    
    default:
      // For most resources, if we got here, access is granted
      return { hasAccess: true };
  }
}

/**
 * File-specific access control checks
 */
function checkFileResourceAccess(context: AccessContext): AccessControlResult {
  const { operation, userId, additionalData } = context;
  const fileKey = additionalData?.fileKey as string;

  if (!fileKey) {
    return { hasAccess: true }; // Allow operation if no specific file
  }

  // Validate file key format
  const keyValidation = validateFileKey(fileKey);
  if (!keyValidation.hasAccess) {
    return keyValidation;
  }

  // Check file ownership for non-admin users
  if (context.userRole !== "admin") {
    const userPrefix = `uploads/${userId}/`;
    if (!fileKey.startsWith(userPrefix)) {
      return {
        hasAccess: false,
        error: "Access denied: Can only access own files",
      };
    }
  }

  return { hasAccess: true };
}

/**
 * Validate file key format and security
 */
export function validateFileKey(fileKey: string): AccessControlResult {
  try {
    // Check for path traversal attempts
    if (
      fileKey.includes("..") ||
      fileKey.includes("//") ||
      fileKey.startsWith("/")
    ) {
      return { hasAccess: false, error: "Invalid file path" };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [/\.\./, /\/\//, /^\/.*/, /.*\/$/, /[<>:"|?*]/];

    if (suspiciousPatterns.some((pattern) => pattern.test(fileKey))) {
      return {
        hasAccess: false,
        error: "File path contains invalid characters",
      };
    }

    // Ensure file key follows expected format
    if (!fileKey.match(/^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)) {
      return { hasAccess: false, error: "Invalid file key format" };
    }

    return { hasAccess: true };
  } catch (_error) {
    return { hasAccess: false, error: "File key validation failed" };
  }
}

/**
 * Convenience function to check if user has access to a specific file
 */
export async function checkFileAccess(
  fileKey: string,
  userId: string
): Promise<AccessControlResult> {
  try {
    // Check if file exists
    const exists = await s3Client.exists(fileKey);
    if (!exists) {
      return { hasAccess: false, error: "File not found" };
    }

    return { hasAccess: true };
  } catch (_error) {
    return { hasAccess: false, error: "File access check failed" };
  }
}

/**
 * Helper functions for common access control patterns
 */
export const AccessControl = {
  // Check if user can perform operation on resource type
  can: (userRole: UserRole, operation: Operation, resourceType: ResourceType): boolean => {
    return checkAccess({ 
      userRole, 
      operation, 
      resourceType, 
      userId: "" // Not needed for basic checks
    }).hasAccess;
  },

  // Check if user is admin
  isAdmin: (userRole: UserRole): boolean => userRole === "admin",

  // Check if user can modify data (create/update/delete)
  canModify: (userRole: UserRole, resourceType: ResourceType): boolean => {
    const context = { userRole, resourceType, operation: "update" as Operation, userId: "" };
    return checkAccess(context).hasAccess;
  },

  // Check if user can view data (read/list)
  canView: (userRole: UserRole, resourceType: ResourceType): boolean => {
    const context = { userRole, resourceType, operation: "read" as Operation, userId: "" };
    return checkAccess(context).hasAccess;
  },
};

/**
 * Auto-infer resource type from route path
 */
function inferResourceType(path: string): ResourceType | null {
  const pathLower = path.toLowerCase();
  
  if (pathLower.includes('daily-log') || pathLower.includes('dailylog')) return 'daily_logs';
  if (pathLower.includes('inspection')) return 'inspections';
  if (pathLower.includes('technical-library') || pathLower.includes('technicallibrary')) return 'technical_library';
  if (pathLower.includes('manual')) return 'manuals';
  if (pathLower.includes('monitoring') || pathLower.includes('chart')) return 'monitoring_charts';
  if (pathLower.includes('file') || pathLower.includes('upload') || pathLower.includes('download')) return 'files';
  if (pathLower.includes('user') || pathLower.includes('member')) return 'users';
  if (pathLower.includes('system-config') || pathLower.includes('config')) return 'system_config';
  
  return null;
}

/**
 * Auto-infer operation from HTTP method
 */
function inferOperation(method: string): Operation {
  const methodUpper = method.toUpperCase();
  
  switch (methodUpper) {
    case 'POST': return 'create';
    case 'GET': return 'read';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'read';
  }
}

/**
 * Auto-access control that infers permissions from route context
 */
export function autoAccessControl(context: {
  user: { id: string; role: UserRole };
  request: { method: string; url: string };
}) {
  const { user, request } = context;
  
  // Extract path from URL
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Infer resource type and operation
  const resourceType = inferResourceType(path);
  const operation = inferOperation(request.method);
  
  // If we can't infer resource type, allow access (fallback)
  if (!resourceType) {
    return { hasAccess: true };
  }
  
  // Check access using inferred values
  const accessResult = checkAccess({
    userId: user.id,
    userRole: user.role,
    resourceType,
    operation,
  });

  return accessResult;
}
