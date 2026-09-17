// QUÉT PANCAKE → BẢNG `page`. Đường vào CSDL cho DANH MỤC PAGE, không qua tệp nào.
//
// ─── VÌ SAO CÓ FILE NÀY ────────────────────────────────────────────────────────────────
// `INSERT INTO page` trước nay chỉ có ĐÚNG MỘT chỗ: `db/di-tru/nap.js`, và nó đọc
// `pages.json` — tệp do `src/page-registry.js` sinh ra khi quét Pancake. Nên dây chuyền
// thật là:
//
//     token → quét Pancake → pages.json → «Kéo dữ liệu về» → bảng page
//
// Khúc giữa là di sản của v1: một máy CHỈ chạy v3 không có tệp đó, nên dán token xong màn
// «Page & bot» vẫn rỗng vĩnh viễn và không nút nào chữa được. File này bỏ khúc giữa:
//
//     token (kể cả token thêm ở màn v3) → quét Pancake → bảng page
//
// ─── KHÔNG XOÁ, KHÔNG ĐÈ CÔNG NGƯỜI ───────────────────────────────────────────────────
// Cùng luật với `napPage`, và luật ấy đã trả giá một lần (án lệ 15/09: lượt «Kéo dữ liệu
// về» xoá sạch thị trường người vừa nhập):
//   · `ten` máy đồng bộ — Pancake là chủ.
//   · `marketer`, `thi_truong`, `nganh_hang`: ĐIỀN VÀO CHỖ TRỐNG, không bao giờ xoá chỗ đã có.
//   · `bot_ai_bat`, `v3_ai_bat`, `trong_diem`, `botcake_tat`, `pos_shop_id`, `san_pham_goc_ma`:
//     KHÔNG có trong câu — công tắc và mọi thứ người gán không được đổi bởi một lượt quét.
//   · `team_id` chỉ ở vế INSERT: page CŨ giữ nguyên team, page MỚI rơi vào team chưa-phân
//     để người gán tiếp ở màn «Cấu hình team».
//
// ─── KHÔNG TỰ ĐÁNH DẤU PAGE MẤT ───────────────────────────────────────────────────────
// Một lượt quét thiếu page KHÔNG chứng minh page biến mất: thường là token hết hạn hoặc
// mất quyền. `src/page-registry.js` phải dựng cả lá chắn 70% cho chuyện này. Ở đây chọn
// đường hẹp hơn mà thành thật: ĐẾM số page trong CSDL mà lượt quét không thấy, trả ra cho
// màn nói, và KHÔNG đổi một cột nào của chúng.
import { refreshPancakePages, pancakePages } from './pancake.js';

/** Team nhận page MỚI. Cùng giá trị với bộ di trú — hai đường không được rơi hai chỗ. */
export const TEAM_CHUA_PHAN = 'chua-phan';

export class LoiQuetPage extends Error {
  constructor(thongDiep, ma = 'quet_page', status = 400) {
    super(thongDiep);
    this.name = 'LoiQuetPage';
    this.ma = ma;
    this.status = status;
  }
}

async function idTeamChuaPhan(pool) {
  const r = await pool.query('SELECT id FROM team WHERE slug = $1', [TEAM_CHUA_PHAN]);
  if (!r.rowCount) {
    throw new LoiQuetPage(`chưa có team slug='${TEAM_CHUA_PHAN}' — chạy \`npm run migrate\` trước`, 'thieu_team', 500);
  }
  return r.rows[0].id;
}

/**
 * Quét Pancake bằng TOÀN BỘ token đang có (env + tệp + bảng `token_pancake`) rồi upsert
 * vào bảng `page`.
 *
 * @param {import('pg').Pool} pool
 * @param {{quet?: Function, doc?: Function}} [cua]  tiêm bộ quét cho bộ ca; mặc định gọi Pancake thật
 * @returns {Promise<{nguon:number, them:number, capNhat:number, khongThay:number, teamMoi:string}>}
 */
export async function quetVaGhiPage(pool, { quet = refreshPancakePages, doc = pancakePages } = {}) {
  const soPage = await quet();
  const ds = [...doc().values()];
  if (!ds.length) {
    // Không token, hoặc token không phủ page nào. Hai chuyện khác nhau, nhưng cùng một
    // hệ quả ở đây — và cả hai đều KHÔNG được đụng vào dữ liệu đã có.
    return { nguon: 0, them: 0, capNhat: 0, khongThay: 0, teamMoi: TEAM_CHUA_PHAN, rong: true, soPageQuet: soPage };
  }

  const teamId = await idTeamChuaPhan(pool);
  let them = 0;
  let capNhat = 0;
  for (const p of ds) {
    const r = await pool.query(
      `INSERT INTO page (team_id, page_id, ten, kiem_luc)
       VALUES ($1,$2,$3, now())
       ON CONFLICT (page_id) DO UPDATE SET
         ten = EXCLUDED.ten,
         kiem_luc = now(),
         sua_luc = now()
       RETURNING (xmax = 0) AS la_moi`,
      [teamId, String(p.id), String(p.name || '')],
    );
    if (r.rows[0].la_moi) them += 1; else capNhat += 1;
  }

  const thay = new Set(ds.map((p) => String(p.id)));
  const trongDb = await pool.query('SELECT page_id FROM page');
  const khongThay = trongDb.rows.filter((x) => !thay.has(String(x.page_id))).length;

  return { nguon: ds.length, them, capNhat, khongThay, teamMoi: TEAM_CHUA_PHAN, rong: false, soPageQuet: soPage };
}
