// PHIẾU LL6 · CÀI ĐẶT — MỘT dòng, sáu tab theo bản vẽ; màn Model nói ĐIỀU MÁY LÀM (CR-28-09c §7).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const mh = await import('../../src/ui/chung/man-hinh.js');
const { VAI } = await import('../../src/auth/boi-canh.js');
const { DUONG_DUNG_VAI_TRO, GIAI_THICH_VAI_TRO } = await import('../../src/ui/model/kho-model.js');
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const doc = (f) => fs.readFileSync(path.join(GOC, f), 'utf8');

test('K1 · Cài đặt của quản trị: MỘT dòng thanh bên, sáu tab theo thứ tự bản vẽ', () => {
  const n = mh.menuCua([VAI.QUAN_TRI]).find((x) => x.ma === 'cai-dat');
  assert.deepEqual(n.man.filter((m) => !m.an).map((m) => m.tenMenu || m.ten), ['Cài đặt']);
  assert.deepEqual(n.man.filter((m) => m.cum === 'cai-dat' && (!m.an || m.trongCum)).map((m) => m.nhanCum),
    // LL10 · 29/09: + «Vận hành» sau «Hệ còn sống» — nhà của việc vận hành (diễn tập · tin bị lọc · chi phí từng tin …).
    // VE7a · 30/09 (bản vẽ 4): «Hệ còn sống» lên ngay sau Bắt đầu và nhận «Việc vận hành»; Vận hành rời thanh tab (mở từ đó).
    ['Bắt đầu', 'Hệ còn sống', 'Kết nối', 'Model', 'Người và team', 'Nhật ký']);
});

test('K2 · bảng «đường dùng thật» của màn Model KHỚP mã đường chat — nối dự phòng (LL14) mà không sửa bảng là đỏ', () => {
  // Mọi lời gọi `layModel(` trong mã chạy: chỉ vai «chính» (tường minh hoặc mặc định).
  const tep = ['src/chat/handler-v3.js', 'src/admin-v3/operations.js'];
  const loiGoi = tep.flatMap((f) => [...doc(f).matchAll(/layModel\(([^)]*)\)/g)].map((m) => `${f}: ${m[1]}`));
  assert.ok(loiGoi.length >= 2, `chỉ thấy ${loiGoi.length} lời gọi layModel — thước đo nhầm chỗ`);
  const khacChinh = loiGoi.filter((x) => /vaiTro/.test(x) && !/vaiTro:\s*["']chinh["']/.test(x));
  assert.deepEqual(khacChinh, [], 'có đường đọc vai khác «chính» — cập nhật DUONG_DUNG_VAI_TRO');
  // Không nơi nào trong src/ và v3/src/ gọi layModel với du_phong/nen.
  const quet = (d) => fs.readdirSync(path.join(GOC, d), { recursive: true }).filter((f) => String(f).endsWith('.js'))
    .map((f) => path.join(d, String(f)));
  const doc2 = [...quet('src'), ...quet('v3/src')].filter((f) => /vaiTro:\s*["'](du_phong|nen)["']/.test(doc(f)));
  assert.deepEqual(doc2, [], 'có mã đọc vai dự phòng/nền');
  assert.ok(!/goiCoDuPhong/.test(doc('src/chat/model.js')), 'đường chat đã dùng lớp dự phòng — cập nhật bảng');
  assert.equal(DUONG_DUNG_VAI_TRO.chinh.dung, true);
  assert.equal(DUONG_DUNG_VAI_TRO.du_phong.dung, false);
  assert.equal(DUONG_DUNG_VAI_TRO.nen.dung, false);
});

test('K3 · lời giải thích không hứa ở thì hiện tại điều máy chưa làm; trang vẽ trạng thái của từng vai', () => {
  assert.ok(!/^Chạy khi/.test(GIAI_THICH_VAI_TRO.du_phong), 'dự phòng chưa nối mà vẫn viết «Chạy khi…»');
  const html = doc('v3/src/ui/model/trang/model-ai.html');
  assert.equal((html.match(/\(D\.duongDung \|\| \{\}\)\.(chinh|du_phong|nen)/g) || []).length, 3, 'ba hàng vai phải nhận trạng thái');
  assert.match(html, /statusBadge\(duongDung\.dung \? 'ready' : 'needs_attention'/);
  assert.match(doc('v3/src/ui/model/kho-model.js'), /duongDung: DUONG_DUNG_VAI_TRO/);
});
