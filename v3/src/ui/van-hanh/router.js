import express from "express";
import { fileURLToPath } from "node:url";
import { batBuocDangNhap, batBuocVaiHTTP, VAI } from "../../auth/index.js";
import {
  pageStatus,
  setPage,
  saveProduct,
  handoffConversation,
  idOf,
  fault,
  transaction,
  audit,
} from "../../../../src/admin-v3/operations.js";
import {
  resumeConversation,
  handoffFailedMessage,
} from "../../../../src/queue/reconcile.js";
import { baoCaoDienTap, tomTatDienTap } from "../../../../src/admin-v3/dien-tap.js";
import { chiPhiTheoTin, gomChiPhi, GOM_THEO } from "../../../../src/admin-v3/chi-phi-tin.js";
import { dsBoQua, tomTatBoQua, LY_DO } from "../../../../src/admin-v3/nap-bo-qua.js";
import { docSanPhamGoiGia } from "../../../../src/products/catalog.js";
import { duyet, loai } from "../../../../src/orders/hang-cho.js";
import { HE_SO_TE } from "../../../../src/pos/index.js";
export const DUONG_TRANG = '/van-hanh-v3';
export const VAI_VAO_DUOC = [VAI.QUAN_TRI, VAI.QUAN_LY];
export const VAI_SUA_DUOC = [VAI.QUAN_TRI];
const wrap = (fn) => async (q, r, next) => {
  try {
    await fn(q, r);
  } catch (e) {
    next(e);
  }
};
export function taoRouterVanHanh({ pool, env = process.env, orderDeps = {} } = {}) {
  const r = express.Router();
  const read = [batBuocDangNhap(), batBuocVaiHTTP(...VAI_VAO_DUOC)];
  const admin = batBuocVaiHTTP(VAI.QUAN_TRI);
  r.get(DUONG_TRANG, (q, s, next) => {
    if (!q.boiCanh) return s.redirect("/dang-nhap?tiep=%2Fvan-hanh-v3");
    next();
  }, ...read, (_q, s) =>
    s.sendFile(fileURLToPath(new URL("./trang/van-hanh.html", import.meta.url))),
  );
  r.get("/van-hanh-v3.js", ...read, (_q, s) =>
    s.sendFile(fileURLToPath(new URL("./trang/van-hanh.js", import.meta.url))),
  );
  r.use("/api/van-hanh", ...read, (q, s, next) => {
    s.set("Cache-Control", "no-store");
    if (q.method !== "GET" && !q.boiCanh.vai.includes(VAI.QUAN_TRI)) return s.status(403).json({ok:false,thongDiep:"Chỉ quản trị được thực hiện thao tác này."});
    if (
      q.method !== "GET" &&
      (!q.is("application/json") ||
        q.get("X-V3-Action") !== "1" ||
        q.get("Sec-Fetch-Site") === "cross-site")
    )
      return s
        .status(403)
        .json({ ok: false, thongDiep: "Yêu cầu ghi không hợp lệ" });
    if (!pool) return s.status(503).json({ok:false,thongDiep:'Môi trường này chưa nối dữ liệu vận hành V3.'});
    next();
  });
  const rows = async (q, sql, args = []) =>
    (await pool.query(sql, [q.boiCanh.teamId, ...args])).rows;
  const offset = (q) =>
    Math.min(100000, Math.max(0, Number.parseInt(q.query.offset, 10) || 0));
  // DIỄN TẬP — chấm bot mà không cho nó chạm khách. Chỉ ĐỌC, nên không đòi `X-V3-Action`.
  r.get(
    "/api/van-hanh/dien-tap",
    wrap(async (q, s) => {
      const [ds, tomTat] = await Promise.all([
        baoCaoDienTap(pool, q.boiCanh, { gioiHan: 50, offset: offset(q) }),
        tomTatDienTap(pool, q.boiCanh),
      ]);
      s.json({ ok: true, ...ds, tomTat, dangBat: process.env.V3_DIEN_TAP === "1" });
    }),
  );
  r.get(
    "/api/van-hanh/pages",
    admin,
    wrap(async (q, s) => {
      const pages = await rows(
        q,
        "SELECT *,xmin::text AS version FROM page WHERE team_id=$1 ORDER BY id LIMIT 50 OFFSET $2",
        [offset(q)],
      );
      s.json({
        ok: true,
        items: await Promise.all(pages.map((p) => pageStatus(pool, p, env))),
      });
    }),
  );
  r.post(
    "/api/van-hanh/pages/:id",
    admin,
    wrap(async (q, s) =>
      s.json({
        ok: true,
        item: await setPage(pool, q.boiCanh, q.params.id, q.body, env),
      }),
    ),
  );
  r.get(
    "/api/van-hanh/products",
    admin,
    wrap(async (q, s) => {
      const products = await rows(
        q,
        `SELECT s.*,s.xmin::text AS version,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'so_luong',g.so_luong,'gia',g.gia,'tien_te',g.tien_te,
          'gia_goc',g.gia_goc,'khuyen_mai',g.khuyen_mai,'phi_ship',g.phi_ship,
          'mien_ship',g.mien_ship,'bat',g.bat) ORDER BY g.so_luong)
      FROM goi_gia g WHERE g.team_id=s.team_id AND g.san_pham_id=s.id),'[]') AS offers,
      COALESCE((SELECT gg.kien_thuc FROM san_pham_goc gg
                 WHERE gg.team_id=s.team_id AND gg.ma_goc=s.ma_goc),'{}') AS kien_thuc
      FROM san_pham s WHERE s.team_id=$1 ORDER BY s.id LIMIT 50 OFFSET $2`,
        [offset(q)],
      );
      s.json({
        ok: true,
        items: products.map((p) => ({
          ...p,
          offers: p.offers.map((g) => ({
            ...g,
            price: Number(g.gia) / (HE_SO_TE[g.tien_te] || 1),
            // Đưa về đơn vị LỚN cho ô nhập; `null` giữ nguyên null (chưa khai ≠ 0).
            gia_goc: g.gia_goc == null ? null : Number(g.gia_goc) / (HE_SO_TE[g.tien_te] || 1),
            phi_ship: g.phi_ship == null ? null : Number(g.phi_ship) / (HE_SO_TE[g.tien_te] || 1),
          })),
        })),
      });
    }),
  );
  r.post(
    "/api/van-hanh/products/:id",
    admin,
    wrap(async (q, s) =>
      s.json({
        ok: true,
        ...(await saveProduct(pool, q.boiCanh, q.params.id, q.body)),
      }),
    ),
  );
  r.get(
    "/api/van-hanh/orders",
    wrap(async (q, s) =>
      s.json({
        ok: true,
        items: await rows(
          q,
          `SELECT o.*,p.ten AS page_name FROM hang_cho_tao_don o
    JOIN hoi_thoai h ON h.id=o.hoi_thoai_id AND h.team_id=o.team_id JOIN page p ON p.id=h.page_id
    WHERE o.team_id=$1 ORDER BY o.id DESC LIMIT 50 OFFSET $2`,
          [offset(q)],
        ),
      }),
    ),
  );
  r.get(
    "/api/van-hanh/orders/:id",
    wrap(async (q, s) => {
      const o = (
        await rows(
          q,
          `SELECT o.*,o.xmin::text AS version,p.id AS page_row_id,p.san_pham_goc_ma,p.pos_shop_id
      FROM hang_cho_tao_don o JOIN hoi_thoai h ON h.id=o.hoi_thoai_id AND h.team_id=o.team_id
      JOIN page p ON p.id=h.page_id WHERE o.team_id=$1 AND o.id=$2`,
          [idOf(q.params.id)],
        )
      )[0];
      if (!o) throw fault("Không tìm thấy đơn", 404);
      s.json({
        ok: true,
        item: o,
        currencyFactors: HE_SO_TE,
        products: await docSanPhamGoiGia(
          pool,
          q.boiCanh.teamId,
          o.page_row_id,
          o,
        ),
      });
    }),
  );
  r.post(
    "/api/van-hanh/orders/:id/save",
    wrap(async (q, s) => {
      const bc = q.boiCanh,
        id = idOf(q.params.id),
        b = q.body;
      if (
        ![
          "ten",
          "sdt",
          "dia_chi",
          "thanh_pho",
          "kho_hang",
          "san_pham_ma",
        ].every((k) => typeof b[k] === "string" && b[k].length <= 1000) ||
        !Number.isInteger(b.so_luong) ||
        b.so_luong < 1 ||
        !b.version
      )
        throw fault("Dữ liệu đơn không hợp lệ");
      await transaction(pool, async (c) => {
        const o = (
          await c.query(
            `SELECT o.*,o.xmin::text AS version,p.id AS page_row_id,p.san_pham_goc_ma,p.pos_shop_id
        FROM hang_cho_tao_don o JOIN hoi_thoai h ON h.id=o.hoi_thoai_id JOIN page p ON p.id=h.page_id
        WHERE o.team_id=$1 AND o.id=$2 FOR UPDATE OF o`,
            [bc.teamId, id],
          )
        ).rows[0];
        if (!o) throw fault("Không tìm thấy đơn", 404);
        if (o.trang_thai !== "cho_duyet" || o.version !== b.version)
          throw fault("Đơn đã đổi hoặc đã xử lý; tải lại", 409);
        const products = await docSanPhamGoiGia(c, bc.teamId, o.page_row_id, o);
        const product = products.find(
          (p) => p.ma === b.san_pham_ma && !p.het_hang,
        );
        const offer = product?.goiGia.find((g) => g.so_luong === b.so_luong);
        if (!offer)
          throw fault("Không có gói giá hợp lệ cho sản phẩm / số lượng này");
        const d = { ...o.du_lieu_don };
        for (const k of [
          "ten",
          "sdt",
          "dia_chi",
          "thanh_pho",
          "kho_hang",
          "san_pham_ma",
          "so_luong",
        ])
          d[k] = b[k];
        d.tong_tien = Number(offer.gia);
        d.tien_te = offer.tien_te;
        delete d.tong_tien_lon;
        await c.query(
          "UPDATE hang_cho_tao_don SET du_lieu_don=$3,cua_kiem='{}' WHERE team_id=$1 AND id=$2",
          [bc.teamId, id, JSON.stringify(d)],
        );
        await audit(c, bc, "hang_cho_tao_don", id, "v3_sua_don", [
          "du_lieu_don",
        ]);
      });
      s.json({ ok: true });
    }),
  );
  r.post(
    "/api/van-hanh/orders/:id/approve",
    wrap(async (q, s) => {
      const bc = q.boiCanh;
      if (typeof q.body.version !== "string")
        throw fault("Tải lại đơn trước khi duyệt");
      const result = await duyet(
        pool,
        { teamId: bc.teamId, nguoiDungId: bc.nguoiDungId },
        {
          hangChoId: idOf(q.params.id),
          nguoiDuyetId: bc.nguoiDungId,
          expectedVersion: q.body.version,
        },
        orderDeps,
      );
      s.json({ ok: true, result });
    }),
  );
  r.post(
    "/api/van-hanh/orders/:id/reject",
    wrap(async (q, s) => {
      const bc = q.boiCanh;
      if (
        typeof q.body.reason !== "string" ||
        q.body.reason.trim().length < 5 ||
        q.body.reason.length > 300
      )
        throw fault("Lý do cần 5–300 ký tự");
      s.json({
        ok: true,
        result: await loai(
          pool,
          { teamId: bc.teamId },
          {
            hangChoId: idOf(q.params.id),
            nguoiDuyetId: bc.nguoiDungId,
            lyDo: q.body.reason,
          },
        ),
      });
    }),
  );
  r.get(
    "/api/van-hanh/conversations",
    wrap(async (q, s) =>
      s.json({
        ok: true,
        items: await rows(
          q,
          `SELECT h.id,h.psid,h.trang_thai,h.chu_so_huu,h.cham_luc,p.ten AS page_name
    FROM hoi_thoai h JOIN page p ON p.id=h.page_id WHERE h.team_id=$1 ORDER BY h.id DESC LIMIT 50 OFFSET $2`,
          [offset(q)],
        ),
      }),
    ),
  );
  // ── TIN BỊ LỌC ────────────────────────────────────────────────────────────────
  // Năm cửa lọc loại phần lớn hội thoại mỗi vòng. Trước migration 023 con số đó chỉ có
  // trong stdout của worker ⇒ một cửa bắt OAN là khách im lặng mà không ai biết.
  r.get(
    "/api/van-hanh/bo-qua",
    wrap(async (q, s) => {
      const pageId = q.query.page || null;
      const [items, tomTat] = await Promise.all([
        dsBoQua(pool, q.boiCanh, { pageId, lyDo: q.query.ly_do || null, gioiHan: 100, offset: offset(q) }),
        tomTatBoQua(pool, q.boiCanh, { pageId }),
      ]);
      s.json({ ok: true, items, tomTat, lyDoCo: Object.entries(LY_DO).map(([ma, v]) => ({ ma, ...v })) });
    }),
  );

  // ── CHI PHÍ THEO TỪNG TIN ─────────────────────────────────────────────────────
  // `/chi-phi` cũ cộng tiền từ tiến trình bot v1 và gom theo page. Page chạy v3 thì v1
  // không xử lượt nào ⇒ màn đó hiện 0đ trong khi bot đang tiêu tiền. Đường này đọc thẳng
  // `so_ai` của v3 và tra ngược được về ĐÚNG câu khách đã nhắn.
  r.get(
    "/api/van-hanh/chi-phi-tin",
    wrap(async (q, s) => {
      const theo = String(q.query.theo || "");
      const khoang = { tu: q.query.tu || null, den: q.query.den || null };
      s.json({
        ok: true,
        ...(theo
          ? { theo, nhan: GOM_THEO[theo]?.nhan || theo, gom: await gomChiPhi(pool, q.boiCanh, { theo, ...khoang }) }
          : {
            items: await chiPhiTheoTin(pool, q.boiCanh, {
              pageId: q.query.page || null, psid: q.query.psid || null,
              ...khoang, gioiHan: 100, offset: offset(q),
            }),
          }),
        gomDuoc: Object.entries(GOM_THEO).map(([ma, v]) => ({ ma, nhan: v.nhan })),
      });
    }),
  );

  r.get(
    "/api/van-hanh/conversations/:id",
    wrap(async (q, s) => {
      const h = (
        await rows(
          q,
          `SELECT h.*,p.page_id AS page_text FROM hoi_thoai h JOIN page p ON p.id=h.page_id WHERE h.team_id=$1 AND h.id=$2`,
          [idOf(q.params.id)],
        )
      )[0];
      if (!h) throw fault("Không tìm thấy hội thoại", 404);
      const incoming = await rows(
        q,
        `SELECT id,noi_dung,trang_thai,ly_do,thoi_diem AS tao_luc FROM tin_cho_xu_ly WHERE team_id=$1 AND page_id=$2 AND psid=$3 ORDER BY id DESC LIMIT 30`,
        [h.page_text, h.psid],
      );
      const outgoing = await rows(
        q,
        `SELECT l.id,l.noi_dung,l.trang_thai,l.tao_luc FROM lan_gui l JOIN tin_cho_xu_ly t ON t.id=l.tin_id AND t.team_id=l.team_id WHERE l.team_id=$1 AND t.page_id=$2 AND t.psid=$3 ORDER BY l.id DESC LIMIT 30`,
        [h.page_text, h.psid],
      );
      // LỊCH SỬ THẬT TRÊN PANCAKE — thứ KHÁCH nhìn thấy, gồm cả tin sale gõ tay và tin
      // Botcake. Hai bảng trên chỉ có phần đi qua hàng đợi v3: tin bot xử lý, và tin bot
      // gửi/định gửi. Chấm «bot hiểu hội thoại không» mà chỉ nhìn phần của bot là chấm
      // một nửa cuộc nói chuyện.
      //
      // Đây là lượt ĐỌC (GET) nên không đụng van gửi — cùng luật với `thuTokenSong`. Best
      // effort: không có token, hoặc Pancake lỗi, thì trả lý do cho màn NÓI RA, chứ không
      // để người dùng tưởng hội thoại chỉ có bấy nhiêu tin.
      let lichSu = [];
      let lichSuLoi = null;
      const moc = (await rows(
        q,
        "SELECT conv_id, cust_id FROM tin_cho_xu_ly WHERE team_id=$1 AND page_id=$2 AND psid=$3 ORDER BY id DESC LIMIT 1",
        [h.page_text, h.psid],
      ))[0];
      if (!moc) lichSuLoi = "chưa có tin nào của hội thoại này đi qua hàng đợi v3, nên không biết mã hội thoại bên Pancake";
      else {
        try {
          const { pkGetMessages } = await import("../../../../src/pancake.js");
          const ds = await pkGetMessages(h.page_text, moc.conv_id, moc.cust_id);
          lichSu = (Array.isArray(ds) ? ds : []).slice(-60).map((m) => ({
            luc: m.inserted_at || null,
            laPage: String(m?.from?.id) === String(h.page_text),
            ten: m?.from?.name || "",
            text: String(m.original_message || m.message || "").replace(/<[^>]*>/g, " ").trim(),
          }));
        } catch (e) {
          lichSuLoi = String(e?.message || e).slice(0, 200);
        }
      }
      // Tiền của TỪNG LƯỢT trong đúng hội thoại này — để chấm "câu này đáng bao nhiêu"
      // ngay tại chỗ đọc câu đó, không phải mở màn khác rồi tự ghép lại.
      const chiPhi = await chiPhiTheoTin(pool, q.boiCanh, {
        pageId: h.page_text, psid: h.psid, gioiHan: 100,
      });
      s.json({ ok: true, item: h, incoming, outgoing, lichSu, lichSuLoi, chiPhi });
    }),
  );
  r.post(
    "/api/van-hanh/conversations/:id/handoff",
    wrap(async (q, s) =>
      s.json({
        ok: true,
        // Lý do đi kèm sang bảng việc: sale mở «Việc đang chờ» phải thấy VÌ SAO khách này
        // được giao lại, không chỉ thấy một dòng tên khách.
        ...(await handoffConversation(pool, q.boiCanh, q.params.id, {
          lyDo: String(q.body?.lyDo || "").slice(0, 300),
        })),
      }),
    ),
  );
  r.post(
    "/api/van-hanh/conversations/:id/resume",
    wrap(async (q, s) =>
      s.json({
        ok: true,
        ...(await resumeConversation(pool, {
          teamId: q.boiCanh.teamId,
          id: idOf(q.params.id),
          reason: q.body.reason,
          nguoiDungId: q.boiCanh.nguoiDungId,
        })),
      }),
    ),
  );
  r.post(
    "/api/van-hanh/messages/:id/reconcile",
    wrap(async (q, s) =>
      s.json({
        ok: true,
        ...(await handoffFailedMessage(pool, {
          teamId: q.boiCanh.teamId,
          id: idOf(q.params.id),
          reason: q.body.reason,
          nguoiDungId: q.boiCanh.nguoiDungId,
        })),
      }),
    ),
  );
  r.use((e, _q, s, _next) =>
    s
      .status(e.status || (["55P03", "40P01"].includes(e.code) ? 409 : 400))
      .json({
        ok: false,
        thongDiep: e.code
          ? "Không thể thực hiện. Dữ liệu có thể đã thay đổi; tải lại và thử lại."
          : e.message,
      }),
  );
  return r;
}
