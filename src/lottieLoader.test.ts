import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { loadLottie } from './lottieLoader.ts'

const lottie = {
  v: '5.7.0',
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [],
}

async function createLottieFile(
  manifest: Record<string, unknown>,
  animationPath: string,
  animation = lottie,
): Promise<File> {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest))
  zip.file(animationPath, JSON.stringify(animation))
  const content = await zip.generateAsync({ type: 'uint8array' })
  const archive = new ArrayBuffer(content.byteLength)
  new Uint8Array(archive).set(content)
  return new File([archive], 'animation.lottie')
}

describe('loadLottie', () => {
  it('loads plain Lottie JSON', async () => {
    const file = new File([JSON.stringify(lottie)], 'animation.json')

    await expect(loadLottie(file)).resolves.toBe(JSON.stringify(lottie))
  })

  it('loads a dotLottie v1 archive using activeAnimationId and animations/', async () => {
    const file = await createLottieFile(
      {
        version: '1',
        activeAnimationId: 'second',
        animations: [{ id: 'first' }, { id: 'second' }],
      },
      'animations/second.json',
    )

    await expect(loadLottie(file)).resolves.toBe(JSON.stringify(lottie))
  })

  it('falls back to the first dotLottie v1 animation', async () => {
    const file = await createLottieFile(
      {
        version: '1.0',
        animations: [{ id: 'first' }],
      },
      'animations/first.json',
    )

    await expect(loadLottie(file)).resolves.toBe(JSON.stringify(lottie))
  })

  it('loads a dotLottie v2 archive using initial.animation and a/', async () => {
    const file = await createLottieFile(
      {
        version: '2',
        initial: { animation: 'second' },
        animations: [{ id: 'first' }, { id: 'second' }],
      },
      'a/second.json',
    )

    await expect(loadLottie(file)).resolves.toBe(JSON.stringify(lottie))
  })

  it('falls back to the first dotLottie v2 animation', async () => {
    const file = await createLottieFile(
      {
        version: '2.0',
        animations: [{ id: 'first' }],
      },
      'a/first.json',
    )

    await expect(loadLottie(file)).resolves.toBe(JSON.stringify(lottie))
  })

  it('rejects an unsupported dotLottie version', async () => {
    const file = await createLottieFile(
      { version: '3', animations: [{ id: 'first' }] },
      'a/first.json',
    )

    await expect(loadLottie(file)).rejects.toThrow('Unsupported dotLottie version: 3')
  })

  it('rejects an animation selection not listed in the manifest', async () => {
    const file = await createLottieFile(
      {
        version: '2',
        initial: { animation: 'missing' },
        animations: [{ id: 'first' }],
      },
      'a/missing.json',
    )

    await expect(loadLottie(file)).rejects.toThrow(
      'Animation is not listed in manifest.json: missing',
    )
  })

  it('rejects missing manifest files', async () => {
    const zip = new JSZip()
    const content = await zip.generateAsync({ type: 'uint8array' })
    const archive = new ArrayBuffer(content.byteLength)
    new Uint8Array(archive).set(content)
    const file = new File([archive], 'animation.lottie')

    await expect(loadLottie(file)).rejects.toThrow(
      '.lottie file does not contain manifest.json',
    )
  })
})
