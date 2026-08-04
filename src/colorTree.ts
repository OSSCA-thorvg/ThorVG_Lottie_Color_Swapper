import type { TreeNode } from './lottieSlots.ts'

// Renders the color hierarchy tree into the panel: layer/group nodes are
// expandable rows, color nodes are a swatch + sid. Doesn't touch the renderer
// or export document directly — onColorChange lets main.ts decide what a color
// edit should update.
export function renderColorTree(tree: TreeNode[], onColorChange: (sid: string, hex: string) => void) {
  const container = document.querySelector<HTMLDivElement>('#hierarchy-tree')!
  container.replaceChildren(...tree.map((node) => renderNode(node, 0, onColorChange)))
}

function renderNode(node: TreeNode, depth: number, onColorChange: (sid: string, hex: string) => void): HTMLElement {
  const wrapper = document.createElement('div')
  const row = document.createElement('div')
  row.style.paddingLeft = `${depth * 14}px`

  if (node.sid !== undefined && node.color !== undefined) {
    row.className = 'color-row'

    const sid = node.sid

    const swatch = document.createElement('input')
    swatch.type = 'color'
    swatch.className = 'color-swatch'
    swatch.value = node.color
    swatch.addEventListener('input', () => onColorChange(sid, swatch.value))

    const label = document.createElement('span')
    label.className = 'color-sid'
    label.textContent = node.sid

    row.append(swatch, label)
    wrapper.appendChild(row)
    return wrapper
  }

  row.className = 'tree-row'

  const toggle = document.createElement('span')
  toggle.className = 'tree-toggle'
  toggle.textContent = '▾'

  const label = document.createElement('span')
  label.className = 'tree-name'
  label.textContent = node.name

  row.append(toggle, label)
  wrapper.appendChild(row)

  const childrenContainer = document.createElement('div')
  childrenContainer.className = 'tree-children'
  childrenContainer.append(...node.children.map((child) => renderNode(child, depth + 1, onColorChange)))
  wrapper.appendChild(childrenContainer)

  row.addEventListener('click', () => {
    childrenContainer.classList.toggle('collapsed')
    toggle.classList.toggle('collapsed')
  })

  return wrapper
}
