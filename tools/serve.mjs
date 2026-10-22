/* ============================================================
   ワイプ・アーケード：かんたんサーバー（packs フォルダの JSON をそのまま読める）
   つかいかた：  node tools/serve.mjs  [--port 8080] [--no-open]
               （Windows は start.bat、Mac / Linux は start.sh でもOK）
   ・packs フォルダに .json を入れて、ブラウザを再読みこみするだけで問題がふえる
   ・このパソコンの中だけで動く（外からはつながらない）
   ============================================================ */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { exec } from 'node:child_process';
import path from 'node:path';
import { ROOT, packFiles, opt, flag } from './lib.mjs';

const PORT = Number(opt('--port', process.env.PORT || 8080));
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    /* パックの一覧は、フォルダの中身から毎回つくる（ファイルを入れるだけでOK） */
    if (p === '/packs/packs.json') { res.writeHead(200, { 'Content-Type':TYPES['.json'], 'Cache-Control':'no-store' }); res.end(JSON.stringify({ packs:await packFiles() })); return; }
    const file = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
    if (!file.startsWith(ROOT) || /[/\\]\./.test(path.relative(ROOT, file))) { res.writeHead(403); res.end('forbidden'); return; }
    const s = await stat(file).catch(() => null);
    if (!s || !s.isFile()) { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }); res.end('見つかりません'); return; }
    res.writeHead(200, { 'Content-Type':TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(await readFile(file));
  } catch (e) { res.writeHead(500); res.end(String(e.message)); }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log(`ポート ${PORT} はほかで使われています。 node tools/serve.mjs --port 8081 のように変えてね`);
  else console.log(e.message);
  process.exit(1);
});
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`ワイプ・アーケードを開きました： ${url}\n（packs フォルダに JSON を入れたら、ブラウザを再読みこみ）\nおわるときは このウィンドウで Ctrl + C`);
  if (!flag('--no-open')) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }
});
