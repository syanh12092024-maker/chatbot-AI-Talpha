// KHO KHOÁ MÃ HOÁ — L1-M4b
//
// Bốn thứ file này canh, đều là tiêu chí nghiệm thu đo được:
//   ⑧ Khoá lưu vào kho là chuỗi mã hoá — `JSON.stringify` bản ghi KHÔNG chứa khoá gốc.
//   ⑨ Thiếu `V3_KHOA_CHU` → ném lỗi, KHÔNG lưu nguyên văn.
//   · Sửa một ký tự trong `mat` → `giaiMa` ném lỗi (GCM tự bắt).
//   · Màn hình chỉ được nhận `{ daCo, duoi }`, không một ký tự khoá thật nào.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  machHoa, giaiMa, duoiKhoa, machHoaKho, giaiMaKho, tomTatKho,
  docKhoaChu, coKhoaChu, laGoiMaHoa,
  LoiKhoaChu, LoiGiaiMa, TEN_BIEN_KHOA_CHU, PHIEN_BAN, DAI_TOI_THIEU_HIEN_DUOI,
} from '../../src/model/kho-khoa.js';
import { LoiThamSo, LoiModel } from '../../src/model/loi.js';

const KHOA_CHU = randomBytes(32).toString('base64');
const KHOA_THAT = 'sk-moonshot-BI-MAT-khong-duoc-ro-ra-ngoai-a3f9';

/** Chạy một hàm với `V3_KHOA_CHU` đặt tạm, rồi trả lại đúng như cũ. */
function voiKhoaChu(gia, fn) {
  const cu = process.env[TEN_BIEN_KHOA_CHU];
  if (gia === undefined) delete process.env[TEN_BIEN_KHOA_CHU];
  else process.env[TEN_BIEN_KHOA_CHU] = gia;
  try { return fn(); } finally {
    if (cu === undefined) delete process.env[TEN_BIEN_KHOA_CHU];
    else process.env[TEN_BIEN_KHOA_CHU] = cu;
  }
}

process.env[TEN_BIEN_KHOA_CHU] = KHOA_CHU;

/** `assert.throws` không trả lỗi về, mà nhiều bài ở đây cần soi thông điệp. */
function batLoi(fn) {
  try { fn(); } catch (e) { return e; }
  return assert.fail('mong đợi một lỗi, nhưng không có lỗi nào');
}

// ---- KHOÁ CHỦ ----------------------------------------------------------------------

test('khoá chủ · thiếu V3_KHOA_CHU thì NÉM ngay lần gọi đầu, không tự sinh khoá', () => {
  voiKhoaChu(undefined, () => {
    assert.throws(() => docKhoaChu(), LoiKhoaChu);
    assert.throws(() => machHoa(KHOA_THAT), LoiKhoaChu);
    assert.equal(coKhoaChu(), false);
  });
});

test('tiêu chí ⑨ · thiếu khoá chủ thì KHÔNG có đường nào lưu nguyên văn', () => {
  voiKhoaChu(undefined, () => {
    // Không có "chế độ nới lỏng": machHoa ném, machHoaKho cũng ném. Nếu ở đây trả về
    // chuỗi gốc thì cả module mất lý do tồn tại.
    assert.throws(() => machHoa(KHOA_THAT), LoiKhoaChu);
    assert.throws(() => machHoaKho({ kimi: KHOA_THAT }), LoiKhoaChu);
  });
});

test('khoá chủ · sai độ dài thì ném, thông điệp nói rõ cần 32 byte base64', () => {
  voiKhoaChu(randomBytes(16).toString('base64'), () => {
    const e = batLoi(() => docKhoaChu());
    assert.ok(e instanceof LoiKhoaChu);
    assert.match(e.message, /32 byte/);
    assert.match(e.message, /base64/);
  });
  voiKhoaChu('khong-phai-base64-32-byte', () => {
    assert.throws(() => docKhoaChu(), LoiKhoaChu);
  });
});

test('khoá chủ · 32 byte base64 thì đọc ra đúng 32 byte', () => {
  const b = docKhoaChu();
  assert.equal(b.length, 32);
  assert.equal(coKhoaChu(), true);
});

test('khoá chủ · LoiKhoaChu và LoiGiaiMa đều thuộc họ LoiModel', () => {
  assert.ok(new LoiKhoaChu('x') instanceof LoiModel);
  assert.ok(new LoiGiaiMa('x') instanceof LoiModel);
});

// ---- MÃ HOÁ · GIẢI MÃ --------------------------------------------------------------

test('mã hoá · đi rồi về đúng nguyên văn', () => {
  const goi = machHoa(KHOA_THAT);
  assert.equal(giaiMa(goi), KHOA_THAT);
});

test('tiêu chí ⑧ · gói lưu xuống chỉ có v/iv/the/mat, JSON.stringify KHÔNG chứa khoá gốc', () => {
  const goi = machHoa(KHOA_THAT);
  assert.deepEqual(Object.keys(goi).sort(), ['iv', 'mat', 'the', 'v']);
  assert.equal(goi.v, PHIEN_BAN);

  // Đây là đúng thứ đi vào cột `cau_hinh_model.khoa_ma_hoa`.
  const banGhi = { team_id: 't1', chinh_ma_model: 'kimi-k2.6', khoa_ma_hoa: { kimi: goi } };
  const chuoi = JSON.stringify(banGhi);
  assert.ok(!chuoi.includes(KHOA_THAT), 'khoá gốc lọt vào bản ghi');
  assert.ok(!chuoi.includes('sk-moonshot'), 'phần đầu khoá lọt vào bản ghi');
  // Cả ba trường đều là base64 đọc lại được.
  for (const k of ['iv', 'the', 'mat']) {
    assert.match(goi[k], /^[A-Za-z0-9+/]+={0,2}$/, `${k} không phải base64`);
  }
});

test('mã hoá · mã hai lần cùng một khoá ra hai gói khác nhau (IV ngẫu nhiên)', () => {
  const a = machHoa(KHOA_THAT);
  const b = machHoa(KHOA_THAT);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.mat, b.mat);
  assert.equal(giaiMa(a), giaiMa(b));
});

test('mã hoá · chuỗi rỗng hoặc không phải chuỗi thì ném LoiThamSo', () => {
  assert.throws(() => machHoa(''), LoiThamSo);
  assert.throws(() => machHoa(null), LoiThamSo);
  assert.throws(() => machHoa(12345), LoiThamSo);
});

test('giải mã · sửa MỘT ký tự trong `mat` thì ném LoiGiaiMa (GCM tự bắt)', () => {
  const goi = machHoa(KHOA_THAT);
  const doiMotKyTu = (s) => {
    const i = 3;
    const c = s[i] === 'A' ? 'B' : 'A';
    return s.slice(0, i) + c + s.slice(i + 1);
  };
  assert.throws(() => giaiMa({ ...goi, mat: doiMotKyTu(goi.mat) }), LoiGiaiMa);
  assert.throws(() => giaiMa({ ...goi, the: doiMotKyTu(goi.the) }), LoiGiaiMa);
  assert.throws(() => giaiMa({ ...goi, iv: doiMotKyTu(goi.iv) }), LoiGiaiMa);
});

test('giải mã · lỗi KHÔNG mang gói hay khoá vào thông điệp', () => {
  const goi = machHoa(KHOA_THAT);
  const e = batLoi(() => giaiMa({ ...goi, mat: `${goi.mat.slice(0, -2)}AA` }));
  assert.ok(e instanceof LoiGiaiMa);
  assert.ok(!e.message.includes(goi.mat));
  assert.ok(!e.message.includes(KHOA_THAT));
});

test('giải mã · gói mã bằng khoá chủ KHÁC thì ném, không trả rác', () => {
  const goi = machHoa(KHOA_THAT);
  voiKhoaChu(randomBytes(32).toString('base64'), () => {
    assert.throws(() => giaiMa(goi), LoiGiaiMa);
  });
});

test('giải mã · gói thiếu trường hoặc phiên bản lạ thì ném LoiGiaiMa', () => {
  const goi = machHoa(KHOA_THAT);
  assert.throws(() => giaiMa(null), LoiGiaiMa);
  assert.throws(() => giaiMa({}), LoiGiaiMa);
  assert.throws(() => giaiMa({ iv: goi.iv, the: goi.the }), LoiGiaiMa);
  assert.throws(() => giaiMa({ ...goi, v: 99 }), LoiGiaiMa);
  assert.equal(laGoiMaHoa(goi), true);
  assert.equal(laGoiMaHoa({ iv: 'a' }), false);
});

// ---- ĐUÔI KHOÁ ---------------------------------------------------------------------

test('đuôi khoá · trả đúng bốn ký tự cuối', () => {
  assert.equal(duoiKhoa(KHOA_THAT), 'a3f9');
  assert.equal(duoiKhoa('0123456789abcdef'), 'cdef');
});

test('đuôi khoá · chuỗi quá ngắn thì KHÔNG hiện gì (hiện đuôi là hiện gần hết)', () => {
  assert.equal(duoiKhoa('abc'), '');
  assert.equal(duoiKhoa('a'.repeat(DAI_TOI_THIEU_HIEN_DUOI - 1)), '');
  assert.equal(duoiKhoa('a'.repeat(DAI_TOI_THIEU_HIEN_DUOI)), 'aaaa');
  assert.equal(duoiKhoa(null), '');
});

// ---- CẢ BỘ BỐN NHÀ -----------------------------------------------------------------

test('bộ khoá · mã hoá cả bộ rồi giải lại đủ và đúng', () => {
  const tho = { kimi: KHOA_THAT, claude: 'sk-ant-0123456789abcdef' };
  const ma = machHoaKho(tho);
  assert.deepEqual(Object.keys(ma).sort(), ['claude', 'kimi']);
  assert.deepEqual(giaiMaKho(ma), tho);
  assert.ok(!JSON.stringify(ma).includes(KHOA_THAT));
});

test('bộ khoá · giá trị rỗng nghĩa là XOÁ khoá nhà đó', () => {
  const ma = machHoaKho({ kimi: KHOA_THAT, claude: '', openai: null });
  assert.ok(ma.kimi);
  assert.equal(ma.claude, null);
  assert.equal(ma.openai, null);
});

test('bộ khoá · nhà cung cấp lạ thì ném LoiThamSo (chặn gõ sai tên nhà)', () => {
  assert.throws(() => machHoaKho({ gemini: KHOA_THAT }), LoiThamSo);
});

test('bộ khoá · một gói hỏng thì bỏ nhà đó, KHÔNG làm chết cả bộ', () => {
  const ma = machHoaKho({ kimi: KHOA_THAT, claude: 'sk-ant-0123456789abcdef' });
  ma.claude = { ...ma.claude, mat: `${ma.claude.mat.slice(0, -2)}AA` };
  const ra = giaiMaKho(ma);
  assert.equal(ra.kimi, KHOA_THAT);      // Kimi vẫn gọi được
  assert.equal(ra.claude, undefined);
});

test('tóm tắt cho màn hình · đủ bốn nhà, chỉ có { daCo, duoi }, không một ký tự khoá thật', () => {
  const ma = machHoaKho({ kimi: KHOA_THAT });
  const tt = tomTatKho(ma);
  assert.deepEqual(Object.keys(tt).sort(), ['claude', 'deepseek', 'kimi', 'openai']);
  assert.deepEqual(tt.kimi, { daCo: true, duoi: 'a3f9' });
  assert.deepEqual(tt.claude, { daCo: false, duoi: null });
  const chuoi = JSON.stringify(tt);
  assert.ok(!chuoi.includes(KHOA_THAT));
  assert.ok(!chuoi.includes('sk-moonshot'));
});

test('tóm tắt · gói hỏng thì hiện daCo:true kèm cờ hỏng, KHÔNG giấu đi', () => {
  const ma = machHoaKho({ kimi: KHOA_THAT });
  ma.kimi = { ...ma.kimi, the: `${ma.kimi.the.slice(0, -2)}AA` };
  const tt = tomTatKho(ma);
  // Giấu đi thì người ta tưởng chưa dán khoá, dán đè lên rồi vẫn không hiểu vì sao lần
  // trước hỏng.
  assert.deepEqual(tt.kimi, { daCo: true, duoi: null, hong: true });
});
