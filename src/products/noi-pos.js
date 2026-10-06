// NỐI SẢN PHẨM CỦA PAGE VỚI MÓN TRONG KHO POS (`san_pham.pos_ma`, migration 027 · CR-28-09b MN8).
//
// Hai nửa sự thật: dòng nguon='kb' (bậc giá combo · ảnh · mô tả — marketer sửa trên trang page)
// và dòng nguon='pos' (tên · tồn kho — kéo từ POS). Nối xong thì:
//   · HẾT HÀNG theo POS: mỗi lượt kéo danh mục (`dongBoTuPos`) đổi `het_hang` của sản phẩm page
//     theo tồn kho món POS, rồi ĐẨY bản chép sang bot — lệch CSDL/bot là điều luật một nguồn cấm.
//   · TÊN: KHÔNG tự đè. Màn đề nghị «Dùng tên POS», người bấm rồi lưu — tên là chữ bot gọi món
//     trước mặt khách, máy không tự đổi thay người.
// Món POS chỉ được chọn trong ĐÚNG shop của page (`page.pos_shop_id`): nối nhầm shop là bot bán
// theo tồn kho của thị trường khác.
import { dayPageSangBot } from "./ban-chep-bot.js";
import { tachSoHieu } from "../pos/ten-goc.js";

/** Tên KHÁCH ĐỌC của món POS: bỏ số hiệu nội bộ đội vận hành gõ đầu tên («41 - …»). */
export const tenKhachCuaPos = (tenPos) => tachSoHieu(tenPos).ten;

export class LoiNoiPos extends Error {
  constructor(thongDiep, ma = "noi_pos", status = 400) {
    super(thongDiep);
    this.name = "LoiNoiPos";
    this.ma = ma;
    this.status = status;
  }
}

async function sanPhamVaPage(db, teamId, sanPhamId) {
  const r = await db.query(
    `SELECT s.id, s.page_id, s.pos_ma, p.page_id AS pid, p.pos_shop_id
       FROM san_pham s LEFT JOIN page p ON p.id = s.page_id
      WHERE s.team_id = $1 AND s.id = $2`,
    [teamId, String(sanPhamId)],
  );
  if (!r.rowCount) throw new LoiNoiPos(`không có sản phẩm #${sanPhamId} trong team này`, "khong_thay", 404);
  return r.rows[0];
}

/** Món POS chọn được cho sản phẩm này — đúng shop của page. Page chưa gắn shop ⇒ `lyDo`. */
export async function dsMonPos(db, teamId, sanPhamId) {
  const s = await sanPhamVaPage(db, teamId, sanPhamId);
  if (!s.pos_shop_id) return { dangNoi: s.pos_ma, mon: [], lyDo: "page chưa gắn shop POS (tab Thiết lập / màn Kết nối)" };
  const r = await db.query(
    `SELECT ma, ten, ton_kho, het_hang FROM san_pham
      WHERE team_id = $1 AND nguon = 'pos' AND ma LIKE $2 ORDER BY ten, ma`,
    [teamId, `${s.pos_shop_id}:%`],
  );
  return {
    dangNoi: s.pos_ma,
    mon: r.rows.map((x) => ({ ma: x.ma, ten: x.ten, tenKhach: tenKhachCuaPos(x.ten), tonKho: x.ton_kho, hetHang: x.het_hang })),
    lyDo: r.rowCount ? "" : "shop của page chưa có món nào trong v3 — bấm «Kéo danh mục» ở màn Kết nối",
  };
}

/**
 * NỐI (hoặc gỡ với `posMa=null`). Nối xong thì hết hàng theo POS NGAY. Trả `sanPhamId` để nơi gọi
 * đẩy bản chép sang bot trong cùng giao dịch.
 */
export async function noiMonPos(c, teamId, sanPhamId, posMa) {
  const s = await sanPhamVaPage(c, teamId, sanPhamId);
  if (posMa == null || posMa === "") {
    await c.query("UPDATE san_pham SET pos_ma = NULL, sua_luc = now() WHERE team_id = $1 AND id = $2", [teamId, s.id]);
    return { sanPhamId: String(s.id), posMa: null, truoc: s.pos_ma };
  }
  const ma = String(posMa);
  if (!s.pos_shop_id || !ma.startsWith(`${s.pos_shop_id}:`)) {
    throw new LoiNoiPos("món POS này không thuộc shop của page — bot sẽ bán theo tồn kho của thị trường khác", "khac_shop");
  }
  const m = (await c.query(
    "SELECT ma, ten, het_hang FROM san_pham WHERE team_id = $1 AND nguon = 'pos' AND ma = $2",
    [teamId, ma],
  )).rows[0];
  if (!m) throw new LoiNoiPos("không có món POS này trong v3 — kéo lại danh mục ở màn Kết nối", "khong_thay_mon", 404);
  await c.query(
    "UPDATE san_pham SET pos_ma = $3, het_hang = $4, sua_luc = now() WHERE team_id = $1 AND id = $2",
    [teamId, s.id, ma, !!m.het_hang],
  );
  return { sanPhamId: String(s.id), posMa: ma, truoc: s.pos_ma, tenPos: m.ten, tenKhach: tenKhachCuaPos(m.ten), hetHang: !!m.het_hang };
}

// «Page đã gắn sản phẩm gốc» — cùng luật `catalog.js#docSanPhamGoiGia` (chuỗi rỗng = chưa gắn).
const daGanGoc = (trang) => String(trang?.san_pham_goc_ma ?? "") !== "";

/**
 * Sau mỗi lượt kéo danh mục: sản phẩm page đã nối mà `het_hang` khác món POS ⇒ sửa và ĐẨY lại bản
 * chép — MỘT GIAO DỊCH MỖI PAGE: bot không nhận thì page ấy ROLLBACK (CSDL và bot không lệch),
 * các page khác vẫn đi tiếp; page hỏng trả ra cho màn gọi tên.
 *
 * GSP3c (nợ N-GSP3B-NEN F4): CHỈ bản sao của page CHƯA gắn sản phẩm gốc — đường cũ, sống tới GSP4. «Đã gắn» = `page.san_pham_goc_ma`
 * có chữ, ĐÚNG luật `catalog.js#docSanPhamGoiGia` (chuỗi rỗng = chưa gắn — review (a) N4). Page đã gắn: bot đọc MÓN POS của gốc × shop,
 * bản sao chỉ là LƯU TRỮ ⇒ không ghi `het_hang` vào bản sao, không đẩy từ đường này (đẩy ở đây là đẩy món POS — có thể chưa giá — ra
 * ngoài mọi chốt GSP3b). Dòng không page (`page_id` NULL) / page team khác giữ như cũ: đổi `het_hang`, không đẩy (LEFT JOIN).
 * Hai lớp: lọc ở câu chọn, và CỬA RA — trong giao dịch của từng page, đọc lại page `FOR SHARE` (cùng thứ tự khoá page → san_pham của
 * GSP3b; lượt gắn page giữ `FOR UPDATE` thì chờ nó xong) và bỏ qua page vừa được gắn sau câu chọn (`pageDaGanBoQua` — nói ra, không im).
 */
export async function dongBoTuPos(pool, teamId, day) {
  const r = await pool.query(
    `SELECT s.id, s.page_id, p.het_hang AS pos_het
       FROM san_pham s JOIN san_pham p ON p.team_id = s.team_id AND p.ma = s.pos_ma AND p.nguon = 'pos'
       LEFT JOIN page pg ON pg.id = s.page_id AND pg.team_id = s.team_id
      WHERE s.team_id = $1 AND s.pos_ma IS NOT NULL AND s.het_hang IS DISTINCT FROM p.het_hang
        AND COALESCE(pg.san_pham_goc_ma, '') = ''`,
    [teamId],
  );
  const theoPage = new Map();
  for (const x of r.rows) {
    const k = String(x.page_id || "");
    if (!theoPage.has(k)) theoPage.set(k, []);
    theoPage.get(k).push(x);
  }
  const kq = { doi: 0, page: 0, hong: [], pageDaGanBoQua: 0 };
  for (const [pageRowId, ds] of theoPage) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const trang = pageRowId
        ? (await c.query("SELECT * FROM page WHERE team_id = $1 AND id = $2 FOR SHARE", [teamId, pageRowId])).rows[0] : null;
      if (daGanGoc(trang)) {   // cửa ra: page được gắn giữa câu chọn và giao dịch này ⇒ không ghi, không đẩy
        await c.query("ROLLBACK");
        kq.pageDaGanBoQua += 1;
        continue;
      }
      for (const x of ds) {
        await c.query("UPDATE san_pham SET het_hang = $3, sua_luc = now() WHERE team_id = $1 AND id = $2", [teamId, x.id, !!x.pos_het]);
      }
      if (trang) await dayPageSangBot(c, teamId, trang, day);
      await c.query("COMMIT");
      kq.doi += ds.length;
      if (trang) kq.page += 1;
    } catch (e) {
      await c.query("ROLLBACK");
      kq.hong.push({ pageRowId, loi: String(e?.message || e) });
    } finally { c.release(); }
  }
  return kq;
}
