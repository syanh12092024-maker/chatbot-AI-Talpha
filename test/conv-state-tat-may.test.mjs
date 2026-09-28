// TIẾN TRÌNH NẠP conv-state.js PHẢI TỰ THOÁT KHI NHẬN SIGTERM (28/09/2026).
//
// Bản cũ bắt SIGTERM để ghi nốt mà không thoát ⇒ bot cũ và giao diện v3 treo tới khi systemd ép
// SIGKILL sau 2 phút (đo 04:12 và 04:22 ngày 28/09). Ca chạy một tiến trình con THẬT và gửi tín
// hiệu THẬT — thứ này không giả được bằng cách gọi hàm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MOD = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/conv-state.js')).href;

function chay(maThem, tep) {
  const code = `const m = await import(${JSON.stringify(MOD)});
    ${maThem}
    m.touchConv('c1', { buoc: 'ghi-not' });
    setInterval(() => {}, 1000);   // giữ tiến trình sống như một máy chủ thật
    console.log('SAN');`;
  const con = spawn(process.execPath, ['--input-type=module', '-e', code], {
    env: { ...process.env, CONV_STATE_FILE: tep }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let ra = '';
  con.stdout.on('data', (d) => { ra += d; });
  const xong = new Promise((ok) => con.on('exit', (ma, tin) => ok({ ma, tin, ra: () => ra })));
  return { con, xong, san: new Promise((ok) => con.stdout.on('data', (d) => { if (String(d).includes('SAN')) ok(); })) };
}

test('① chỉ có conv-state bắt SIGTERM ⇒ tiến trình THOÁT trong 3 giây', async () => {
  const tep = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cs-')), 'cs.json');
  const { con, xong, san } = chay('', tep);
  await san;
  const t = Date.now();
  con.kill('SIGTERM');
  const hetGio = new Promise((ok) => setTimeout(() => ok('treo'), 3000));
  const kq = await Promise.race([xong, hetGio]);
  if (kq === 'treo') con.kill('SIGKILL');
  assert.notEqual(kq, 'treo', 'nhận SIGTERM mà không thoát — systemd sẽ phải ép SIGKILL sau 2 phút');
  assert.equal(kq.tin, 'SIGTERM');
  assert.ok(Date.now() - t < 3000);
  assert.ok(fs.existsSync(tep) && fs.readFileSync(tep, 'utf8').includes('c1'),
    'phải GHI NỐT trạng thái hội thoại trước khi thoát — đó là lý do bộ bắt tồn tại');
});

test('② có người khác bắt SIGTERM (như worker) ⇒ conv-state KHÔNG giành quyền thoát', async () => {
  const tep = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cs-')), 'cs.json');
  const { con, xong, san } = chay(
    `process.on('SIGTERM', () => { console.log('WORKER-DUNG-EM'); setTimeout(() => process.exit(0), 300); });`, tep);
  await san;
  con.kill('SIGTERM');
  const kq = await Promise.race([xong, new Promise((ok) => setTimeout(() => ok('treo'), 3000))]);
  if (kq === 'treo') con.kill('SIGKILL');
  assert.notEqual(kq, 'treo');
  assert.equal(kq.ma, 0, 'worker phải được tự thoát theo cách của nó, không bị cắt ngang');
  assert.match(kq.ra(), /WORKER-DUNG-EM/);
});
