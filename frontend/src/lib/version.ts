export const APP_VERSION = __APP_VERSION__

/** Plain X.Y.Z numeric comparison — every Croesus release is a clean version (see CHANGELOG.md),
 * never a pre-release suffix, so this doesn't need a full semver parser. */
export function isNewerVersion(a: string, b: string): boolean {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}
