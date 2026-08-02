import ThorVG from '@thorvg/webcanvas'

const TVG = await ThorVG.init({ renderer: 'gl' });

const canvas = new TVG.Canvas('#canvas', {
  width: 800,
  height: 800,
});

// canvas.render();

const uploadInput = document.querySelector<HTMLInputElement>('#lottie-upload')!

uploadInput.addEventListener('change', async () => {
  const file = uploadInput.files?.[0]
  if (!file) return

  const json = await file.text()
  console.log(json)
})
