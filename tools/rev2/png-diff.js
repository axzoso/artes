'use strict';
// Lettura/scrittura PNG e confronto pixel a pixel (solo Node, nessuna dipendenza). Pensato per gli screenshot di Chrome
// (8 bit, RGB o RGBA, senza interlacciamento).
//   node tools/rev2/png-diff.js a.png b.png [diff.png] [--tol 10]
const fs = require('fs');
const zlib = require('zlib');

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('non è un PNG');
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0, inter = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8); const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; inter = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || inter !== 0 || (ctype !== 2 && ctype !== 6)) throw new Error(`PNG non supportato (profondità ${depth}, tipo ${ctype}, interlaccio ${inter})`);
  const bpp = ctype === 6 ? 4 : 3; const stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat)); const out = Buffer.alloc(w * h * 4);
  const prev = Buffer.alloc(stride); let cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0; const b = prev[x]; const c = x >= bpp ? prev[x - bpp] : 0; let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; out[o] = cur[x * bpp]; out[o + 1] = cur[x * bpp + 1]; out[o + 2] = cur[x * bpp + 2]; out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    cur.copy(prev);
  }
  return { width: w, height: h, data: out };
}

function encodePng(width, height, rgba) {
  const stride = width * 4; const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

// Confronto: restituisce statistiche e, se richiesto, scrive l'immagine delle differenze (rosso = diverso).
function comparePngs(fileA, fileB, { tol = 10, diffOut = null, band = 100 } = {}) {
  const A = decodePng(fs.readFileSync(fileA)); const B = decodePng(fs.readFileSync(fileB));
  const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height);
  const out = diffOut ? Buffer.alloc(w * h * 4) : null; let diff = 0; const bands = new Array(Math.ceil(h / band)).fill(0);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inA = x < A.width && y < A.height, inB = x < B.width && y < B.height; const o = (y * w + x) * 4;
      let d = false;
      if (inA && inB) { const a = (y * A.width + x) * 4, b = (y * B.width + x) * 4; d = Math.abs(A.data[a] - B.data[b]) > tol || Math.abs(A.data[a + 1] - B.data[b + 1]) > tol || Math.abs(A.data[a + 2] - B.data[b + 2]) > tol; if (out) { const g = Math.round((A.data[a] + A.data[a + 1] + A.data[a + 2]) / 3 * 0.35 + 255 * 0.65); out[o] = d ? 255 : g; out[o + 1] = d ? 0 : g; out[o + 2] = d ? 0 : g; out[o + 3] = 255; } }
      else { d = true; if (out) { out[o] = 255; out[o + 1] = 160; out[o + 2] = 0; out[o + 3] = 255; } }
      if (d) { diff++; bands[Math.floor(y / band)]++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }
  if (out) fs.writeFileSync(diffOut, encodePng(w, h, out));
  const total = w * h;
  return { widthA: A.width, heightA: A.height, widthB: B.width, heightB: B.height, pixel: total, diversi: diff, percentuale: +(diff / total * 100).toFixed(3), riquadro: diff ? { x0: minX, y0: minY, x1: maxX, y1: maxY } : null, bande: bands.map((n, i) => ({ da: i * band, a: (i + 1) * band, percentuale: +(n / (w * band) * 100).toFixed(1) })).filter((b) => b.percentuale > 0.2) };
}

module.exports = { decodePng, encodePng, comparePngs };

if (require.main === module) {
  const args = process.argv.slice(2); const ti = args.indexOf('--tol'); let tol = 10; if (ti >= 0) { tol = parseInt(args[ti + 1], 10); args.splice(ti, 2); }
  const [a, b, d] = args; if (!a || !b) { console.error('uso: node png-diff.js a.png b.png [diff.png] [--tol 10]'); process.exit(2); }
  console.log(JSON.stringify(comparePngs(a, b, { tol, diffOut: d || null }), null, 1));
}
