'use strict';
// Carica tools/out/rev2/dati-rev2.json (modello dati estratto dalla grafica in radice). tools/out/ non è versionata: se il file
// manca (clone nuovo) lo rigenera con dati-rev2.js, che legge solo i file HTML locali.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

module.exports = function caricaDatiRev2() {
  const file = path.resolve(__dirname, '..', 'out', 'rev2', 'dati-rev2.json');
  if (!fs.existsSync(file)) execFileSync(process.execPath, [path.join(__dirname, 'dati-rev2.js')], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
