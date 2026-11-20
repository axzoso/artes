'use strict';
// Client MCP minimo (HTTP JSON-RPC) per i due connettori di dev3, in Node. Legge URL e credenziali da ~/.claude.json
// (mai scritti nel repository, mai stampati). Equivalente di tools/mcp.ps1 + php.ps1, ma con una sola sessione per più chiamate.
//
//   const { connetti } = require('./mcp-client');
//   const el = await connetti('elementor');           // oppure 'novamira'
//   const r = await el.callJson('elementor-list-site-parts', {});
//   const nv = await connetti('novamira');
//   const v = await nv.php('return get_bloginfo("version");');
const fs = require('fs');
const os = require('os');
const path = require('path');

function leggiServer() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8'));
  // la stessa cartella può comparire con maiuscole diverse (C:/… e c:/…): si prende la voce che ha i server
  for (const [k, v] of Object.entries(cfg.projects || {})) {
    if (/github[\/\\]artes$/i.test(k) && v.mcpServers && v.mcpServers['artes-elementor']) return v.mcpServers;
  }
  throw new Error('Configurazione dei connettori MCP non trovata in ~/.claude.json');
}

async function connetti(server) {
  const s = leggiServer();
  let url; let auth;
  if (server === 'elementor') { url = s['artes-elementor'].url.replace(/\/+$/, '') + '/'; auth = s['artes-elementor'].headers.Authorization; }
  else if (server === 'novamira') { const e = s['novamira-dev3-minimalstud'].env; url = e.WP_API_URL; auth = 'Basic ' + Buffer.from(`${e.WP_API_USERNAME}:${e.WP_API_PASSWORD}`).toString('base64'); }
  else throw new Error('server sconosciuto: ' + server);
  const base = { Authorization: auth, Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' };
  const post = async (body, extra = {}) => { const r = await fetch(url, { method: 'POST', headers: { ...base, ...extra }, body: JSON.stringify(body) }); return { status: r.status, headers: r.headers, text: await r.text() }; };
  const leggi = (t) => { const m = /data:\s*(\{.*\})/s.exec(t); return JSON.parse(m ? m[1] : t); };
  const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'artes-tools', version: '1' } } });
  const ij = leggi(init.text);
  if (!ij.result) throw new Error('initialize fallita: ' + init.text.slice(0, 200));
  const sess = { 'Mcp-Session-Id': init.headers.get('mcp-session-id') || '', 'MCP-Protocol-Version': ij.result.protocolVersion };
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sess);
  let id = 10;
  const api = {
    async call(tool, args = {}) {
      const r = await post({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: tool, arguments: args } }, sess);
      const j = leggi(r.text);
      if (j.error) throw new Error(`${tool}: ${JSON.stringify(j.error).slice(0, 400)}`);
      return (j.result.content || []).map((c) => c.text).join('\n');
    },
    async callJson(tool, args = {}) { const t = await api.call(tool, args); try { return JSON.parse(t); } catch { return t; } },
    // Novamira: esegue codice PHP su dev3 e restituisce il valore di return
    async php(code) {
      const t = await api.call('mcp-adapter-execute-ability', { ability_name: 'novamira/execute-php', parameters: { code } });
      const j = JSON.parse(t);
      if (!j.data || !j.data.success) throw new Error('php: ' + t.slice(0, 600));
      return j.data.return_value;
    },
  };
  return api;
}

module.exports = { connetti };
