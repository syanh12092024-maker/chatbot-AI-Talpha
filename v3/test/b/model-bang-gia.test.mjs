// BẢNG MODEL & QUY GIÁ — L1-M4a
//
// Bài quan trọng nhất ở đây là bài ĐỐI CHIẾU VỚI TÀI LIỆU: `dTinThamChieu` của cả bảy
// model phải khớp cột "đ/tin" của `docs/v3/01-QUYET-DINH.md` mục 7 trong sai số 2%.
// Bảng giá trong code lệch tài liệu mà không ai biết thì MỌI so sánh model sau này đều
// sai — mà cả lớp model tồn tại chỉ để so được model nào rẻ hơn THẬT. Đây là cái chuông.
//
// Test đọc THẲNG file tài liệu chứ không chép số sang đây: chép số là hai bản sao rồi
// lệch nhau lúc nào không hay, đúng cái bệnh đang muốn chữa.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  layModel, danhSachModel, quyTien, dTinThamChieu, chuanHoaDemToken,
  tenBienGia, tiGiaHienTai, MA_MODEL, HO_SO_TOKEN_DO_THAT, USD_VND_MAC_DINH,
} from '../../src/model/bang-model.js';
import { LoiModelLa, LoiThamSo } from '../../src/model/loi.js';

const thuMuc = path.dirname(fileURLToPath(import.meta.url));
const FILE_QUYET_DINH = path.resolve(thuMuc, '../../../docs/v3/01-QUYET-DINH.md');

/** Tỉ giá mà bảng quyết định đã dùng để tính cột đ/tin. */
const TI_GIA_TAI_LIEU = 26000;
const SAI_SO_CHO_PHEP = 2; // phần trăm

/** '**Kimi K2.6** ← đang chạy' → 'kimi-k2.6' */
function maTuTenTaiLieu(ten) {
  return String(ten)
    .replace(/\*\*/g, '')
    .replace(/←.*$/, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/** '**127,7**' → 127.7 (tài liệu viết dấu phẩy thập phân kiểu Việt) */
function soTuO(o) {
  return Number(String(o).replace(/\*\*/g, '').replace(/\s/g, '').replace(',', '.'));
}

/** Đọc cột "đ/tin" của mục 7 trong hồ sơ quyết định → Map<ma, đ/tin>. */
function docDTinTuTaiLieu() {
  const van = fs.readFileSync(FILE_QUYET_DINH, 'utf8');
  const dau = van.indexOf('## 7 · Model AI');
  assert.notEqual(dau, -1, 'Không tìm thấy mục 7 trong 01-QUYET-DINH.md — tài liệu đã đổi cấu trúc?');
  const sau = van.indexOf('\n## ', dau + 5);
  const khuc = van.slice(dau, sau === -1 ? undefined : sau);

  const bang = new Map();
  for (const dong of khuc.split('\n')) {
    const d = dong.trim();
    if (!d.startsWith('|')) continue;
    const o = d.split('|').slice(1, -1).map((s) => s.trim());
    if (o.length < 2) continue;
    if (/^-+:?$|^:?-+/.test(o[0]) || o[0] === 'Model') continue; // dòng kẻ & dòng tiêu đề
    const ma = maTuTenTaiLieu(o[0]);
    const dTin = soTuO(o[1]);
    if (!Number.isFinite(dTin)) continue;
    bang.set(ma, dTin);
  }
  return bang;
}

test('bảng giá · đ/tin bảy model khớp cột "đ/tin" của 01-QUYET-DINH.md mục 7 (sai số 2%)', () => {
  const tuTaiLieu = docDTinTuTaiLieu();

  assert.equal(tuTaiLieu.size, 7, `Mục 7 phải có đúng 7 model, đọc được ${tuTaiLieu.size}: ${[...tuTaiLieu.keys()].join(', ')}`);
  assert.deepEqual([...tuTaiLieu.keys()].sort(), [...MA_MODEL].sort(),
    'Mã model trong bảng code không khớp tên model trong tài liệu.');

  for (const [ma, dTinTaiLieu] of tuTaiLieu) {
    const dTinCode = dTinThamChieu(ma, { usdVnd: TI_GIA_TAI_LIEU });
    const lech = Math.abs((dTinCode - dTinTaiLieu) / dTinTaiLieu) * 100;
    assert.ok(
      lech <= SAI_SO_CHO_PHEP,
      `${ma}: code ${dTinCode}đ/tin vs tài liệu ${dTinTaiLieu}đ/tin — lệch ${lech.toFixed(2)}% (> ${SAI_SO_CHO_PHEP}%)`,
    );
  }
});

test('bảng giá · hồ sơ token nền đúng số đo thật 22/08/2026', () => {
  // vào 3.053 · đọc cache 8.390 · ra 167 — "Số đo nền" của 01-QUYET-DINH.md.
  assert.deepEqual({ ...HO_SO_TOKEN_DO_THAT }, { vao: 3053, cacheDoc: 8390, cacheGhi: 0, ra: 167 });
  assert.equal(USD_VND_MAC_DINH, 26000);
});

test('bảng giá · bảy dòng, đủ trường, đủ bốn nhà', () => {
  const ds = danhSachModel();
  assert.equal(ds.length, 7);
  for (const d of ds) {
    assert.equal(typeof d.ma, 'string');
    assert.ok(['claude', 'kimi', 'openai', 'deepseek'].includes(d.nha), `nhà lạ: ${d.nha}`);
    assert.equal(typeof d.maGoiApi, 'string');
    assert.ok(d.maGoiApi.length > 0);
    for (const k of ['vao', 'cacheDoc', 'cacheGhi', 'ra']) {
      assert.equal(typeof d.giaUsd[k], 'number', `${d.ma} thiếu giá ${k}`);
      assert.ok(d.giaUsd[k] >= 0);
    }
    assert.ok(['cong-bo', 'suy-nguoc'].includes(d.nguonGia), `${d.ma}: nguonGia lạ ${d.nguonGia}`);
    assert.ok(String(d.ghiChu).length > 0, `${d.ma} thiếu ghi chú`);
  }
  assert.equal(danhSachModel({ nha: 'claude' }).length, 3);
  assert.equal(danhSachModel({ nha: 'kimi' }).length, 2);
  assert.equal(danhSachModel({ nha: 'openai' }).length, 1);
  assert.equal(danhSachModel({ nha: 'deepseek' }).length, 1);
});

test('bảng giá · hai model chưa mở tài khoản phải ghi rõ là giá SUY NGƯỢC', () => {
  // Không đánh dấu thì sau này có người tưởng đó là giá công bố rồi đem đi quyết định thật.
  const suyNguoc = danhSachModel().filter((d) => d.nguonGia === 'suy-nguoc').map((d) => d.ma).sort();
  assert.deepEqual(suyNguoc, ['deepseek-v4-flash', 'gpt-5.6-luna', 'kimi-k2.5']);
  for (const ma of suyNguoc) {
    assert.match(layModel(ma).ghiChu, /SUY NGƯỢC/, `${ma}: ghi chú phải nói rõ giá là số suy ngược`);
  }
});

test('bảng giá · mã model lạ thì NÉM LoiModelLa, không trả undefined', () => {
  assert.throws(() => layModel('gpt-9000'), LoiModelLa);
  assert.throws(() => layModel(''), LoiModelLa);
  assert.throws(() => layModel(undefined), LoiModelLa);
  try {
    layModel('gpt-9000');
  } catch (e) {
    assert.equal(e.maModel, 'gpt-9000');
    assert.match(e.message, /kimi-k2\.6/); // gợi ý mã đúng ngay trong lỗi
  }
});

test('quyTien · nhận cả hình dạng Anthropic lẫn hình dạng nội bộ, ra cùng một số', () => {
  const anthropic = {
    input_tokens: 3053,
    output_tokens: 167,
    cache_read_input_tokens: 8390,
    cache_creation_input_tokens: 0,
  };
  const noiBo = { vao: 3053, ra: 167, cacheDoc: 8390, cacheGhi: 0 };
  assert.deepEqual(chuanHoaDemToken(anthropic), noiBo);

  const a = quyTien(anthropic, 'kimi-k2.6', { usdVnd: TI_GIA_TAI_LIEU });
  const b = quyTien(noiBo, 'kimi-k2.6', { usdVnd: TI_GIA_TAI_LIEU });
  assert.deepEqual(a, b);
  // Đúng bằng đ/tin của bảng quyết định vì đây chính là hồ sơ token nền.
  assert.equal(a.vnd, Math.round(dTinThamChieu('kimi-k2.6', { usdVnd: TI_GIA_TAI_LIEU })));
});

test('quyTien · ghi cache tính riêng, không lẫn với giá vào', () => {
  // Trước 11/08/2026 khoản GHI cache không được đếm và không được tính giá, nên mọi con
  // số chi phí trước đó là CẬN DƯỚI (src/economics.js dòng 72–75). v3 phải tính đủ.
  const khongGhi = quyTien({ vao: 1000, ra: 0, cacheDoc: 0, cacheGhi: 0 }, 'claude-haiku-4.5', { usdVnd: 26000 });
  const coGhi = quyTien({ vao: 1000, ra: 0, cacheDoc: 0, cacheGhi: 1000 }, 'claude-haiku-4.5', { usdVnd: 26000 });
  assert.ok(coGhi.usd > khongGhi.usd, 'ghi cache phải làm tăng tiền');
  // Haiku: ghi cache 1,25 USD/Mtok → 1000 token = 0,00125 USD.
  assert.equal(+(coGhi.usd - khongGhi.usd).toFixed(8), 0.00125);
});

test('quyTien · token thiếu/âm/không phải số thì coi như 0, không ra NaN', () => {
  assert.deepEqual(chuanHoaDemToken({}), { vao: 0, ra: 0, cacheDoc: 0, cacheGhi: 0 });
  assert.deepEqual(chuanHoaDemToken(undefined), { vao: 0, ra: 0, cacheDoc: 0, cacheGhi: 0 });
  assert.deepEqual(chuanHoaDemToken({ vao: -5, ra: 'x' }), { vao: 0, ra: 0, cacheDoc: 0, cacheGhi: 0 });
  const t = quyTien({}, 'kimi-k2.6');
  assert.equal(t.usd, 0);
  assert.equal(t.vnd, 0);
});

test('tỉ giá · mặc định 26.000, đọc AI_USD_VND lúc GỌI (không phải lúc nạp module)', () => {
  const cu = process.env.AI_USD_VND;
  try {
    delete process.env.AI_USD_VND;
    assert.equal(tiGiaHienTai(), 26000);
    process.env.AI_USD_VND = '27000';
    assert.equal(tiGiaHienTai(), 27000);
    assert.equal(
      quyTien({ vao: 1e6, ra: 0, cacheDoc: 0, cacheGhi: 0 }, 'claude-haiku-4.5').vnd,
      27000,
    );
    process.env.AI_USD_VND = 'linh tinh';
    assert.equal(tiGiaHienTai(), 26000, 'tỉ giá hỏng thì quay về mặc định, không ra NaN');
  } finally {
    if (cu === undefined) delete process.env.AI_USD_VND; else process.env.AI_USD_VND = cu;
  }
});

test('đè đơn giá bằng env · V3_GIA_<MÃ> đổi được giá, sai cú pháp thì NÉM LỖI', () => {
  const ten = tenBienGia('kimi-k2.6');
  assert.equal(ten, 'V3_GIA_KIMI_K2_6');
  assert.equal(tenBienGia('gpt-5.6-luna'), 'V3_GIA_GPT_5_6_LUNA');
  assert.equal(tenBienGia('deepseek-v4-flash'), 'V3_GIA_DEEPSEEK_V4_FLASH');

  const cu = process.env[ten];
  try {
    process.env[ten] = '1,0.1,1.25,5';
    const d = layModel('kimi-k2.6');
    assert.deepEqual({ ...d.giaUsd }, { vao: 1, cacheDoc: 0.1, cacheGhi: 1.25, ra: 5 });
    assert.equal(d.giaDeBangEnv, true);
    // Đè xong thì đ/tin của Kimi đúng bằng đ/tin của Haiku (cùng bảng giá).
    assert.equal(
      dTinThamChieu('kimi-k2.6', { usdVnd: 26000 }),
      dTinThamChieu('claude-haiku-4.5', { usdVnd: 26000 }),
    );

    // Sai cú pháp phải NÉM. Im lặng dùng giá cũ là kiểu sai tệ nhất: người đặt biến tin
    // là đã đổi giá, mà mọi con số chi phí sau đó vẫn tính bằng giá cũ.
    process.env[ten] = '1,2,3';
    assert.throws(() => layModel('kimi-k2.6'), LoiThamSo);
    process.env[ten] = '1,2,ba,4';
    assert.throws(() => layModel('kimi-k2.6'), LoiThamSo);
    process.env[ten] = '1,-2,3,4';
    assert.throws(() => layModel('kimi-k2.6'), LoiThamSo);
  } finally {
    if (cu === undefined) delete process.env[ten]; else process.env[ten] = cu;
  }
  assert.equal(layModel('kimi-k2.6').giaDeBangEnv, false);
});

test('bảng giá · mã gọi API của họ Claude đúng dạng nhà cung cấp nhận', () => {
  // Mã HỆ THỐNG dùng dấu chấm cho người đọc ('claude-haiku-4.5'), mã GỌI API thì phải là
  // chuỗi Anthropic thật sự nhận ('claude-haiku-4-5'). Lẫn hai thứ là 404 "model not
  // found" và bot đứng im — bẫy có thật, ghi ở src/config.js dòng 18–19.
  assert.equal(layModel('claude-haiku-4.5').maGoiApi, 'claude-haiku-4-5');
  assert.equal(layModel('claude-sonnet-5').maGoiApi, 'claude-sonnet-5');
  assert.equal(layModel('claude-opus-5').maGoiApi, 'claude-opus-5');
  assert.equal(layModel('kimi-k2.6').maGoiApi, 'kimi-k2.6');
});
