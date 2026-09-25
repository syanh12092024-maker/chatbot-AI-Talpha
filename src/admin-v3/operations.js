// Application services shared by the V3 operator UI. All identifiers are team scoped.
import { ghiNhatKy } from "../db/index.js";
import { pageThuocBotMoi, lyDoChuaThuocBotMoi } from "../queue/page-routing.js";
import { docSanPhamGoiGia } from "../products/catalog.js";
import { layModel } from "../chat/model.js";
import { HE_SO_TE } from "../pos/index.js";

export const fault = (message, status = 400) =>
  Object.assign(new Error(message), { status });
export function idOf(value) {
  if (!/^[1-9]\d*$/.test(String(value))) throw fault("Mã không hợp lệ");
  return String(value);
}
export async function audit(c, bc, table, id, action, fields) {
  await ghiNhatKy(c, {
    teamId: bc.teamId,
    nguoiDungId: bc.nguoiDungId,
    tacNhan: `nguoi:${bc.nguoiDungId}`,
    doiTuong: table,
    doiTuongId: String(id),
    hanhDong: action,
    sau: { cot: fields },
  });
}
export async function transaction(pool, work) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await work(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function pageStatus(pool, p, env = process.env) {
  const blockers = [];
  // Ghi chú KHÁC với «còn thiếu»: đây là những thứ đang đóng ĐÚNG NHƯ CHỦ Ý. Gộp chúng
  // vào danh sách thiếu là báo hỏng một cấu hình cố tình — rồi người vận hành đi «sửa»
  // cái đang đúng, và mở đúng cái van mà phép đo dựng ra để giữ đóng.
  const luuY = [];
  const dienTap = env.V3_DIEN_TAP === "1";
  // 024: nguồn của «page này thuộc bot nào» đổi theo cầu dao `V3_GIAO_PAGE_TREN_MAN`, và
  // câu chỉ đường phải đổi theo — bảo người ta đi sửa cấu hình máy chủ trong khi việc ấy
  // đã bấm được trên màn là đẩy họ đi một vòng vô ích.
  const thuocBotMoi = pageThuocBotMoi(p, env);
  if (!thuocBotMoi) blockers.push(lyDoChuaThuocBotMoi(env));
  if (env.V3_PANCAKE_GUI !== "1" || env.PANCAKE_READONLY === "1") {
    if (dienTap) luuY.push("Chế độ DIỄN TẬP: bot xử lý và ghi sổ, KHÔNG gửi cho khách — đúng cấu hình, không phải thiếu");
    else blockers.push("Máy chủ chưa mở gửi tin");
  }
  if (env.V3_RAP_PROMPT_BAT !== "1")
    blockers.push("Máy chủ chưa bật cấu hình prompt V3");
  const products = await docSanPhamGoiGia(pool, p.team_id, p.id, p);
  if (!products.length) blockers.push("Thiếu sản phẩm đúng Page / shop");
  if (
    !products.some((s) =>
      s.goiGia.some((g) => Number(g.gia) > 0 && HE_SO_TE[g.tien_te]),
    )
  )
    blockers.push("Thiếu gói giá hợp lệ");
  try {
    const m = await layModel(pool, { teamId: p.team_id });
    if (m.nguon === "config" && !env.ANTHROPIC_API_KEY && !env.KIMI_API_KEY)
      blockers.push("Chưa cấu hình model và API key");
  } catch {
    blockers.push("Model hoặc API key chưa hợp lệ");
  }
  return {
    ...p,
    runtime: thuocBotMoi ? "v3" : "legacy",
    enabled: thuocBotMoi && p.v3_ai_bat !== false,
    blockers,
    luuY,
    dienTap,
    // `ready` = sẵn sàng PHỤC VỤ KHÁCH. Ở chế độ diễn tập nó vẫn có thể `true` mà không
    // một tin nào bay ra — nên màn phải đọc kèm `dienTap`, đừng đọc mỗi chữ «sẵn sàng».
    ready: blockers.length === 0,
    note: "Kiểm tra cấu hình; chưa xác nhận worker đang sống hoặc kết nối bên ngoài.",
  };
}
export async function setPage(pool, bc, id, input, env = process.env) {
  idOf(id);
  if (
    Object.keys(input).some(
      (k) => !["enabled", "source", "version"].includes(k),
    )
  )
    throw fault("Trường cấu hình không hợp lệ");
  if (input.enabled !== undefined && typeof input.enabled !== "boolean")
    throw fault("Công tắc phải là boolean");
  if (input.source !== undefined && !["poll", "webhook"].includes(input.source))
    throw fault("Nguồn phải là poll hoặc webhook");
  return transaction(pool, async (c) => {
    const p = (
      await c.query(
        "SELECT *,xmin::text AS version FROM page WHERE team_id=$1 AND id=$2 FOR UPDATE",
        [bc.teamId, id],
      )
    ).rows[0];
    if (!p) throw fault("Không tìm thấy Page", 404);
    if (!pageThuocBotMoi(p, env)) throw fault(`${lyDoChuaThuocBotMoi(env)}.`, 409);
    if (input.version && input.version !== p.version)
      throw fault("Cấu hình đã đổi; tải lại trước khi lưu", 409);
    if (input.source && input.source !== p.nguon_tin) {
      if (p.v3_ai_bat !== false)
        throw fault("Tắt AI trước khi đổi nguồn nhận tin", 409);
      const pending = await c.query(
        "SELECT 1 FROM tin_cho_xu_ly WHERE team_id=$1 AND page_id=$2 AND trang_thai IN ('cho','dang_xu','loi','chan_guard') LIMIT 1",
        [bc.teamId, p.page_id],
      );
      if (pending.rowCount)
        throw fault("Còn tin chờ/lỗi; xử lý trước khi đổi nguồn", 409);
    }
    if (input.enabled === true) {
      const status = await pageStatus(
        c,
        { ...p, nguon_tin: input.source || p.nguon_tin },
        env,
      );
      if (!status.ready) throw fault(status.blockers.join("; "), 409);
    }
    const r = await c.query(
      `UPDATE page SET v3_ai_bat=COALESCE($3,v3_ai_bat),nguon_tin=COALESCE($4,nguon_tin)
      WHERE team_id=$1 AND id=$2 RETURNING *,xmin::text AS version`,
      [bc.teamId, id, input.enabled ?? null, input.source ?? null],
    );
    await audit(c, bc, "page", id, "v3_cau_hinh_page", Object.keys(input));
    return r.rows[0];
  });
}
/** Mốc 10 phút của bảng điều phối — cùng con số với việc đơn hàng (`dayChoSale`). */
export const PHUT_HAN_VIEC = 10;

export async function handoffConversation(pool, bc, id, { lyDo = "" } = {}) {
  return transaction(pool, async (c) => {
    const h = (
      await c.query(
        `SELECT h.*,p.page_id AS page_text FROM hoi_thoai h JOIN page p ON p.id=h.page_id
      WHERE h.team_id=$1 AND h.id=$2 FOR UPDATE OF h NOWAIT`,
        [bc.teamId, idOf(id)],
      )
    ).rows[0];
    if (!h) throw fault("Không tìm thấy hội thoại", 404);
    const lock = await c.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS ok",
      [`${bc.teamId}:${h.page_text}:${h.psid}`],
    );
    if (!lock.rows[0].ok) throw fault("Hội thoại đang xử lý; thử lại sau", 409);
    await c.query(
      `UPDATE hoi_thoai SET chu_so_huu='SALE',nguoi_that_luc=now(),sua_luc=now(),
      trang_thai=CASE WHEN trang_thai IN ('CLOSING','POST_SALE') THEN trang_thai ELSE 'HANDOFF' END
      WHERE team_id=$1 AND id=$2`,
      [bc.teamId, id],
    );
    // GD5 · 25/09: BÀN GIAO PHẢI ĐẺ RA MỘT DÒNG VIỆC.
    //
    // Trước lượt này, bàn giao chỉ đổi chủ sở hữu hội thoại. Không dòng nào vào
    // `viec_can_xu_ly`, nên màn «Việc đang chờ» — màn DUY NHẤT vai sale thấy — vẫn trống
    // trong khi khách đã bị giao lại. Đo 22/09 trên bản dev: hàng đợi 0 dòng, hội thoại
    // HANDOFF 56 dòng, và chính màn «Việc của tôi» tự khai ra chỗ lệch đó.
    //
    // Chèn có điều kiện: đã có một việc CHƯA ĐÓNG cho hội thoại này thì thôi. Bấm bàn giao
    // hai lần (hoặc bot giao lại sau khi sale trả về) không được đẻ hai dòng — sale sẽ thấy
    // một khách xuất hiện hai lần và không biết cái nào là thật.
    const viec = await c.query(
      `INSERT INTO viec_can_xu_ly (team_id, loai, hoi_thoai_id, ly_do_day, han_luc)
         SELECT $1, 'hoi_thoai', $2, $3, now() + ($4 || ' minutes')::interval
         WHERE NOT EXISTS (
           SELECT 1 FROM viec_can_xu_ly
            WHERE team_id = $1 AND loai = 'hoi_thoai' AND hoi_thoai_id = $2 AND dong_luc IS NULL
         )
       RETURNING id`,
      [bc.teamId, idOf(id), lyDo || "người bấm bàn giao cho sale", String(PHUT_HAN_VIEC)],
    );
    await audit(c, bc, "hoi_thoai", id, "v3_ban_giao_sale", ["chu_so_huu"]);
    return { owner: "SALE", viecId: viec.rows[0]?.id ?? null, viecMoi: viec.rowCount > 0 };
  });
}
export async function saveProduct(pool, bc, id, input) {
  idOf(id);
  if (
    typeof input.ten !== "string" ||
    !input.ten.trim() ||
    input.ten.length > 300 ||
    typeof input.mo_ta !== "string" ||
    input.mo_ta.length > 12000 ||
    typeof input.het_hang !== "boolean" ||
    !Array.isArray(input.offers) ||
    input.offers.length > 30 ||
    !input.version
  )
    throw fault("Tên, mô tả hoặc gói giá không hợp lệ");
  const quantities = new Set();
  for (const g of input.offers) {
    if (
      !Number.isInteger(g.so_luong) ||
      g.so_luong < 1 ||
      g.so_luong > 10000 ||
      quantities.has(g.so_luong) ||
      !HE_SO_TE[g.tien_te] ||
      typeof g.price !== "number" ||
      !Number.isFinite(g.price) ||
      g.price <= 0 ||
      Math.round(g.price * HE_SO_TE[g.tien_te]) < 1 ||
      Math.abs(
        g.price * HE_SO_TE[g.tien_te] -
          Math.round(g.price * HE_SO_TE[g.tien_te]),
      ) > 0.000001 ||
      g.price > 1e9
    )
      throw fault(
        "Gói giá phải có số lượng duy nhất, giá dương và tiền tệ được hỗ trợ",
      );
    quantities.add(g.so_luong);
  }
  return transaction(pool, async (c) => {
    const lock = await c.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS ok",
      [`catalog:${bc.teamId}`],
    );
    if (!lock.rows[0].ok)
      throw fault("Đang đồng bộ danh mục POS; thử lưu lại sau", 409);
    const p = (
      await c.query(
        "SELECT *,xmin::text AS version FROM san_pham WHERE team_id=$1 AND id=$2 FOR UPDATE",
        [bc.teamId, id],
      )
    ).rows[0];
    if (!p) throw fault("Không tìm thấy sản phẩm", 404);
    if (p.version !== input.version)
      throw fault("Sản phẩm đã đổi; tải lại trước khi lưu", 409);
    await c.query(
      "UPDATE san_pham SET ten=$3,mo_ta=$4,het_hang=$5,cau_hinh_tay=true,sua_luc=now() WHERE team_id=$1 AND id=$2",
      [bc.teamId, id, input.ten.trim(), input.mo_ta, input.het_hang],
    );
    // GD5 · 25/09: chụp GÓI GIÁ CŨ trước khi xoá. Nhật ký cũ chỉ ghi tên cột («goi_gia»),
    // nên sau một lượt sửa giá không ai dựng lại được giá cũ là bao nhiêu — mà đây đúng là
    // con số khách trả. Gói giá được XOÁ rồi CHÈN LẠI, nên không chụp trước là mất hẳn.
    const giaCu = (
      await c.query(
        `SELECT so_luong, gia, tien_te, gia_goc, khuyen_mai, phi_ship, mien_ship, bat
           FROM goi_gia WHERE team_id=$1 AND san_pham_id=$2 ORDER BY so_luong`,
        [bc.teamId, id],
      )
    ).rows;
    await c.query("DELETE FROM goi_gia WHERE team_id=$1 AND san_pham_id=$2", [
      bc.teamId,
      id,
    ]);
    for (const g of input.offers)
      await c.query(
        `INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,
                             gia_goc,khuyen_mai,phi_ship,mien_ship,bat)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          bc.teamId,
          id,
          g.so_luong,
          Math.round(g.price * HE_SO_TE[g.tien_te]),
          g.tien_te,
          // Ưu đãi (021). Cùng đơn vị NHỎ với `gia` — nhân hệ số tệ đúng một lần, ở đây.
          g.gia_goc == null || g.gia_goc === "" ? null : Math.round(Number(g.gia_goc) * HE_SO_TE[g.tien_te]),
          String(g.khuyen_mai ?? "").slice(0, 300),
          g.phi_ship == null || g.phi_ship === "" ? null : Math.round(Number(g.phi_ship) * HE_SO_TE[g.tien_te]),
          // `mien_ship` giữ ba trạng thái: chưa khai (null) · miễn (true) · KHÔNG miễn
          // (false). Quy null thành false ở đây là thay người vận hành hứa một điều họ
          // chưa khai — chỗ này cấm tiện tay.
          g.mien_ship == null || g.mien_ship === "" ? null : !!g.mien_ship,
          g.bat === false ? false : true,
        ],
      );
    const giaMoi = (
      await c.query(
        `SELECT so_luong, gia, tien_te, gia_goc, khuyen_mai, phi_ship, mien_ship, bat
           FROM goi_gia WHERE team_id=$1 AND san_pham_id=$2 ORDER BY so_luong`,
        [bc.teamId, id],
      )
    ).rows;
    await ghiNhatKy(c, {
      teamId: bc.teamId,
      nguoiDungId: bc.nguoiDungId,
      tacNhan: `nguoi:${bc.nguoiDungId}`,
      doiTuong: "san_pham",
      doiTuongId: String(id),
      hanhDong: "v3_sua_san_pham",
      truoc: { ten: p.ten, mo_ta: p.mo_ta, het_hang: p.het_hang, goi_gia: giaCu },
      sau: {
        ten: input.ten.trim(), mo_ta: input.mo_ta, het_hang: input.het_hang,
        goi_gia: giaMoi,
        cot: ["ten", "mo_ta", "het_hang", "goi_gia"],
      },
    });
    return { saved: true };
  });
}
