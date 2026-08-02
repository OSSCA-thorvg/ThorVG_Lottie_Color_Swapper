import ThorVG from '@thorvg/webcanvas'

const TVG = await ThorVG.init({ renderer: 'gl' });

const canvas = new TVG.Canvas('#canvas', {
  width: 800,
  height: 800,
});

// canvas.render();
