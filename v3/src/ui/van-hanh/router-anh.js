// CỬA GHI ẢNH SẢN PHẨM (CR-28-09b · MN4) — thêm (tải tệp / dán link), sửa nhãn, bỏ, xếp lại.
//
// | Đường                                        | Việc                                       |
// |----------------------------------------------|--------------------------------------------|
// | POST   /api/anh-san-pham/:spId/tai-len?nhan= | thân = BYTE ẢNH (image/jpeg|png|webp|gif)  |
// | POST   /api/anh-san-pham/:spId/link          | { duong, nhan } — link công khai sẵn có    |
// | POST   /api/anh-san-pham/anh/:id             | { nhan }                                   |
// | DELETE /api/anh-san-pham/anh/:id             |                                            |
// | POST   /api/anh-san-pham/:spId/thu-tu        | { ids: [...] } — đúng tập ảnh hiện có      |
// | POST   /api/anh-san-pham/san-pham/:spId      | lưu tên · mô tả · phân loại · hết hàng · bậc giá |
//
// ─── GSP3b · BẢN SAO CỦA PAGE ĐÃ GẮN SẢN PHẨM = CHỈ XEM (CR-02-10b 5e · G2-N1) ──────────────────────────
// Mọi cửa GHI ở đây (lưu sản phẩm · năm cửa ảnh · nối món POS) gọi `chanBanSaoDaChuyen` TRƯỚC khi ghi (lưới sớm, đúng mã trước mọi
// kiểm thân): bản sao (`nguon <> 'pos'`) của page đã gắn gốc ⇒ 409 `ban_sao_da_chuyen` (+ lối sang Sản phẩm › Theo thị trường), 0 dòng
// đổi, 0 lời gọi đẩy. Cửa ra chung `taoBuocDayBot` chốt lần nữa trong giao dịch (khoá dòng page). Id dạng lạ («0<id>») ⇒ 400.
// Món POS và bản sao của page CHƯA gắn đi qua như cũ — trừ cửa lưu ĐẦY ĐỦ (vòng 2 · F1): món POS mà `page_id` NULL hoặc page của nó đã
// gắn ⇒ 409 `mon_pos_sua_o_san_pham` (giá món chỉ sửa chỉ-giá ở Sản phẩm › Theo thị trường); món RF-15 của page CHƯA gắn vẫn qua.
//
// ─── AI SỬA ĐƯỢC: QUẢN TRỊ + MARKETER (người quyết 28/09) ─────────────────────────────
// Marketer là người viết kịch bản và dựng page — người quyết chốt họ sửa được cả sản phẩm, giá,
// ảnh ngay trên trang page. Cửa lưu của màn «Hội thoại và đơn» (`/api/van-hanh/products/:id`)
// giữ nguyên chỉ-quản-trị; cửa ở đây dùng ĐÚNG hàm `saveProduct` + bước đẩy bot, nên luật dữ
// liệu, kiểm phiên bản và nhật ký giá trước/sau y hệt — chỉ khác ai được gõ.
//
// ─── LUẬT MỘT NGUỒN ────────────────────────────────────────────────────────────────────
// Mỗi thao tác chạy trong MỘT giao dịch: ghi CSDL → đẩy bản chép của mọi page đang bán sản
// phẩm sang bot (CHÍNH bước `taoBuocDayBot` của cửa lưu sản phẩm) → nhật ký. Bot không nhận
// ⇒ ROLLBACK, và tệp vừa tải lên bị xoá — không để lại ảnh mồ côi lẫn «đã lưu» giả.
//
// ─── VÌ SAO TẢI LÊN BẰNG BYTE, KHÔNG BẰNG base64 TRONG JSON ────────────────────────────
// App gắn `express.json()` mặc định (trần 100 KB) cho mọi đường. Một ảnh điện thoại 3 MB
// thành 4 MB base64 là 413 trước khi tới đây. Byte thô đi đường `express.raw` riêng, trần 10 MB
// như cửa tải ảnh cũ của bot v1 (`src/admin.js#/upload-image`).
//
// ─── TỆP NẰM Ở ĐÂU ─────────────────────────────────────────────────────────────────────
// Cùng thư mục bot v1 đang phục vụ (`<gốc>/public/uploads`), đường lưu `/uploads/<tệp>` —
// bot tự ghép `PUBLIC_URL` vào khi gửi. Một thư mục, một kiểu đường, cho cả ảnh cũ lẫn mới.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { batBuocDangNhap, batBuocVaiHTTP, VAI } from "../../auth/index.js";
import { transaction, fault, saveProduct } from "../../../../src/admin-v3/operations.js";
import { ghiNhatKy } from "../../../../src/db/index.js";
import {
  themAnh, suaNhanAnh, boAnh, xepAnh, LoiAnhSanPham,
} from "../../../../src/products/anh-san-pham.js";
import { taoBuocDayBot, poolChotDauGiaoDich } from "./router.js";
import { luuKhoiChung, docKhoiChung, batBuocGiuKhoiChung, LoiKhoiChung } from "../../../../src/products/khoi-chung.js";
import { dsMonPos, noiMonPos, LoiNoiPos } from "../../../../src/products/noi-pos.js";
import { chanBanSaoDaChuyen, chanCuaLuuDayDu, idSo } from "../../../../src/products/chuyen-ban-sao.js";
import { LoiSanPhamGoc } from "../../../../src/products/san-pham-goc.js";

export const DUOI_THEO_KIEU = Object.freeze({
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
});
export const TRAN_BYTE = 10 * 1024 * 1024;
/** Ai sửa được sản phẩm · giá · ảnh trên trang page. */
export const VAI_SUA_SAN_PHAM = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER]);

const wrap = (fn) => async (q, s, next) => { try { await fn(q, s); } catch (e) { next(e); } };

export function taoRouterAnhSanPham({ pool, env = process.env, daySanPhamLenBot = null, thuMucAnh = null, dayKhoiChungLenBot = null } = {}) {
  const r = express.Router();
  const dayBot = taoBuocDayBot({ day: daySanPhamLenBot, env });

  // Rào: đăng nhập · quản trị hoặc marketer · cờ X-V3-Action · không nhận yêu cầu từ trang khác
  // (chặn CSRF). Không có pool thì nói rõ, không 500.
  r.use("/api/anh-san-pham", batBuocDangNhap(), batBuocVaiHTTP(...VAI_SUA_SAN_PHAM), (q, s, next) => {
    s.set("Cache-Control", "no-store");
    if (q.get("X-V3-Action") !== "1" || q.get("Sec-Fetch-Site") === "cross-site") {
      return s.status(403).json({ ok: false, thongDiep: "Yêu cầu ghi không hợp lệ" });
    }
    if (!pool) return s.status(503).json({ ok: false, thongDiep: "Môi trường này chưa nối dữ liệu vận hành V3." });
    next();
  });

  /** Một thao tác = ghi → đẩy sang bot → nhật ký, trong MỘT giao dịch. */
  const voiDayBot = (bc, viec) => transaction(pool, async (c) => {
    const { sanPhamId, truoc = null, sau = null, ra } = await viec(c);
    const dongBo = await dayBot(c, bc, sanPhamId);
    await ghiNhatKy(c, {
      teamId: bc.teamId, nguoiDungId: bc.nguoiDungId, tacNhan: `nguoi:${bc.nguoiDungId}`,
      doiTuong: "anh_san_pham", doiTuongId: String(sanPhamId),
      hanhDong: "v3_sua_anh_san_pham", truoc, sau,
    });
    return { ...ra, dongBo };
  });
  // GSP3b: cửa theo id ẢNH tra sản phẩm từ dòng ảnh trước khi chốt (ảnh không có ⇒ null ⇒ cửa phía sau nói 404 như cũ; id dạng lạ ⇒ 400).
  const spCuaAnh = async (c, teamId, id) => {
    const a = idSo(id, "mã ảnh");
    return a ? (await c.query("SELECT san_pham_id FROM anh_san_pham WHERE team_id=$1 AND id=$2", [teamId, a])).rows[0]?.san_pham_id ?? null : null;
  };

  r.post(
    "/api/anh-san-pham/:spId/tai-len",
    express.raw({ type: Object.keys(DUOI_THEO_KIEU), limit: TRAN_BYTE }),
    wrap(async (q, s) => {
      if (!thuMucAnh) throw fault("Máy chủ chưa khai thư mục ảnh — không tải lên được", 503);
      const kieu = String(q.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
      const duoi = DUOI_THEO_KIEU[kieu];
      if (!duoi || !Buffer.isBuffer(q.body) || !q.body.length) {
        throw fault("Chỉ nhận ảnh jpg, png, webp hoặc gif (tối đa 10 MB)");
      }
      const spId = String(q.params.spId).replace(/[^0-9]/g, "");
      if (!spId) throw fault("Mã sản phẩm không hợp lệ");
      const tep = `v3-${spId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${duoi}`;
      fs.mkdirSync(thuMucAnh, { recursive: true });
      const duongTep = path.join(thuMucAnh, tep);
      fs.writeFileSync(duongTep, q.body);
      try {
        const kq = await voiDayBot(q.boiCanh, async (c) => {
          await chanBanSaoDaChuyen(c, q.boiCanh.teamId, spId);   // GSP3b — trước khi ghi (tệp vừa ghi bị xoá ở catch)
          const a = await themAnh(c, q.boiCanh.teamId, spId, { duong: `/uploads/${tep}`, nhan: q.query.nhan });
          return { sanPhamId: a.sanPhamId, sau: a, ra: { anh: a } };
        });
        s.json({ ok: true, ...kq });
      } catch (e) {
        fs.rmSync(duongTep, { force: true });   // lượt lưu không thành ⇒ không để tệp mồ côi
        throw e;
      }
    }),
  );

  r.post("/api/anh-san-pham/:spId/link", wrap(async (q, s) => {
    const kq = await voiDayBot(q.boiCanh, async (c) => {
      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, q.params.spId);   // GSP3b
      const a = await themAnh(c, q.boiCanh.teamId, q.params.spId, { duong: q.body?.duong, nhan: q.body?.nhan });
      return { sanPhamId: a.sanPhamId, sau: a, ra: { anh: a } };
    });
    s.json({ ok: true, ...kq });
  }));

  r.post("/api/anh-san-pham/anh/:id", wrap(async (q, s) => {
    const kq = await voiDayBot(q.boiCanh, async (c) => {
      const cu = (await c.query("SELECT nhan FROM anh_san_pham WHERE team_id=$1 AND id=$2", [q.boiCanh.teamId, q.params.id])).rows[0];
      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, await spCuaAnh(c, q.boiCanh.teamId, q.params.id));   // GSP3b
      const a = await suaNhanAnh(c, q.boiCanh.teamId, q.params.id, { nhan: q.body?.nhan });
      return { sanPhamId: a.sanPhamId, truoc: cu || null, sau: a, ra: { anh: a } };
    });
    s.json({ ok: true, ...kq });
  }));

  r.delete("/api/anh-san-pham/anh/:id", wrap(async (q, s) => {
    const kq = await voiDayBot(q.boiCanh, async (c) => {
      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, await spCuaAnh(c, q.boiCanh.teamId, q.params.id));   // GSP3b
      const a = await boAnh(c, q.boiCanh.teamId, q.params.id);
      return { sanPhamId: a.sanPhamId, truoc: a, ra: { daBo: a.id } };
    });
    s.json({ ok: true, ...kq });
  }));

  r.post("/api/anh-san-pham/:spId/thu-tu", wrap(async (q, s) => {
    const kq = await voiDayBot(q.boiCanh, async (c) => {
      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, q.params.spId);   // GSP3b
      const ds = await xepAnh(c, q.boiCanh.teamId, q.params.spId, q.body?.ids);
      return { sanPhamId: String(q.params.spId), sau: { thuTu: ds.map((a) => a.id) }, ra: { anh: ds } };
    });
    s.json({ ok: true, ...kq });
  }));

  // Lưu MỘT sản phẩm từ trang page — chính `saveProduct` (kiểm phiên bản · nhật ký giá trước/sau)
  // + bước đẩy bot trong cùng giao dịch. Nhật ký ghi đúng người (quản trị hay marketer).
  // GSP3b: chốt TRƯỚC `saveProduct` (0 dòng đổi, 0 lời gọi đẩy, đúng mã trước mọi kiểm thân). Vòng 2 · F1: món POS ngoài đường RF-15
  // (`page_id` NULL hoặc page đã gắn) ⇒ 409 `mon_pos_sua_o_san_pham` — marketer lẫn quản trị; món RF-15 của page CHƯA gắn vẫn qua (D10).
  // Vòng 2 · F2: cùng chốt chạy lại ở ĐẦU giao dịch của `saveProduct` (`poolChotDauGiaoDich`) — khoá page trước `san_pham` (không còn
  // vòng chờ với lượt gắn / «Không chuyển»), page được gắn giữa hai lượt ⇒ 409, ROLLBACK, không đẩy món POS thay bản sao vừa lưu.
  r.post("/api/anh-san-pham/san-pham/:spId", wrap(async (q, s) => {
    const chot = (db) => chanCuaLuuDayDu(db, q.boiCanh.teamId, q.params.spId);
    await chot(pool);
    const kq = await saveProduct(poolChotDauGiaoDich(pool, chot), q.boiCanh, q.params.spId, q.body || {}, { sauKhiLuu: dayBot });
    s.json({ ok: true, ...kq });
  }));

  // NỐI MÓN POS (MN8) — danh sách món cùng shop của page, và nối/gỡ. Nối xong hết hàng theo POS
  // NGAY ⇒ đẩy bản chép trong cùng giao dịch (khuôn `voiDayBot`).
  r.get("/api/anh-san-pham/pos/:spId", wrap(async (q, s) => {
    s.json({ ok: true, ...(await dsMonPos(pool, q.boiCanh.teamId, q.params.spId)) });
  }));
  r.post("/api/anh-san-pham/pos/:spId", wrap(async (q, s) => {
    const kq = await voiDayBot(q.boiCanh, async (c) => {
      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, q.params.spId);   // GSP3b — nối món cũng đẩy bản sao theo cùng chuỗi
      const n = await noiMonPos(c, q.boiCanh.teamId, q.params.spId, q.body?.posMa ?? null);
      return { sanPhamId: n.sanPhamId, truoc: { pos_ma: n.truoc }, sau: { pos_ma: n.posMa }, ra: n };
    });
    s.json({ ok: true, ...kq });
  }));

  // VE4 · 29/09: cửa ĐỌC ba khối của team — tab «Chính sách · FAQ · Phản đối» của Luật chung (bản vẽ 2d). Đặt CÙNG router
  // với cửa ghi để hưởng CÙNG rào ở trên. `giu`: team này có đang giữ bộ khối của bot không — màn khoá ô sửa và nói lý do
  // TRƯỚC khi người ta gõ, thay vì để bấm lưu rồi mới nhận 403/409.
  r.get("/api/anh-san-pham/khoi-chung", wrap(async (q, s) => {
    const bc = q.boiCanh;
    const kc = await docKhoiChung(pool, bc.teamId);
    let giu = { ok: true, viSao: null };
    try { await batBuocGiuKhoiChung(pool, bc.teamId); }
    catch (e) { if (e instanceof LoiKhoiChung) giu = { ok: false, viSao: e.message }; else throw e; }
    s.json({ ok: true, ...kc, giu });
  }));

  // BA KHỐI DÙNG CHUNG (MN7) — Chính sách · FAQ · Phản đối. Cùng khuôn: lưu → đẩy bot → đọc lại
  // → nhật ký, MỘT giao dịch; bot không nhận ⇒ ROLLBACK. Đổi ở đây là đổi lời bot ở MỌI page.
  r.post("/api/anh-san-pham/khoi-chung", wrap(async (q, s) => {
    if (typeof dayKhoiChungLenBot !== "function") {
      throw fault("Chưa nối cửa đẩy sang bot — không lưu, vì lưu mà bot không đổi là màn hình nói sai", 503);
    }
    const bc = q.boiCanh;
    const kq = await transaction(pool, async (c) => {
      await batBuocGiuKhoiChung(c, bc.teamId);   // bot có MỘT bộ ba khối — chỉ team đang giữ được sửa
      const l = await luuKhoiChung(c, bc.teamId, q.body?.noiDung, {
        phienBanCu: q.body?.phienBan, nguoiSua: bc.tenDangNhap || String(bc.nguoiDungId || ""),
      });
      let dongBo;
      try { dongBo = { ok: true, ...(await dayKhoiChungLenBot(l.sau)) }; }
      catch (e) {
        if (e?.ma === "cua_ghi_dong" && env.V3_RAP_PROMPT_BAT === "1") dongBo = { ok: false, ghiChu: String(e.message || e) };
        else { if (e && !e.status) e.status = 502; throw e; }
      }
      await ghiNhatKy(c, {
        teamId: bc.teamId, nguoiDungId: bc.nguoiDungId, tacNhan: `nguoi:${bc.nguoiDungId}`,
        doiTuong: "khoi_dung_chung", doiTuongId: String(bc.teamId),
        hanhDong: "v3_sua_khoi_dung_chung", truoc: l.truoc, sau: l.sau,
      });
      return { phienBan: l.phienBan, dongBo };
    });
    s.json({ ok: true, ...kq });
  }));

  r.use("/api/anh-san-pham", (e, _q, s, _next) => {
    // GSP3b: 409 `ban_sao_da_chuyen` mang MÃ + lối sang (`duLieu.duongSua`) để màn nói đúng chỗ sửa.
    if (e instanceof LoiSanPhamGoc) {
      return s.status(e.status || 400).json({ ok: false, ma: e.ma, thongDiep: e.message, ...(e.duLieu ? { duLieu: e.duLieu } : {}) });
    }
    const status = e instanceof LoiAnhSanPham || e instanceof LoiKhoiChung || e instanceof LoiNoiPos ? e.status
      : e?.type === "entity.too.large" ? 413 : (e.status || 400);
    s.status(status).json({
      ok: false,
      thongDiep: status === 413 ? "Ảnh quá lớn (tối đa 10 MB)."
        : e.code && !(e instanceof LoiAnhSanPham) && !(e instanceof LoiKhoiChung) && !(e instanceof LoiNoiPos) ? "Không thể thực hiện. Dữ liệu có thể đã thay đổi; tải lại và thử lại."
          : e.message,
    });
  });
  return r;
}
