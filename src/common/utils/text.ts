export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function sanitizePlainText(value: string): string {
  return normalizeWhitespace(value.replace(/<[^>]*>/g, ''));
}

export function sanitizeMarkdown(value: string): string {
  return normalizeWhitespace(
    value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/javascript:/gi, ''),
  );
}

export function normalizeSlug(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeSku(value: string): string {
  return normalizeWhitespace(value).toUpperCase();
}

export function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = sanitizePlainText(raw);
    const key = value.toLocaleLowerCase('en-US');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
}
