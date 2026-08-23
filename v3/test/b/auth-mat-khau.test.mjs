// L0-M3 · tiêu chí 2 — băm rồi kiểm đúng → true; sai một ký tự → false; chuỗi băm rác → false.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bam, kiem, hopLe, THAM_SO } from '../../src/auth/mat-khau.js';

// scrypt N=16384 cố ý chậm (~50ms/lần). Vài lời gọi là đủ, đừng thêm cho vui.
const NHANH = { N: 1024, r: 8, p: 1 };

test('mật khẩu · băm rồi kiểm đúng → true, sai một ký tự → false', async () => {
  const mk = 'Mật-khẩu Sale #2026';
  const chuoi = await bam(mk, NHANH);

  assert.equal(await kiem(mk, chuoi), true);
  assert.equal(await kiem('Mật-khẩu Sale #2027', chuoi), false);   // sai một ký tự cuối
  assert.equal(await kiem('mật-khẩu Sale #2026', chuoi), false);   // sai hoa/thường
  assert.equal(await kiem(mk + ' ', chuoi), false);                // thừa một dấu cách
  assert.equal(await kiem('', chuoi), false);
});

test('mật khẩu · đúng định dạng lưu scrypt$N$r$p$muối$băm', async () => {
  const chuoi = await bam('abc123');
  const phan = chuoi.split('$');
  assert.equal(phan.length, 6);
  assert.equal(phan[0], 'scrypt');
  assert.equal(Number(phan[1]), THAM_SO.N);
  assert.equal(Number(phan[2]), THAM_SO.r);
  assert.equal(Number(phan[3]), THAM_SO.p);
  assert.equal(Buffer.from(phan[4], 'base64').length, THAM_SO.muoiByte);
  assert.equal(Buffer.from(phan[5], 'base64').length, THAM_SO.bamByte);
});

test('mật khẩu · hai lần băm cùng một mật khẩu ra hai chuỗi khác nhau (muối ngẫu nhiên)', async () => {
  const a = await bam('cùng một mật khẩu', NHANH);
  const b = await bam('cùng một mật khẩu', NHANH);
  assert.notEqual(a, b);
  assert.equal(await kiem('cùng một mật khẩu', a), true);
  assert.equal(await kiem('cùng một mật khẩu', b), true);
});

test('mật khẩu · chuỗi băm rác → false, KHÔNG ném', async () => {
  const rac = [
    undefined, null, 42, {}, [], '', 'không phải băm',
    'scrypt$16384$8$1$muối$băm',                       // base64 rác
    'scrypt$16384$8$muốiA$muốiB',                      // thiếu một đoạn
    'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA$X',// thừa một đoạn
    'bcrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAA==', // sai thuật toán
    'scrypt$15000$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAA==', // N không là luỹ thừa 2
    'scrypt$0$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAA==',
    'scrypt$1073741824$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAA==', // N quá lớn → chặn, không treo máy
    'scrypt$16384$8$1$$AAAAAAAAAAAAAAAAAAAAAA==',      // muối rỗng
  ];
  for (const r of rac) {
    assert.equal(await kiem('bất kỳ', r), false, `phải là false với: ${String(r)}`);
    assert.equal(hopLe(r), false, `hopLe phải là false với: ${String(r)}`);
  }
});

test('mật khẩu · bam từ chối mật khẩu rỗng, kiem thì không ném', async () => {
  await assert.rejects(() => bam(''), /không rỗng/);
  await assert.rejects(() => bam(null), /không rỗng/);
  assert.equal(await kiem(null, await bam('x', NHANH)), false);
});
