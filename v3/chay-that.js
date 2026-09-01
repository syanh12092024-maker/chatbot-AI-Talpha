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

/** Vé của vai B → hình dạng `ctx` mà tầng dữ liệu của người A đòi. */
const ctxCuaA = (bc) => ({ teamId: bc.teamId, nguoiDungId: bc.nguoiDungId });

// Cổng danh tính: bốn bảng dùng chung (team · nguoi_dung · vai · thanh_vien_team) KHÔNG nằm
// trong BANG_NGHIEP_VU_CHUAN của A (bàn giao tầng truy vấn §6) — gọi tầng đó với chúng là
// ném ngay. Nên đọc thẳng bằng pool, đúng chỗ A dặn B tự viết.
//
// ⚠️ PHẢI truyền vào làm `taoTruyVanHeThong`, KHÔNG gọi `datCongDanhTinh` riêng ở đây:
// `dungPhanB` tự đặt cổng danh tính bằng chính `taoTruyVanHeThong`, nên đặt trước là bị nó
// ghi đè, rồi đăng nhập nổ «nguoi_dung không nằm trong BANG_NGHIEP_VU_CHUAN». Đã dính thật.
const { taoCongDanhTinh } = await import('./src/noi-day/cong-danh-tinh.js');

// Chuyển page giữa các team — `PHIEU-B-Y3`, người A giao 25/08. Hàm này tự lo giao dịch,
// khoá dòng, kiểm vai `quan-tri` trong bảng `thanh_vien_team`, và ghi `nhat_ky` NGAY TRONG
// giao dịch. Lớp v3 chỉ dịch bối cảnh và gom kết quả từng page.
const { chuyenPageSangTeam } = await import(`${GOC}/src/db/chuyen-team.js`);

// Kho khoá API theo (team × nhà) — bảng `khoa_nha`, migration 008 (`PHIEU-B-Y2`).
// `ghiKhoaNha` của A nhận `teamSlug` chứ không nhận `teamId`, nên mảnh nối tra slug hộ.
const { ghiKhoaNha, docKhoaNha, coKhoaNha } = await import(`${GOC}/db/khoa.js`);

// Bốn bộ đọc khối prompt — chính bộ mà đường chat đang dùng. KHÔNG gọi `rapKb()`: nó có cờ
// `V3_RAP_PROMPT_BAT`, vắng cờ thì lui về `kb.js` cũ và không đụng CSDL. Bốn bộ lẻ không
// nhìn cờ, và cho từng khối riêng để đếm token.
const rap = await import(`${GOC}/src/chat/rap-prompt.js`);

// Bộ dựng BẢN CHO MÁY và bộ bóc file Pancake — của người A, dùng NGUYÊN. Tự viết bản thứ
// hai là màn hình hứa một prompt khác cái bot thật sự nhận.
const { dungBanChoMay } = await import(`${GOC}/db/di-tru/nguon.js`);
const { parsePancakeScript } = await import(`${GOC}/src/kb.js`);

// Cửa GHI có giao dịch cho bộ luật chung — người A giao (G2-A4). Màn của B cắt sang đây
// 25/08: bản đầu ghi bằng hai lời gọi `db.sua()` rời, nên giao dịch, khoá chống bấm-cùng-lúc
// và luật «đề xuất của AI phải có người duyệt» đều không ăn.
const noiDung = await import(`${GOC}/src/db/noi-dung.js`);
// Sổ số liệu của người A (G2-A6) — dùng ĐỐI CHIẾU ở màn Chi phí AI.
const soLieu = await import(`${GOC}/src/db/so-lieu.js`);
// CHỈ ĐỌC hằng `CORE` — `src/prompts.js` là file cấm sửa, nhưng nó tự export CORE cho các
// bộ nghiệm thu (`test/l4-prompt.test.mjs`), và màn Prompt của page cần đúng khối đó.
const { CORE: CORE_PROMPT } = await import(`${GOC}/src/prompts.js`);
const { datBotAi: _unused } = await import('./src/noi-day/cau-bot-v1.js');
const _slug = new Map();
async function slugCua(teamId) {
  if (_slug.has(String(teamId))) return _slug.get(String(teamId));
  const r = await pool.query('SELECT slug FROM team WHERE id = $1', [teamId]);
  if (!r.rowCount) throw new Error(`không có team id=${teamId}`);
  _slug.set(String(teamId), r.rows[0].slug);
  return r.rows[0].slug;
}

// Kết nối POS: bảng `ket_noi_pos` CHỨA BÍ MẬT nên nó cố ý không nằm trong tầng truy vấn
// chung — người A cho nó bộ đọc riêng. `lietKeThiTruong` KHÔNG giải mã khoá (đúng thứ màn
// cấu hình team cần: chỉ hiện thị trường, shop, bật/tắt).
//
// Nối vào đây thay vì để trống, vì để trống thì màn hình nói «chưa nối bộ đọc kết nối POS»
// — đúng sự thật, nhưng là một sự thật do chính máy chủ này gây ra chứ không phải do dữ liệu.
const { lietKeThiTruong } = await import(`${GOC}/src/pos/ket-noi.js`);

const app = express();
const bao = dungPhanB(app, {
  taoTruyVan,
  taoTruyVanHeThong: () => taoCongDanhTinh(pool),
  docKetNoiPos: (bc) => lietKeThiTruong(pool, { teamId: bc.teamId, nguoiDungId: bc.nguoiDungId || null }),
  chuyenPage: (bc, t) => chuyenPageSangTeam(pool, { teamId: bc.teamId, nguoiDungId: bc.nguoiDungId }, t),
  cuaBoLuat: {
    taoBan: (bc, t) => noiDung.taoBanBoLuat(pool, ctxCuaA(bc), t),
    ap: (bc, t) => noiDung.apBoLuat(pool, ctxCuaA(bc), t),
    duyet: (bc, t) => noiDung.duyetBoLuat(pool, ctxCuaA(bc), t),
    // Con số ② «bao nhiêu page bị ảnh hưởng» — hàm của A hỏi NGUỒN THẬT
    // (`ai-enabled.json`), không hỏi cột `page.bot_ai_bat` đã lệch. Xem B-Y7.
    xemAnhHuong: (bc) => noiDung.xemAnhHuongBoLuat(pool, ctxCuaA(bc)),
  },
  // Sổ cái `so_ai` của v3 — dùng để ĐỐI CHIẾU với số đo của tiến trình bot, không phải
  // nguồn chính. Hai sổ lệch thì màn Chi phí nói ra kèm cả hai con số.
  docSoAiV3: (bc) => soLieu.chiPhiAiTheoPage(pool, ctxCuaA(bc)),
  docHieuQua: (bc) => soLieu.hieuQuaKichBan(pool, ctxCuaA(bc)),
  // Hai luồng đơn đo THẲNG trong CSDL (một câu GROUP BY nguon, có lớp vai). Không truyền
  // thì màn Báo cáo tự đếm `don_hang` lần hai — bản khai thứ hai của một con số, đúng
  // bệnh vừa vá ở màn «Rủi ro hoàn hàng» (01/09).
  docHaiLuong: (bc) => soLieu.baoCaoHaiLuong(pool, ctxCuaA(bc)),
  // Phân bố tầng × số đơn đã kết — gom bằng một câu GROUP BY thay vì kéo `khach` về màn.
  docPhanBoHoan: (bc) => soLieu.phanBoRuiRoHoan(pool, ctxCuaA(bc)),
  // Hiệu lực THẬT của prompt cho màn «Prompt của page»: cờ ráp-4-khối và hằng `CORE` của
  // `src/prompts.js` (chỉ ĐỌC — file cấm sửa). Thiếu hai thứ này thì màn khoe một prompt
  // mà bot chưa chắc đang gửi.
  docHieuLucPrompt: () => ({
    coBat: process.env.V3_RAP_PROMPT_BAT === '1',
    core: CORE_PROMPT,
  }),
  dungBanMay: (cfg) => dungBanChoMay(cfg),
  // Đưa lên LIVE = ghi vào `kb-overrides.json` + RAM tiến trình bot, qua đúng cửa v1.
  dayKichBanLenBot: async (pageIdFacebook, cfg) => {
    const { goiAdminV1 } = await import('./src/noi-day/cau-bot-v1.js');
    return goiAdminV1(`/kb/${encodeURIComponent(pageIdFacebook)}/config`, { phuongThuc: 'POST', than: cfg, ghi: true });
  },
  bocPancake: async (b64) => parsePancakeScript(b64),
  docKhoi: {
    boLuat: (teamId) => rap.docBoLuatChung(pool, teamId),
    // `docKyNang` lọc theo MÃ sản phẩm của page. Nơi gọi truyền sẵn mã xuống — nó đã đọc
    // `san_pham` cho khối sản phẩm rồi, đọc lại là tốn thêm một dòng `nhat_ky` mỗi lượt xem.
    kyNang: (teamId, _pageRowId, dsMaSp = []) => rap.docKyNang(pool, teamId, dsMaSp),
    kichBan: (teamId, pageRowId) => rap.docKichBanLive(pool, teamId, pageRowId),
    sanPham: (teamId, pageRowId) => rap.docSanPhamGoiGia(pool, teamId, pageRowId),
  },
  khoKhoa: {
    coKhoa: (teamId, nha) => coKhoaNha(pool, { teamId, nhaCungCap: nha }),
    docKhoa: (teamId, nha) => docKhoaNha(pool, { teamId, nhaCungCap: nha }),
    ghiKhoa: async (teamId, nha, khoaApi) =>
      ghiKhoaNha(pool, { teamSlug: await slugCua(teamId), nhaCungCap: nha, khoaApi }),
  },
  express,
});
app.get('/', (_q, r) => r.redirect('/dieu-phoi'));

const CONG = Number(process.env.CHAYTHAT_CONG || 3102);
http.createServer(app).listen(CONG, () => {
  console.log(`[chay-that] DỮ LIỆU THẬT · cổng ${CONG} · KHÔNG gửi tin cho ai`);
  for (const d of bao.daNoi) console.log(`[chay-that] đã nối: ${d}`);
  for (const t of bao.thieu) console.log(`[chay-that] chưa nối: ${t}`);
});
