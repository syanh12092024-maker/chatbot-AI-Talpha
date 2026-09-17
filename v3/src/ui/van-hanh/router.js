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
      COALESCE((SELECT jsonb_agg(jsonb_build_object('so_luong',g.so_luong,'gia',g.gia,'tien_te',g.tien_te) ORDER BY g.so_luong)
      FROM goi_gia g WHERE g.team_id=s.team_id AND g.san_pham_id=s.id),'[]') AS offers
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
      s.json({ ok: true, item: h, incoming, outgoing });
    }),
  );
  r.post(
    "/api/van-hanh/conversations/:id/handoff",
    wrap(async (q, s) =>
      s.json({
        ok: true,
        ...(await handoffConversation(pool, q.boiCanh, q.params.id)),
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
