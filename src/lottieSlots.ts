// Checks whether a Lottie JSON already defines a top-level "slots" dictionary.
// Slots are a Lottie-JSON-level feature (not a dotLottie container feature), so
// this check applies the same way regardless of whether the source was a plain
// .json file or one extracted from a .lottie archive.
export function hasSlots(jsonText: string): boolean {
  const data: unknown = JSON.parse(jsonText)
  if (typeof data !== 'object' || data === null) return false

  const slots = (data as Record<string, unknown>).slots
  return typeof slots === 'object' && slots !== null
}
