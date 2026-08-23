// MẬT KHẨU — băm và kiểm bằng `scrypt` của `node:crypto`. KHÔNG thêm thư viện ngoài.
//
// Vì sao scrypt chứ không phải bcrypt/argon2: hai cái kia là gói ngoài có phần biên dịch
// máy, cài trên VPS hay hỏng. scrypt nằm sẵn trong Node, đủ chậm để chống dò, và không
// thêm một dòng nào vào `package.json` — mà `package.json` là file B không được đụng.
//
// Định dạng lưu (đúng hợp đồng mục 4, cột `nguoi_dung.mat_khau_bam` kiểu text):
//     scrypt$<N>$<r>$<p>$<muối base64>$<băm base64>
// Tham số nằm ngay trong chuỗi để sau này nâng N mà mật khẩu cũ vẫn kiểm được.

import { scrypt as _scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt);

/** Mặc định của giai đoạn 1. Nâng N thì chuỗi cũ vẫn đọc được vì N nằm trong chuỗi. */
export const THAM_SO = Object.freeze({ N: 16384, r: 8, p: 1, muoiByte: 16, bamByte: 64 });

/** Trần tham số khi ĐỌC chuỗi lạ — chuỗi rác với N khổng lồ có thể treo tiến trình. */
const TRAN = Object.freeze({ N: 1 << 20, r: 32, p: 16, bamByte: 128 });

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Mật khẩu gõ bằng bàn phím tiếng Việt có thể ra hai chuỗi Unicode khác nhau mà nhìn y hệt.
// Chuẩn hoá NFKC để "cùng một mật khẩu" luôn ra cùng một chuỗi byte.
const chuanHoa = (s) => String(s).normalize('NFKC');

// Node chặn scrypt khi 128*N*r vượt maxmem (mặc định 32MB). Cấp đúng đủ, có dư.
const boNho = (N, r, p) => 128 * N * r * Math.max(1, p) + (1 << 20);

/**
 * @param {string} matKhau
 * @returns {Promise<string>} chuỗi `scrypt$N$r$p$muối$băm`
 */
export async function bam(matKhau, thamSo = {}) {
  if (typeof matKhau !== 'string' || matKhau.length === 0) {
    throw new Error('bam: mật khẩu phải là chuỗi không rỗng.');
  }
  const { N, r, p, muoiByte, bamByte } = { ...THAM_SO, ...thamSo };
  const muoi = randomBytes(muoiByte);
  const ra = await scrypt(chuanHoa(matKhau), muoi, bamByte, { N, r, p, maxmem: boNho(N, r, p) });
  return `scrypt$${N}$${r}$${p}$${muoi.toString('base64')}$${ra.toString('base64')}`;
}

/**
 * So mật khẩu với chuỗi đã băm. Chuỗi băm sai định dạng → trả `false`, KHÔNG ném:
 * dữ liệu hỏng trong cột `mat_khau_bam` không được làm sập đường đăng nhập của cả team.
 * @returns {Promise<boolean>}
 */
export async function kiem(matKhau, chuoiDaBam) {
  if (typeof matKhau !== 'string' || matKhau.length === 0) return false;
  const t = tach(chuoiDaBam);
  if (!t) return false;
  try {
    const ra = await scrypt(chuanHoa(matKhau), t.muoi, t.bam.length, {
      N: t.N, r: t.r, p: t.p, maxmem: boNho(t.N, t.r, t.p),
    });
    // timingSafeEqual ném khi lệch độ dài — đã chắc bằng nhau ở trên, vẫn chắn thêm một lần.
    return ra.length === t.bam.length && timingSafeEqual(ra, t.bam);
  } catch {
    return false;
  }
}

/** Chuỗi băm có đọc được không — dùng để soát dữ liệu, không dùng lúc đăng nhập. */
export function hopLe(chuoiDaBam) {
  return tach(chuoiDaBam) !== null;
}

function giaiB64(s, toiDa) {
  if (typeof s !== 'string' || !s.length || !B64.test(s)) return null;
  const b = Buffer.from(s, 'base64');
  if (!b.length || b.length > toiDa) return null;
  return b;
}

/** Bóc chuỗi băm ra tham số. Sai một chỗ → `null`, không ném, không đoán. */
function tach(chuoi) {
  if (typeof chuoi !== 'string') return null;
  const phan = chuoi.split('$');
  if (phan.length !== 6 || phan[0] !== 'scrypt') return null;

  const N = Number(phan[1]); const r = Number(phan[2]); const p = Number(phan[3]);
  if (!Number.isInteger(N) || N < 2 || N > TRAN.N || (N & (N - 1)) !== 0) return null; // N phải là luỹ thừa của 2
  if (!Number.isInteger(r) || r < 1 || r > TRAN.r) return null;
  if (!Number.isInteger(p) || p < 1 || p > TRAN.p) return null;

  const muoi = giaiB64(phan[4], 64);
  const bam_ = giaiB64(phan[5], TRAN.bamByte);
  if (!muoi || !bam_ || bam_.length < 16) return null;
  return { N, r, p, muoi, bam: bam_ };
}
