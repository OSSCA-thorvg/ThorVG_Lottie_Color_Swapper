export function createColorHistory() {
  const snapshots: string[] = []

  return {
    record(snapshot: string) {
      snapshots.push(snapshot)
    },
    undo(): string | null {
      return snapshots.pop() ?? null
    },
    clear() {
      snapshots.length = 0
    },
    canUndo() {
      return snapshots.length > 0
    },
  }
}
