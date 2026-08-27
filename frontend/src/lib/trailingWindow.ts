export function findReferencePoint<T>(points: T[], getDate: (point: T) => string, days: number): T | null {
  if (points.length < 2) return null

  const latest = points[points.length - 1]
  const cutoff = new Date(getDate(latest))
  cutoff.setDate(cutoff.getDate() - days)

  let reference = points[0]
  for (const point of points) {
    if (new Date(getDate(point)) <= cutoff) reference = point
    else break
  }
  return reference === latest ? null : reference
}
