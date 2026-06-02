// Génère les icônes PNG de la PWA à partir de public/favicon.svg
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')

const cibles = [
  { taille: 192, fichier: 'icon-192.png' },
  { taille: 512, fichier: 'icon-512.png' },
  { taille: 180, fichier: 'apple-touch-icon.png' },
]

for (const { taille, fichier } of cibles) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: taille } })
  const png = resvg.render().asPng()
  writeFileSync(new URL(`../public/${fichier}`, import.meta.url), png)
  console.log(`✓ public/${fichier} (${taille}px)`)
}
