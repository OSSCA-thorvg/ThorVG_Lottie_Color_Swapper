import ThorVG from '@thorvg/webcanvas'

const CANVAS_SIZE = { width: 800, height: 800 }

export const TVG = await ThorVG.init({ renderer: 'gl' })

export const canvas = new TVG.Canvas('#canvas', CANVAS_SIZE)

const sizeLabel = document.querySelector<HTMLSpanElement>('#canvas-size')
if (sizeLabel) {
  sizeLabel.textContent = `${CANVAS_SIZE.width} × ${CANVAS_SIZE.height}`
}

// canvas.render()
