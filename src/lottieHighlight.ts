const TRANSPARENT_RGBA = [0, 0, 0, 0]

export function createHighlightLottie(jsonText: string, selectedSid: string): string {
  const data = JSON.parse(jsonText) as Record<string, unknown>
  const slots = data.slots

  if (typeof slots !== 'object' || slots === null) return JSON.stringify(data)

  for (const [sid, slot] of Object.entries(slots as Record<string, unknown>)) {
    if (typeof slot !== 'object' || slot === null) continue

    const property = (slot as Record<string, unknown>).p
    if (typeof property !== 'object' || property === null) continue

    const value = property as Record<string, unknown>
    if (!Array.isArray(value.k)) continue

    if (sid !== selectedSid) value.k = TRANSPARENT_RGBA
  }

  return JSON.stringify(data)
}
