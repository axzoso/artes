'use strict';
// Ritaglia una fascia verticale dalle immagini di tools/rev2/parita.js e affianca rev2 (sinistra) e dev3 (destra), ridotte
// a metà, per guardarle con un solo sguardo.
//   node tools/rev2/affianca.js <nome> <larghezza> <y0> <y1> [uscita.png] [--scala 0.5] [--diff]   (--diff: a destra l'immagine delle differenze)
const fs = require('fs');
const path = require('path');
const { decodePng, encodePng } = require('./png-diff');

const args = process.argv.slice(2);
const di = args.indexOf('--diff'); const conDiff = di >= 0; if (conDiff) args.splice(di, 1);
const si = args.indexOf('--scala'); const scala = si >= 0 ? parseFloat(args[si + 1]) : 0.5; if (si >= 0) args.splice(si, 2);
const [nome, w, y0s, y1s, uscitaArg] = args;
const dir = path.resolve(__dirname, '..', 'out', 'rev2', 'parita', nome);
const y0 = parseInt(y0s, 10), y1 = parseInt(y1s, 10);

function ritaglia(img, y0, y1) {                 // ritaglio + riduzione a scatola
  const h = Math.max(0, Math.min(y1, img.height) - y0); const sw = Math.round(img.width * scala), sh = Math.max(1, Math.round(h * scala));
  const out = Buffer.alloc(sw * sh * 4);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const xa = Math.floor(x / scala), xb = Math.max(xa + 1, Math.floor((x + 1) / scala)), ya = y0 + Math.floor(y / scala), yb = Math.max(ya + 1, y0 + Math.floor((y + 1) / scala));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = ya; yy < yb && yy < img.height; yy++) for (let xx = xa; xx < xb && xx < img.width; xx++) { const o = (yy * img.width + xx) * 4; r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; n++; }
    const o = (y * sw + x) * 4; out[o] = n ? r / n : 255; out[o + 1] = n ? g / n : 255; out[o + 2] = n ? b / n : 255; out[o + 3] = 255;
  }
  return { width: sw, height: sh, data: out };
}
const A = ritaglia(decodePng(fs.readFileSync(path.join(dir, `rev2@${w}.png`))), y0, y1);
const B = ritaglia(decodePng(fs.readFileSync(path.join(dir, conDiff ? `diff@${w}.png` : `dev3@${w}.png`))), y0, y1);
const gap = 8, H = Math.max(A.height, B.height), W = A.width + gap + B.width;
const out = Buffer.alloc(W * H * 4, 255);
const copia = (src, ox) => { for (let y = 0; y < src.height; y++) src.data.copy(out, (y * W + ox) * 4, y * src.width * 4, (y + 1) * src.width * 4); };
copia(A, 0); copia(B, A.width + gap);
for (let y = 0; y < H; y++) { const o = (y * W + A.width + Math.floor(gap / 2)) * 4; out[o] = 215; out[o + 1] = 25; out[o + 2] = 32; }   // filetto rosso al centro
const file = uscitaArg || path.join(dir, `affianca@${w}_${y0}-${y1}.png`);
fs.writeFileSync(file, encodePng(W, H, out));
console.log(file);
