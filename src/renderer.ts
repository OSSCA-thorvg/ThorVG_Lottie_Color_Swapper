import ThorVG from '@thorvg/webcanvas'

export const TVG = await ThorVG.init({ renderer: 'gl' })

export const canvas = new TVG.Canvas('#canvas', {
  width: 800,
  height: 800,
})

// canvas.render()
