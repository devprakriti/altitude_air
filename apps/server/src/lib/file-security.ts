// File type from Bun's global types
type File = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

export type FileValidationResult = {
  isValid: boolean;
  error?: string;
  mimeType?: string;
  size?: number;
};

export type FileTypeConfig = {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeBytes: number;
  magicNumbers: number[][]; // File signature patterns
};

// File type configurations with magic number validation
export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  pdf: {
    allowedMimeTypes: ["application/pdf"],
    allowedExtensions: ["pdf"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    magicNumbers: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  image: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    magicNumbers: [
      [0xff, 0xd8, 0xff], // JPEG
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
      [0x47, 0x49, 0x46, 0x38], // GIF
      [0x52, 0x49, 0x46, 0x46], // WEBP (RIFF)
    ],
  },
  document: {
    allowedMimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    allowedExtensions: ["doc", "docx", "xls", "xlsx"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    magicNumbers: [
      [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // DOC/XLS
      [0x50, 0x4b, 0x03, 0x04], // DOCX/XLSX (ZIP-based)
    ],
  },
  csv: {
    allowedMimeTypes: ["text/csv", "application/csv"],
    allowedExtensions: ["csv"],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    magicNumbers: [], // CSV doesn't have a specific magic number
  },
};

/**
 * Validate file signature (magic numbers) against expected patterns
 */
export function validateFileSignature(
  buffer: ArrayBuffer,
  expectedMagicNumbers: number[][]
): boolean {
  if (expectedMagicNumbers.length === 0) {
    return true; // No magic number validation needed
  }

  const bytes = new Uint8Array(buffer);

  return expectedMagicNumbers.some((pattern) => {
    if (bytes.length < pattern.length) {
      return false;
    }

    return pattern.every((byte, index) => bytes[index] === byte);
  });
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Determine file type category from extension
 */
export function getFileTypeCategory(extension: string): string | null {
  for (const [category, config] of Object.entries(FILE_TYPE_CONFIGS)) {
    if (config.allowedExtensions.includes(extension)) {
      return category;
    }
  }
  return null;
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File,
  allowedTypes: string[] = ["pdf", "image", "document", "csv"]
): Promise<FileValidationResult> {
  try {
    // Basic file checks
    if (!file?.name) {
      return { isValid: false, error: "No file provided" };
    }

    const extension = getFileExtension(file.name);
    if (!extension) {
      return { isValid: false, error: "File must have an extension" };
    }

    // Check if file type is allowed
    const fileTypeCategory = getFileTypeCategory(extension);
    if (!(fileTypeCategory && allowedTypes.includes(fileTypeCategory))) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      };
    }

    const config = FILE_TYPE_CONFIGS[fileTypeCategory];

    // Validate MIME type
    if (!config.allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid MIME type. Expected: ${config.allowedMimeTypes.join(", ")}`,
      };
    }

    // Validate file size
    if (file.size > config.maxSizeBytes) {
      const maxSizeMB = Math.round(config.maxSizeBytes / (1024 * 1024));
      return {
        isValid: false,
        error: `File too large. Maximum size: ${maxSizeMB}MB`,
      };
    }

    // Validate magic numbers (file signature)
    if (config.magicNumbers.length > 0) {
      const buffer = await file.arrayBuffer();
      if (!validateFileSignature(buffer, config.magicNumbers)) {
        return {
          isValid: false,
          error: "File signature does not match expected format",
        };
      }
    }

    // Additional security checks
    if (
      file.name.includes("..") ||
      file.name.includes("/") ||
      file.name.includes("\\")
    ) {
      return {
        isValid: false,
        error: "Filename contains invalid characters",
      };
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|scr|pif|vbs|js|jar|php|asp|aspx|jsp)$/i,
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
      return {
        isValid: false,
        error: "Suspicious file type detected",
      };
    }

    return {
      isValid: true,
      mimeType: file.type,
      size: file.size,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `File validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/^\.+/, "") // Remove leading dots
    .trim();

  // Ensure filename isn't empty
  if (!sanitized) {
    sanitized = "unnamed_file";
  }

  // Limit filename length
  if (sanitized.length > 255) {
    const extension = getFileExtension(filename);
    const nameWithoutExt = sanitized.replace(/\.[^/.]+$/, "");
    sanitized = `${nameWithoutExt.substring(0, 255 - extension.length - 1)}.${extension}`;
  }

  return sanitized;
}

/**
 * Generate secure file key with timestamp and sanitized name
 */
export function generateSecureFileKey(
  userId: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFilename(originalFilename);
  const extension = getFileExtension(originalFilename);
  const nameWithoutExt = sanitizedName.replace(/\.[^/.]+$/, "");

  return `uploads/${userId}/${timestamp}_${nameWithoutExt}.${extension}`;
}
