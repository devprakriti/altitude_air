import { sql } from "drizzle-orm";
import { db } from "../db";
import { s3Client } from "./s3";

export type HealthCheckResult = {
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  responseTime?: number;
  details?: Record<string, any>;
};

export type ServiceHealth = {
  name: string;
  status: "healthy" | "unhealthy" | "degraded";
  responseTime: number;
  message: string;
  details?: Record<string, any>;
};

export type OverallHealth = {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealth[];
  metrics: {
    totalRequests?: number;
    errorRate?: number;
    averageResponseTime?: number;
  };
};

// Health check functions for individual services
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Test basic connectivity
    const _result = await db.execute(sql`SELECT 1 as test`);

    // Test query performance
    const performanceStart = Date.now();
    await db.execute(
      sql`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const queryTime = Date.now() - performanceStart;

    const responseTime = Date.now() - startTime;

    if (queryTime > 1000) {
      return {
        status: "degraded",
        message: "Database responding slowly",
        responseTime,
        details: { queryTime, slowQuery: true },
      };
    }

    return {
      status: "healthy",
      message: "Database connection successful",
      responseTime,
      details: { queryTime, connectionTest: true },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

export async function checkS3Health(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Test S3 connectivity with a simple operation
    const testKey = "health-check/test-connection";

    // Try to check if a non-existent file exists (should return false quickly)
    const _exists = await s3Client.exists(testKey);

    const responseTime = Date.now() - startTime;

    if (responseTime > 2000) {
      return {
        status: "degraded",
        message: "S3 responding slowly",
        responseTime,
        details: { slowResponse: true },
      };
    }

    return {
      status: "healthy",
      message: "S3 connection successful",
      responseTime,
      details: { connectionTest: true },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `S3 connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

export async function checkAuthHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Test auth service by checking if we can access the auth tables
    const _result = await db.execute(sql`SELECT COUNT(*) FROM "user" LIMIT 1`);

    const responseTime = Date.now() - startTime;

    return {
      status: "healthy",
      message: "Auth service accessible",
      responseTime,
      details: { authTablesAccessible: true },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Auth service failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

export async function checkMemoryHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    const responseTime = Date.now() - startTime;

    let status: "healthy" | "unhealthy" | "degraded" = "healthy";
    let message = "Memory usage normal";

    if (memoryUsagePercent > 90) {
      status = "unhealthy";
      message = "Memory usage critically high";
    } else if (memoryUsagePercent > 80) {
      status = "degraded";
      message = "Memory usage high";
    }

    return {
      status,
      message,
      responseTime,
      details: {
        memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
        heapUsed: Math.round((usedMemory / 1024 / 1024) * 100) / 100, // MB
        heapTotal: Math.round((totalMemory / 1024 / 1024) * 100) / 100, // MB
        external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100, // MB
        rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100, // MB
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Memory check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

// Main health check function
export async function performHealthCheck(): Promise<OverallHealth> {
  const _startTime = Date.now();

  // Run all health checks in parallel
  const [dbHealth, s3Health, authHealth, memoryHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkS3Health(),
    checkAuthHealth(),
    checkMemoryHealth(),
  ]);

  const services: ServiceHealth[] = [
    {
      name: "database",
      status: dbHealth.status,
      responseTime: dbHealth.responseTime || 0,
      message: dbHealth.message,
      details: dbHealth.details,
    },
    {
      name: "storage",
      status: s3Health.status,
      responseTime: s3Health.responseTime || 0,
      message: s3Health.message,
      details: s3Health.details,
    },
    {
      name: "auth",
      status: authHealth.status,
      responseTime: authHealth.responseTime || 0,
      message: authHealth.message,
      details: authHealth.details,
    },
    {
      name: "memory",
      status: memoryHealth.status,
      responseTime: memoryHealth.responseTime || 0,
      message: memoryHealth.message,
      details: memoryHealth.details,
    },
  ];

  // Determine overall status
  const hasUnhealthy = services.some((s) => s.status === "unhealthy");
  const hasDegraded = services.some((s) => s.status === "degraded");

  let overallStatus: "healthy" | "unhealthy" | "degraded";
  if (hasUnhealthy) {
    overallStatus = "unhealthy";
  } else if (hasDegraded) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    services,
    metrics: {
      // These could be populated from a metrics service
      totalRequests: undefined,
      errorRate: undefined,
      averageResponseTime: undefined,
    },
  };
}

// Simple health check for load balancers
export async function performSimpleHealthCheck(): Promise<{
  status: string;
  timestamp: string;
}> {
  try {
    // Just check if we can connect to the database
    await db.execute(sql`SELECT 1`);
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  } catch (_error) {
    return {
      status: "error",
      timestamp: new Date().toISOString(),
    };
  }
}
