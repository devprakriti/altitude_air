import { s3Client } from "./s3";

export interface AccessControlResult {
  hasAccess: boolean;
  error?: string;
}

/**
 * Check if user has access to a specific file
 */
export async function checkFileAccess(
  fileKey: string,
  userId: string,
  organizationId?: string
): Promise<AccessControlResult> {
  try {
    // Check if file exists
    const exists = await s3Client.exists(fileKey);
    if (!exists) {
      return { hasAccess: false, error: "File not found" };
    }

    // Check if file belongs to user (basic path-based access control)
    const userPrefix = `uploads/${userId}/`;
    if (!fileKey.startsWith(userPrefix)) {
      return { hasAccess: false, error: "Access denied: File does not belong to user" };
    }

    // Additional organization-based access control if needed
    if (organizationId) {
      // You can implement organization-level access control here
      // For example, check if the file is in an organization-specific folder
      const orgPrefix = `uploads/${organizationId}/`;
      if (!fileKey.startsWith(orgPrefix) && !fileKey.startsWith(userPrefix)) {
        return { hasAccess: false, error: "Access denied: File not accessible by organization" };
      }
    }

    return { hasAccess: true };
  } catch (error) {
    console.error("Access control check failed:", error);
    return { hasAccess: false, error: "Access control check failed" };
  }
}

/**
 * Check if user has access to a file list/prefix
 */
export function checkFileListAccess(
  prefix: string,
  userId: string,
  organizationId?: string
): AccessControlResult {
  try {
    // Ensure user can only list their own files
    const userPrefix = `uploads/${userId}/`;
    if (!prefix.startsWith(userPrefix)) {
      return { hasAccess: false, error: "Access denied: Can only list own files" };
    }

    // Additional organization-based access control
    if (organizationId) {
      const orgPrefix = `uploads/${organizationId}/`;
      if (!prefix.startsWith(orgPrefix) && !prefix.startsWith(userPrefix)) {
        return { hasAccess: false, error: "Access denied: Can only list organization files" };
      }
    }

    return { hasAccess: true };
  } catch (error) {
    console.error("File list access check failed:", error);
    return { hasAccess: false, error: "File list access check failed" };
  }
}

/**
 * Validate file key format and security
 */
export function validateFileKey(fileKey: string): AccessControlResult {
  try {
    // Check for path traversal attempts
    if (fileKey.includes('..') || fileKey.includes('//') || fileKey.startsWith('/')) {
      return { hasAccess: false, error: "Invalid file path" };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\./,
      /\/\//,
      /^\/.*/,
      /.*\/$/,
      /[<>:"|?*]/
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(fileKey))) {
      return { hasAccess: false, error: "File path contains invalid characters" };
    }

    // Ensure file key follows expected format
    if (!fileKey.match(/^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)) {
      return { hasAccess: false, error: "Invalid file key format" };
    }

    return { hasAccess: true };
  } catch (error) {
    console.error("File key validation failed:", error);
    return { hasAccess: false, error: "File key validation failed" };
  }
}

/**
 * Check if user has permission to perform file operations
 */
export function checkFileOperationPermission(
  operation: 'read' | 'write' | 'delete' | 'list',
  userId: string,
  organizationId?: string
): AccessControlResult {
  try {
    // Basic permission checks
    switch (operation) {
      case 'read':
      case 'write':
      case 'delete':
      case 'list':
        // All authenticated users can perform these operations on their own files
        return { hasAccess: true };
      
      default:
        return { hasAccess: false, error: "Unknown operation" };
    }
  } catch (error) {
    console.error("Permission check failed:", error);
    return { hasAccess: false, error: "Permission check failed" };
  }
}

/**
 * Comprehensive access control check for file operations
 */
export async function checkFileAccessControl(
  fileKey: string,
  userId: string,
  operation: 'read' | 'write' | 'delete' | 'list',
  organizationId?: string
): Promise<AccessControlResult> {
  try {
    // Validate file key format
    const keyValidation = validateFileKey(fileKey);
    if (!keyValidation.hasAccess) {
      return keyValidation;
    }

    // Check operation permission
    const permissionCheck = checkFileOperationPermission(operation, userId, organizationId);
    if (!permissionCheck.hasAccess) {
      return permissionCheck;
    }

    // For list operations, check prefix access
    if (operation === 'list') {
      return checkFileListAccess(fileKey, userId, organizationId);
    }

    // For other operations, check specific file access
    return await checkFileAccess(fileKey, userId, organizationId);
  } catch (error) {
    console.error("Comprehensive access control check failed:", error);
    return { hasAccess: false, error: "Access control check failed" };
  }
}
