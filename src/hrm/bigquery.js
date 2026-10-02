// ĐỌC BIGQUERY — CHỈ ĐỌC, KHÔNG GÓI NGOÀI (LL15a · 02/10).
//
// Máy chủ prod đã giữ khoá service account `levelup-465304` ở `/etc/aicloser/bq-levelup.json` (người quyết chọn 02/10: chép
// khoá đang có thay vì chờ tạo SA mới). Khoá ấy CÓ THỂ mang quyền ghi (chưa đo được — SA không đọc được chính sách IAM), nên
// lớp này tự bó mình ở hai chỗ, không dựa vào IAM:
//   ① token xin đúng phạm vi `bigquery.readonly` — Google từ chối mọi lời gọi ghi bằng token này, kể cả khi SA có quyền ghi;
//   ② chỉ có MỘT cửa ra: `truyVan(sql)` gọi `jobs.query` — không có hàm nào dựng câu ghi / tạo bảng / xoá.
// Ký JWT bằng `node:crypto` (RS256) và gọi REST — `@google-cloud/bigquery` kéo theo ~40 gói cho đúng hai câu SELECT.
// Khoá không bao giờ lọt vào thông điệp lỗi: lỗi chỉ mang mã + trạng thái HTTP + lý do của Google.
import crypto from 'node:crypto';
import fs from 'node:fs';

export const PHAM_VI_CHI_DOC = 'https://www.googleapis.com/auth/bigquery.readonly';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';

export class LoiBigQuery extends Error {
  constructor(ma, thongDiep, status = null) {
    super(thongDiep);
    this.name = 'LoiBigQuery';
    this.ma = ma;           // 'thieu_khoa' | 'khoa_hong' | 'token' | 'truy_van' | 'cham' | 'cat_trang' | 'mang'
    this.status = status;   // HTTP của Google (khi có)
  }
}

// «fetch failed» của undici không nói gì — mã thật nằm ở `cause` (đo 02/10 trên máy dev: ETIMEDOUT chập chờn tới googleapis).
const lyDoMang = (e) => [e?.message, e?.cause?.code || e?.cause?.message].filter(Boolean).join(' · ').slice(0, 100) || String(e);

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

function docKhoa(tepKhoa) {
  if (!tepKhoa) throw new LoiBigQuery('thieu_khoa', 'chưa khai đường dẫn tệp khoá BigQuery (V3_BQ_KHOA)');
  let k;
  try { k = JSON.parse(fs.readFileSync(tepKhoa, 'utf8')); } catch (e) {
    throw new LoiBigQuery('khoa_hong', `không đọc được tệp khoá BigQuery (${e.code || 'JSON hỏng'})`);
  }
  if (!k || k.type !== 'service_account' || !k.client_email || !k.private_key || !k.project_id) {
    throw new LoiBigQuery('khoa_hong', 'tệp khoá BigQuery không phải khoá service account đủ trường');
  }
  return k;
}

/** Chuyển một dòng `f/v` của REST BigQuery thành đối tượng theo tên cột (chỉ kiểu phẳng — đủ cho bảng HRM). */
function dongThanhDoiTuong(schema, row) {
  const ra = {};
  schema.fields.forEach((f, i) => {
    const v = row.f[i] ? row.f[i].v : null;
    ra[f.name] = v == null ? null
      : f.type === 'BOOLEAN' ? v === 'true'
        : (f.type === 'INTEGER' || f.type === 'INT64') ? Number(v)
          : f.type === 'TIMESTAMP' ? Number(v) * 1000   // REST trả giây dạng chuỗi số thực
            : v;
  });
  return ra;
}

/**
 * Khách BigQuery CHỈ ĐỌC.
 * @param {{ tepKhoa: string, fetchFn?: Function, dongHo?: () => number, viTri?: string, timeoutMs?: number }} o
 * @returns {{ truyVan(sql: string): Promise<object[]>, duAn: string, email: string }}
 */
export function taoKhachBigQuery({ tepKhoa, fetchFn = fetch, dongHo = () => Date.now(), viTri = 'US', timeoutMs = 20000 } = {}) {
  const k = docKhoa(tepKhoa);
  let token = null;   // { giaTri, hetLuc }

  async function layToken() {
    if (token && token.hetLuc - dongHo() > 60_000) return token.giaTri;
    const now = Math.floor(dongHo() / 1000);
    const dau = b64({ alg: 'RS256', typ: 'JWT' });
    const than = b64({ iss: k.client_email, scope: PHAM_VI_CHI_DOC, aud: URL_TOKEN, iat: now, exp: now + 3600 });
    let chuKy;
    try { chuKy = crypto.createSign('RSA-SHA256').update(`${dau}.${than}`).sign(k.private_key).toString('base64url'); } catch {
      throw new LoiBigQuery('khoa_hong', 'khoá riêng trong tệp khoá BigQuery không ký được');
    }
    let r;
    try {
      r = await fetchFn(URL_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${dau}.${than}.${chuKy}` });
    } catch (e) { throw new LoiBigQuery('mang', `không gọi được máy cấp token của Google (${lyDoMang(e)})`); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new LoiBigQuery('token', `Google từ chối cấp token (${j.error || r.status})`, r.status);
    token = { giaTri: j.access_token, hetLuc: dongHo() + (Number(j.expires_in) || 3600) * 1000 };
    return token.giaTri;
  }

  async function truyVan(sql) {
    const tk = await layToken();
    let r;
    try {
      r = await fetchFn(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(k.project_id)}/queries`, {
        method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql, useLegacySql: false, location: viTri, timeoutMs }),
      });
    } catch (e) { throw new LoiBigQuery('mang', `không gọi được BigQuery (${lyDoMang(e)})`); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) {
      const lyDo = j.error?.errors?.[0]?.reason || j.error?.status || r.status;
      throw new LoiBigQuery('truy_van', `BigQuery từ chối câu đọc (${lyDo})`, r.status);
    }
    if (j.jobComplete === false) throw new LoiBigQuery('cham', `BigQuery chưa trả kết quả sau ${timeoutMs / 1000} giây`);
    // LL17a · 02/10: kết quả dài hơn MỘT trang (`pageToken`) ⇒ từ chối, KHÔNG trả nửa số. Lớp này cố ý chỉ có một cửa `jobs.query`
    // (không gọi trang sau) — câu đọc phải tự gộp cho vừa. Trả nửa số là số sai trông như số đúng (án lệ #35: «đọc bao nhiêu» lặng
    // lẽ quyết câu trả lời).
    if (j.pageToken) {
      throw new LoiBigQuery('cat_trang', `BigQuery trả ${j.totalRows ?? '?'} dòng mà một trang chỉ ${(j.rows || []).length} — câu đọc phải gộp thêm`);
    }
    return (j.rows || []).map((row) => dongThanhDoiTuong(j.schema, row));
  }

  return { truyVan, duAn: k.project_id, email: k.client_email };
}
