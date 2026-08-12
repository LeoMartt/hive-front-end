export function toSafeIdPart(value: string): string {
  return value.replace(/\s+/g, "-").toLowerCase();
}
