export function serializeRow<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val instanceof Date) {
      result[key] = val.toISOString();
    } else if (Array.isArray(val)) {
      result[key] = val.map((v) => (v instanceof Date ? v.toISOString() : v));
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

export function serializeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(serializeRow);
}
