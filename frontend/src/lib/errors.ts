export function errorMessage(e: unknown): string | undefined
export function errorMessage(e: unknown, fallback: string): string
export function errorMessage(e: unknown, fallback?: string): string | undefined {
  return e instanceof Error ? e.message : fallback
}
