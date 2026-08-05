import { describe, expect, it } from 'vitest'
import { renderColorTree } from './colorTree.ts'

class FakeElement {
  children: FakeElement[] = []
  listeners = new Map<string, (event: Event) => void>()
  style = { paddingLeft: '' }
  dataset: Record<string, string> = {}
  className = ''
  value = ''
  textContent = ''

  classList = {
    add: () => {},
    remove: () => {},
  }

  append(...elements: FakeElement[]) {
    this.children.push(...elements)
  }

  appendChild(element: FakeElement) {
    this.children.push(element)
  }

  replaceChildren(...elements: FakeElement[]) {
    this.children = elements
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.set(type, listener)
  }

  setAttribute() {}

  querySelectorAll() {
    return []
  }

  querySelector() {
    return null
  }

  dispatch(type: string) {
    this.listeners.get(type)?.(new Event(type))
  }
}

describe('renderColorTree', () => {
  it('previews color input events and commits change events separately', () => {
    const container = new FakeElement()
    const previews: string[] = []
    const changes: string[] = []

    globalThis.document = {
      querySelector: () => container,
      createElement: () => new FakeElement(),
    } as unknown as Document
    globalThis.CSS = { escape: (value: string) => value } as unknown as typeof CSS

    renderColorTree(
      [{ name: 'Fill', sid: 'color', color: '#112233', children: [] }],
      (sid, hex) => previews.push(`${sid}:${hex}`),
      (sid, hex) => changes.push(`${sid}:${hex}`),
      () => {},
    )

    const swatch = container.children[0].children[0].children[0]
    swatch.value = '#445566'
    swatch.dispatch('input')
    swatch.dispatch('change')

    expect(previews).toEqual(['color:#445566'])
    expect(changes).toEqual(['color:#445566'])
  })
})
