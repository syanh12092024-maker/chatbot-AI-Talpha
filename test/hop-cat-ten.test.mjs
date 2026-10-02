// CHỐNG ĐỤNG NHAU GIỮA CÁC PHIÊN (02/10) — CSDL hộp cát mang hậu tố TIẾN TRÌNH, dọn mồ côi của tiến trình đã chết, và MỌI cổng bash
// đặt tên CSDL có `_p$$`. Án lệ: cửa vào LL17a đỏ ll5 · ll10 · ll18 (chạy lại xanh) trong lúc phiên CR-02-10b chạy ca cùng lúc — hai phiên
// `DROP … WITH (FORCE)` cùng một CSDL tên cố định.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';
import { dungSandbox, donMoCoi, tenSandbox } from '../db/sandbox.js';
import { chuoiNoi } from '../db/ket-noi.js';

const songKhong = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

test('T1 · tên CSDL mang pid của tiến trình — hai phiên cùng bộ ca KHÔNG cùng tên', async (t) => {
  assert.equal(tenSandbox('var1', 4242), 'aicloser_v3_test_var1_p4242');
  const sb = await dungSandbox('hopcat_t1', { migrate: false });
  t.after(() => sb.don());
  assert.equal(sb.ten, `aicloser_v3_test_hopcat_t1_p${process.pid}`);
  assert.equal((await sb.pool.query('SELECT current_database() AS d')).rows[0].d, sb.ten);
});

test('T2 · dọn mồ côi: CHỈ CSDL hộp cát (test · nt) của tiến trình ĐÃ CHẾT; không đụng tiến trình sống, chính mình, hay tên lạ', async () => {
  const ten = [`aicloser_v3_test_a_p${process.pid}`, 'aicloser_v3_test_b_p111', 'aicloser_v3_nt_l1m1_p222', 'aicloser_v3_test_c_p333',
    'aicloser_v3', 'aicloser_v3_test_cu', 'khac_p111'];
  const lenh = [];
  const quanLy = { query: async (sql) => { lenh.push(sql); return { rows: sql.startsWith('SELECT') ? ten.map((datname) => ({ datname })) : [] }; } };
  const chet = await donMoCoi(quanLy, { laSong: (pid) => pid === 333 });
  assert.deepEqual(chet, ['aicloser_v3_test_b_p111', 'aicloser_v3_nt_l1m1_p222']);
  assert.deepEqual(lenh.filter((x) => x.startsWith('DROP')), ['DROP DATABASE IF EXISTS aicloser_v3_test_b_p111 WITH (FORCE)',
    'DROP DATABASE IF EXISTS aicloser_v3_nt_l1m1_p222 WITH (FORCE)']);
});

test('T3 · thật trên Postgres: CSDL mồ côi của pid đã chết bị xoá khi một hộp cát mới được dựng', async (t) => {
  let pidChet = 99991;
  while (songKhong(pidChet)) pidChet--;
  const moCoi = `aicloser_v3_test_hopcat_mocoi_p${pidChet}`;
  const u = new URL(chuoiNoi()); u.pathname = '/postgres';
  const ql = new pg.Pool({ connectionString: u.toString(), max: 1 });
  t.after(() => ql.end());
  await ql.query(`DROP DATABASE IF EXISTS ${moCoi} WITH (FORCE)`);
  await ql.query(`CREATE DATABASE ${moCoi}`);
  const sb = await dungSandbox('hopcat_t3', { migrate: false });
  t.after(() => sb.don());
  assert.equal((await ql.query('SELECT count(*)::int n FROM pg_database WHERE datname = $1', [moCoi])).rows[0].n, 0, 'mồ côi phải bị dọn');
  assert.equal((await ql.query('SELECT count(*)::int n FROM pg_database WHERE datname = $1', [sb.ten])).rows[0].n, 1, 'hộp cát của chính mình còn');
});

test('T4 · thước: MỌI cổng bash đặt tên CSDL hộp cát có hậu tố tiến trình `_p$$`', () => {
  const thu = new URL('../ops/bin/nghiem-thu/', import.meta.url);
  const sai = [];
  let dem = 0;
  for (const f of fs.readdirSync(thu).filter((x) => x.endsWith('.sh'))) {
    for (const dong of fs.readFileSync(new URL(f, thu), 'utf8').split('\n')) {
      const m = dong.match(/^\s*(?:SB_)?DB="(aicloser_v3_nt_[^"]*)"/);
      if (!m) continue;
      dem++;
      if (!m[1].endsWith('_p$$')) sai.push(`${f}: ${m[1]}`);
    }
  }
  assert.ok(dem >= 18, `chỉ thấy ${dem} cổng đặt tên hộp cát — lưới quét hỏng?`);
  assert.deepEqual(sai, []);
});
