// MÁY CHỦ XEM THỬ MÀN HÌNH v3 — CHẠY BẰNG DỮ LIỆU GIẢ.
//
// Vì sao có file này: 37 màn hình v3 đã thiết kế xong nhưng **không có chỗ nào bấm thử**.
// Bản chạy thật cần PostgreSQL + tầng truy vấn của người A, mà máy chủ chưa có Postgres và
// mảnh nối còn chờ `PHIEU-B-Y1`. Trong lúc chờ, đây là cách duy nhất để người quyết nhìn
// thấy màn hình và duyệt những thứ đang chờ duyệt (danh sách kết quả đóng việc, mục 18 sổ tay).
//
// BA LUẬT CỦA CHÍNH FILE NÀY:
//   1. **Không bao giờ chạm dữ liệu thật.** Chỉ dùng `v3/testkit/db-gia.js` (RAM). Nếu môi
//      trường có `DATABASE_URL_V3` thì **từ chối khởi động** — để không ai vô tình trỏ bản
//      xem thử vào cơ sở dữ liệu thật rồi tưởng đang xem số thật.
//   2. **Không gửi tin cho ai.** Không nạp `src/` của bản đang chạy, không có đường ra Pancake.
//      Nút "Mở Pancake" chỉ là đường dẫn, bấm thì mở tab mới sang Pancake thật — chỉ để xem.
//   3. **Phải có mật khẩu.** `XEMTHU_MAT_KHAU` bắt buộc; thiếu là từ chối chạy, không tự đặt
//      mật khẩu mặc định.
//
//   node v3/xem-thu.js          # cổng lấy từ XEMTHU_CONG, mặc định 3101
//
// Dữ liệu bên trong là BỊA: tên khách đặt mới, tên page mượn dạng thật cho dễ nhìn.

import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const express = createRequire(path.join(GOC, 'package.json'))('express');

// ── luật 1 ──
if (process.env.DATABASE_URL_V3) {
  console.error('[xem-thu] TỪ CHỐI CHẠY: môi trường có DATABASE_URL_V3.');
  console.error('[xem-thu] Bản xem thử chỉ chạy bằng dữ liệu giả. Bỏ biến đó rồi chạy lại.');
  process.exit(1);
}
// ── luật 3 ──
const MAT_KHAU = process.env.XEMTHU_MAT_KHAU;
if (!MAT_KHAU || MAT_KHAU.length < 8) {
  console.error('[xem-thu] TỪ CHỐI CHẠY: thiếu XEMTHU_MAT_KHAU (tối thiểu 8 ký tự).');
  console.error('[xem-thu] Cố ý không có mật khẩu mặc định — bản này mở ra Internet.');
  process.exit(1);
}
process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { bam } = await import('./src/auth/mat-khau.js');
const auth = await import('./src/auth/index.js');
const { datCongDanhTinh } = await import('./src/auth/kho-nguoi-dung.js');
const { dungCongGia } = await import('./testkit/db-gia.js');
const { boiCanhMay } = await import('./src/auth/boi-canh.js');
const { dungPhanB } = await import('./src/vai-b.js');

const B = Date.now();
const p = (n) => B - n * 60000;

// Tên cột theo ĐÚNG lược đồ thật (`db/migrate/001_nen.up.sql`) — bản xem thử mà gieo sai tên
// thì nó thành cái bẫy: màn hình chạy đẹp trên dữ liệu giả rồi vỡ lúc nối vào bản thật.
const { taoTruyVan } = dungCongGia({
  nguoi_dung: [
    { id: '1', email: 'sale@talpha.vn', mat_khau_hash: await bam(MAT_KHAU), ten: 'Ngọc (sale)', hoat_dong: true },
    { id: '2', email: 'binh@talpha.vn', mat_khau_hash: await bam(MAT_KHAU), ten: 'Bình', hoat_dong: true },
  ],
  team: [
    { id: '1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
    { id: '2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
    { id: '3', slug: 'pialpha-eu', ten: 'Pialpha EU', la_ky_thuat: false },
    // Team KỸ THUẬT — cố ý gieo vào để thấy nó KHÔNG hiện trên màn chọn team.
    { id: '9', slug: 'chua-phan', ten: 'Chưa phân', la_ky_thuat: true },
  ],
  vai: [{ id: '1', ma: 'sale', ten: 'Sale' }, { id: '2', ma: 'quan-tri', ten: 'Quản trị' }],
  thanh_vien_team: [
    { id: '1', nguoi_dung_id: '1', team_id: '1', vai_id: '1' },
    { id: '2', nguoi_dung_id: '1', team_id: '2', vai_id: '2' },
    { id: '3', nguoi_dung_id: '1', team_id: '3', vai_id: '1' },
    { id: '4', nguoi_dung_id: '2', team_id: '1', vai_id: '1' },
  ],
  page: [
    { id: '1', team_id: '1', page_id: '1209280405604866', ten: 'Kreain Nature PH - Ksa' },
    { id: '2', team_id: '1', page_id: '1200082103184799', ten: 'Golden Soap House KSA' },
    { id: '3', team_id: '1', page_id: '1100863943120879', ten: 'Mint Breeze KSA' },
  ],
  khach: [
    { id: '1', team_id: '1', ten: 'Aisha Al Balushi', so_dien_thoai: '+96891234567', ti_le_hoan: 8.5 },
    { id: '2', team_id: '1', ten: 'Fatima Al Zadjali', so_dien_thoai: '+96899887766', ti_le_hoan: 41.2 },
    { id: '3', team_id: '1', ten: 'Mariam Al Hinai', so_dien_thoai: '+96897001122', ti_le_hoan: 0 },
    { id: '4', team_id: '1', ten: 'Laila Al Rawahi', so_dien_thoai: '+96895553311', ti_le_hoan: 12.9 },
    { id: '5', team_id: '1', ten: 'Noura Al Kindi', so_dien_thoai: '+96894442200', ti_le_hoan: 5.1 },
  ],
  // ⚠️ `hoi_thoai.page_id` là **bigint REFERENCES page(id)**, KHÔNG phải id Facebook —
  // id Facebook nằm ở `page.page_id`. Gieo nhầm hai cái này thì cột PAGE trên bảng điều
  // phối trống trơn mà không báo lỗi gì. Đã dính thật lúc dựng bản xem thử lần đầu.
  hoi_thoai: [
    { id: '1', team_id: '1', page_id: '1', psid: '9001', khach_id: '1' },
    { id: '2', team_id: '1', page_id: '1', psid: '9002', khach_id: '2' },
    { id: '3', team_id: '1', page_id: '2', psid: '9003', khach_id: '3' },
    { id: '4', team_id: '1', page_id: '3', psid: '9004', khach_id: '5' },
  ],
  don_hang: [
    { id: '1', team_id: '1', nguon: 'messenger', ma_pos: '77:40219', khach_id: '4',
      tong_tien: 159, trang_thai_pos: 'cho_xac_nhan', trang_thai_he: 'cho_sale' },
    { id: '2', team_id: '1', nguon: 'trang_ban_hang', ma_pos: '77:40233', khach_id: '2',
      tong_tien: 249, trang_thai_pos: 'cho_xac_nhan', trang_thai_he: 'cho_gui_wa' },
  ],
  viec_can_xu_ly: [
    { id: '1', team_id: '1', loai: 'hoi_thoai', hoi_thoai_id: '1',
      ly_do_day: 'Khách khiếu nại — hàng bị lỗi', day_luc: p(13), han_luc: p(3), nguoi_nhan_id: null, dong_luc: null },
    { id: '2', team_id: '1', loai: 'hoi_thoai', hoi_thoai_id: '2',
      ly_do_day: 'Khách đòi đổi hoặc trả hàng', day_luc: p(7), han_luc: p(-3), nguoi_nhan_id: null, dong_luc: null },
    { id: '3', team_id: '1', loai: 'hoi_thoai', hoi_thoai_id: '3',
      ly_do_day: 'Câu hỏi ngoài kịch bản', day_luc: p(2), han_luc: p(-8), nguoi_nhan_id: '2', nhan_luc: p(1), dong_luc: null },
    { id: '4', team_id: '1', loai: 'don_hang', don_hang_id: '1',
      ly_do_day: 'Đơn bot chốt, chờ sale duyệt', day_luc: p(11), han_luc: p(1), nguoi_nhan_id: null, dong_luc: null },
    { id: '5', team_id: '1', loai: 'don_hang', don_hang_id: '2',
      ly_do_day: 'Nghi trùng với đơn đã có', day_luc: p(1), han_luc: p(-9), nguoi_nhan_id: null, dong_luc: null },
    { id: '6', team_id: '1', loai: 'hoi_thoai', hoi_thoai_id: '4',
      ly_do_day: 'ma_la_chua_co_trong_bang', day_luc: p(4), han_luc: p(-6), nguoi_nhan_id: null, dong_luc: null },
    // Việc của team KHÁC — cố ý gieo để thấy nó KHÔNG lọt sang team đang đăng nhập.
    { id: '7', team_id: '2', loai: 'hoi_thoai', hoi_thoai_id: '1',
      ly_do_day: 'VIỆC CỦA TEAM AUUS — không được hiện ở Tiểu Alpha', day_luc: p(5), han_luc: p(5), nguoi_nhan_id: null, dong_luc: null },
  ],
  nhat_ky: [],
});

datCongDanhTinh(() => taoTruyVan(boiCanhMay('9', 'bản xem thử đọc bảng dùng chung')));

const app = express();
const bao = dungPhanB(app, {
  taoTruyVan,
  taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('9', 'bản xem thử đọc bảng dùng chung')),
  express,
});
app.get('/', (_q, r) => r.redirect('/dieu-phoi'));

const CONG = Number(process.env.XEMTHU_CONG || 3101);
http.createServer(app).listen(CONG, () => {
  console.log(`[xem-thu] DỮ LIỆU GIẢ — không đụng khách thật, không gửi tin cho ai.`);
  console.log(`[xem-thu] cổng ${CONG} · đăng nhập: sale@talpha.vn`);
  for (const d of bao.daNoi) console.log(`[xem-thu] đã nối: ${d}`);
});
