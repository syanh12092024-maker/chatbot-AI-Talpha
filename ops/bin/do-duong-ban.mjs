#!/usr/bin/env node
// THƯỚC ĐƯỜNG BÁN — đo hội thoại THẬT xem bot/page đang bán khéo tới đâu.
//
// ═══ VÌ SAO CÓ FILE NÀY ═══════════════════════════════════════════════════════════
// Mọi phiếu của sóng BÁN HÀNG (BH1–BH6) đều đụng cách bot NÓI. Trước hôm nay không có
// cách nào đo "nói khéo hơn" ngoài đọc tay vài hội thoại rồi đoán — nên mỗi lần sửa
// prompt là một lần cãi nhau bằng cảm giác. File này biến câu hỏi đó thành SỐ.
//
// Đo trên 719 hội thoại thật (14 page đông nhất, 16/09/2026) ra sáu con số nền dưới đây.
// Chúng là MỐC XUẤT PHÁT của sóng BH; phiếu nào cũng so lại với chính chúng.
//
//   tin page được khách trả lời ......... 31,8%  (template 28,7% · tự soạn 41,5%)
//   hội thoại đạt ≥4 tin khách .......... 39,4%
//   hội thoại khách cho SĐT ............. 19,5%  (sau trung bình 7,1 lượt page)
//   hội thoại có thẻ đơn POS ............ 22,9%
//   tin page dài >300 ký tự ............. 21,3% số tin — và chỉ được trả lời 9,5%
//   câu "giết hội thoại" ................ 18,6 tin/100 tin page
//
// ═══ HAI PHÁT HIỆN LÀM ĐỔI CẢ SÓNG (đừng xoá, người sau sẽ hỏi vì sao) ════════════
//  · ĐỘ DÀI QUYẾT ĐỊNH TẤT CẢ. Tin 21–80 ký tự được trả lời 41,2%; tin >300 ký tự chỉ
//    9,5%. Tin TỰ SOẠN dài 151–300 ký tự đạt 50% — cao nhất toàn bộ dữ liệu. Mà bot
//    đang chạy với max_tokens=400 (~550 ký tự/tin, đo trong Sổ AI: 182 token/tin),
//    tức nằm gọn trong vùng tệ nhất.
//  · ÉP CHỐT LÀM MẤT KHÁCH. Hội thoại CÓ đơn dùng 0,5 câu chốt/hội thoại; hội thoại
//    KHÔNG đơn dùng 0,8. Tương quan NGHỊCH. Và top "câu cuối rồi khách biến mất" là
//    185 lượt của đúng mẫu câu "will you choose buy 1 get 1 or buy 2 get 2?".
//
// ═══ CHỈ ĐỌC, KHÔNG GỬI GÌ ════════════════════════════════════════════════════════
// Dùng đúng hai endpoint ĐỌC của Pancake (`/conversations`, `/messages`). Không gửi tin,
// không gắn thẻ, không đụng đơn. Từ chối chạy nếu `PANCAKE_READONLY` khác 1 — luật 1
// §0a sổ điều hành: máy này không bao giờ được chạm khách thật.
//
// ⚠️ PII: mẫu lưu ra đĩa ĐÃ CHE số điện thoại và tên riêng (`<SĐT>` / `<TÊN>`) NGAY LÚC
// đọc, trước khi ghi. Tệp mẫu vẫn bị gitignore — che không phải lý do để commit nó.
//
//   node --env-file=.env ops/bin/do-duong-ban.mjs --keo        # kéo mẫu mới rồi đo
//   node --env-file=.env ops/bin/do-duong-ban.mjs              # đo lại trên mẫu đã lưu
//   node --env-file=.env ops/bin/do-duong-ban.mjs --json       # chỉ 6 số, cho cổng đọc
//   PAGES_N=20 ... --keo                                        # rộng hơn (mặc định 14)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEP_MAU = process.env.MAU_DUONG_BAN || path.join(GOC, "mau-duong-ban.json");

const co = (ten) => process.argv.includes(ten);
const soTron = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const tb = (a, b) => (b ? Math.round((a / b) * 10) / 10 : 0);
const dem = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const dinh = (o, n = 15) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

// ── CHE PII ────────────────────────────────────────────────────────────────────────
// Che NGAY lúc đọc, không phải lúc in: mẫu nằm trên đĩa nhiều ngày và sẽ bị đọc lại bởi
// script khác, nên thứ không bao giờ được ghi xuống thì đừng ghi xuống lần nào.
const doiChu = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
export function che(s) {
  return doiChu(s)
    .replace(/\+?\d[\d\s().-]{6,18}\d/g, "<SĐT>")
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "<TÊN>");
}

// Thẻ hệ thống Pancake = -(mã trạng thái đơn) — cùng tập với `conv-owner.ORDER_STOP_TAGS`.
const THE_DON = new Set([-1, -2, -3, -11, -12, -20]);

// ── KÉO MẪU ────────────────────────────────────────────────────────────────────────
async function keoMau() {
  if (process.env.PANCAKE_READONLY !== "1") {
    console.error("TỪ CHỐI: .env phải có PANCAKE_READONLY=1 (luật 1 §0a sổ điều hành).");
    process.exit(2);
  }
  const { pkGetConversations, pkGetMessages } = await import(`${GOC}/src/pancake.js`);

  // Page nào? Lấy từ `conv-state.json` — hội thoại NÀO ĐÃ TỪNG có lượt gọi model, tức
  // page thật sự đã chạy bot. Gõ tay danh sách page là lỗ hẹn giờ (án lệ #22).
  let batDau = [];
  try {
    const cs = JSON.parse(fs.readFileSync(path.join(GOC, "conv-state.json"), "utf8"));
    const theoPage = new Map();
    for (const [k, c] of Object.entries(cs)) {
      if (!c.llmTurns) continue;
      const p = k.split("_")[0];
      theoPage.set(p, (theoPage.get(p) || 0) + 1);
    }
    batDau = [...theoPage.entries()].sort((a, b) => b[1] - a[1]);
  } catch (e) {
    console.error(`không đọc được conv-state.json: ${e.message}`);
    process.exit(2);
  }
  const N = Number(process.env.PAGES_N || 14);
  const pages = batDau.slice(0, N).map((x) => x[0]);

  const mau = { taoLuc: new Date().toISOString(), pages: pages.length, hoiThoai: [] };
  let i = 0;
  for (const pageId of pages) {
    i++;
    let convs = [];
    try { convs = await pkGetConversations(pageId); }
    catch (e) { console.error(`  page ${pageId}: đọc hội thoại lỗi — ${e.message}`); continue; }
    let n = 0;
    for (const c of convs) {
      const custId = (c.customers || [])[0]?.id;
      if (!c.id || !custId) continue;
      let msgs = [];
      try { msgs = await pkGetMessages(pageId, c.id, custId); } catch { continue; }
      if (!msgs.length) continue;
      mau.hoiThoai.push({
        page: String(pageId),
        conv: String(c.id),
        the: (c.tags || []).map(Number),
        tin: msgs.map((m) => {
          const tho = doiChu(m.original_message || m.message || "");
          return {
            ai: String(m.from?.id) === String(pageId) ? "page" : "khach",
            t: che(tho),
            dai: tho.length,                          // độ dài THẬT, trước khi che
            anh: (m.attachments || []).length > 0,
            luc: m.inserted_at || m.created_at || null,
          };
        }),
      });
      n++;
    }
    console.error(`  [${i}/${pages.length}] page ${pageId} · ${n} hội thoại`);
  }
  fs.writeFileSync(TEP_MAU, JSON.stringify(mau));
  console.error(`→ ghi ${mau.hoiThoai.length} hội thoại vào ${path.basename(TEP_MAU)} (đã che PII)`);
  return mau;
}

// ── PHÂN LOẠI TIN PAGE ─────────────────────────────────────────────────────────────
// "Template" nhận bằng LẶP LẠI, không bằng sổ template: cùng một chuỗi xuất hiện ở ≥3
// hội thoại KHÁC NHAU thì người thật không gõ như thế. Cùng luật đã hạ tỷ lệ nhận nhầm
// người thật của M05 từ 30,2% xuống 8,6% (docs/v2/09-DO-THAT-TRUOC-DEPLOY.md §B3).
function banDoLap(hoiThoai) {
  const m = new Map();
  for (const ht of hoiThoai)
    for (const t of ht.tin)
      if (t.ai === "page" && t.t) {
        const k = t.t.toLowerCase().slice(0, 60);
        if (!m.has(k)) m.set(k, new Set());
        m.get(k).add(ht.conv);
      }
  return m;
}

// Sáu mẫu câu đã ĐO ĐƯỢC là làm khách im. Giữ ở đây vì cổng nghiệm thu BH3 đếm chúng
// trong tin AI phát ra; `outbound-guard` cũng chặn đúng tập này (cùng một sự thật, hai
// nơi dùng — khai ở ĐÂY là bản đo, bên kia là bản cưỡng chế).
export const CAU_GIET = [
  ["chot_lua_chon", /(which (combo|promo|one|set)|will you choose|do you wanna order \d|would you like to (choose|reserve)|alin po ang|combo 1 (or|o) combo 2)/i],
  ["thuc_con_do", /(are you still there|still interested|still waiting|checking in|hello\?+$|may i know your)/i],
  ["hoi_them_gi", /(do you have any (other )?questions|any other question|ano pa po ang|other inquiries)/i],
  ["khan_hiem", /(limited|today only|ends? (at|tonight|today)|sell out|hurry|last chance|stocks? (are )?limited)/i],
  ["nhac_nho", /(friendly reminder|reminder!|don'?t forget|just wanted to (let you know|check))/i],
  ["checklist", /(full name.*contact number|contact number.*complete address|provide the information below|✔️\s*your)/i],
];

function nhan(tin, lap) {
  if (!tin.t) return tin.anh ? "anh" : "rong";
  const n = lap.get(tin.t.toLowerCase().slice(0, 60))?.size || 0;
  return n >= 3 ? "template" : "tu_soan";
}
const bacDai = (n) =>
  n > 300 ? ">300" : n > 150 ? "151-300" : n > 80 ? "81-150" : n > 20 ? "21-80" : "≤20";

// ── ĐO ─────────────────────────────────────────────────────────────────────────────
export function do_(mau) {
  const HT = mau.hoiThoai;
  const lap = banDoLap(HT);

  const K = {
    hoiThoai: HT.length, tinKhach: 0, tinPage: 0,
    traLoiTheoDai: {}, traLoiTheoNhan: {}, phatTheoDai: {},
    cauGiet: {}, cauGietImSau: {},
    truocSdt: {}, cuoiRoiIm: {},
    coSdt: 0, coTheDon: 0, tinKhachTu4: 0, treo: 0,
    coDon: { ht: 0, tinKhach: 0, tinPage: 0, kyTu: 0, anh: 0, chot: 0 },
    khongDon: { ht: 0, tinKhach: 0, tinPage: 0, kyTu: 0, anh: 0, chot: 0 },
    luotPageTruocSdt: 0, htCoSdtDem: 0,
  };

  for (const ht of HT) {
    const coDon = (ht.the || []).some((t) => THE_DON.has(Number(t)));
    const G = coDon ? K.coDon : K.khongDon;
    G.ht++;
    if (coDon) K.coTheDon++;

    const khach = ht.tin.filter((t) => t.ai === "khach");
    const page = ht.tin.filter((t) => t.ai === "page");
    K.tinKhach += khach.length; K.tinPage += page.length;
    G.tinKhach += khach.length; G.tinPage += page.length;
    if (khach.length >= 4) K.tinKhachTu4++;

    let thaySdt = false, luotPage = 0;
    for (let i = 0; i < ht.tin.length; i++) {
      const t = ht.tin[i];
      const sau = ht.tin[i + 1];

      if (t.ai === "page") {
        G.kyTu += t.dai;
        if (!t.t && t.anh) G.anh++;
        if (!thaySdt) luotPage++;
        const nh = nhan(t, lap);
        if (t.t) {
          dem(K.phatTheoDai, bacDai(t.dai));
          const b = K.traLoiTheoDai[bacDai(t.dai)] || (K.traLoiTheoDai[bacDai(t.dai)] = { n: 0, dap: 0 });
          b.n++; if (sau && sau.ai === "khach") b.dap++;
          const bn = K.traLoiTheoNhan[nh] || (K.traLoiTheoNhan[nh] = { n: 0, dap: 0 });
          bn.n++; if (sau && sau.ai === "khach") bn.dap++;
          for (const [ten, re] of CAU_GIET)
            if (re.test(t.t)) {
              dem(K.cauGiet, ten);
              if (ten === "chot_lua_chon") G.chot++;
              if (!sau || sau.ai !== "khach") dem(K.cauGietImSau, ten);
            }
        }
        // tin page CUỐI CÙNG của hội thoại = câu nói xong rồi khách biến mất
        if (i === ht.tin.length - 1 && t.t) dem(K.cuoiRoiIm, t.t.toLowerCase().slice(0, 70));
      } else {
        if (!thaySdt && /<SĐT>/.test(t.t)) {
          thaySdt = true; K.coSdt++; K.htCoSdtDem++; K.luotPageTruocSdt += luotPage;
          // hai tin page ngay trước đó = thứ thật sự kéo được số
          for (let k = i - 1, lay = 0; k >= 0 && lay < 2; k--)
            if (ht.tin[k].ai === "page" && ht.tin[k].t) { dem(K.truocSdt, ht.tin[k].t.toLowerCase().slice(0, 70)); lay++; }
        }
        if (i === ht.tin.length - 1) K.treo++;   // tin cuối là của khách → chưa ai trả lời
      }
    }
  }

  const tongPhat = Object.values(K.phatTheoDai).reduce((a, b) => a + b, 0);
  const dapChung = Object.values(K.traLoiTheoDai).reduce((a, b) => ({ n: a.n + b.n, dap: a.dap + b.dap }), { n: 0, dap: 0 });

  return {
    K,
    // SÁU SỐ NGHIỆM THU — cổng đọc đúng khối này, đừng đổi tên khoá.
    so: {
      tin_page_duoc_tra_loi: soTron(dapChung.dap, dapChung.n),
      ht_tu_4_tin_khach: soTron(K.tinKhachTu4, K.hoiThoai),
      ht_cho_sdt: soTron(K.coSdt, K.hoiThoai),
      ht_co_the_don: soTron(K.coTheDon, K.hoiThoai),
      tin_dai_qua_300: soTron(K.phatTheoDai[">300"] || 0, tongPhat),
      // "trên 100 tin page thì bao nhiêu tin mang câu giết" — `soTron` đã nhân 100 sẵn,
      // nhân thêm lần nữa là ra 1858% (bản đầu đã sai đúng chỗ này, mẫu bắt được).
      cau_giet_moi_100_tin: soTron(Object.values(K.cauGiet).reduce((a, b) => a + b, 0), K.tinPage),
    },
  };
}

function in_(kq) {
  const { K, so } = kq;
  const d = (a, b) => `${a} (${soTron(a, b)}%)`;
  console.log(`MẪU: ${K.hoiThoai} hội thoại · ${K.tinKhach} tin khách · ${K.tinPage} tin page`);
  console.log("\n── SÁU SỐ NGHIỆM THU ───────────────────────────────────────────────");
  // MỐC NỀN đo 16/09/2026 trên chính mẫu này (719 hội thoại · 14 page). Đổi mốc thì phải
  // đổi cả phiếu BH — con số ở đây là thứ mọi phiếu của sóng so lại.
  const moc = {
    tin_page_duoc_tra_loi: [31.8, "≥40"], ht_tu_4_tin_khach: [39.4, "≥50"],
    ht_cho_sdt: [19.5, "≥25"], ht_co_the_don: [22.9, "≥27"],
    tin_dai_qua_300: [21.3, "<5"], cau_giet_moi_100_tin: [18.6, "≤6"],
  };
  for (const [k, v] of Object.entries(so)) {
    const [nen, dich] = moc[k] || [null, ""];
    console.log(`  ${k.padEnd(24)} ${String(v).padStart(6)}%   nền ${nen == null ? "—" : nen + "%"}  đích ${dich}`);
  }

  console.log("\n── KHÁCH TRẢ LỜI theo ĐỘ DÀI tin page ──────────────────────────────");
  for (const b of ["≤20", "21-80", "81-150", "151-300", ">300"]) {
    const v = K.traLoiTheoDai[b]; if (!v) continue;
    console.log(`  ${b.padEnd(9)} n=${String(v.n).padStart(5)}  trả lời ${String(soTron(v.dap, v.n)).padStart(5)}%`);
  }
  console.log("── theo LOẠI tin page ──────────────────────────────────────────────");
  for (const [k, v] of Object.entries(K.traLoiTheoNhan).sort((a, b) => b[1].n - a[1].n))
    console.log(`  ${k.padEnd(9)} n=${String(v.n).padStart(5)}  trả lời ${String(soTron(v.dap, v.n)).padStart(5)}%`);

  console.log("\n── SÁU MẪU CÂU ĐÃ ĐO LÀ LÀM KHÁCH IM ───────────────────────────────");
  for (const [ten] of CAU_GIET) {
    const n = K.cauGiet[ten] || 0; if (!n) continue;
    console.log(`  ${ten.padEnd(14)} ${String(n).padStart(4)} lần · khách im ngay sau: ${d(K.cauGietImSau[ten] || 0, n)}`);
  }

  console.log(`\n── ĐƯỜNG TỚI SĐT ──────────────────────────────────────────────────`);
  console.log(`  ${K.coSdt} hội thoại có SĐT · trung bình ${tb(K.luotPageTruocSdt, K.htCoSdtDem)} lượt page trước khi khách cho số`);
  console.log("  tin page NGAY TRƯỚC khi khách cho SĐT (top 8):");
  for (const [k, v] of dinh(K.truocSdt, 8)) console.log(`    ${String(v).padStart(3)}× ${k.slice(0, 88)}`);
  console.log("  tin page CUỐI rồi khách biến mất (top 8):");
  for (const [k, v] of dinh(K.cuoiRoiIm, 8)) console.log(`    ${String(v).padStart(3)}× ${k.slice(0, 88)}`);

  console.log("\n── CÓ ĐƠN vs KHÔNG ĐƠN ────────────────────────────────────────────");
  const O = K.coDon, N = K.khongDon;
  const hang = (ten, a, b) => console.log(`  ${ten.padEnd(26)} ${String(a).padStart(8)} ${String(b).padStart(10)}`);
  hang("", "CÓ ĐƠN", "KHÔNG");
  hang("hội thoại", O.ht, N.ht);
  hang("tin khách/hội thoại", tb(O.tinKhach, O.ht), tb(N.tinKhach, N.ht));
  hang("tin page/hội thoại", tb(O.tinPage, O.ht), tb(N.tinPage, N.ht));
  hang("ký tự/tin page", tb(O.kyTu, O.tinPage), tb(N.kyTu, N.tinPage));
  hang("ảnh/hội thoại", tb(O.anh, O.ht), tb(N.anh, N.ht));
  hang("câu chốt lựa chọn/ht", tb(O.chot, O.ht), tb(N.chot, N.ht));
  console.log(`\n  Hội thoại TREO (tin cuối là của khách, chưa ai trả lời): ${d(K.treo, K.hoiThoai)}`);
}

// ── MAIN ───────────────────────────────────────────────────────────────────────────
// So ĐƯỜNG DẪN ĐÃ GIẢI MÃ, không ghép `file://` + argv[1]: cây làm việc thật có DẤU CÁCH
// trong tên ("…/Work/AI Chatbot") và `import.meta.url` mã hoá nó thành %20 — ghép chuỗi
// thì điều kiện KHÔNG BAO GIỜ đúng và script thoát 0 mà không làm gì (án lệ 25/08 §9 sổ:
// `npm run migrate` từng chết câm đúng kiểu này).
const chayTrucTiep = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (chayTrucTiep) {
  const mau = co("--keo")
    ? await keoMau()
    : (() => {
        if (!fs.existsSync(TEP_MAU)) {
          console.error(`chưa có mẫu ${path.basename(TEP_MAU)} — chạy lại với --keo`);
          process.exit(2);
        }
        return JSON.parse(fs.readFileSync(TEP_MAU, "utf8"));
      })();
  const kq = do_(mau);
  if (co("--json")) console.log(JSON.stringify(kq.so, null, 1));
  else in_(kq);
}
