#!/usr/bin/env node
// CHẤM BỘ ĐỊNH TUYẾN Ý ĐỊNH — regex hiện tại vs model quyết định (Jev/Kev), trên cùng một
// bộ chuẩn dán nhãn tay. Không gọi model sinh chữ, không gửi gì cho khách.
//
// ═══ VÌ SAO ĐO CÁI NÀY ═════════════════════════════════════════════════════════════
// Lớp 0 đồng định tuyến bằng REGEX. Đo trên 146 tin khách thật: regex bắt 19,9%, và
// **17,8% tin GẦN TRÚNG mà trượt** — "mabkanonpo" (magkano), "parice" (price),
// "I need order". Mỗi tin trượt là một lượt gọi closer ~110đ thay vì 0đ bắn mẫu.
//
// Một model quyết định (Jev/Kev — trả `choice` kèm xác suất hiệu chuẩn) về lý thuyết
// vá đúng chỗ đó. Bộ này đo xem THẬT SỰ vá được bao nhiêu, và đổi lại sai bao nhiêu.
//
// ═══ HAI CON SỐ, KHÔNG PHẢI MỘT ════════════════════════════════════════════════════
// «Bắt được nhiều hơn» là nửa câu chuyện. Nửa kia là BẮN NHẦM: định tuyến một tin
// `khieu_nai` thành `tpl_price` là bắn bảng giá vào mặt người đang bức xúc vì chưa
// nhận hàng. Nên mọi bảng dưới đây tách BẮT ĐƯỢC khỏi BẮN NHẦM, và bắn nhầm được
// chia theo mức độ nguy hiểm.
//
// Chạy:
//   node ops/bin/do-dinh-tuyen.mjs <tin.json> <nhan-chuan.json>              # chấm regex
//   BO=jev JEV_KEY=... node ops/bin/do-dinh-tuyen.mjs ... --page <id>        # chấm Jev
//   BO=kev KEV_URL=http://127.0.0.1:8000 node ops/bin/do-dinh-tuyen.mjs ...  # chấm Kev tự host
import fs from "node:fs";

const [tepTin, tepNhan] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
if (!tepTin || !tepNhan) {
  console.error("Dùng: node ops/bin/do-dinh-tuyen.mjs <tin.json> <nhan-chuan.json>");
  process.exit(2);
}
// ⚠️ BỘ QUÉT che SĐT/email thành `<SĐT>`/`<EMAIL>` trước khi lưu (đúng, đó là dữ liệu
// người thật). Nhưng `HAS_PHONE` — cửa NHƯỜNG đứng đầu cả `fast-lane` lẫn `lop-tu-khoa`
// — bắt SỐ, không bắt chữ `<SĐT>`. Chấm trên dữ liệu đã che là chấm một cỗ máy KHÁC cái
// đang chạy: ở bản thật những tin đó đã bị nhường từ đầu. Trả lại một số giả có cùng
// HÌNH DẠNG để cửa đó bắn đúng như production.
const boChe = (t) => String(t)
  .replace(/<SĐT>/g, "0551234567")
  .replace(/<EMAIL>/g, "a@b.com");
const tin = JSON.parse(fs.readFileSync(tepTin, "utf8")).map(boChe);
const chuan = JSON.parse(fs.readFileSync(tepNhan, "utf8"));
const nhan = chuan.nhan;
if (tin.length !== nhan.length) {
  console.error(`LỆCH: ${tin.length} tin nhưng ${nhan.length} nhãn.`);
  process.exit(2);
}
const Y_DINH = Object.keys(chuan._y_dinh);

/** Ý định nào ĐƯỢC PHÉP bắn mẫu 0 đồng. Ngoài danh sách này thì phải lên AI/người. */
const CO_MAU = new Set(["gia", "ship", "dat_hang", "hang_that", "size", "im_lang"]);

/** Bắn nhầm NGUY HIỂM: tin cần người/luồng đơn mà lại bị bắn mẫu cứng. */
const NHAY_CAM = new Set(["khieu_nai", "cho_thong_tin", "chot", "hen_sau"]);

/* ─────────────── bộ định tuyến ① · REGEX đang chạy ─────────────── */
async function boRegex() {
  const { fastLane } = await import("../../src/fast-lane.js");
  const { lopTuKhoa } = await import("../../src/chat/lop-tu-khoa.js");
  // KB giả có đủ mẫu, để đo SỨC ĐỊNH TUYẾN của regex chứ không đo page thiếu mẫu.
  const kb = { config: {
    fastLanePrice: "giá", fastLaneShip: "ship", fastLaneHowto: "cách đặt",
    fastLaneAuth: "hàng thật", fastLaneSize: "size",
  }, products: [], text: "" };
  const LANE = {
    tpl_price: "gia", tpl_ship: "ship", tpl_howto: "dat_hang",
    tpl_greet: "im_lang", tpl_start: "im_lang",
    silent_greet: "im_lang", silent_thanks: "im_lang", silent_affirm: "im_lang",
    silent_sticker: "im_lang", silent_start: "im_lang", silent_start_botcake: "im_lang",
    silent_greet_botcake: "im_lang",
  };
  return (t) => {
    const k = lopTuKhoa({ text: t, kb });
    if (k?.handled) {
      const m = { that_gia: "hang_that", hoi_size: "size", howto: "dat_hang",
        paano_gap: "dat_hang", muon_dat: "dat_hang", hoi_ship: "ship", gia_sai_chinh_ta: "gia" };
      return { y: m[k.rule] || "khac", tin_cay: 1 };
    }
    const f = fastLane({ text: t, kb, aiTurns: 1, usedLanes: new Set(), pageId: "x" });
    if (f?.handled) return { y: LANE[f.lane] || "khac", tin_cay: 1 };
    return { y: "khac", tin_cay: 0 };   // không bắt được ⇒ đẩy lên AI
  };
}

/* ─────────────── bộ định tuyến ①b · REGEX NỚI (nhánh đối chứng) ───────────────
 *
 * VÌ SAO CÓ NHÁNH NÀY: regex hiện tại BẮN RẤT CHÍNH XÁC (92,3% lượt bắn là đúng) nhưng
 * bắt được ít. Đó là dấu hiệu của một bộ từ khoá viết HẸP, không phải của một bài toán
 * cần model. Mua model để chữa một regex viết sơ sài là mua nhầm.
 *
 * Nhánh này nới đúng ba ý yếu nhất — ship (3/29), dat_hang (0/12), im_lang (6/30) —
 * bằng từ vựng CHUNG của miền (giao hàng, đặt hàng, ậm ừ), KHÔNG chép từ chính bộ
 * chuẩn. Dù vậy vẫn có rủi ro vừa-khít-dữ-liệu: đây là 146 tin của MỘT page, và tôi
 * đã đọc chúng trước khi viết. Con số nó cho ra là CẬN TRÊN của regex, không phải
 * số sẽ gặp trên page khác.
 */
function boRegexNoi() {
  const SHIP = /(ship|deliver|delivery|courier|parcel|arrive|arriving|receiv|waiting|wait|when|what time|how long|how many days|next week|tomorrow|today|available|schedule|kailan|kelan|ilang araw|ilang days|dumating|darating|hintay|naghihintay|bukas|ngayon|araw|توصيل|متى|يصل)/i;
  const DAT = /(i (want|need|will|can|would like) (to )?order|place an order|mag ?order|umorder|magpaorder|pa ?order|paano|pano|pwede|puwede|puwidi|makaorder|maka order|i order|order po|try ko|gusto ko|sige order|اطلب|اشتري)/i;
  const AM_U = /^(ok(e|ey|ay)?|yes+|yeah|yup|sige|oo+|opo|noted|thank(s| you)?|salamat|welcome|wow|nice|good|fine|alright|hmm+|hm\?*|👍|❤️|😊)[\s.,!👍❤️😊]*$/i;
  const GIA = /(how ?much|magkano|mabkano|mgkano|presyo|price|parice|pricelist|cost|riyal|sar\b|كم|السعر|بكم)/i;
  const THAT = /(legit|original|totoo|totoo ba|true ba|true b|peke|scam|fake|authentic|aslly|asli|اصلي)/i;
  return (t) => {
    const s = String(t || "").trim();
    if (!s) return { y: "im_lang", tin_cay: 1 };
    if (AM_U.test(s)) return { y: "im_lang", tin_cay: 1 };
    if (THAT.test(s)) return { y: "hang_that", tin_cay: 1 };
    if (GIA.test(s)) return { y: "gia", tin_cay: 1 };
    if (DAT.test(s)) return { y: "dat_hang", tin_cay: 1 };
    if (SHIP.test(s)) return { y: "ship", tin_cay: 1 };
    return { y: "khac", tin_cay: 0 };
  };
}

/* ─────────────── bộ định tuyến ② · MODEL QUYẾT ĐỊNH (Jev / Kev) ─────────────── */
// Cả hai cùng API `POST /v1/systemone`. Chỉ khác gốc URL và cách xác thực.
function boSystemOne({ goc, khoa, model }) {
  const CAU_HOI = {
    y_dinh: {
      type: "choice",
      instructions:
        "Khách của một page bán hàng trên Messenger (người Philippines ở Ả Rập Xê Út, viết "
        + "English/Tagalog/Ả Rập, hay sai chính tả). Tin dưới đây thuộc ý định nào? Chọn ý "
        + "ĐÚNG NHẤT theo việc người bán phải LÀM tiếp.",
      criteria: Object.fromEntries(Y_DINH.map((k) => [k, chuan._y_dinh[k]])),
    },
  };
  return async (t) => {
    const r = await fetch(`${goc}/v1/systemone`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(khoa ? { authorization: `Bearer ${khoa}` } : {}) },
      body: JSON.stringify({ state: String(t), model, questions: CAU_HOI }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`${goc} → HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    const a = j.answers?.y_dinh || {};
    return { y: a.choice ?? a.value ?? "khac", tin_cay: Number(a.confidence ?? 0), tre: j.latency_ms };
  };
}

const BO = process.env.BO || "regex";
const dinhTuyen = BO === "regex" ? await boRegex()
  : BO === "regex-noi" ? boRegexNoi()
  : BO === "jev" ? boSystemOne({ goc: process.env.JEV_GOC || "https://api.typesafe.ai", khoa: process.env.JEV_KEY, model: process.env.JEV_MODEL || "jev-latest" })
    : boSystemOne({ goc: process.env.KEV_URL || "http://127.0.0.1:8000", khoa: null, model: process.env.KEV_MODEL || "kev-4b" });

/* ─────────────── chấm ─────────────── */
const ket = [];
const treDs = [];
for (let i = 0; i < tin.length; i++) {
  let r;
  try { r = await dinhTuyen(tin[i]); }
  catch (e) { console.error(`tin #${i}: ${e.message}`); process.exit(1); }
  if (r.tre != null) treDs.push(r.tre);
  ket.push({ i, text: tin[i], that: nhan[i], doan: r.y, tinCay: r.tin_cay });
}

const dung = ket.filter((x) => x.doan === x.that).length;
const banMau = ket.filter((x) => CO_MAU.has(x.doan));                 // sẽ bắn mẫu 0 đồng
const banDung = banMau.filter((x) => x.doan === x.that);
const banNham = banMau.filter((x) => x.doan !== x.that);
const nguyHiem = banNham.filter((x) => NHAY_CAM.has(x.that));
const boSot = ket.filter((x) => CO_MAU.has(x.that) && !CO_MAU.has(x.doan));

const pc = (a, b) => (b ? `${(a * 100 / b).toFixed(1)}%` : "—");
console.log(`\n═══ BỘ ĐỊNH TUYẾN: ${BO.toUpperCase()} · ${tin.length} tin khách thật ═══\n`);
console.log(`  đúng nhãn                     ${String(dung).padStart(3)}/${tin.length}   ${pc(dung, tin.length)}`);
console.log(`  PHỦ 0 ĐỒNG (sẽ bắn mẫu)       ${String(banMau.length).padStart(3)}/${tin.length}   ${pc(banMau.length, tin.length)}`);
console.log(`    ├─ bắn ĐÚNG                 ${String(banDung.length).padStart(3)}       ${pc(banDung.length, banMau.length)} số lượt bắn`);
console.log(`    └─ bắn NHẦM                 ${String(banNham.length).padStart(3)}       ${pc(banNham.length, banMau.length)}`);
console.log(`         trong đó NGUY HIỂM     ${String(nguyHiem.length).padStart(3)}       (tin cần người/luồng đơn mà bị bắn mẫu)`);
console.log(`  BỎ SÓT (đáng bắn mà lên AI)   ${String(boSot.length).padStart(3)}       ${pc(boSot.length, tin.length)}`);
if (treDs.length) {
  const s = treDs.slice().sort((a, b) => a - b);
  console.log(`  độ trễ p50/p95                 ${s[Math.floor(s.length / 2)]}ms / ${s[Math.floor(s.length * 0.95)]}ms`);
}

console.log(`\n── theo từng ý định (bắt được / tổng thật) ──`);
for (const y of Y_DINH) {
  const that = ket.filter((x) => x.that === y);
  if (!that.length) continue;
  const bat = that.filter((x) => x.doan === y).length;
  const nham = ket.filter((x) => x.doan === y && x.that !== y).length;
  console.log(`  ${y.padEnd(15)} ${String(bat).padStart(3)}/${String(that.length).padEnd(3)} ${pc(bat, that.length).padStart(6)}`
    + `${nham ? `   · nhận nhầm vào đây: ${nham}` : ""}`);
}

if (banNham.length) {
  console.log(`\n── BẮN NHẦM (không nguy hiểm) — ${banNham.length} tin:`);
  for (const x of banNham) console.log(`   #${x.i} thật=${x.that} → ${x.doan}   "${String(x.text).replace(/\s+/g," ").slice(0,60)}"`);
}
if (nguyHiem.length) {
  console.log(`\n⚠️  BẮN NHẦM NGUY HIỂM — ${nguyHiem.length} tin:`);
  for (const x of nguyHiem.slice(0, 8)) {
    console.log(`   #${x.i} thật=${x.that} → đoán=${x.doan}`);
    console.log(`      "${String(x.text).replace(/\s+/g, " ").slice(0, 78)}"`);
  }
}
console.log(`\n── BỎ SÓT: tin đáng bắn mẫu mà bị đẩy lên AI (mỗi tin ≈ 110đ) ──`);
for (const x of boSot.slice(0, 12)) {
  console.log(`   #${String(x.i).padStart(3)} ${x.that.padEnd(10)} "${String(x.text).replace(/\s+/g, " ").slice(0, 66)}"`);
}
if (boSot.length > 12) console.log(`   … và ${boSot.length - 12} tin nữa`);
console.log(`\n   TIỀN bỏ sót ước: ${boSot.length} × 110đ = ${(boSot.length * 110).toLocaleString("vi-VN")}đ / ${tin.length} tin`);
