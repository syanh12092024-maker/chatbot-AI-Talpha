// LƯU SẢN PHẨM TRÊN v3 ⇒ BOT CHẠY ĐÚNG THẾ, HOẶC LƯU KHÔNG THÀNH (CR-28-09b · MN3).
//
// Luật một nguồn (01-QUYET-DINH §8): mỗi lượt lưu hoặc có hiệu lực với bot ngay, hoặc báo lỗi —
// không bao giờ «đã lưu» mà bot vẫn chạy bản cũ. Bộ ca canh bốn chỗ luật đó có thể gãy:
//   ① bộ dựng bản chép (v3 → hình dạng bot v1) mất chữ khách đọc (nhãn bậc, nhãn ảnh)
//   ② lượt lưu vẫn thành khi bước đẩy sang bot hỏng
//   ③ bot nhận rồi cất khác đi (vòng khứ hồi qua CHÍNH `kb.js` của bot)
//   ④ bot ghi đĩa hỏng mà vẫn báo xong
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Bot v1 thật (`kb.js`) đọc/ghi một tệp TẠM. ⚠️ Đặt biến TRƯỚC MỌI module của dự án, và nạp
// chúng bằng `import()` động: `import` tĩnh chạy trước thân tệp, và `operations.js` kéo
// `kb.js` theo đường bắc cầu — bản đầu của tệp này đã ghi một page giả vào tệp thật như thế.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mn3-"));
process.env.KB_OVERRIDES_FILE = path.join(TMP, "kb-overrides.json");
const kb = await import("../src/kb.js");
const { dungSandbox } = await import("../db/sandbox.js");
const { sanPhamChoBot, dungSanPhamChoBot, idChoBot, dayPageSangBot, pageBanSanPham } =
  await import("../src/products/ban-chep-bot.js");
const { saveProduct } = await import("../src/admin-v3/operations.js");
const { taoBuocDayBot } = await import("../v3/src/ui/van-hanh/router.js");
const { soBanChep } = await import("../v3/src/noi-day/loi-bot.js");
assert.equal(kb.getPageProductsRaw("khong-co").length, 0);

const spMau = (o = {}) => ({
  ma: "kb:111:SP01", ten: "", mo_ta: "Vòng tay", bien_the: "Vàng", het_hang: false,
  goiGia: [
    { so_luong: 1, gia: "19900", tien_te: "AED", nhan: "" },
    { so_luong: 2, gia: "29900", tien_te: "AED", nhan: "Buy 1 Get 1 FREE (Total 2 Products)" },
  ],
  anh: [
    { duong: "https://content.pancake.vn/a.jpg", nhan: "Ảnh sản phẩm" },
    { duong: "/uploads/111-SP01-1.jpg", nhan: "Feedback khách" },
  ],
  ...o,
});

test("BC1 · bộ dựng giữ NGUYÊN chữ khách đọc: nhãn bậc, nhãn ảnh, id cũ; giá về đơn vị lớn", () => {
  const p = sanPhamChoBot(spMau());
  assert.deepEqual(p, {
    id: "SP01", name: "", desc: "Vòng tay", variant: "Vàng",
    tiers: [{ label: "Buy 1", price: 199 }, { label: "Buy 1 Get 1 FREE (Total 2 Products)", price: 299 }],
    currency: "AED",
    images: [
      { url: "https://content.pancake.vn/a.jpg", label: "Ảnh sản phẩm" },
      { url: "/uploads/111-SP01-1.jpg", label: "Feedback khách" },
    ],
  });
  assert.equal(idChoBot("1328:abc-var"), "1328:abc-var", "mã POS giữ nguyên");
});

test("BC2 · món HẾT HÀNG không ra bản chép (bot v1 không biết hết hàng); món rỗng bị bỏ", () => {
  const ds = dungSanPhamChoBot([
    spMau(),
    spMau({ ma: "kb:111:SP02", het_hang: true }),
    spMau({ ma: "kb:111:SP03", mo_ta: "", goiGia: [], anh: [] }),
  ]);
  assert.deepEqual(ds.map((p) => p.id), ["SP01"]);
});

test("BC3 · vòng khứ hồi qua CHÍNH kb.js của bot: gửi gì, bot cất và đọc ra đúng thế", () => {
  const gui = dungSanPhamChoBot([spMau(), spMau({ ma: "kb:111:SP02", ten: "Nhẫn", bien_the: "" })]);
  const r = kb.updatePageProducts("111", gui);
  assert.equal(r.ok, true);
  assert.equal(soBanChep(gui, kb.getPageProductsRaw("111")), "", "bot phải giữ ĐÚNG bản đã gửi");
  const trenDia = JSON.parse(fs.readFileSync(process.env.KB_OVERRIDES_FILE, "utf8"));
  assert.equal(trenDia["111"].products[1].tiers[1].label, "Buy 1 Get 1 FREE (Total 2 Products)");
});

test("BC4 · phép so bản chép BẮT được lệch nhãn bậc, lệch ảnh, lệch số món", () => {
  const gui = dungSanPhamChoBot([spMau()]);
  const sai = (f) => { const b = structuredClone(gui); f(b); return soBanChep(gui, b); };
  assert.match(sai((b) => { b[0].tiers[1].label = "Buy 2"; }), /bậc giá/);
  assert.match(sai((b) => { b[0].images[0].label = "Feedback"; }), /ảnh 1/);
  assert.match(sai((b) => { b[0].images.pop(); }), /số ảnh/);
  assert.match(sai((b) => { b.pop(); }), /số sản phẩm/);
  // bot tự ghép gốc công khai vào đường `/uploads/…` — đó KHÔNG phải lệch
  assert.equal(sai((b) => { b[0].images[1].url = "http://x:3100/uploads/111-SP01-1.jpg"; }), "");
});

test("BC5 · bot ghi đĩa HỎNG thì kb.js NÉM, không báo xong (trước 28/09 nó nuốt lỗi)", async () => {
  const cu = process.env.KB_OVERRIDES_FILE;
  // Nạp một bản kb.js RIÊNG trỏ vào thư mục không tồn tại.
  process.env.KB_OVERRIDES_FILE = path.join(TMP, "khong-co-thu-muc", "kb.json");
  const kbHong = await import(`../src/kb.js?hong=${Date.now()}`);
  process.env.KB_OVERRIDES_FILE = cu;
  assert.throws(() => kbHong.updatePageProducts("111", dungSanPhamChoBot([spMau()])));
});

// ─── CSDL thật: lượt lưu và bước đẩy trong CÙNG giao dịch ──────────────────────────────
let sb, pool, team, trang, sp;
const bc = () => ({ teamId: team, nguoiDungId: null, vai: ["quan-tri"] });
const q = (s, p) => pool.query(s, p);
const version = async () => (await q("SELECT xmin::text v FROM san_pham WHERE id=$1", [sp])).rows[0].v;
const dauVao = async (o = {}) => ({
  ten: "", mo_ta: "Vòng tay", het_hang: false, version: await version(),
  offers: [{ so_luong: 2, tien_te: "AED", price: 299 }],
  ...o,
});

before(async () => {
  sb = await dungSandbox("mn3");
  pool = sb.pool;
  team = (await q("INSERT INTO team(slug,ten) VALUES('mn3','MN3') RETURNING id")).rows[0].id;
  trang = (await q("INSERT INTO page(team_id,page_id,ten) VALUES($1,'111','Page') RETURNING *", [team])).rows[0];
  sp = (await q("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta) VALUES($1,$2,'kb:111:SP01','','cũ') RETURNING id", [team, trang.id])).rows[0].id;
  await q(`INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan)
           VALUES($1,$2,2,29900,'AED','Buy 1 Get 1 FREE (Total 2 Products)')`, [team, sp]);
});
after(async () => { await sb.don(); fs.rmSync(TMP, { recursive: true, force: true }); });

test("BC6 · bước đẩy HỎNG ⇒ lượt lưu KHÔNG thành: CSDL giữ nguyên bản cũ", async () => {
  const buoc = taoBuocDayBot({ day: async () => { throw new Error("bot không trả lời"); }, env: {} });
  await assert.rejects(async () => saveProduct(pool, bc(), sp, { ...(await dauVao()), mo_ta: "MỚI" }, { sauKhiLuu: buoc }),
    (e) => e.status === 502);
  assert.equal((await q("SELECT mo_ta FROM san_pham WHERE id=$1", [sp])).rows[0].mo_ta, "cũ");
});

test("BC7 · chưa nối cửa đẩy ⇒ TỪ CHỐI lưu (503), không lưu im lặng", async () => {
  const buoc = taoBuocDayBot({ day: null, env: {} });
  await assert.rejects(async () => saveProduct(pool, bc(), sp, await dauVao(), { sauKhiLuu: buoc }), (e) => e.status === 503);
});

test("BC8 · lưu thành ⇒ bot nhận ĐÚNG bản mới; màn cũ không gửi `nhan` thì tên bậc GIỮ nguyên", async () => {
  let nhan = null;
  const buoc = taoBuocDayBot({ day: async (pid, products) => { nhan = { pid, products }; }, env: {} });
  const r = await saveProduct(pool, bc(), sp, { ...(await dauVao()), mo_ta: "Vòng tay mới" }, { sauKhiLuu: buoc });
  assert.equal(r.dongBo.ok, true);
  assert.equal(nhan.pid, "111");
  assert.deepEqual(nhan.products[0].tiers, [{ label: "Buy 1 Get 1 FREE (Total 2 Products)", price: 299 }]);
  assert.equal(nhan.products[0].desc, "Vòng tay mới");
});

test("BC9 · máy khoá ghi (cua_ghi_dong) + ráp prompt từ CSDL ⇒ cho lưu, KÈM ghi chú; thiếu cờ ⇒ từ chối", async () => {
  const khoa = async () => { const e = new Error("Cửa ghi sang tiến trình bot đang ĐÓNG"); e.ma = "cua_ghi_dong"; throw e; };
  const r = await saveProduct(pool, bc(), sp, await dauVao(),
    { sauKhiLuu: taoBuocDayBot({ day: khoa, env: { V3_RAP_PROMPT_BAT: "1" } }) });
  assert.equal(r.dongBo.ok, false);
  assert.match(r.dongBo.ghiChu, /ĐÓNG/);
  await assert.rejects(() => (async () => saveProduct(pool, bc(), sp, await dauVao(),
    { sauKhiLuu: taoBuocDayBot({ day: khoa, env: {} }) }))());
});

test("BC10 · page CHƯA có sản phẩm v3 ⇒ KHÔNG đẩy (đẩy rỗng là xoá sạch thứ bot đang bán)", async () => {
  const trong = (await q("INSERT INTO page(team_id,page_id,ten) VALUES($1,'222','Trống') RETURNING *", [team])).rows[0];
  let goi = 0;
  const r = await dayPageSangBot(pool, team, trong, async () => { goi += 1; });
  assert.deepEqual({ goi, daDay: r.daDay, lyDo: r.lyDo }, { goi: 0, daDay: false, lyDo: "page_chua_co_san_pham_v3" });
  assert.deepEqual((await pageBanSanPham(pool, team, sp)).map((p) => p.page_id), ["111"]);
});
