// CHẠY BẢN THẬT — màn hình vai B nối vào CƠ SỞ DỮ LIỆU THẬT qua tầng truy vấn của người A.
//
// Khác `v3/xem-thu.js` (dữ liệu giả trong RAM): file này đọc `aicloser_v3` thật.
//
// VẪN KHÔNG GỬI TIN CHO AI. Nó chỉ nạp `v3/src/ui/dispatch` + `v3/src/auth` và tầng truy vấn
// `src/db/` — không nạp bộ não chat, không nạp cửa Pancake, không có đường ra ngoài.
//
//   DATABASE_URL_V3=... CHAYTHAT_CONG=3102 node v3/chay-that.js

import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const express = createRequire(path.join(GOC, 'package.json'))('express');

for (const bien of ['DATABASE_URL_V3', 'V3_KHOA_VE']) {
  if (!process.env[bien]) { console.error(`[chay-that] TỪ CHỐI CHẠY: thiếu ${bien}.`); process.exit(1); }
}

const { taoPool } = await import(`${GOC}/db/ket-noi.js`);
const auth = await import('./src/auth/index.js');
const { taoTruyVanThat } = await import('./src/noi-day/cong-du-lieu-that.js');
const { dungPhanB } = await import('./src/vai-b.js');

const pool = taoPool();
const taoTruyVan = (bc) => taoTruyVanThat(pool, bc);

// Cổng danh tính: bốn bảng dùng chung (team · nguoi_dung · vai · thanh_vien_team) KHÔNG nằm
// trong BANG_NGHIEP_VU_CHUAN của A (bàn giao tầng truy vấn §6) — gọi tầng đó với chúng là
// ném ngay. Nên đọc thẳng bằng pool, đúng chỗ A dặn B tự viết.
//
// ⚠️ PHẢI truyền vào làm `taoTruyVanHeThong`, KHÔNG gọi `datCongDanhTinh` riêng ở đây:
// `dungPhanB` tự đặt cổng danh tính bằng chính `taoTruyVanHeThong`, nên đặt trước là bị nó
// ghi đè, rồi đăng nhập nổ «nguoi_dung không nằm trong BANG_NGHIEP_VU_CHUAN». Đã dính thật.
const { taoCongDanhTinh } = await import('./src/noi-day/cong-danh-tinh.js');

const app = express();
const bao = dungPhanB(app, {
  taoTruyVan,
  taoTruyVanHeThong: () => taoCongDanhTinh(pool),
  express,
});
app.get('/', (_q, r) => r.redirect('/dieu-phoi'));

const CONG = Number(process.env.CHAYTHAT_CONG || 3102);
http.createServer(app).listen(CONG, () => {
  console.log(`[chay-that] DỮ LIỆU THẬT · cổng ${CONG} · KHÔNG gửi tin cho ai`);
  for (const d of bao.daNoi) console.log(`[chay-that] đã nối: ${d}`);
  for (const t of bao.thieu) console.log(`[chay-that] chưa nối: ${t}`);
});
