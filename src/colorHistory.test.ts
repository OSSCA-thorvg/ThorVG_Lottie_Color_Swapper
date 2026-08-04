import { describe, expect, it } from 'vitest'
import { createColorHistory } from './colorHistory.ts'

describe('createColorHistory', () => {
  it('undoes color edits in reverse order', () => {
    const history = createColorHistory()

    history.record('original')
    history.record('first edit')

    expect(history.undo()).toBe('first edit')
    expect(history.undo()).toBe('original')
    expect(history.undo()).toBeNull()
  })

  it('clears edit history for color initialization', () => {
    const history = createColorHistory()

    history.record('edited')
    history.clear()

    expect(history.canUndo()).toBe(false)
    expect(history.undo()).toBeNull()
  })
})
