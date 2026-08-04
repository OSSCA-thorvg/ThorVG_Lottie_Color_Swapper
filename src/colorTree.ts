import type { TreeNode } from './lottieSlots.ts'

// Renders the color hierarchy tree into the panel: layer/group nodes are
// expandable rows, color nodes are a swatch + sid. Doesn't touch the renderer
// or export document directly — onColorChange lets main.ts decide what a color
// edit should update.
export function renderColorTree(
  tree: TreeNode[],
  onColorChange: (sid: string, hex: string) => void,
  onColorSelect: (sid: string | null) => void,
  initialSelectedSid: string | null = null,
) {
  const container = document.querySelector<HTMLDivElement>('#hierarchy-tree')!
  let selectedSid = initialSelectedSid

  const selectSid = (sid: string) => {
    selectedSid = selectedSid === sid ? null : sid
    container.querySelectorAll<HTMLElement>('.color-row.selected').forEach((row) => {
      row.classList.remove('selected')
      row.setAttribute('aria-selected', 'false')
    })
    if (selectedSid) {
      const selectedRow = container.querySelector<HTMLElement>(`[data-sid="${CSS.escape(selectedSid)}"]`)
      selectedRow?.classList.add('selected')
      selectedRow?.setAttribute('aria-selected', 'true')
    }
    onColorSelect(selectedSid)
  }

  container.replaceChildren(...tree.map((node) => renderNode(node, 0, onColorChange, selectSid)))
  if (selectedSid) {
    const selectedRow = container.querySelector<HTMLElement>(`[data-sid="${CSS.escape(selectedSid)}"]`)
    selectedRow?.classList.add('selected')
    selectedRow?.setAttribute('aria-selected', 'true')
  }
}

function renderNode(
  node: TreeNode,
  depth: number,
  onColorChange: (sid: string, hex: string) => void,
  onColorSelect: (sid: string) => void,
): HTMLElement {
  const wrapper = document.createElement('div')
  const row = document.createElement('div')
  row.style.paddingLeft = `${depth * 14}px`

  if (node.sid !== undefined && node.color !== undefined) {
    row.className = 'color-row'
    row.dataset.sid = node.sid
    row.setAttribute('role', 'button')
    row.setAttribute('tabindex', '0')
    row.setAttribute('aria-selected', 'false')

    const sid = node.sid

    const swatch = document.createElement('input')
    swatch.type = 'color'
    swatch.className = 'color-swatch'
    swatch.value = node.color
    swatch.addEventListener('click', (event) => event.stopPropagation())
    swatch.addEventListener('change', () => onColorChange(sid, swatch.value))

    row.addEventListener('click', () => onColorSelect(sid))
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onColorSelect(sid)
      }
    })

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
  childrenContainer.append(
    ...node.children.map((child) => renderNode(child, depth + 1, onColorChange, onColorSelect)),
  )
  wrapper.appendChild(childrenContainer)

  row.addEventListener('click', () => {
    childrenContainer.classList.toggle('collapsed')
    toggle.classList.toggle('collapsed')
  })

  return wrapper
}
