// VÉ ĐĂNG NHẬP — chuỗi ký HMAC, KHÔNG có bảng phiên. Lý do ở `docs/hop-dong-b-voi-a.md` mục 6.
//
//     <payload base64url>.<HMAC-SHA256 base64url>
//
// Payload đọc được bằng mắt (base64url không phải mã hoá). Chỉ chữ ký là không giả được.
// Nên: KHÔNG nhét gì nhạy cảm vào đây — không mật khẩu, không khoá API, không email.
//
// HAI LOẠI VÉ:
//   · vé ĐỦ QUYỀN — có `teamId` và `vai`, hạn 8 tiếng. Đây là vé dựng ra `req.boiCanh`.
//   · vé TẠM      — `tam:true`, `teamId:null`, `vai:[]`, hạn 10 phút. Phát ra sau khi mật
//                   khẩu đúng nhưng người này thuộc NHIỀU team, nên chưa biết chọn team nào.
//                   Vé tạm KHÔNG dựng được bối cảnh (`taoBoiCanh` ném khi thiếu teamId) —
//                   đúng ý đồ: chưa chọn team thì chưa đọc được dữ liệu của team nào.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { LoiChuaDangNhap } from './boi-canh.js';

export const PHIEN_BAN_VE = 1;
export const TEN_COOKIE = 'v3_ve';
export const HAN_VE_MS = 8 * 60 * 60 * 1000;   // 8 tiếng — hợp đồng mục 6
export const HAN_VE_TAM_MS = 10 * 60 * 1000;   // đủ để đọc ba cái thẻ team rồi bấm

/**
 * Đọc khoá ký TỪNG LẦN GỌI, không nhớ lại.
 *
 * Thiếu `V3_KHOA_VE` thì NÉM, tuyệt đối không tự sinh khoá tạm: sinh khoá tạm thì mỗi
 * lần khởi động lại là cả 51 page bị đá ra mà không ai hiểu vì sao, và trên nhiều tiến
 * trình thì vé của tiến trình này tiến trình kia không đọc được — lỗi rất khó lần.
 */
function khoa() {
  const k = process.env.V3_KHOA_VE;
  if (typeof k !== 'string' || k.trim().length === 0) {
    throw new Error(
      'Thiếu biến môi trường V3_KHOA_VE — không ký được vé đăng nhập. ' +
      'Đặt một chuỗi ngẫu nhiên dài (>=32 ký tự) và giữ nguyên giữa các lần khởi động.',
    );
  }
  return Buffer.from(k, 'utf8');
}

const mahoaB64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const giaiB64 = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const kyPhan = (chuoi) => createHmac('sha256', khoa()).update(chuoi, 'utf8').digest();

/**
 * Phát vé.
 * @param {{nguoiDungId?:string, tenDangNhap?:string, teamId?:string, vai?:string[], tam?:boolean, capLuc?:number}} than
 * @param {{hanMs?:number}} [tuyChon] `hanMs` âm dùng để test vé hết hạn.
 * @returns {string}
 */
export function phatVe({ nguoiDungId, tenDangNhap, teamId, vai, tam = false, capLuc } = {}, { hanMs } = {}) {
  khoa(); // ném NGAY nếu thiếu khoá, trước khi dựng payload

  if (!nguoiDungId) throw new Error('phatVe: thiếu nguoiDungId.');
  const dsVai = tam ? [] : (Array.isArray(vai) ? vai : [vai]).filter(Boolean).map(String);
  if (!tam && !teamId) throw new Error('phatVe: vé đủ quyền phải có teamId (vé chưa chọn team thì dùng phatVeTam).');
  if (!tam && !dsVai.length) throw new Error('phatVe: vé đủ quyền phải có ít nhất một vai.');

  const luc = Number(capLuc) || Date.now();
  const han = Number.isFinite(hanMs) ? Number(hanMs) : (tam ? HAN_VE_TAM_MS : HAN_VE_MS);
  const than = {
    v: PHIEN_BAN_VE,
    nguoiDungId: String(nguoiDungId),
    tenDangNhap: tenDangNhap == null ? null : String(tenDangNhap),
    teamId: tam ? null : String(teamId),
    vai: dsVai,
    capLuc: luc,
    hetHan: luc + han,
  };
  if (tam) than.tam = true;

  const p = mahoaB64(Buffer.from(JSON.stringify(than), 'utf8'));
  return `${p}.${mahoaB64(kyPhan(p))}`;
}

/** Vé tạm: đã đúng mật khẩu, chưa chọn team. */
export function phatVeTam({ nguoiDungId, tenDangNhap }, tuyChon = {}) {
  return phatVe({ nguoiDungId, tenDangNhap, tam: true }, tuyChon);
}

/**
 * Đọc vé. Sai chữ ký / hết hạn / sai phiên bản / rác → ném `LoiChuaDangNhap` với
 * ĐÚNG MỘT thông điệp "Chưa đăng nhập." — không nói sai chỗ nào, vì nói ra là chỉ đường
 * cho người đang dò vé.
 * @returns {{v:number,nguoiDungId:string,tenDangNhap:string|null,teamId:string|null,vai:string[],capLuc:number,hetHan:number,tam?:boolean}}
 */
export function docVe(ve, { bayGio = Date.now } = {}) {
  const K = khoa(); // thiếu khoá là lỗi cấu hình của máy chủ, KHÔNG phải "chưa đăng nhập" → ném Error thật
  void K;

  if (typeof ve !== 'string' || ve.length < 8 || ve.length > 4096) throw new LoiChuaDangNhap();
  const cham = ve.indexOf('.');
  if (cham <= 0 || cham === ve.length - 1 || ve.indexOf('.', cham + 1) !== -1) throw new LoiChuaDangNhap();

  const phanThan = ve.slice(0, cham);
  const chuKy = giaiB64(ve.slice(cham + 1));
  const mong = kyPhan(phanThan);
  if (chuKy.length !== mong.length || !timingSafeEqual(chuKy, mong)) throw new LoiChuaDangNhap();

  let than;
  try {
    than = JSON.parse(giaiB64(phanThan).toString('utf8'));
  } catch {
    throw new LoiChuaDangNhap();
  }
  if (!than || typeof than !== 'object' || than.v !== PHIEN_BAN_VE) throw new LoiChuaDangNhap();
  if (!than.nguoiDungId) throw new LoiChuaDangNhap();
  if (!Number.isFinite(than.hetHan) || than.hetHan <= bayGio()) throw new LoiChuaDangNhap();
  if (!Array.isArray(than.vai)) throw new LoiChuaDangNhap();
  if (!than.tam && !than.teamId) throw new LoiChuaDangNhap();

  return than;
}

/** Đọc vé mà không ném — dùng ở lớp đọc cookie, nơi "không có vé" là chuyện bình thường. */
export function docVeAmTham(ve) {
  try { return docVe(ve); } catch (e) {
    if (e instanceof LoiChuaDangNhap) return null;
    throw e; // thiếu V3_KHOA_VE thì phải kêu, không nuốt
  }
}

/** Số mili giây vé còn sống — dùng để đặt `Max-Age` của cookie cho khớp hạn vé. */
export function conLai(than, bayGio = Date.now) {
  return Math.max(0, Number(than?.hetHan || 0) - bayGio());
}
