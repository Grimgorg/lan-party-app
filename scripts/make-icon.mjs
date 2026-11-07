// Renders build/icon.svg to the PNGs electron-builder and the app use.
// Run with: npm run icon
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync('build/icon.svg', 'utf8')
for (const [file, size] of [
  ['build/icon.png', 1024],
  ['build/icon-256.png', 256]
]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(file, png)
  console.log(`${file} (${size}x${size}, ${png.length} bytes)`)
}
