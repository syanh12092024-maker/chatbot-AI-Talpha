// HỘP THƯ — CÁC THAO TÁC GHI của sale (phiếu LL2 · CR-28-09c · `01-QUYET-DINH.md` §10 bổ sung).
//
// Bàn hội thoại (`ui/ban-hoi-thoai`) vẫn là module CHỈ ĐỌC — thước T1–T3 của nó giữ nguyên.
// §10 bổ sung cho sale thêm đúng ba việc ghi trên hệ, và chúng nằm ở đây, tách hẳn:
//   ① nhận thay bot (đổi người giữ hội thoại sang sale — CSDL, không ghi gì ra Pancake)
//   ② xem · lưu · duyệt · loại đơn Messenger chờ duyệt (01 §1: «Sale duyệt → tạo đơn ở Chờ in»)
//   ③ tìm khách theo số điện thoại, gộp các kênh (đọc)
// Vẫn KHÔNG có đường gửi tin cho khách: thước `hop-thu.test.mjs` H1 soi đồ thị import, H2 soi
// danh sách đường.
//
// | GET  /hop-thu/hop-thu-ui.js           | script giao diện (trang Hộp thư nhúng)                 |
// | GET  /api/hop-thu/don-cho             | tab Đơn chờ: Messenger chờ duyệt · việc đơn · Ladi chờ WA |
// | GET  /api/hop-thu/don/:id             | một đơn chờ duyệt + sản phẩm/gói giá để sửa            |
// | POST /api/hop-thu/don/:id/luu         | lưu thông tin đơn (đúng phiên bản đã đọc)              |
// | POST /api/hop-thu/don/:id/duyet       | duyệt = tạo đơn POS (đủ cửa kiểm, van V3_POS_GHI)      |
// | POST /api/hop-thu/don/:id/loai        | loại đơn, lý do 5–300 ký tự                            |
// | POST /api/hop-thu/hoi-thoai/:id/nhan  | nhận thay bot — hội thoại sang sale, đẻ một dòng việc   |
// | GET  /api/hop-thu/tim-khach?sdt=      | khách theo số điện thoại (chuẩn hoá như lọc trùng)     |
// | GET  /api/hop-thu/khach/:id           | hồ sơ một khách: đơn · hội thoại                        |
//
// Vai: ĐÚNG như bàn hội thoại (sale · quản trị). Màn «Hội thoại và đơn» của quản trị vẫn đi
// `/api/van-hanh/orders/*` — cùng MỘT thân hàm (`van-hanh/don-cho.js`).
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { batBuocDangNhap, batBuocVaiHTTP } from '../../auth/index.js';
import { VAI_VAO_DUOC as VAI_BAN } from '../dispatch/router.js';
import { docDonCho, luuDonCho, duyetDonCho, loaiDonCho } from '../van-hanh/don-cho.js';
import { vanGhiMo } from '../../../../src/pos/index.js';
import { handoffConversation, fault } from '../../../../src/admin-v3/operations.js';
import { timKhach, docHoSoKhach } from '../../../../src/orders/doc-ho-so.js';
import { donCho } from '../ban-hoi-thoai/kho-ban-hoi-thoai.js';
import { CHU_TRANG_THAI_DON } from '../ban-hoi-thoai/boi-canh-hoi-thoai.js';
import { CHU_TANG_HOAN } from '../dispatch/chi-tiet.js';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
export const VAI_VAO_DUOC = VAI_BAN;
/** Ai GHI được (thước `phan-quyen-nam-vai` đòi khai): đúng những vai vào được — §10 bổ sung cho sale
 *  nhận thay bot và duyệt đơn Messenger (01 §1 «sale duyệt»). */
export const VAI_GHI_DUOC = VAI_BAN;
export const LY_DO_NHAN = 'sale nhận thay bot ở Hộp thư';

// Chữ lấy từ bảng của màn khác — không chép bản thứ hai (tầng hoàn: `dispatch/chi-tiet.js`;
// trạng thái đơn: bối cảnh bàn hội thoại, nguồn là máy trạng thái).
const tangCua = (ma) => (ma ? (CHU_TANG_HOAN[ma] || { chu: ma, muc: 'mu' }) : { chu: 'Chưa chấm', muc: 'mu' });
const NGUON_CHU = { messenger: 'Messenger', trang_ban_hang: 'Ladi' };

const boc = (fn) => async (q, s, next) => {
  try { await fn(q, s); } catch (e) { next(e); }
};

/**
 * @param {{ pool?: import('pg').Pool, orderDeps?: object }} tuy — `pool` là CSDL v3 (cùng
 *   pool của van-hanh). Không có ⇒ mọi đường API trả 503 «chưa nối», không đoán.
 */
export function taoRouterHopThu({ pool = null, orderDeps = {} } = {}) {
  const r = express.Router();
  const chan = [batBuocDangNhap(), batBuocVaiHTTP(...VAI_VAO_DUOC)];

  r.get('/hop-thu/hop-thu-ui.js', ...chan, (_q, s) => {
    s.set('Cache-Control', 'no-cache');
    s.type('application/javascript');
    s.sendFile(path.join(THU_MUC, 'trang', 'hop-thu-ui.js'));
  });

  r.use('/api/hop-thu', ...chan, (q, s, next) => {
    s.set('Cache-Control', 'no-store');
    // Cùng rào ghi của van-hanh: JSON + đầu `X-V3-Action` + không đến từ trang khác.
    if (q.method !== 'GET' && (!q.is('application/json') || q.get('X-V3-Action') !== '1'
      || q.get('Sec-Fetch-Site') === 'cross-site')) {
      return s.status(403).json({ ok: false, thongDiep: 'Yêu cầu ghi không hợp lệ' });
    }
    return next();
  });
  // Đường dùng `pool` (đơn chờ, nhận thay bot, tra khách): không có pool ⇒ 503 «chưa nối», không đoán.
  const canPool = (_q, s, next) => (pool ? next()
    : s.status(503).json({ ok: false, ma: 'chua_noi', thongDiep: 'Môi trường này chưa nối dữ liệu đơn và hội thoại.' }));

  // Tab «Đơn chờ» — đọc qua CỔNG kẹp team (không cần pool), cùng đường đọc với bàn hội thoại.
  r.get('/api/hop-thu/don-cho', boc(async (q, s) => s.json({ ok: true, ...(await donCho(q.boiCanh, { bay: Date.now() })) })));

  // VE5 · 29/09: `posGhiMo` — van tạo đơn POS (`V3_POS_GHI`, CÙNG nguồn env mà lượt duyệt đọc: `orderDeps.env` ?? process.env).
  // Thẻ đơn nói trước «duyệt sẽ không tạo đơn» khi van đóng, thay vì để sale bấm rồi mới nhận lỗi.
  r.get('/api/hop-thu/don/:id', canPool, boc(async (q, s) => s.json({ ok: true, ...(await docDonCho(pool, q.boiCanh, q.params.id)),
    posGhiMo: vanGhiMo(orderDeps.env ?? process.env) })));
  r.post('/api/hop-thu/don/:id/luu', canPool, boc(async (q, s) => s.json(await luuDonCho(pool, q.boiCanh, q.params.id, q.body))));
  r.post('/api/hop-thu/don/:id/duyet', canPool, boc(async (q, s) =>
    s.json({ ok: true, result: await duyetDonCho(pool, q.boiCanh, q.params.id, q.body, orderDeps) })));
  r.post('/api/hop-thu/don/:id/loai', canPool, boc(async (q, s) =>
    s.json({ ok: true, result: await loaiDonCho(pool, q.boiCanh, q.params.id, q.body) })));

  r.post('/api/hop-thu/hoi-thoai/:id/nhan', canPool, boc(async (q, s) =>
    s.json({ ok: true, ...(await handoffConversation(pool, q.boiCanh, q.params.id, { lyDo: LY_DO_NHAN })) })));

  r.get('/api/hop-thu/tim-khach', canPool, boc(async (q, s) => {
    const sdt = String(q.query?.sdt || '').trim().slice(0, 40);
    if (!sdt) throw fault('Nhập số điện thoại để tìm.');
    const kq = await timKhach(pool, q.boiCanh, { sdt, moiTrang: 20 });
    s.json({ ok: true, ...kq, khach: kq.khach.map((k) => ({ ...k, tangHoan: tangCua(k.tangHoan) })) });
  }));
  r.get('/api/hop-thu/khach/:id', canPool, boc(async (q, s) => {
    const kq = await docHoSoKhach(pool, q.boiCanh, { khachId: q.params.id });
    if (!kq) return s.status(404).json({ ok: false, thongDiep: 'Không có khách này.' });
    return s.json({
      ok: true, ...kq,
      khach: { ...kq.khach, tangHoan: tangCua(kq.khach.tangHoan) },
      donHang: kq.donHang.map((d) => ({ ...d, nguonChu: NGUON_CHU[d.nguon] || d.nguon,
        trangThaiChu: CHU_TRANG_THAI_DON[d.trangThaiHe] || d.trangThaiHe })),
    });
  }));

  // Lỗi có `status` (fault) ⇒ đúng mã đó; khoá/khoá chết Postgres ⇒ 409; `batBuocVai` của
  // `doc-ho-so.js` (không vai trong team) ⇒ 403; còn lại 400.
  r.use('/api/hop-thu', (e, _q, s, _next) => {
    const status = e?.status || (['55P03', '40P01'].includes(e?.code) ? 409 : ['LoiXuyenTeam', 'LoiThieuBoiCanhTeam'].includes(e?.name) ? 403 : 400);
    if (status >= 500 || (!e?.status && !e?.code)) console.error('[hop-thu]', e?.stack || e?.message || e);
    s.status(status).json({
      ok: false,
      thongDiep: e?.code ? 'Không thể thực hiện. Dữ liệu có thể đã thay đổi; tải lại và thử lại.' : String(e?.message || e),
    });
  });
  return r;
}
