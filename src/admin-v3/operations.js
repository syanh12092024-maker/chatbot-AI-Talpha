// Application services shared by the V3 operator UI. All identifiers are team scoped.
import { ghiNhatKy } from "../db/index.js";
import {
  botDangTraLoi, dsPageBotTraLoi, tranPageBat, vuotTran, cauSoTran, KHOA_TRAN_PAGE_BAT,
} from "../queue/page-routing.js";
import { docSanPhamGoiGia } from "../products/catalog.js";
import { layModel } from "../chat/model.js";
import { HE_SO_TE, quyDonViNho, teCuaThiTruong } from "../pos/index.js";

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
  // MỘT BẢN (CR-02-10 · MB2): mọi page là của MỘT bot — không còn điều kiện «đã giao cho bot
  // mới chưa». Bật/tắt là cột `bot_ai_bat`, và chính hàm này là cổng trước khi bật.
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
    runtime: "v3",
    enabled: botDangTraLoi(p),
    blockers,
    luuY,
    dienTap,
    // `ready` = sẵn sàng PHỤC VỤ KHÁCH. Ở chế độ diễn tập nó vẫn có thể `true` mà không
    // một tin nào bay ra — nên màn phải đọc kèm `dienTap`, đừng đọc mỗi chữ «sẵn sàng».
    ready: blockers.length === 0,
    note: "Kiểm tra cấu hình; chưa xác nhận worker đang sống hoặc kết nối bên ngoài.",
  };
}
/**
 * GL2 — TRẦN SỐ PAGE BẬT BOT TOÀN HỆ (`V3_TRAN_PAGE_BAT`, vắng = 0). Chạy TRONG giao dịch của `setPage`, SAU `pageStatus`
 * (lỗi cấu hình nói trước lỗi trần) và chỉ ở chiều BẬT — tắt không bao giờ bị trần chặn.
 *
 * Khoá tư vấn TOÀN HỆ trước khi đếm: hai lượt bật song song (hai page, hai team) xếp hàng ở đây; lượt sau đếm SAU khi lượt
 * trước COMMIT — đúng vì `transaction()` chạy READ COMMITTED (mỗi câu một ảnh chụp mới; REPEATABLE READ sẽ đếm bằng ảnh chụp
 * cũ và cả hai cùng lọt). Khoá dòng page lấy trước, khoá tư vấn chỉ một ⇒ không có vòng chờ.
 * Đếm bằng ĐÚNG hàm nguồn của worker (`dsPageBotTraLoi`, không kẹp team); page này đã bật thì không tính chính nó.
 */
async function kiemTranPageBat(c, p, env) {
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [KHOA_TRAN_PAGE_BAT]);
  const dangBat = await dsPageBotTraLoi(c);
  const khac = dangBat.filter((pid) => pid !== String(p.page_id)).length;
  if (vuotTran(khac + 1, tranPageBat(env))) {
    // Câu nói số THẬT đang bật (kể cả chính page này nếu nó đã bật — gạt lại khi đang vượt cũng bị chặn, và phải nói đúng số).
    throw fault(
      `Vượt trần page bật bot TOÀN HỆ: ${cauSoTran(dangBat.length, env)}. Tắt bớt một page đang bật `
        + "(có thể ở team khác) hoặc nhờ quản trị hệ thống nâng trần, rồi bật lại.",
      409,
    );
  }
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
    if (input.version && input.version !== p.version)
      throw fault("Cấu hình đã đổi; tải lại trước khi lưu", 409);
    if (input.source && input.source !== p.nguon_tin) {
      if (botDangTraLoi(p))
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
      await kiemTranPageBat(c, p, env);
    }
    const r = await c.query(
      `UPDATE page SET bot_ai_bat=COALESCE($3,bot_ai_bat),nguon_tin=COALESCE($4,nguon_tin),sua_luc=now()
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
/**
 * TT1b (đối kháng TT1 F1): bậc giá của MÓN POS phải mang đúng tệ thị trường của shop món. 01 §8 «1 shop POS = 1 thị trường»; POS ghi
 * `shipping_fee` theo tệ của shop, và bot lấy tệ ĐƠN từ chính bậc (`src/orders/draft.js` currency = tệ bậc) nên không cửa nào sau
 * chỗ này còn hỏi «shop bán bằng tệ gì» ngoài `taoDon` cửa (b) — tức lúc khách đã nghe giá sai. Với MÓN POS, chặn ở đây là chặn TRƯỚC
 * khi bot nói (bản sao `kb` theo page KHÔNG được soát — xem cuối khối).
 * · `offers` rỗng (xoá hết bậc) ⇒ không có tệ nào để sai ⇒ cho qua — kể cả khi shop mất kết nối: đó là đường DUY NHẤT gỡ bậc sai
 *   của một món như vậy (/code-review TT1b #3);
 * · shop = phần trước dấu `:` đầu tiên của `san_pham.ma` (`<shop_id>:<biến thể>` — đúng `split_part(ma, ':', 1)` của
 *   san-pham-goc.js / chuyen-ban-sao.js); mã không có `:` hoặc phần trước rỗng ⇒ 400 «không mang mã shop»;
 * · tra `ket_noi_pos` theo CẶP (team của món, shop) — `UNIQUE(team_id, shop_id)` cho đúng một dòng; KHÔNG `shop_id` trơn (shop dùng
 *   chung nhiều team) và KHÔNG lọc `bat`: thị trường là thuộc tính của shop, kết nối tạm tắt không được khoá việc sửa giá (cùng câu
 *   tra của đối soát GSP3 `chuyen-ban-sao.js#docDonViTho`);
 * · không có kết nối / thị trường ngoài `TIEN_TE_THI_TRUONG` (tra qua `teCuaThiTruong` — một luật với `taoDon`) ⇒ 400 nói rõ
 *   (fail-closed, không đoán tệ);
 * · MỌI bậc gửi lên được soát; lời từ chối chỉ in mã tệ đã qua `HE_SO_TE` (vòng kiểm trên) và tên thị trường đã qua bảng.
 * Món `nguon='kb'` (bản sao theo page) KHÔNG qua hàm này — đường đó bị cắt ở GSP4.
 */
async function kiemTeThiTruong(c, teamId, p, offers) {
  if (!offers.length) return;
  const ma = String(p.ma ?? "");
  const shop = ma.includes(":") ? ma.slice(0, ma.indexOf(":")) : "";
  if (!shop)
    throw fault(`Món POS #${p.id} không mang mã shop («<shop>:<biến thể>») — không biết shop bán bằng tiền tệ nào, chưa lưu được giá`);
  const kn = (await c.query("SELECT market FROM ket_noi_pos WHERE team_id = $1 AND shop_id = $2", [teamId, shop])).rows[0];
  if (!kn)
    throw fault(`Món POS của shop ${shop} chưa có kết nối POS trong team này — không biết shop bán bằng tiền tệ nào, chưa lưu được giá (thêm kết nối ở màn Kết nối)`);
  const te = teCuaThiTruong(kn.market);
  if (!te)
    throw fault(`Shop ${shop} nối thị trường ${JSON.stringify(String(kn.market).slice(0, 40))} chưa có trong bảng tiền tệ của hệ — chưa lưu được giá (báo kỹ thuật thêm thị trường)`);
  const sai = offers.find((g) => g.tien_te !== te);
  if (sai)
    throw fault(`Bậc giá dùng ${sai.tien_te} nhưng shop ${String(kn.market).trim()} bán bằng ${te} — nhập giá bằng ${te} (hệ không quy đổi tiền tệ)`);
}
/**
 * Lưu MỘT sản phẩm + toàn bộ bậc giá.
 *
 * CR-28-09b (luật một nguồn): `sauKhiLuu(c, bc, id)` chạy TRONG giao dịch, sau khi đã ghi —
 * nơi gọi truyền bước đẩy bản chép sang bot v1. Nó ném ⇒ ROLLBACK: lượt lưu KHÔNG thành, và
 * người dùng nhận lỗi. Không bao giờ có cảnh «đã lưu» mà bot vẫn chạy bản cũ.
 *
 * Tên được phép RỖNG (28/09): đo prod 75/79 sản phẩm bot đang bán không có tên — bắt buộc
 * tên là khoá chết việc sửa giá của chúng. `nhan` (tên bậc khách đọc) và `bien_the` vắng mặt
 * trong thân yêu cầu ⇒ GIỮ giá trị cũ, không xoá: màn cũ không biết hai trường này.
 */
/**
 * `chiGia` (VE8b · màn Sản phẩm › Theo thị trường): CHỈ thay bậc giá — không đụng tên/mô tả/hết hàng, và đặt `gia_tay`
 * thay vì `cau_hinh_tay`: lượt kéo POS thôi ghi đè GIÁ nhưng vẫn cập nhật tên + hết hàng (bot không chào món đã hết).
 */
export async function saveProduct(pool, bc, id, input, { sauKhiLuu = null, chiGia = false } = {}) {
  idOf(id);
  if (
    (!chiGia && (
      typeof input.ten !== "string" ||
      input.ten.length > 300 ||
      (input.bien_the !== undefined && (typeof input.bien_the !== "string" || input.bien_the.length > 200)) ||
      typeof input.mo_ta !== "string" ||
      input.mo_ta.length > 12000 ||
      typeof input.het_hang !== "boolean")) ||
    !Array.isArray(input.offers) ||
    input.offers.length > 30 ||
    !input.version
  )
    throw fault("Tên, mô tả hoặc gói giá không hợp lệ");
  const quantities = new Set();
  // TT1 (05/10): quy đơn vị qua MỘT luật `quyDonViNho` (tao-don.js) — giá, giá gốc, phí ship. Số không chia hết đơn vị nhỏ
  // của tệ ⇒ TỪ CHỐI rõ, không làm tròn ngầm: hệ 1 (TWD/JPY không xu) ⇒ 990,5 TWD bị từ chối; hệ 100 ⇒ 49,999 EUR bị từ chối.
  // Trước TT1 `gia_goc`/`phi_ship` qua `Math.round` ngầm (49,999 ⇒ 5000; với hệ 1 thì 990,5 ⇒ 991) — nay cùng luật với `gia`.
  // Lời từ chối chỉ in SỐ đã ép kiểu (không vọng lại chuỗi thô người gửi) và mã tệ đã qua bảng.
  const loiLe = (v, te, o) => fault(!Number.isFinite(Number(v)) ? `${o} không phải số`
    : HE_SO_TE[te] === 1
      ? `${o} ${Number(v)} ${te} có phần lẻ — POS không có xu cho ${te} (lưu theo đơn vị 1 ${te}); nhập số nguyên`
      : `${o} ${Number(v)} ${te} lẻ quá đơn vị nhỏ POS (1/${HE_SO_TE[te]} ${te}); nhập tối đa ${String(HE_SO_TE[te]).length - 1} chữ số thập phân`);
  const quy = [];   // số ĐÃ quy (đơn vị nhỏ) của từng bậc — INSERT dùng lại, không quy lần hai (/code-review TT1 #9)
  for (const g of input.offers) {
    if (
      !Number.isInteger(g.so_luong) ||
      g.so_luong < 1 ||
      g.so_luong > 10000 ||
      quantities.has(g.so_luong) ||
      !Object.hasOwn(HE_SO_TE, g.tien_te) ||
      typeof g.price !== "number" ||
      !Number.isFinite(g.price) ||
      g.price <= 0 ||
      g.price > 1e9
    )
      throw fault(
        "Gói giá phải có số lượng duy nhất, giá dương và tiền tệ được hỗ trợ",
      );
    const nho = { gia: quyDonViNho(g.price, g.tien_te), gia_goc: null, phi_ship: null };
    if (nho.gia == null || nho.gia < 1) throw loiLe(g.price, g.tien_te, "Giá");
    for (const [k, o] of [["gia_goc", "Giá gốc"], ["phi_ship", "Phí ship"]]) {
      if (g[k] == null || g[k] === "") continue;
      nho[k] = quyDonViNho(g[k], g.tien_te);
      if (nho[k] == null) throw loiLe(g[k], g.tien_te, o);
    }
    quy.push(nho);
    if (g.nhan !== undefined && (typeof g.nhan !== "string" || g.nhan.length > 160))
      throw fault("Tên bậc giá quá dài (tối đa 160 ký tự)");
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
    // TT1b: món POS — tệ của MỌI bậc = tệ thị trường shop (cả đường đầy đủ lẫn chỉ-giá); ném TRƯỚC mọi câu ghi ⇒ 0 ghi.
    if (p.nguon === "pos") await kiemTeThiTruong(c, bc.teamId, p, input.offers);
    const bienThe = chiGia || input.bien_the === undefined ? p.bien_the ?? "" : input.bien_the.trim();
    if (chiGia) {
      await c.query("UPDATE san_pham SET gia_tay=true,sua_luc=now() WHERE team_id=$1 AND id=$2", [bc.teamId, id]);
    } else {
      await c.query(
        "UPDATE san_pham SET ten=$3,mo_ta=$4,het_hang=$5,bien_the=$6,cau_hinh_tay=true,sua_luc=now() WHERE team_id=$1 AND id=$2",
        [bc.teamId, id, input.ten.trim(), input.mo_ta, input.het_hang, bienThe],
      );
    }
    // GD5 · 25/09: chụp GÓI GIÁ CŨ trước khi xoá. Nhật ký cũ chỉ ghi tên cột («goi_gia»),
    // nên sau một lượt sửa giá không ai dựng lại được giá cũ là bao nhiêu — mà đây đúng là
    // con số khách trả. Gói giá được XOÁ rồi CHÈN LẠI, nên không chụp trước là mất hẳn.
    const giaCu = (
      await c.query(
        `SELECT so_luong, gia, tien_te, gia_goc, khuyen_mai, phi_ship, mien_ship, bat, nhan
           FROM goi_gia WHERE team_id=$1 AND san_pham_id=$2 ORDER BY so_luong`,
        [bc.teamId, id],
      )
    ).rows;
    const nhanCu = new Map(giaCu.map((g) => [Number(g.so_luong), g.nhan || ""]));
    await c.query("DELETE FROM goi_gia WHERE team_id=$1 AND san_pham_id=$2", [
      bc.teamId,
      id,
    ]);
    for (const [i, g] of input.offers.entries())
      await c.query(
        `INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,
                             gia_goc,khuyen_mai,phi_ship,mien_ship,bat,nhan)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          bc.teamId,
          id,
          g.so_luong,
          quy[i].gia,
          g.tien_te,
          // Ưu đãi (021). Cùng đơn vị NHỎ với `gia` — quy hệ số tệ đúng một lần, ở vòng kiểm trên (TT1 `quyDonViNho`).
          quy[i].gia_goc,
          String(g.khuyen_mai ?? "").slice(0, 300),
          quy[i].phi_ship,
          // `mien_ship` giữ ba trạng thái: chưa khai (null) · miễn (true) · KHÔNG miễn
          // (false). Quy null thành false ở đây là thay người vận hành hứa một điều họ
          // chưa khai — chỗ này cấm tiện tay.
          g.mien_ship == null || g.mien_ship === "" ? null : !!g.mien_ship,
          g.bat === false ? false : true,
          // Tên bậc KHÁCH ĐỌC (025). Vắng ⇒ giữ tên cũ của cùng số lượng — xoá nó là đổi
          // lời bot nói với khách chỉ vì một màn không biết cột này.
          g.nhan === undefined ? nhanCu.get(g.so_luong) ?? "" : g.nhan.trim(),
        ],
      );
    const giaMoi = (
      await c.query(
        `SELECT so_luong, gia, tien_te, gia_goc, khuyen_mai, phi_ship, mien_ship, bat, nhan
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
      truoc: chiGia ? { goi_gia: giaCu } : { ten: p.ten, mo_ta: p.mo_ta, het_hang: p.het_hang, bien_the: p.bien_the ?? "", goi_gia: giaCu },
      sau: chiGia ? { goi_gia: giaMoi, cot: ["goi_gia"] } : {
        ten: input.ten.trim(), mo_ta: input.mo_ta, het_hang: input.het_hang, bien_the: bienThe,
        goi_gia: giaMoi,
        cot: ["ten", "mo_ta", "het_hang", "bien_the", "goi_gia"],
      },
    });
    // Đẩy sang bot TRONG giao dịch — ném là ROLLBACK (xem đầu hàm).
    const dongBo = sauKhiLuu ? await sauKhiLuu(c, bc, id) : null;
    return { saved: true, dongBo };
  });
}
