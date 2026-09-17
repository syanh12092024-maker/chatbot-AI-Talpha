// KHO TOKEN PANCAKE TRONG CSDL (bảng `token_pancake`, migration 019).
//
// Vì sao có file này: kho token cũ sống ở `.env` + `pancake-tokens.json` của tiến trình
// bot v1, nên màn «Kết nối & token» của v3 phải gọi HTTP sang `/admin/api` mới xem và sửa
// được — tắt v1 là màn chết, và cửa ghi ấy bị van `PANCAKE_READONLY` chắn ngang dù thêm
// một token KHÔNG gửi tin cho ai. Bảng này cắt sợi dây đó: v3 ghi thẳng CSDL, còn
// `src/pancake.js` nhận danh sách qua một cửa tiêm, nên cả tiến trình bot lẫn worker v3
// đều thấy cùng một kho.
//
// ⛔ BẢNG CHỨA BÍ MẬT nên nó nằm NGOÀI tầng truy vấn chung, cùng khuôn với `ket_noi_pos`:
//    không `SELECT *` dùng chung, không `team_id` (kho token là tài nguyên TOÀN HỆ — một
//    tài khoản Pancake phủ một nhóm page có thể thuộc nhiều team).
// ⛔ `docTokenSong()` trả về TOKEN NGUYÊN VĂN trong bộ nhớ. Cấm log, cấm ghi xuống đĩa,
//    cấm đưa vào `nhat_ky`. Mọi đường ra màn hình chỉ được dùng `dsToken()`.
import crypto from 'node:crypto';
import { giaiMa, maHoa } from '../db/khoa.js';
import { moiTruongKhoa } from './pos/moi-truong.js';

export class LoiKhoToken extends Error {
  constructor(thongDiep, ma = 'kho_token', status = 400) {
    super(thongDiep);
    this.name = 'LoiKhoToken';
    this.ma = ma;
    this.status = status;
  }
}

/** Đọc payload JWT lấy tên/hạn/uid. KHÔNG xác thực chữ ký — Pancake mới là bên xác thực. */
export function docJwt(token) {
  const phan = String(token || '').split('.');
  if (phan.length !== 3) return null;
  try {
    const j = JSON.parse(Buffer.from(phan[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return {
      ten: String(j.name || j.fb_name || ''),
      uid: String(j.uid || ''),
      hetHan: j.exp ? new Date(j.exp * 1000) : null,
    };
  } catch {
    return null;
  }
}

const bam = (t) => crypto.createHash('sha256').update(String(t), 'utf8').digest('hex');
const duoiCua = (t) => String(t).slice(-8);

/** Hàng cho MÀN HÌNH: không có token, không có bản mã. */
const gonRa = (d) => ({
  id: String(d.id),
  ten: d.ten || '(không tên)',
  uid: d.uid || '',
  duoi: d.duoi || '',
  hetHan: d.het_han ? new Date(d.het_han).getTime() : 0,
  hetHanRoi: !!d.het_han && new Date(d.het_han).getTime() <= Date.now(),
  bat: d.bat,
  themBoi: d.them_boi == null ? null : String(d.them_boi),
  taoLuc: new Date(d.tao_luc).getTime(),
  nguon: 'CSDL (v3)',
});

/** Danh sách cho màn hình — cũ trước, đúng thứ tự dự phòng. */
export async function dsToken(pool) {
  const r = await pool.query(
    `SELECT id, ten, uid, duoi, het_han, bat, them_boi, tao_luc
       FROM token_pancake ORDER BY id`,
  );
  return r.rows.map(gonRa);
}

/**
 * Token NGUYÊN VĂN cho bộ gửi: còn bật, còn hạn, cũ trước.
 *
 * Token hết hạn bị loại NGAY TRONG CÂU SQL chứ không lọc ở JS — cùng quy ước với
 * `src/pancake.js#allToks`: gọi Pancake bằng token chết chỉ tốn một vòng mạng để nhận
 * lỗi 103, rồi cơ chế dự phòng lại nhảy sang token kế tiếp.
 */
export async function docTokenSong(pool, { env = process.env } = {}) {
  const r = await pool.query(
    `SELECT id, ten, token_ma FROM token_pancake
      WHERE bat AND (het_han IS NULL OR het_han > now()) ORDER BY id`,
  );
  const ra = [];
  for (const d of r.rows) {
    let token = '';
    try { token = giaiMa(d.token_ma, moiTruongKhoa(env)); } catch { token = ''; }
    // Giải mã hỏng = khoá `V3_KHOA_MA_HOA` đã đổi. Bỏ qua dòng đó và KÊU, đừng ném:
    // một token hỏng không được làm câm cả kho.
    if (!token) { console.error(`[kho-token] giải mã hỏng token #${d.id} (${d.ten}) — bỏ qua`); continue; }
    ra.push(token);
  }
  return ra;
}

/**
 * THÊM token. Kiểm hình dạng và hạn TẠI ĐÂY; việc «token có sống trên Pancake không»
 * do nơi gọi thử trước (đường HTTP của v3 gọi `GET /pages`) — file này không tự mở một
 * cửa thứ hai ra Internet, cùng lý do đã ghi ở `src/pos/ket-noi.js#themKetNoi`.
 */
export async function themToken(pool, { token, nguoiDungId = null, env = process.env } = {}) {
  const t = String(token || '').trim();
  const doc = docJwt(t);
  if (!doc) throw new LoiKhoToken('Không phải JWT Pancake hợp lệ (phải có ba phần a.b.c)', 'khong_phai_jwt');
  if (doc.hetHan && doc.hetHan.getTime() <= Date.now()) {
    throw new LoiKhoToken(`Token đã hết hạn ${doc.hetHan.toLocaleDateString('vi-VN')}`, 'het_han');
  }
  let ma;
  try {
    ma = maHoa(t, moiTruongKhoa(env));
  } catch (e) {
    throw new LoiKhoToken(
      `Không mã hoá được token: ${e.message} — token KHÔNG được ghi. Khai V3_KHOA_MA_HOA `
      + 'ở docs/v3/ban-giao/bien-moi-truong-v3.md.', 'thieu_khoa_ma_hoa', 500,
    );
  }
  try {
    const r = await pool.query(
      `INSERT INTO token_pancake (ten, uid, duoi, het_han, token_ma, token_bam, them_boi)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, ten, uid, duoi, het_han, bat, them_boi, tao_luc`,
      [doc.ten, doc.uid, duoiCua(t), doc.hetHan, ma, bam(t), nguoiDungId],
    );
    return gonRa(r.rows[0]);
  } catch (e) {
    if (e?.code === '23505') throw new LoiKhoToken('Token này đã có trong kho', 'trung_token', 409);
    throw e;
  }
}

/** BỎ HẲN một token. Token trong `.env` không đi qua đây — muốn bỏ thì sửa `.env`. */
export async function boToken(pool, id) {
  const r = await pool.query(
    'DELETE FROM token_pancake WHERE id = $1 RETURNING id, ten, uid, duoi, het_han, bat, them_boi, tao_luc',
    [id],
  );
  if (!r.rowCount) throw new LoiKhoToken(`Không có token #${id} trong kho`, 'khong_thay', 404);
  return gonRa(r.rows[0]);
}

/** BẬT/TẮT — cách đúng để ngừng dùng một token mà vẫn giữ dấu vết nó từng ở đây. */
export async function batTatToken(pool, id, bat) {
  const r = await pool.query(
    `UPDATE token_pancake SET bat = $2, sua_luc = now() WHERE id = $1
     RETURNING id, ten, uid, duoi, het_han, bat, them_boi, tao_luc`,
    [id, !!bat],
  );
  if (!r.rowCount) throw new LoiKhoToken(`Không có token #${id} trong kho`, 'khong_thay', 404);
  return gonRa(r.rows[0]);
}
