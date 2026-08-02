import './renderer.ts'
import { initFileUpload } from './fileUpload.ts'

initFileUpload(handleLottieData)

// TODO: hand off to the parser here once it's ready
function handleLottieData(data: unknown) {
  console.log(data)
}
