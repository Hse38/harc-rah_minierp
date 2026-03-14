const PREFIX = "HRC-";

export function parseExpenseNumber(num: string): number {
  const n = num.replace(/^HRC-/i, "").trim();
  const parsed = parseInt(n, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatExpenseNumber(n: number): string {
  return `${PREFIX}${String(n).padStart(4, "0")}`;
}

export async function getNextExpenseNumber(
  getMax: () => Promise<string | null>
): Promise<string> {
  const max = await getMax();
  const next = max ? parseExpenseNumber(max) + 1 : 1001;
  return formatExpenseNumber(next);
}
