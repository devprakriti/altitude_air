import { type SQL, sql } from "drizzle-orm";

/**
 * Optimized search with full-text search capabilities
 */
export function buildSearchConditions(
  searchFields: string[],
  searchTerm?: string
): SQL[] {
  if (!searchTerm) {
    return [];
  }

  const searchPattern = `%${searchTerm.toLowerCase()}%`;

  return searchFields.map(
    (field) => sql`LOWER(${sql.identifier(field)}) LIKE ${searchPattern}`
  );
}

/**
 * Build date range conditions efficiently
 */
export function buildDateRangeConditions(
  dateField: string,
  dateFrom?: string,
  dateTo?: string
): SQL[] {
  const conditions: SQL[] = [];

  if (dateFrom) {
    conditions.push(sql`${sql.identifier(dateField)} >= ${dateFrom}`);
  }

  if (dateTo) {
    conditions.push(sql`${sql.identifier(dateField)} <= ${dateTo}`);
  }

  return conditions;
}
