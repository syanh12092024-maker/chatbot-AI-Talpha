// PHIẾU GL10 ④1 ④2 (+ ② 1 đọc/gắn tay, ② 3 giờ Pancake) — mô-đun `src/queue/ai-sale-nhuong.js`, chỗ DUY NHẤT đọc/ghi
// `page_gan_them.json` của pancake-tool. KHÔNG CSDL, KHÔNG mạng. ⛔ Mọi tệp là tệp TẠM (mkdtemp) — CẤM đụng `/opt/pancake-tool`.
//
// Thước ĐỐI CHIẾU NGỮ NGHĨA ai_sale: `python3 -I -c` chạy BẢN CHÉP NGUYÊN VĂN ba hàm `_page_gan_them` · `_page_gan_noi_khac` ·
// `_hop_page_shop` (`/opt/pancake-tool/ai_sale.py` :13530–13559, đọc chỉ-đọc 19/10, tệp sửa 18/10 17:24) và `_doc_gan` · `_ghi_gan`
// (`tu_gan_page_ngoai.py` :48–64) — chỉ đổi `SCRIPT_DIR` / `F_GAN` sang thư mục tạm. Mã ai_sale đổi gần như hằng ngày (498 bản .bak):
// bước mở van ② 5 đối chiếu lại thân ba hàm trên prod với bản chép này trước lần gạt đầu.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const m = await import("../src/queue/ai-sale-nhuong.js").catch((e) => ({ _loi: e }));
const coMoDun = () => assert.ok(!m._loi, `chưa có src/queue/ai-sale-nhuong.js (${m._loi?.message})`);
console.log(`   [gl10t] tệp đo ${fileURLToPath(new URL("../src/queue/ai-sale-nhuong.js", import.meta.url))} · cwd ${process.cwd()}`);

const GOC_TAM = fs.mkdtempSync(path.join(os.tmpdir(), "gl10-tep-"));
after(() => fs.rmSync(GOC_TAM, { recursive: true, force: true }));
let soThuMuc = 0;
/** Thư mục tạm dáng pancake-tool: `<goc>/state/chung/page_gan_them.json`. */
function dungTep(d) {
  const goc = path.join(GOC_TAM, `t${++soThuMuc}`);
  fs.mkdirSync(path.join(goc, "state", "chung"), { recursive: true });
  const tep = path.join(goc, "state", "chung", "page_gan_them.json");
  fs.writeFileSync(tep, typeof d === "string" ? d : JSON.stringify(d, null, 1));
  fs.chmodSync(tep, 0o644);
  return { goc, tep };
}
// Dáng THẬT (đo prod 19/10: dict 7 khoá — `_ghi_chu` chuỗi · khoá nước dict pid→chuỗi · `tram_landing` dict pid→dict).
const P = "981000000001"; const Q = "981000000002"; const X = "981000000009"; const L = "981000000077";
const MAU = () => ({
  _ghi_chu: "Gắn page ngoài 12 shop vào thị trường theo tiền tệ — sửa tay được, ai_sale đọc lại mỗi lần tra page.",
  uae: { "981000000101": "AED — gắn 19/09", "981000000102": "AED" },
  saudi: { "981000000201": "SAR" },
  tram_landing: { [L]: { nha: "saudi", nuoc: ["uae", "qatar"], ten: "Trạm landing GCC" } },
});
const docJson = (tep) => JSON.parse(fs.readFileSync(tep, "utf8"));
const conTam = (tep) => fs.readdirSync(path.dirname(tep)).filter((t) => t.includes(".v3-") || t.endsWith(".tmp"));

/* ─────────── bản chép NGUYÊN VĂN mã pancake-tool (đọc 19/10) ─────────── */
const PY_AI_SALE = String.raw`
import json, os, sys
SCRIPT_DIR = sys.argv[1]

def _page_gan_them(mkey):
    """19/09 (chủ shop: "rõ ràng tôi bảo theo đơn vị tiền tệ mà gắn rồi còn gì"): page còn gói nhưng thuộc shop POS
    RIÊNG (không có trong markets.json) → gắn vào thị trường theo tiền tệ page báo giá (AED→uae, NT$/TWD→taiwan…).
    Nguồn: state/chung/page_gan_them.json {tt: {pid: ghi chú}}. Đọc lại mỗi lần gọi → sửa file không cần restart
    (vòng dò tra lại danh sách page 10 phút/lần). Hỏng/thiếu file → không gắn thêm gì."""
    try:
        d = json.load(open(os.path.join(SCRIPT_DIR, "state", "chung", "page_gan_them.json"), encoding="utf-8"))
        # TRAM_LANDING_2409: + page trạm landing có nước này trong "nuoc" (mỗi hội thoại vẫn chỉ 1 AI xử — tram_bo_qua)
        return ({str(p) for p in (d.get(mkey) or {})}
                | {str(p) for p, v in (d.get("tram_landing") or {}).items()
                   if isinstance(v, dict) and mkey in [v.get("nha")] + list(v.get("nuoc") or [])})
    except Exception:                                    # noqa: BLE001
        return set()


def _page_gan_noi_khac(mkey):
    """23/09 (chủ shop: "giá bán thị trường nào tư vấn theo thị trường đó" — ca Gold Avenue Taiwan: page nằm trong shop
    POS Mỹ nhưng kịch bản báo 1290/1790 TWD): page đã được gắn cho thị trường KHÁC trong page_gan_them.json thì
    thị trường của shop POS phải BỎ nó ra, không thì hai AI cùng rep (AI Mỹ nói giá đô + xác nhận nhà + cọc $50
    với khách Đài). Cùng file với _page_gan_them, đọc lại mỗi lần gọi; hỏng/thiếu file → không bỏ gì."""
    try:
        d = json.load(open(os.path.join(SCRIPT_DIR, "state", "chung", "page_gan_them.json"), encoding="utf-8"))
        return {str(p) for k, o in d.items() if k != mkey and isinstance(o, dict) for p in o}
    except Exception:                                    # noqa: BLE001
        return set()


def _hop_page_shop(mkey, ids):
    """Tập page AI <mkey> trông = page của shop POS − page đã gắn cho nước khác (theo tiền tệ) + page gắn thêm cho nước này."""
    return (set(ids) - _page_gan_noi_khac(mkey)) | _page_gan_them(mkey)

ids = [x for x in sys.argv[2].split(",") if x]
print(json.dumps({mkey: sorted(_hop_page_shop(mkey, ids)) for mkey in sys.argv[3].split(",")}))
`;
const PY_GHI_GAN = String.raw`
import json, os, sys
F_GAN = sys.argv[1]


def _doc_gan():
    try:
        return json.load(open(F_GAN, encoding="utf-8"))
    except Exception:                                    # noqa: BLE001
        return {}


def _ghi_gan(them):
    """Đọc LẠI rồi ghi bằng os.replace — AI Sale đọc file này mỗi lần tra danh sách page."""
    d = _doc_gan()
    for mkey, o in them.items():
        d.setdefault(mkey, {}).update(o)
    tam = f"{F_GAN}.{os.getpid()}.tmp"
    with open(tam, "w", encoding="utf-8") as g:
        json.dump(d, g, ensure_ascii=False, indent=1)
    os.replace(tam, F_GAN)
    return d

_ghi_gan(json.loads(sys.argv[2]))
`;
/** Tập page ai_sale thị trường `mkey` trông, theo BẢN CHÉP nguyên văn — `ids` = page của shop POS. */
const hopPageShop = (goc, ids, mkeys = ["uae", "saudi"]) =>
  JSON.parse(execFileSync("python3", ["-I", "-c", PY_AI_SALE, goc, ids.join(","), mkeys.join(",")], { encoding: "utf8" }));
const ghiGanPy = (tep, them) => execFileSync("python3", ["-I", "-c", PY_GHI_GAN, tep, JSON.stringify(them)], { encoding: "utf8" });

/* ═══════════ ② 1 · ĐỌC: hỏng ≠ {} · vắng ≠ {} ═══════════ */

test("GL10 D1 · đọc tệp: hợp lệ ⇒ ok; cụt · gốc mảng · _v3 chuỗi · _v3 giá trị số ⇒ ok:false có lỗi (KHÔNG coi là {}); vắng ⇒ vang:true", () => {
  coMoDun();
  const { tep } = dungTep(MAU());
  const r = m.docTepGan(tep);
  assert.equal(r.ok, true); assert.deepEqual(r.d, MAU()); assert.equal(r.soLon, false);
  for (const [nhan, noi] of [["cụt", '{"uae": {'], ["gốc mảng", "[]"], ["_v3 chuỗi", '{"_v3": "981"}'], ["_v3 giá trị số", '{"_v3": {"981": 1}}'],
    ["gốc null", "null"], ["_v3 mảng", '{"_v3": []}']]) {
    const t = dungTep(noi).tep;
    const k = m.docTepGan(t);
    assert.equal(k.ok, false, `${nhan}: phải hỏng, đo ${JSON.stringify(k)}`);
    assert.ok(k.loi && k.loi.includes(t), `${nhan}: câu lỗi phải nêu đường tệp, đo ${k.loi}`);
    assert.equal(k.d, undefined, `${nhan}: hỏng KHÔNG được trả object rỗng`);
  }
  const vang = m.docTepGan(path.join(GOC_TAM, "khong-co.json"));
  assert.deepEqual([vang.ok, vang.vang], [false, true]);
});

test("GL10 D2 · gắn tay = pid dưới khoá DICT khác _v3 (nước · tram_landing) hoặc mảng; _ghi_chu (chuỗi) không tính; _v3 không tính", () => {
  coMoDun();
  const d = { ...MAU(), _v3: { [P]: "v3" }, japan: [X] };
  assert.deepEqual(m.khoaGanTay(d, "981000000101"), ["uae"]);
  assert.deepEqual(m.khoaGanTay(d, L), ["tram_landing"]);
  assert.deepEqual(m.khoaGanTay(d, X), ["japan"], "mảng cũng là cộng lại (ai_sale lặp `d.get(mkey) or {}`)");
  assert.deepEqual(m.khoaGanTay(d, P), [], "chỉ nằm ở _v3 ⇒ KHÔNG gắn tay");
  assert.deepEqual(m.khoaGanTay({ _ghi_chu: `ghi chú có ${P} trong chữ` }, P), []);
});

/* ═══════════ ④1 · ghi khoá giữ khoá lạ + đúng ngữ nghĩa ai_sale ═══════════ */

test("GL10 G1 · ghiKhoa ⇒ _v3[P] có, khoá khác so sâu bằng, thứ tự khoá giữ; bản chép ai_sale ⇒ P rời uae + saudi; _ghi_gan chen ⇒ _v3 còn; xoaKhoa ⇒ khoá _v3 mất", () => {
  coMoDun();
  const { goc, tep } = dungTep(MAU());
  const ids = [P, Q, "981000000101"];
  const truoc = hopPageShop(goc, ids);
  assert.ok(truoc.uae.includes(P) && truoc.saudi.includes(P), `trước khi ghi ai_sale trông P ở cả hai nước, đo ${JSON.stringify(truoc)}`);
  const k = m.ghiKhoa(tep, P, "v3 pilot — Trang P — bật 2026-10-19T00:00:00.000Z");
  assert.deepEqual([k.ghi, k.coTruoc], [true, false]);
  const sau = docJson(tep);
  assert.equal(sau._v3[P], "v3 pilot — Trang P — bật 2026-10-19T00:00:00.000Z");
  const { _v3, ...khac } = sau;
  assert.deepEqual(khac, MAU(), "mọi khoá khác giữ nguyên ngữ nghĩa");
  assert.deepEqual(Object.keys(sau), [...Object.keys(MAU()), "_v3"], "thứ tự khoá giữ, _v3 thêm ở cuối");
  assert.deepEqual(conTam(tep), [], "không sót tệp tạm");
  const hop = hopPageShop(goc, ids);
  assert.ok(!hop.uae.includes(P) && !hop.saudi.includes(P), `ai_sale (bản chép) PHẢI bỏ P ở mọi nước, đo ${JSON.stringify(hop)}`);
  assert.ok(hop.uae.includes(Q), "page khác của shop KHÔNG bị bỏ");
  ghiGanPy(tep, { uae: { [X]: "AED — tu_gan_page_ngoai" } });   // người ghi khác của tệp chạy SAU v3
  assert.equal(docJson(tep)._v3[P], sau._v3[P], "_ghi_gan (đọc lại rồi os.replace) giữ _v3");
  const k2 = m.xoaKhoa(tep, P);
  assert.deepEqual([k2.ghi, k2.coTruoc], [true, true]);
  const cuoi = docJson(tep);
  assert.equal(Object.hasOwn(cuoi, "_v3"), false, "mục cuối ⇒ xoá luôn khoá _v3");
  assert.deepEqual(cuoi, { ...MAU(), uae: { ...MAU().uae, [X]: "AED — tu_gan_page_ngoai" } }, "khoá khác so sâu bằng (kể cả lượt ghi của bên kia)");
  assert.ok(hopPageShop(goc, ids).uae.includes(P), "gỡ khoá ⇒ ai_sale trông lại P");
  assert.deepEqual(m.xoaKhoa(tep, P), { doi: false, coTruoc: false, ghi: false }, "khoá vắng ⇒ thành công, không ghi (lũy đẳng)");
});

test("GL10 G1b · ghiKhoa kiểm lại GẮN TAY trên ĐÚNG bản sắp ghi (dưới khoá tư vấn — _ghi_gan có thể chen sau lượt kiểm của cổng) ⇒ từ chối, tệp nguyên byte", () => {
  coMoDun();
  const d = MAU(); d.uae[P] = "AED — vừa gắn tay";
  const { tep } = dungTep(d);
  const truoc = fs.readFileSync(tep);
  assert.throws(() => m.ghiKhoa(tep, P, "x"), (e) => e.name === "LoiTepAiSale" && /gắn tay cho ai_sale ở khoá uae/.test(e.message));
  assert.ok(fs.readFileSync(tep).equals(truoc));
  assert.deepEqual(conTam(tep), []);
});

/* ═══════════ ④2 · nguyên tử + quyền ═══════════ */

test("GL10 G2a · lỗi ở lần GHI THỨ 2 vào tệp tạm (đã ghi một phần) ⇒ tệp đích giống TỪNG BYTE, không sót *.v3-*.tmp", () => {
  coMoDun();
  const { tep } = dungTep(MAU());
  const byteTruoc = fs.readFileSync(tep);
  let lan = 0;
  const fsLoi = { ...fs, writeSync: (fd, buf, off, len) => {
    lan += 1;
    if (lan === 1) return fs.writeSync(fd, buf, off, Math.max(1, Math.floor(len / 2)));   // ghi MỘT PHẦN
    throw Object.assign(new Error("ENOSPC giả"), { code: "ENOSPC" });
  } };
  assert.throws(() => m.ghiKhoa(tep, P, "x", { fs: fsLoi }), (e) => e.name === "LoiTepAiSale" && /ENOSPC/.test(e.message));
  assert.ok(lan >= 2, `phải chạm lần ghi thứ 2, đo ${lan}`);
  assert.ok(fs.readFileSync(tep).equals(byteTruoc), "tệp đích phải nguyên từng byte");
  assert.deepEqual(conTam(tep), [], "không sót tệp tạm");
});

test("GL10 G2b · tiến trình umask 077, tệp gốc 644 ⇒ sau ghi VẪN 644, cùng uid/gid", () => {
  coMoDun();
  const { tep } = dungTep(MAU());
  const st0 = fs.statSync(tep);
  const cu = process.umask(0o077);
  try { m.ghiKhoa(tep, P, "x"); } finally { process.umask(cu); }
  const st1 = fs.statSync(tep);
  assert.equal((st1.mode & 0o777).toString(8), "644", `mode sau ghi ${(st1.mode & 0o777).toString(8)} — UMask=0077 của unit v3 làm tệp thành 600 (ai_sale chạy root vẫn đọc được, người khác thì không)`);
  assert.deepEqual([st1.uid, st1.gid], [st0.uid, st0.gid]);
  assert.notEqual(st1.ino, st0.ino, "ghi bằng rename (inode mới), không ghi đè tại chỗ");
});

test("GL10 G2c · tệp có số nguyên 17 chữ số · số THỰC (600.0 của Python) ⇒ TỪ CHỐI ghi (JS không giữ được), tệp nguyên byte; số trong CHUỖI không tính", () => {
  coMoDun();
  for (const raw of ['{\n "uae": {"981000000101": "AED"},\n "dem": 12345678901234567\n}', '{\n "uae": {"981000000101": "AED"},\n "nhip": 600.0\n}']) {
    const { tep } = dungTep(raw);
    assert.throws(() => m.ghiKhoa(tep, P, "x"), (e) => e.name === "LoiTepAiSale" && /16 chữ số hoặc số thực/.test(e.message), raw);
    assert.equal(fs.readFileSync(tep, "utf8"), raw);
    assert.deepEqual(conTam(tep), []);
  }
  assert.equal(m.coSoKhongGiuDuoc('{"a": "12345678901234567890", "b": "1.5"}'), false, "số trong chuỗi không dính");
  assert.equal(m.coSoKhongGiuDuoc('{"a": [1, 22, -3], "981000000101": "AED"}'), false, "số nguyên nhỏ giữ được");
  assert.equal(m.coSoKhongGiuDuoc('{"a": [1, 9007199254740993]}'), true);
  assert.equal(m.coSoKhongGiuDuoc('{"a": 1e5}'), true, "số mũ = số thực của Python");
});

test("GL10 G2d · một lượt _ghi_gan (bản chép) CHEN giữa lúc v3 đọc và lúc rename ⇒ v3 làm lại; tệp cuối có CẢ uae.X lẫn _v3[P]", () => {
  coMoDun();
  const { tep } = dungTep(MAU());
  let chen = 0;
  const k = m.ghiKhoa(tep, P, "v3", { truocRename: () => { if (++chen === 1) ghiGanPy(tep, { uae: { [X]: "AED — chen" } }); } });
  assert.equal(k.ghi, true);
  assert.ok(chen >= 2, `phải làm lại sau lượt chen, đo ${chen} lượt tới trước rename`);
  const d = docJson(tep);
  assert.equal(d.uae[X], "AED — chen", "v3 ĐÈ MẤT lượt ghi của tu_gan_page_ngoai (gắn page theo tiền tệ)");
  assert.equal(d._v3[P], "v3");
  assert.deepEqual(conTam(tep), []);
  // chen MỌI lượt ⇒ hết 3 lượt thì lỗi, tệp đích = bản cuối của bên kia, không có _v3
  const t2 = dungTep(MAU()).tep;
  let n = 0;
  assert.throws(() => m.ghiKhoa(t2, P, "v3", { truocRename: () => { n += 1; ghiGanPy(t2, { uae: { [`98100000100${n}`]: "chen" } }); } }),
    (e) => e.name === "LoiTepAiSale" && e.status === 409 && /ghi chen 3 lần/.test(e.message));
  assert.equal(Object.hasOwn(docJson(t2), "_v3"), false);
  assert.deepEqual(conTam(t2), []);
});

test("GL10 G2e · ghi khi tệp VẮNG ⇒ lỗi «không tồn tại», KHÔNG tạo tệp; biến rỗng ⇒ lỗi «Chưa nối ai_sale»", () => {
  coMoDun();
  const tep = path.join(GOC_TAM, "vang", "page_gan_them.json");
  fs.mkdirSync(path.dirname(tep), { recursive: true });
  assert.throws(() => m.ghiKhoa(tep, P, "x"), (e) => e.vang === true && /không tồn tại/.test(e.message));
  assert.equal(fs.existsSync(tep), false, "không tự tạo tệp của team khác");
  assert.throws(() => m.ghiKhoa("", P, "x"), /Chưa nối ai_sale/);
});

/* ═══════════ ② 3 · giờ Pancake — UTC KHÔNG múi ═══════════ */

test("GL10 M1 · thoiDiemPancake: không múi ⇒ UTC ở MỌI múi máy (Berlin · UTC · +7); Z/±hh:mm giữ; số giây ⇒ ms; rác ⇒ NaN", () => {
  coMoDun();
  const tzCu = process.env.TZ;
  try {
    for (const tz of ["Europe/Berlin", "UTC", "Asia/Ho_Chi_Minh"]) {
      process.env.TZ = tz;
      assert.equal(m.thoiDiemPancake("2026-10-15T09:31:58"), Date.UTC(2026, 9, 15, 9, 31, 58), tz);
      assert.equal(m.thoiDiemPancake("2026-10-15T09:31:58.000000"), Date.UTC(2026, 9, 15, 9, 31, 58), `${tz} — 6 chữ số lẻ`);
      assert.equal(m.thoiDiemPancake("2026-10-15 09:31:58"), Date.UTC(2026, 9, 15, 9, 31, 58), `${tz} — dấu cách`);
      assert.equal(m.thoiDiemPancake("2026-10-15T09:31:58Z"), Date.UTC(2026, 9, 15, 9, 31, 58));
      assert.equal(m.thoiDiemPancake("2026-10-15T11:31:58+02:00"), Date.UTC(2026, 9, 15, 9, 31, 58));
      assert.equal(m.thoiDiemPancake(1792056718), 1792056718000);
      assert.equal(m.thoiDiemPancake("1792056718000"), 1792056718000);
    }
  } finally { if (tzCu === undefined) delete process.env.TZ; else process.env.TZ = tzCu; }
  for (const rac of ["", null, undefined, "hôm qua", "2026-10-15", "15/10/2026 09:31", NaN, "2026-13-45T99:99:99"]) {
    assert.ok(Number.isNaN(m.thoiDiemPancake(rac)), `${JSON.stringify(rac)} ⇒ NaN`);
  }
});
