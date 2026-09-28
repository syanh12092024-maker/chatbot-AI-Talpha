// NẠP MỘT LƯỢT `kb-overrides.json` → CSDL v3 (CR-28-09b · MN2).
//
// ─── VÌ SAO ────────────────────────────────────────────────────────────────────────────
// Đo prod 28/09: bảng `san_pham`/`goi_gia` của v3 RỖNG, còn bot bán 77 page — tất cả lấy từ
// `kb-overrides.json` (Sheet cấp 0 page). Luật một nguồn chuyển chỗ ghi sang CSDL v3, nên dữ
// liệu phải sang TRƯỚC — nếu không, lượt lưu đầu tiên trên v3 đẩy một bản gần rỗng sang bot.
//
// ─── LUẬT CỦA LƯỢT NẠP: CHÉP, KHÔNG SỬA ───────────────────────────────────────────────
// Nạp y nguyên thứ bot đang chạy, kể cả thứ trông sai (ảnh link chết, sản phẩm tên rỗng, bậc
// giá nhãn lạ). Sửa nội dung là việc của người trên màn, sau khi nó đã nằm ở chỗ sửa được.
// Thứ trông sai thì BÁO ra (`canhBao`), không tự vá.
//
// ─── BẰNG CHỨNG TRƯỚC KHI GHI: VÒNG KHỨ HỒI ───────────────────────────────────────────
// Với mỗi page: dựng các dòng v3 → chạy CHÍNH bộ sinh bản chép (`ban-chep-bot.js`) → so
// với thứ bot đang giữ bằng CHÍNH phép so của cửa đẩy (`soBanChep`). Khớp hết mới được ghi:
// nghĩa là ngay sau lượt nạp, lượt lưu đầu tiên trên v3 không đổi một chữ nào bot nói ngoài
// chữ người vừa sửa.
import { productTiers } from "../kb.js";
import { config } from "../config.js";
import { HE_SO_TE } from "../pos/tao-don.js";
import { sanPhamChoBot, soBanChep } from "./ban-chep-bot.js";

/**
 * SỐ LƯỢNG cho từng bậc — `goi_gia` cần một số nguyên duy nhất, tăng dần theo thứ tự bậc.
 * Đọc từ nhãn: «(Total 4 Products)» thắng, không thì số đầu tiên («2 Pairs», «𝐁𝐮𝐲 𝟏»).
 * Dãy đọc được mà KHÔNG tăng ngặt (hai bậc cùng số, hoặc lùi) ⇒ dùng 1..n và BÁO: thứ tự
 * bậc là thứ khách thấy, còn số lượng chỉ là khoá — giữ thứ tự quan trọng hơn đoán số.
 */
export function soLuongTuNhan(nhan = []) {
  const doc = nhan.map((n) => {
    const s = String(n || "").normalize("NFKC");
    const tong = /total\s*(\d+)/i.exec(s);
    const dau = /(\d+)/.exec(s);
    return Number((tong || dau || [])[1]) || null;
  });
  const tang = doc.every((x, i) => x && x >= 1 && (i === 0 || x > doc[i - 1]));
  return tang ? { soLuong: doc, duPhong: false } : { soLuong: nhan.map((_, i) => i + 1), duPhong: true };
}

/**
 * Id KHÔNG TRÙNG cho từng sản phẩm của một page, theo thứ tự. Đo 28/09: 2 page có hai sản
 * phẩm cùng `SP01` — bot tra `find(id)` nên bản sau KHÔNG BAO GIỜ gửi được ảnh. `san_pham.ma`
 * là khoá duy nhất, nên bản thứ n đổi thành `<id>-<n>`. Lượt khứ hồi dùng CHÍNH hàm này cho
 * phía bot, nên chỗ đổi ấy hiện ra như một cảnh báo, không bị che.
 */
export function idKhongTrung(dsV1 = []) {
  const dem = new Map();
  return dsV1.map((p) => {
    const id = String(p.id || "").trim() || "SP01";
    const n = (dem.get(id) || 0) + 1;
    dem.set(id, n);
    return n === 1 ? id : `${id}-${n}`;
  });
}

/**
 * Ảnh của một sản phẩm v1 — đọc THÔ, không qua `productImages` (hàm đó ghép `PUBLIC_URL` vào
 * đường tương đối). Ảnh nằm trên chính máy mình (`/uploads/…`, hoặc tuyệt đối trỏ về
 * `PUBLIC_URL/uploads/…`) được lưu dạng TƯƠNG ĐỐI: đo 28/09 có 43 ảnh trỏ `…:3100/uploads/…`
 * mà cổng 3100 đã đóng — lưu tương đối thì đổi `PUBLIC_URL` một lần là cả 43 ảnh sống lại.
 */
export function anhTho(p, goc = config.publicUrl) {
  const ds = Array.isArray(p.images) && p.images.length
    ? p.images.map((im) => ({ url: String(im.url || "").trim(), label: String(im.label || "").trim() }))
    : (p.image ? [{ url: String(p.image).trim(), label: "Ảnh sản phẩm" }] : []);
  const tienTo = goc ? `${String(goc).replace(/\/+$/, "")}/uploads/` : null;
  return ds.filter((im) => im.url).map((im) => ({
    url: tienTo && im.url.startsWith(tienTo) ? `/uploads/${im.url.slice(tienTo.length)}` : im.url,
    label: im.label,
  }));
}

/** Một page của `kb-overrides.json` → kế hoạch các dòng v3 + cảnh báo. KHÔNG chạm CSDL. */
export function keHoachPage(pageId, dsV1 = []) {
  const canhBao = [];
  const sanPham = [];
  const ids = idKhongTrung(dsV1);
  for (const [i, p] of dsV1.entries()) {
    const id = ids[i];
    const idGoc = String(p.id || "").trim() || "SP01";
    if (id !== idGoc) canhBao.push(`${pageId}/${idGoc}: id trùng trong page — bản này đổi thành ${id} (trước nay bot chỉ tìm thấy bản đầu)`);
    const tien = String(p.currency || "AED").trim().toUpperCase();
    const he = HE_SO_TE[tien];
    const bac = productTiers(p);
    const { soLuong, duPhong } = soLuongTuNhan(bac.map((t) => t.label));
    if (duPhong && bac.length) canhBao.push(`${pageId}/${id}: không đọc được số lượng tăng dần từ nhãn bậc — dùng 1..${bac.length}`);
    if (!bac.length && tien !== "AED") {
      canhBao.push(`${pageId}/${id}: KHÔNG có bậc giá — tiền tệ «${tien}» không có chỗ giữ, bản chép sẽ ghi AED (get_price trả tiền tệ cạnh bảng giá RỖNG)`);
    }
    if (bac.length && !he) { canhBao.push(`${pageId}/${id}: tiền tệ lạ «${tien}» — bỏ sản phẩm`); continue; }
    const goi = bac.map((t, i) => {
      const gia = t.price * he;
      if (Math.abs(gia - Math.round(gia)) > 1e-6) canhBao.push(`${pageId}/${id}: giá ${t.price} ${tien} không chia hết đơn vị nhỏ — làm tròn`);
      return { so_luong: soLuong[i], gia: Math.round(gia), tien_te: tien, nhan: t.label };
    });
    const anh = [];
    for (const a of anhTho(p)) {
      if (anh.some((x) => x.duong === a.url)) { canhBao.push(`${pageId}/${id}: ảnh trùng đường — bỏ bản sau`); continue; }
      anh.push({ duong: a.url, nhan: a.label });
    }
    if (!String(p.name || "").trim()) canhBao.push(`${pageId}/${id}: sản phẩm KHÔNG có tên — bot không gọi được tên món`);
    sanPham.push({
      ma: `kb:${pageId}:${id}`,
      ten: String(p.name || "").trim(),
      mo_ta: String(p.desc || "").trim(),
      bien_the: String(p.variant || "").trim(),
      tienTeGoc: tien,
      goi,
      anh,
    });
  }
  return { pageId: String(pageId), sanPham, canhBao };
}

/**
 * Vòng khứ hồi: kế hoạch → bộ sinh bản chép → so với bot. '' = khớp.
 * Bot đọc gì thì so đúng thứ đó: `productTiers`/`productImages` của CHÍNH `kb.js`.
 */
export function kiemKhuHoi(keHoach, dsV1 = []) {
  const gia = keHoach.sanPham.map((s) => sanPhamChoBot({
    ma: s.ma, ten: s.ten, mo_ta: s.mo_ta, bien_the: s.bien_the, het_hang: false,
    goiGia: s.goi, anh: s.anh,
  }));
  // Món không có giá thì bộ sinh lấy «AED» làm tiền tệ; bot vẫn giữ tiền tệ khai sẵn. Tiền
  // tệ chỉ được in CẠNH giá, nên món không giá không nói nó ra — so như bot so: bỏ qua.
  for (let i = 0; i < gia.length; i += 1) if (!gia[i].tiers.length) gia[i].currency = keHoach.sanPham[i].tienTeGoc;
  const ids = idKhongTrung(dsV1);
  const bot = dsV1
    .map((p, i) => ({
      id: ids[i],
      name: String(p.name || "").trim(),
      desc: String(p.desc || "").trim(),
      variant: String(p.variant || "").trim(),
      currency: String(p.currency || "AED").trim().toUpperCase(),
      tiers: productTiers(p),
      images: anhTho(p, null).map((im) => ({ url: im.url, label: im.label })),
    }))
    .filter((p) => p.name || p.desc || p.tiers.length || p.images.length);
  return soBanChep(gia.filter((p) => p.name || p.desc || p.tiers.length || p.images.length), bot);
}

/**
 * GHI kế hoạch của một page vào CSDL (trong giao dịch của nơi gọi).
 * Page ĐÃ có sản phẩm v3 ⇒ KHÔNG ghi, trả `daCo` — nạp hai lần là nhân đôi danh mục.
 */
export async function ghiKeHoach(c, teamId, trang, keHoach) {
  const co = await c.query("SELECT count(*)::int n FROM san_pham WHERE team_id=$1 AND page_id=$2", [teamId, trang.id]);
  if (co.rows[0].n) return { daCo: true, sanPham: 0, bac: 0, anh: 0 };
  let bac = 0; let anh = 0;
  for (const s of keHoach.sanPham) {
    const sp = (await c.query(
      `INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta,bien_the,nguon,cau_hinh_tay)
       VALUES($1,$2,$3,$4,$5,$6,'kb',true) RETURNING id`,
      [teamId, trang.id, s.ma, s.ten, s.mo_ta, s.bien_the],
    )).rows[0].id;
    for (const g of s.goi) {
      await c.query(
        "INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,$3,$4,$5,$6)",
        [teamId, sp, g.so_luong, g.gia, g.tien_te, g.nhan],
      );
      bac += 1;
    }
    for (let i = 0; i < s.anh.length; i += 1) {
      await c.query(
        "INSERT INTO anh_san_pham(team_id,san_pham_id,duong,nhan,thu_tu,nguon) VALUES($1,$2,$3,$4,$5,'kb')",
        [teamId, sp, s.anh[i].duong, s.anh[i].nhan, i],
      );
      anh += 1;
    }
  }
  return { daCo: false, sanPham: keHoach.sanPham.length, bac, anh };
}
