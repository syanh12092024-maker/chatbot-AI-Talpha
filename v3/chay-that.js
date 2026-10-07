// CHẠY BẢN THẬT — màn hình vai B nối vào CƠ SỞ DỮ LIỆU THẬT qua tầng truy vấn của người A.
//
// Khác `v3/xem-thu.js` (dữ liệu giả trong RAM): file này đọc `aicloser_v3` thật.
//
// UI vận hành đọc/ghi PostgreSQL. Duyệt đơn gọi business service và có thể tạo đơn POS
// khi các điều kiện cấu hình cho phép. Worker chat vẫn là tiến trình riêng.
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
// UI-HT1: bộ đọc Sổ AI của bot cũ (đồng bộ) — nạp một lần ở đây vì bộ tra mã gọi nó đồng bộ.
const _soAi = await import(`${GOC}/src/ai-log.js`).catch((e) => { console.error('[chay-that] không nạp được src/ai-log.js:', e?.message || e); return null; });
// UI-HT3: mẫu tin máy (Botcake/RTO) — chỉ đọc `botcake-templates.json`, không mở kết nối nào.
const _mauMay = await import(`${GOC}/src/bot-registry.js`).catch((e) => { console.error('[chay-that] không nạp được src/bot-registry.js:', e?.message || e); return null; });

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
const { chuyenPageSangTeam, pageChuaPhan } = await import(`${GOC}/src/db/chuyen-team.js`);

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
const { datBotAi: _unused } = await import('./src/noi-day/loi-bot.js');
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
const { lietKeThiTruong, themKetNoi, suaKetNoi, batTatKetNoi, boKetNoi }
  = await import(`${GOC}/src/pos/ket-noi.js`);

const khoToken = await import(`${GOC}/src/token-pancake.js`);
const { quetVaGhiPage } = await import(`${GOC}/src/quet-page.js`);
// TIẾN TRÌNH NÀY CŨNG PHẢI THẤY KHO TOKEN CSDL.
//
// `src/pancake.js` giữ kho token theo TỪNG tiến trình. Bản đầu tôi chỉ nối ở `src/server.js`
// và worker — nhưng lượt quét Pancake chạy trong CHÍNH tiến trình giao diện này, nên nó
// thấy 0 token và báo «không token nào trả về page» trong khi kho token có token sống.
// Nối ở đây là điều kiện để nút «Quét Pancake» hoạt động.
const { datKhoTokenDb, lamMoiTokenDb } = await import(`${GOC}/src/pancake.js`);
datKhoTokenDb(() => khoToken.docTokenSong(pool));
// CR-02-10 · MB1: lõi bot (KB · Sheet danh bạ · page Pancake · sổ đăng ký page) chạy TRONG tiến
// trình này — trước 02/10 nó chỉ chạy trong tiến trình bot v1 và màn đọc qua `/admin/api`.
await (await import(`${GOC}/src/core/khoi-dong-loi.js`)).khoiDongLoi({ nhan: 'chay-that', quetSoDangKy: true });
const { keoDanhMucTeam } = await import(`${GOC}/src/pos/keo-danh-muc.js`);
const spGoc = await import(`${GOC}/src/products/san-pham-goc.js`);
const chuyenBanSao = await import(`${GOC}/src/products/chuyen-ban-sao.js`);   // GSP2 · danh sách việc chuyển
// BẢN SỬA ĐƯỢC của sản phẩm, lấy THEO ID (GD3 · 25/09).
//
// ⚠️ VÌ SAO KHÔNG DÙNG `/api/van-hanh/products`: cửa ấy cắt **50 dòng mỗi trang** và BỎ các
//    bậc giá đang tắt. Tab sản phẩm của trang page ghép theo id, nên sản phẩm thứ 51 trở đi
//    biến mất — đo được: page thử có sản phẩm id 236, cửa kia chỉ trả tới id ~120, và tab
//    nói «page này chưa có sản phẩm nào». Một câu SAI, không phải một câu thiếu.
//
// ⚠️ VÀ PHẢI TRẢ ĐỦ BẬC TẮT: bộ đọc của đường ráp lời cố ý lọc bỏ bậc `bat=false` (bot không
//    được chào giá đã ngừng bán). Nhưng màn SỬA mà thiếu chúng thì lượt lưu kế tiếp XOÁ MẤT
//    chúng — cửa ghi thay trọn danh sách bậc giá.
const { HE_SO_TE: HE_SO_TE_SUA } = await import(`${GOC}/src/pos/tao-don.js`);
async function docSanPhamSua(bc, ids) {
  const ds = (Array.isArray(ids) ? ids : []).map((x) => String(x)).filter(Boolean);
  if (!ds.length) return [];
  // CR-28-09b · MN4: thêm `nhan` (tên bậc khách đọc), `bien_the` và ẢNH. Đọc hai cột mới qua
  // `to_jsonb(...)->>` để câu KHÔNG gãy trên CSDL chưa áp 025 (cột vắng ⇒ null ⇒ '').
  const r = await pool.query(
    `SELECT s.id, s.ma, s.ten, s.mo_ta, s.het_hang, s.xmin::text AS version,
       COALESCE(to_jsonb(s)->>'bien_the', '') AS bien_the,
       to_jsonb(s)->>'pos_ma' AS pos_ma,
       (SELECT jsonb_build_object('ten', p.ten, 'ton_kho', p.ton_kho, 'het_hang', p.het_hang) FROM san_pham p
         WHERE p.team_id = s.team_id AND p.nguon = 'pos' AND p.ma = to_jsonb(s)->>'pos_ma') AS pos,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'so_luong',g.so_luong,'gia',g.gia,'tien_te',g.tien_te,'gia_goc',g.gia_goc,
           'khuyen_mai',g.khuyen_mai,'phi_ship',g.phi_ship,'mien_ship',g.mien_ship,'bat',g.bat,
           'nhan',COALESCE(to_jsonb(g)->>'nhan',''))
           ORDER BY g.so_luong)
         FROM goi_gia g WHERE g.team_id = s.team_id AND g.san_pham_id = s.id), '[]') AS offers
     FROM san_pham s WHERE s.team_id = $1 AND s.id = ANY($2::bigint[]) ORDER BY s.ma`,
    [bc.teamId, ds],
  );
  const anhTheoSp = new Map();
  try {
    const a = await pool.query(
      `SELECT id, san_pham_id, duong, nhan, thu_tu FROM anh_san_pham
        WHERE team_id = $1 AND san_pham_id = ANY($2::bigint[]) ORDER BY san_pham_id, thu_tu, id`,
      [bc.teamId, ds],
    );
    for (const x of a.rows) {
      const k = String(x.san_pham_id);
      if (!anhTheoSp.has(k)) anhTheoSp.set(k, []);
      anhTheoSp.get(k).push({ id: String(x.id), duong: x.duong, nhan: x.nhan, thuTu: x.thu_tu });
    }
  } catch (e) { if (e?.code !== '42P01') throw e; }   // 025 chưa áp ⇒ chưa có ảnh nào ở v3
  const lon = (v, tt) => (v == null ? null : Number(v) / (HE_SO_TE_SUA[tt] || 1));
  const { tenKhachCuaPos } = await import(`${GOC}/src/products/noi-pos.js`);
  return r.rows.map((x) => ({
    ...x,
    // MN8: tên món POS cho KHÁCH đọc — bỏ số hiệu nội bộ «41 - …» (nút «Dùng tên POS»).
    pos: x.pos ? { ...x.pos, ten_khach: tenKhachCuaPos(x.pos.ten) } : null,
    anh: anhTheoSp.get(String(x.id)) || [],
    offers: (x.offers || []).map((g) => ({
      ...g,
      price: lon(g.gia, g.tien_te),
      gia_goc: lon(g.gia_goc, g.tien_te),
      phi_ship: lon(g.phi_ship, g.tien_te),
    })),
  }));
}

const { noiVanHanhV3 } = await import('./src/noi-day/van-hanh-v3.js');
const docSanSangV3 = noiVanHanhV3(pool);

// ═══ MÁY CHẠY BOT CÒN SỐNG KHÔNG (GD5 · K4) ═══════════════════════════════════════════
// Đo bằng HÀNG ĐỢI TIN, không bằng «tiến trình có `active` không». Ngày 08–10/08/2026
// systemctl báo `active` suốt hai ngày trong khi không khách nào được trả lời — nên phép
// đo phải nhìn vào việc tin của khách CÓ ĐƯỢC RÚT RA XỬ hay không.
// Bảng nhịp tim riêng đo thẳng hơn, nhưng nó cần một migration; chỗ này thì đã có sẵn.
const { nhipMayBot } = await import(`${GOC}/src/queue/kho.js`);

// ═══ PHỄU CẢNH BÁO CỦA LỚP MODEL (GD5 · K8) ═══════════════════════════════════════════
// Chưa nối thì `canhBao()` chỉ in ra console của tiến trình — tức lời báo «nhà chính hết
// tiền, đã chuyển dự phòng» sống đúng bằng tuổi của một vòng log, và cảnh 06/08/2026 (ba
// tiếng không ai biết) lặp lại y nguyên.
//
// ⚠️ CÓ CHỖ GIAO VỚI NHẬT KÝ SẴN CÓ, VÀ NÓI RA: lớp model đã tự ghi `chuyen_du_phong` /
//    `lop_model_hong` cho hai lượt đổi trạng thái. Dòng ở đây KHÁC ở chỗ nó mang MỨC NẶNG
//    NHẸ và CÂU NGƯỜI ĐỌC ĐƯỢC, và nó có mặt cả ở lượt «nhà đã sống lại» — lượt mà lớp
//    model KHÔNG ghi nhật ký, tức trước hôm nay không chỗ nào lưu lại.
//    Không sợ ngập: lớp model chỉ báo khi ĐỔI trạng thái (`vuaHong`, `_daBaoCaHai`).
const { ghiNhatKy: ghiNhatKyV3, HANH_DONG } = await import('./src/audit/index.js');
async function canhBaoLopModel(canh) {
  const { muc = 'canh_bao', thongDiep = '', teamId = null, nha = '', maModel = '' } = canh || {};
  const dong = `[chay-that] BÁO ĐỘNG lớp model (${muc}) team=${teamId ?? '?'} `
    + `nhà=${nha || '?'} model=${maModel || '?'}: ${thongDiep}`;
  if (muc === 'tin') console.warn(dong); else console.error(dong);
  // `nhat_ky.team_id` là NOT NULL. Báo động không có team thì không có chỗ đứng trong bảng
  // — in ra rồi thôi, chứ không gán bừa một team để cho vừa lược đồ.
  if (teamId == null) return null;
  try {
    return await ghiNhatKyV3(auth.boiCanhMay(teamId, 'báo động từ lớp model'), {
      hanhDong: HANH_DONG.CANH_BAO_MODEL,
      doiTuongLoai: 'cau_hinh_model',
      doiTuongId: maModel || nha || '',
      sau: { muc, nha, ma_model: maModel },
      ghiChu: String(thongDiep).slice(0, 300),
    });
  } catch (e) {
    // Ghi hỏng KHÔNG được làm hỏng lượt gọi model đang chạy — nhưng phải kêu, vì im lặng ở
    // đúng cái phễu báo động là mất luôn lớp phòng cuối.
    console.error('[chay-that] ghi báo động vào nhật ký hỏng:', (e && e.message) || e);
    return null;
  }
}

const app = express();
// CR-02-10 · MB1 — cửa Meta dời từ `src/server.js`: GET xác minh + POST nhận tin (chỉ ACK sau
// khi đã lưu, xử bằng worker). `rawBody` cho phép kiểm chữ ký nên bộ đọc JSON đứng RIÊNG ở đây.
{
  const { config: cauHinhBot } = await import(`${GOC}/src/config.js`);
  const { taoWebhookHandler } = await import(`${GOC}/src/queue/webhook.js`);
  app.use('/webhook', (_req, res, next) => (process.env.META_WEBHOOK_OFF === '1' ? res.sendStatus(404) : next()));
  app.get('/webhook', (req, res) => (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === cauHinhBot.verifyToken
    ? res.status(200).send(req.query['hub.challenge']) : res.sendStatus(403)));
  app.post('/webhook', express.json({ limit: '12mb', verify: (req, _res, buf) => { req.rawBody = buf; } }),
    taoWebhookHandler({ layPool: () => pool }));
  // Trang chính sách quyền riêng tư (Meta đòi để go-live).
  app.get('/privacy', (_req, res) => res.sendFile(path.join(GOC, 'docs', 'index.html')));
}
// MN4: ảnh sản phẩm xem được trên màn v3 (và là đường công khai cho Facebook tải khi MN5 đổi
// PUBLIC_URL sang cổng này). Chỉ đọc, không liệt kê thư mục, không phục vụ tệp bắt đầu bằng dấu chấm.
app.use('/uploads', express.static(path.join(GOC, 'public', 'uploads'), { index: false, dotfiles: 'deny', fallthrough: false, maxAge: '7d' }));
// LL15a · 02/10: HRM từ BigQuery `levelup-465304` — CHỈ ĐỌC (token phạm vi bigquery.readonly), đệm một ngày. Vắng `V3_BQ_KHOA`
// (đường tới tệp khoá) = ĐÓNG: màn nói «HRM chưa nối vào máy chủ». Khách BigQuery dựng LÚC GỌI ĐẦU — tệp khoá hỏng thì màn nói
// «Đọc HRM hỏng», tiến trình không chết lúc khởi động.
const docHrm = await (async () => {
  if (!process.env.V3_BQ_KHOA) return undefined;
  const { taoDocHrm } = await import(`${GOC}/src/hrm/hrm.js`);
  const { taoKhachBigQuery } = await import(`${GOC}/src/hrm/bigquery.js`);
  return taoDocHrm({ taoKhach: () => taoKhachBigQuery({ tepKhoa: process.env.V3_BQ_KHOA }) });
})();
// LL15b · 02/10: người + vai theo HRM (`src/hrm/dong-bo.js`) — tạo tài khoản (chưa mật khẩu) · Marketer/Sale theo team HRM · nghỉ
// thì rút vai HRM + khoá · tên team theo HRM. Màn: xem kế hoạch rồi bấm áp. Lượt TỰ ĐỘNG chỉ khi `V3_HRM_TU_DONG=1` (vắng = đóng):
// lượt đầu 5 phút sau khi chạy, rồi mỗi 24 giờ; vượt rào (`kiemAnToan`) thì KHÔNG áp — ghi nhật ký «hoãn», chờ người xem.
const dongBoHrm = await (async () => {
  if (!docHrm) return undefined;
  const { taoDongBoHrm } = await import(`${GOC}/src/hrm/dong-bo.js`);
  const db = taoDongBoHrm({ pool, docHrm });
  if (process.env.V3_HRM_TU_DONG !== '1') return db;
  const chay = () => db.tuDong().then((k) => console.log(`[chay-that] đồng bộ HRM tự động: ${k.loi ? `HỎNG — ${k.loi}`
    : k.hoan ? `HOÃN — ${k.hoan.join(' · ')}` : JSON.stringify(k.ra)}`));
  setTimeout(() => { chay(); setInterval(chay, 24 * 3600_000).unref(); }, 5 * 60_000).unref();
  return { ...db, tuDongMoiGio: 24 };
})();

// LL15d · 02/10: gợi ý marketer phụ trách từ đơn POS 60 ngày — cùng khoá BigQuery, CHỈ ĐỌC, đệm một ngày. Vắng `V3_BQ_KHOA` = đóng.
const docGoiYMarketer = await (async () => {
  if (!process.env.V3_BQ_KHOA) return undefined;
  const { taoDocGoiYMarketer } = await import(`${GOC}/src/hrm/goi-y-marketer.js`);
  const { taoKhachBigQuery } = await import(`${GOC}/src/hrm/bigquery.js`);
  return taoDocGoiYMarketer({ taoKhach: () => taoKhachBigQuery({ tepKhoa: process.env.V3_BQ_KHOA }) });
})();

// LL17a · 02/10: đơn POS của team theo marketer (Số liệu › Tổng quan) — cùng khoá BigQuery, CHỈ ĐỌC, đệm 1 giờ. Vắng biến = đóng.
const docDonPos = await (async () => {
  if (!process.env.V3_BQ_KHOA) return undefined;
  const { taoDocDonPos } = await import(`${GOC}/src/hrm/don-pos.js`);
  const { taoKhachBigQuery } = await import(`${GOC}/src/hrm/bigquery.js`);
  return taoDocDonPos({ taoKhach: () => taoKhachBigQuery({ tepKhoa: process.env.V3_BQ_KHOA, timeoutMs: 60000 }) });
})();

// VE8b · cửa lưu giá DUY NHẤT của màn Sản phẩm (giá theo thị trường = bậc giá của chính món POS, chỉ giá): kiểm món thuộc gốc,
// `saveProduct` chế độ chỉ-giá + đẩy bản chép sang bot TRONG giao dịch (đẩy hỏng ⇒ không lưu). GSP3 (đối soát) gọi lại đúng hàm này.
const dayBanChep = async (pid, products) => (await import('./src/noi-day/loi-bot.js')).daySanPhamLenBot(pid, products);
// GP1: `chot` (tuỳ chọn) chạy NGAY SAU `BEGIN` của saveProduct (`poolChotDauGiaoDich`) — «chỉ ghi món 0 dòng goi_gia» kiểm TRONG giao dịch ghi.
const luuGiaMonGoc = async (bc, id, posMa, t, { chot = null } = {}) => {
  const m = await spGoc.monCuaGoc(pool, bc.teamId, id, posMa);
  const { saveProduct } = await import(`${GOC}/src/admin-v3/operations.js`);
  const { taoBuocDayBot, poolChotDauGiaoDich } = await import('./src/ui/van-hanh/router.js');
  return saveProduct(chot ? poolChotDauGiaoDich(pool, chot) : pool, bc, m.id, { offers: t.offers, version: t.version },
    { chiGia: true, sauKhiLuu: taoBuocDayBot({ day: dayBanChep }) });
};
// GP1 · 07/10: điền giá món POS chưa có giá từ COD đơn POS một món — cùng khoá BigQuery, CHỈ ĐỌC, đệm 1 giờ (xem trước và áp đọc cùng một
// lát). Vắng `V3_BQ_KHOA` ⇒ `null` ⇒ màn nói «chưa nối BigQuery» (503), không trả rỗng. Chạy TRONG tiến trình này (bản chép do chính nó ghi).
const giaTuDon = await import(`${GOC}/src/products/gia-tu-don-pos.js`);
const nguonGiaDon = await (async () => {
  if (!process.env.V3_BQ_KHOA) return null;
  const { taoKhachBigQuery } = await import(`${GOC}/src/hrm/bigquery.js`);
  return giaTuDon.taoNguonGiaDon({ taoKhach: () => taoKhachBigQuery({ tepKhoa: process.env.V3_BQ_KHOA, timeoutMs: 60000 }) });
})();

const bao = dungPhanB(app, {
  docHrm,
  dongBoHrm,
  docGoiYMarketer,
  docDonPos,
  taoTruyVan,
  // CR-28-09b · MN3: lưu sản phẩm trên v3 ⇒ đẩy bản chép sang bot v1 rồi đọc lại xác minh.
  vanHanh: {
    pool,
    daySanPhamLenBot: async (pageIdFacebook, products) =>
      (await import('./src/noi-day/loi-bot.js')).daySanPhamLenBot(pageIdFacebook, products),
    // MN4: ảnh tải lên nằm CÙNG thư mục bot v1 phục vụ — một kiểu đường `/uploads/<tệp>`.
    thuMucAnh: path.join(GOC, 'public', 'uploads'),
    // MN7: ba khối dùng chung (Chính sách · FAQ · Phản đối) → `kb-chung.json` của bot, đọc lại xác minh.
    dayKhoiChungLenBot: async (noiDung) =>
      (await import('./src/noi-day/loi-bot.js')).dayKhoiChungLenBot(noiDung),
  },
  // MN4: «Sản phẩm & kho» · «Ảnh gửi khách» · «Đưa lên chạy» đọc CSDL — đúng chỗ người sửa.
  khoSanPham: (await import('./src/noi-day/kho-san-pham-v3.js')).taoKhoSanPhamV3(pool),
  docSanSang: docSanSangV3,
  taoTruyVanHeThong: () => taoCongDanhTinh(pool),
  docKetNoiPos: (bc) => lietKeThiTruong(pool, { teamId: bc.teamId, nguoiDungId: bc.nguoiDungId || null }),
  // Cùng `ctx` với bộ đọc — vế `team_id` trong WHERE của tầng dưới lấy từ đây, nên bối cảnh
  // sai là sửa nhầm team, không phải lỗi hiển thị.
  ghiKetNoiPos: {
    them: (bc, t) => themKetNoi(pool, ctxCuaA(bc), t),
    sua: (bc, id, t) => suaKetNoi(pool, ctxCuaA(bc), id, t),
    batTat: (bc, id, bat) => batTatKetNoi(pool, ctxCuaA(bc), id, bat),
    bo: (bc, id) => boKetNoi(pool, ctxCuaA(bc), id),
  },
  // Kho token Pancake: v3 ghi thẳng bảng `token_pancake`, tiến trình bot đọc cùng bảng đó
  // qua `src/pancake.js#datKhoTokenDb`. Không còn đường «muốn thêm token phải nhờ v1».
  khoTokenV3: {
    ds: () => khoToken.dsToken(pool),
    them: ({ token, nguoiDungId }) => khoToken.themToken(pool, { token, nguoiDungId }),
    bo: (id) => khoToken.boToken(pool, id),
    batTat: (id, bat) => khoToken.batTatToken(pool, id, bat),
  },
  // Quét Pancake bằng kho token (env + bảng `token_pancake`) rồi upsert bảng `page`.
  // Đây là đường thay cho `pages.json`: máy chỉ chạy v3 vẫn dựng được danh mục page.
  // Nạp lại kho token NGAY trước khi quét: người vừa dán token xong bấm quét luôn, không
  // ai chờ hết nhịp làm mới 5 phút.
  quetPagePancake: async () => { await lamMoiTokenDb(); return quetVaGhiPage(pool); },
  // Kéo danh mục + tồn kho POS cho team đang mở. Cùng `ctx` với bộ đọc kết nối POS — vế
  // `team_id` trong WHERE lấy từ đây, nên bối cảnh sai là kéo nhầm kho của team khác.
  // MN8 (CR-28-09b): sau lượt kéo, sản phẩm page đã nối món POS đổi hết hàng theo tồn kho POS và
  // ĐẨY bản chép sang bot (một giao dịch mỗi page). Kết quả đi kèm để màn Kết nối nói ra.
  keoDanhMucPos: async (bc) => {
    const kq = await keoDanhMucTeam(pool, ctxCuaA(bc));
    const { dongBoTuPos } = await import(`${GOC}/src/products/noi-pos.js`);
    const day = async (pid, products) => (await import('./src/noi-day/loi-bot.js')).daySanPhamLenBot(pid, products);
    kq.dongBoPos = await dongBoTuPos(pool, bc.teamId, day).catch((e) => ({ loi: String(e?.message || e) }));
    return kq;
  },
  // Kho sản phẩm GỐC — danh mục do người định nghĩa (014). Tầng A giữ luật dữ liệu; lớp
  // trên chỉ kiểm vai và ghi nhật ký.
  khoSanPhamGoc: {
    ds: (bc) => spGoc.dsSanPhamGoc(pool, bc.teamId),
    cho: (bc) => spGoc.soHieuChuaCoGoc(pool, bc.teamId),
    dem: (bc) => spGoc.demGia(pool, bc.teamId),
    // GSP1: `tao` GIỮ — nằm trong danh sách hàm BẮT BUỘC của `datKhoGoc`; thiếu là boot ném `noi_day_thieu`. Không còn cửa HTTP nào gọi.
    tao: (bc, t) => spGoc.taoSanPhamGoc(pool, bc.teamId, t),
    sua: (bc, id, t) => spGoc.suaSanPhamGoc(pool, bc.teamId, id, t),
    bo: (bc, id) => spGoc.boSanPhamGoc(pool, bc.teamId, id),
    // LL13: sản phẩm là lõi — thị trường = shop POS của món đã gắn.
    chiTiet: (bc, id) => spGoc.chiTietSanPhamGoc(pool, bc.teamId, id),
    monChuaGan: (bc) => spGoc.monPosChuaGan(pool, bc.teamId),
    gan: (bc, id, posMa) => spGoc.ganMonPosVaoGoc(pool, bc.teamId, id, posMa),
    go: (bc, id, posMa) => spGoc.goMonPosKhoiGoc(pool, bc.teamId, id, posMa),
    // LL11: kiến thức sản phẩm — nhà mới của kỹ năng.
    kienThuc: (bc, id, t) => spGoc.suaKienThucGoc(pool, bc.teamId, id, t),
    // VE8a: gộp món POS thành sản phẩm — gợi ý (đọc) + gộp (một giao dịch).
    goiYGop: (bc) => spGoc.goiYGopMonPos(pool, bc.teamId),
    gop: (bc, t) => spGoc.gopMonThanhGoc(pool, bc.teamId, t),
    // VE8b: giá theo thị trường = bậc giá của CHÍNH món POS (chỉ giá — tên/hết hàng vẫn theo POS), đẩy bản chép sang bot
    // trong giao dịch (cùng bước Vận hành dùng); gắn/gỡ page ghi sản phẩm · shop · thị trường · marketer.
    luuGia: luuGiaMonGoc,
    ganPage: (bc, id, t) => spGoc.ganPageVaoGoc(pool, bc.teamId, id, t),
    goPage: (bc, id, pageId) => spGoc.goPageKhoiGoc(pool, bc.teamId, id, pageId),
    // GSP2: danh sách việc chuyển (TẠM, gỡ ở GSP5) — hàm TUỲ CHỌN của `datKhoGoc`, KHÔNG thuộc danh sách bắt buộc.
    dsChuyen: (bc) => chuyenBanSao.dsViecChuyen(pool, bc.teamId),
    boQuaChuyen: (bc, pageId, lyDo) => chuyenBanSao.boQuaPage(pool, bc.teamId, pageId, lyDo),
    huyBoQuaChuyen: (bc, pageId) => chuyenBanSao.huyBoQua(pool, bc.teamId, pageId),
    // GSP3: đối soát giá + ảnh theo đơn vị gốc × shop — hàm TUỲ CHỌN. Ghi giá qua ĐÚNG cửa lưu giá VE8b ở trên (`luuGiaMonGoc`,
    // cấm đường ghi giá thứ hai); nhánh bảng thắng = bảng món vẫn đẩy bản chép một lần bằng CÙNG bước đẩy (`taoBuocDayBot`).
    donViDoiSoat: (bc, gocId, shopId) => chuyenBanSao.donViDoiSoat(pool, bc.teamId, gocId, shopId),
    doiSoat: (bc, t) => chuyenBanSao.doiSoatDonVi(pool, bc.teamId, t, {
      luuGia: (posMa, x) => luuGiaMonGoc(bc, t.gocId, posMa, x),
      dayMon: async (monId) => (await import('./src/ui/van-hanh/router.js')).taoBuocDayBot({ day: dayBanChep })(pool, bc, monId),
    }),
    // GP1: điền giá từ đơn POS — hàm TUỲ CHỌN. Ghi qua ĐÚNG cửa lưu giá VE8b ở trên (`luuGiaMonGoc`, cấm đường ghi giá thứ hai); `chot` của
    // tầng A (0 dòng goi_gia, dưới khoá danh mục) đi kèm vào giao dịch của saveProduct.
    xemGiaTuDon: (bc, t) => giaTuDon.xemTruoc(pool, bc.teamId, nguonGiaDon, t),
    apGiaTuDon: (bc, t) => giaTuDon.apGiaTuDon(pool, bc.teamId, nguonGiaDon, t, {
      luuGia: (x) => luuGiaMonGoc(bc, x.gocId, x.posMa, { offers: x.offers, version: x.version }, { chot: x.chot }),
    }),
  },
  // Kho tạm: page ở team kỹ thuật, nguồn cho lát «gán page ↔ team».
  docKhoTamPage: (t) => pageChuaPhan(pool, t),
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
  docPhanBoHoiThoai: (bc) => soLieu.phanBoHoiThoai(pool, ctxCuaA(bc)),   // VE6c · tab Khách (bản vẽ 3c)
  // Hiệu lực THẬT của prompt cho màn «Prompt của page»: cờ ráp-4-khối và hằng `CORE` của
  // `src/prompts.js` (chỉ ĐỌC — file cấm sửa). Thiếu hai thứ này thì màn khoe một prompt
  // mà bot chưa chắc đang gửi.
  docHieuLucPrompt: () => ({
    coBat: process.env.V3_RAP_PROMPT_BAT === '1',
    core: CORE_PROMPT,
  }),
  dungBanMay: (cfg) => dungBanChoMay(cfg),
  // BH8: bản khuôn tiếng Việt → DỊCH sang tiếng Anh gọn bằng model của chính team (một lần
  // lúc lưu). Lỗi/kiểm lệch ⇒ `dichBanMay` tự trả lại bản tiếng Việt như trước.
  dichBanMay: async (vi, bc) => {
    const { dichBanMay } = await import(`${GOC}/src/chat/dich-ban-may.js`);
    const { layModel } = await import(`${GOC}/src/chat/model.js`);
    const { goiMotLan } = await import(`${GOC}/v3/src/model/goi-mot-lan.js`);
    // Dịch cả kịch bản quá trần 30s mặc định của `layModel` (đo 28/09) — nới riêng lời gọi dịch.
    const goiLau = (o) => goiMotLan({ ...o, timeoutMs: 120000 });
    const goi = async (req) => (await layModel(pool, { teamId: bc?.teamId }, { vaiTro: 'chinh', goi: goiLau })).client.messages.create(req);
    const kq = await dichBanMay(vi, { goi });
    if (kq.lyDo) console.warn(`[kịch bản] bản máy giữ tiếng Việt — ${kq.lyDo}`);
    return kq.text;
  },
  // Đưa lên LIVE = ghi vào `kb-overrides.json` + RAM lõi trong tiến trình này (CR-02-10 · MB1);
  // worker đọc lại tệp khi nó đổi. Đường ghi KHO, được `V3_GHI_KHO_BOT=1` mở riêng (CR-28-09b · MN5).
  dayKichBanLenBot: async (pageIdFacebook, cfg) =>
    (await import('./src/noi-day/loi-bot.js')).dayKichBanLenBot(pageIdFacebook, cfg),
  bocPancake: async (b64) => parsePancakeScript(b64),

  // «Kéo dữ liệu về» — đúng lượt `npm run di-tru`, gọi từ trong tiến trình màn hình.
  // CHỈ ĐỌC sáu tệp nguồn của tiến trình bot; ghi vào nền v3 bằng upsert theo `page_id`, và
  // câu `ON CONFLICT` cố ý KHÔNG đè bốn cột người đặt (marketer · trọng điểm · công tắc bot ·
  // botcake) — ca B-Y4 ④ canh điều đó, nên bấm nút này không làm mất công gán của ai.
  chayNapLai: async () => {
    const { chay } = await import(`${GOC}/db/di-tru/index.js`);
    return chay(pool, GOC);
  },
  docKhoi: {
    boLuat: (teamId) => rap.docBoLuatChung(pool, teamId),
    // `docKyNang` lọc theo MÃ sản phẩm của page. Nơi gọi truyền sẵn mã xuống — nó đã đọc
    // `san_pham` cho khối sản phẩm rồi, đọc lại là tốn thêm một dòng `nhat_ky` mỗi lượt xem.
    kyNang: (teamId, _pageRowId, dsMaSp = []) => rap.docKyNang(pool, teamId, dsMaSp),
    kichBan: (teamId, pageRowId) => rap.docKichBanLive(pool, teamId, pageRowId),
    // GSP3b (CR-02-10b 5e · G2-N1): đọc dòng `page` rồi gọi bộ đọc CHUNG (`catalog.js#docSanPhamGoiGia` — chính hàm `rap` re-export)
    // KÈM `trang` ⇒ page đã gắn gốc + shop đọc món POS như bot · cửa tiền · cổng bật; trước đây thiếu `trang` ⇒ luôn bản sao.
    sanPham: (teamId, pageRowId) => chuyenBanSao.docSanPhamTrangPage(pool, teamId, pageRowId),
    // MN7: Chính sách · FAQ · Phản đối của team — trang page hiện và sửa tại chỗ.
    khoiChung: async (teamId) => (await import(`${GOC}/src/products/khoi-chung.js`)).docKhoiChung(pool, teamId),
  },
  khoKhoa: {
    coKhoa: (teamId, nha) => coKhoaNha(pool, { teamId, nhaCungCap: nha }),
    docKhoa: (teamId, nha) => docKhoaNha(pool, { teamId, nhaCungCap: nha }),
    ghiKhoa: async (teamId, nha, khoaApi) =>
      ghiKhoaNha(pool, { teamSlug: await slugCua(teamId), nhaCungCap: nha, khoaApi }),
  },
  // VE7c: màn Model AI đọc ĐÚNG đường chọn model + khoá của bot (`src/chat/model.js` — chính hàm `layModel` của handler-v3
  // gọi), không phải luật song song của lớp v3. Nạp lười, cùng tệp + cùng pool với `dichBanMay` (BH8) ngay trên.
  duongBot: {
    chon: async (bc) => (await import(`${GOC}/src/chat/model.js`)).chonModel(pool, { teamId: bc.teamId }, { vaiTro: 'chinh' }),
    khoa: async (bc, nha) => (await import(`${GOC}/src/chat/model.js`)).khoaCuaBot(pool, { teamId: bc.teamId, nhaCungCap: nha }),
  },
  // Nhịp máy chạy bot: một bộ đọc, hai chỗ hiện (dải trạng thái ở mọi trang + đèn «Máy chạy
  // bot» ở màn Hệ còn sống không). Kẹp `team_id` tường minh — luật 1 của kho hàng đợi.
  docNhipMayBot: (bc) => nhipMayBot(pool, { teamId: bc?.teamId ?? null }),
  // UI-HT1 · bàn hội thoại: đọc THẲNG Pancake (chỉ GET) + mã khách từ Sổ AI của bot cũ. Nạp
  // lười — `src/pancake.js` và `src/ai-log.js` chỉ vào đồ thị khi có người mở một hội thoại.
  docTinPancake: async (pageId, convId, custId) =>
    (await import(`${GOC}/src/pancake.js`)).pkDocTin(pageId, convId, custId),
  docSoAiBotCu: () => (_soAi ? _soAi.readLog() : []),   // không nạp được ⇒ màn nói «chưa có mã khách»
  // UI-HT3: `tin_cho_xu_ly`/`lan_gui` ngoài danh sách bảng của cổng ⇒ BẮT BUỘC đọc bằng SQL kẹp team.
  docDauVetV3: (await import('./src/ui/ban-hoi-thoai/index.js')).taoDocDauVetV3Sql(pool),
  giaiKichBanPage: async (teamId, pageRowId) =>
    (await import(`${GOC}/src/db/kich-ban.js`)).docKichBanChoPage(pool, teamId, pageRowId),
  laTinTuDong: (text) => (_mauMay ? _mauMay.isAutomationTemplate(text) : false),
  // UI-HT2: danh sách hội thoại có LIMIT — cổng không có LIMIT, kéo cả bảng = 19,6 MB (đo 28/09).
  docHoiThoaiSql: (await import('./src/ui/ban-hoi-thoai/index.js')).taoDocHoiThoaiSql(pool),
  docSanPhamSua,
  canhBao: canhBaoLopModel,
  express,
});
// `/` đổi hướng theo vai ở `vai-b.js` (LL18) — không đặt đích cứng ở đây.

const CONG = Number(process.env.CHAYTHAT_CONG || 3102);
http.createServer(app).listen(CONG, process.env.HOST, () => {
  console.log(`[chay-that] DỮ LIỆU THẬT · cổng ${CONG} · UI vận hành V3`);
  for (const d of bao.daNoi) console.log(`[chay-that] đã nối: ${d}`);
  for (const t of bao.thieu) console.log(`[chay-that] chưa nối: ${t}`);
  // LÀM NÓNG bản nhớ cửa kiểm (28/09): lượt đọc này mất ~10 giây phía bot. Đọc một lần lúc
  // khởi động thì người mở màn đầu tiên không phải đứng chờ ở «Đang mở…».
  import('./src/noi-day/loi-bot.js')
    .then(({ sanSangToanHe }) => sanSangToanHe())
    .then((kq) => console.log(`[chay-that] đã làm nóng cửa kiểm: ${kq.pages.length} page`))
    .catch((e) => console.log(`[chay-that] chưa làm nóng được cửa kiểm: ${e?.message || e}`));
});
