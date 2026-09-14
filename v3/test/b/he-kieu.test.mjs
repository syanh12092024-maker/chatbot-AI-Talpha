// HỆ KIỂU — canh HAI bất biến của `v3/src/ui/chung/kieu.css`.
//
// Ca này không đo «trang có đẹp không» — không thước nào đo được thế. Nó canh hai điều
// mà nếu vỡ thì vỡ ÂM THẦM, và một trong hai làm hỏng cả 25 màn cùng lúc.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const GOC = path.resolve(import.meta.dirname, "../../..");
const DUONG = path.join(GOC, "v3/src/ui/chung/kieu.css");
const css = fs.readFileSync(DUONG, "utf8");

// Bỏ chú thích trước khi đo — chú thích có nhắc mã màu (#e8f7ee…) để giải thích lịch sử,
// đó là TƯ LIỆU chứ không phải kiểu. Đo cả chú thích là tự làm thước kêu oan.
const khongChuThich = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("HK1 · MỌI kiểu nằm trong @layer — nếu không thì nó đè <style> của 25 màn cũ", () => {
  assert.match(
    khongChuThich,
    /@layer\s+ds-dau\s*,\s*ds-nen\s*,\s*ds-phan\s*;/,
    "phải khai thứ tự layer ở đầu tệp",
  );

  // Cắt bỏ từng khối `@layer <ten> { … }` (đếm ngoặc, vì trong đó có ngoặc lồng).
  let con = khongChuThich.replace(/@layer\s+[a-z-]+\s*,[^;]*;/g, "");
  let i;
  while ((i = con.search(/@layer\s+[a-z-]+\s*\{/)) !== -1) {
    let j = con.indexOf("{", i);
    let sau = 1;
    while (sau > 0 && ++j < con.length) {
      if (con[j] === "{") sau++;
      else if (con[j] === "}") sau--;
    }
    con = con.slice(0, i) + con.slice(j + 1);
  }

  const conLai = con.trim();
  assert.equal(
    conLai,
    "",
    `còn kiểu NGOÀI layer — nó sẽ đè <style> của trang:\n${conLai.slice(0, 300)}`,
  );
});

test("HK2 · không màu nào gõ thẳng ngoài khối token — 86 màu rời là bệnh cũ", () => {
  // Mọi giá trị màu phải khai MỘT LẦN ở `ds-dau`, phần sau chỉ được gọi `var(--…)`.
  // Đây chính là phép chặn cảnh đo 14/09: 86 màu khác nhau, riêng ý «ổn» có sáu sắc xanh.
  const dauNen = khongChuThich.indexOf("@layer ds-nen");
  assert.ok(dauNen > 0, "không thấy khối ds-nen");
  const sauToken = khongChuThich.slice(dauNen);

  const goThang = [
    ...sauToken.matchAll(/#[0-9a-fA-F]{3,8}\b/g),
    ...sauToken.matchAll(/\b(?:rgba?|hsla?)\s*\(/g),
  ].map((m) => m[0]);

  assert.deepEqual(
    goThang,
    [],
    `màu gõ thẳng ngoài token (phải dùng var(--…)): ${goThang.join(" · ")}`,
  );
});

test("HK3 · nav tự nạp hệ kiểu, và router có đường phục vụ nó", () => {
  // Hai nửa của một mạch: thiếu nửa nào thì hệ kiểu không tới được trang nào cả,
  // mà trang vẫn hiện bình thường — nên không ai phát hiện.
  const nav = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/dieu-huong.js"), "utf8");
  assert.match(nav, /\/chung\/kieu\.css/, "nav phải chèn <link> tới hệ kiểu");

  const router = fs.readFileSync(
    path.join(GOC, "v3/src/ui/chung/router-dieu-huong.js"),
    "utf8",
  );
  assert.match(router, /['"]\/chung\/kieu\.css['"]/, "router phải phục vụ hệ kiểu");
  assert.match(router, /text\/css/, "phải trả đúng kiểu nội dung text/css");
});

// ── HK4 · LUẬT GIAO DIỆN thành phép đo máy chạy được ──────────────────────────────
// Nguồn: `.claude/skills/web-design-guidelines` — bản chốt Web Interface Guidelines của
// nhóm Vercel (MIT), 93 luật. Cài 14/09/2026 theo yêu cầu của chủ dự án.
//
// Vì sao neo thành ca kiểm chứ không chỉ đọc một lượt: luật đọc rồi là quên, còn ca kiểm
// thì đỏ. Chính lượt soi đầu tiên đã bắt được BẢY lỗi trong bản `kieu.css` tôi vừa viết —
// trong đó có một lỗi trông như đã tuân: `outline: none` kèm quầng thay thế màu #e6f3f4,
// nhạt tới mức trên nền trắng gần như vô hình. Tuân hình thức, vi phạm thực chất.
//
// Chỉ neo các luật ĐO ĐƯỢC trên tệp CSS. Luật thuộc HTML/JS (aria-label, alt, Intl.*,
// nhãn nút) không neo ở đây — chúng thuộc từng màn, và `Skill(web-design-guidelines)`
// là đường soi chúng.
test("HK4 · hệ kiểu KHÔNG vi phạm các luật giao diện đo được trên CSS", () => {
  const loi = [];
  const co = (re, msg) => { if (!re.test(khongChuThich)) loi.push(msg); };
  const khong = (re, msg) => { if (re.test(khongChuThich)) loi.push(msg); };

  // ① Chống-mẫu bị luật cấm thẳng.
  khong(/transition\s*:\s*all\b/, "`transition: all` — luật cấm; phải liệt kê thuộc tính");
  khong(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/, "chặn phóng to — luật cấm");

  // ② `outline: none` chỉ được phép khi CÓ thay thế thấy được. Đếm: mỗi chỗ tắt outline
  //    phải có một quầng `box-shadow` hoặc `border-color` đi kèm trong cùng khối.
  const tatOutline = [...khongChuThich.matchAll(/outline\s*:\s*(none|0)\b/g)].length;
  const coThayThe = [...khongChuThich.matchAll(/box-shadow\s*:\s*0 0 0 3px|border-color\s*:\s*var\(--chinh\)/g)].length;
  if (tatOutline > 0 && coThayThe < tatOutline) {
    loi.push(`tắt outline ${tatOutline} chỗ mà chỉ ${coThayThe} chỗ có quầng thay thế`);
  }

  // ③ Những luật PHẢI có mặt.
  co(/:focus-visible/, "thiếu `:focus-visible` — bàn phím không thấy mình đang ở đâu");
  co(/prefers-reduced-motion/, "thiếu `prefers-reduced-motion`");
  co(/color-scheme\s*:/, "thiếu `color-scheme` — ô nhập và thanh cuộn gốc vẽ sai ở chế độ tối");
  co(/font-variant-numeric\s*:\s*tabular-nums/, "thiếu `tabular-nums` — cột số nhảy chữ");
  co(/text-wrap\s*:\s*balance/, "thiếu `text-wrap: balance` — tiêu đề rớt chữ mồ côi");
  co(/touch-action\s*:\s*manipulation/, "thiếu `touch-action` — cảm ứng trễ 300ms mỗi lần bấm");
  co(/-webkit-tap-highlight-color/, "thiếu `-webkit-tap-highlight-color`");
  co(/overscroll-behavior\s*:\s*contain/, "thiếu `overscroll-behavior` — cuộn lọt sang trang dưới");
  co(/env\(safe-area-inset/, "thiếu `env(safe-area-inset-*)` — nội dung bị tai máy che");
  co(/text-overflow\s*:\s*ellipsis/, "thiếu lớp cắt chữ — tên người nhập dài làm vỡ bảng");

  // ④ Bẫy cổ điển: `.cat` trong con của flex không ăn nếu thiếu `min-width: 0`.
  if (/text-overflow\s*:\s*ellipsis/.test(khongChuThich)) {
    co(/min-width\s*:\s*0/, "có lớp cắt chữ mà thiếu `min-width: 0` cho con của flex — cắt sẽ KHÔNG ăn");
  }

  assert.deepEqual(loi, [], "vi phạm luật giao diện:\n  · " + loi.join("\n  · "));
});

test("HK5 · nav cắm LỐI BỎ QUA, và trỏ vào mốc có thật", () => {
  // Luật Accessibility: «include skip link for main content». Trước 14/09, đi bằng bàn
  // phím phải Tab qua 24 mục thanh bên mới tới nội dung — ở MỌI trang trong 25 màn.
  const nav = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/dieu-huong.js"), "utf8");
  assert.match(nav, /class\s*=\s*["']bo-qua["']|className\s*=\s*["']bo-qua["']/, "nav phải cắm <a class=bo-qua>");
  assert.match(nav, /querySelector\("main"\)|querySelector\('main'\)/, "phải trỏ vào <main>");
  assert.match(css, /\.bo-qua/, "hệ kiểu phải có kiểu cho lối bỏ qua");

  // Mốc phải có thật ở CẢ 25 màn, không phải chỉ ở màn tôi vừa xem.
  const thieu = fs
    .readdirSync(path.join(GOC, "v3/src/ui"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const t = path.join(GOC, "v3/src/ui", d.name, "trang");
      if (!fs.existsSync(t)) return [];
      return fs
        .readdirSync(t)
        .filter((f) => f.endsWith(".html"))
        .filter((f) => !/<main/.test(fs.readFileSync(path.join(t, f), "utf8")))
        .map((f) => `${d.name}/${f}`);
    });
  assert.deepEqual(thieu, [], `màn thiếu <main> nên lối bỏ qua vô dụng ở đó: ${thieu.join(", ")}`);
});

test("HK6 · màn «Bắt đầu» KHÔNG có CSS riêng — nó là bản mẫu để di trú 25 màn kia", () => {
  // Màn này là màn ĐẦU TIÊN dùng trọn hệ kiểu, nên nó cũng là cái chứng minh hệ kiểu ĐỦ
  // dùng. Có một dòng CSS riêng ở đây là hệ còn thiếu — và chỗ sửa là hệ, không phải trang.
  //
  // Đo 14/09/2026: bản đầu của tôi có 24 thuộc tính `style=` gõ thẳng. Chúng đều dùng
  // token nên không sinh màu lạ, nhưng vẫn là CSS tuỳ hứng trong trang — đúng bệnh 2.206
  // dòng vừa chữa, chỉ nhỏ hơn. Và màn kế tiếp sẽ chép lại chúng rồi lệch dần.
  const tho = fs.readFileSync(path.join(GOC, "v3/src/ui/bat-dau/trang/bat-dau.html"), "utf8");
  // Bỏ chú thích HTML trước khi đo. Chính chú thích của trang có nhắc chữ `<style>` để
  // giải thích VÌ SAO nó không dùng — đo cả chú thích là tự làm thước kêu oan, và lượt
  // đầu nó kêu oan thật.
  const t = tho.replace(/<!--[\s\S]*?-->/g, "");

  const theStyle = t.match(/<style[\s>]/g) || [];
  assert.deepEqual(theStyle, [], "màn Bắt đầu không được có thẻ <style>");

  const goThang = t.match(/\sstyle\s*=\s*"/g) || [];
  assert.equal(
    goThang.length,
    0,
    `còn ${goThang.length} thuộc tính style= gõ thẳng — đặt tên lớp trong `
      + "`chung/kieu.css` rồi dùng lại, đừng gõ trong trang",
  );

  assert.match(tho, /\/chung\/kieu\.css/, "phải nạp hệ kiểu");
});

test("HK7 · màn «Bắt đầu» KHÔNG dựng nguồn dữ liệu hay cửa ghi thứ hai", () => {
  // Đây là phép canh chống «màn thứ tư hiện cùng một dữ liệu». Ba màn đã trả lời từng
  // phần câu «cần làm gì để bot chạy»: /san-sang nói thiếu gì, /page-bot có công tắc,
  // /trang-chu là màn mở đầu. Màn này chỉ NỐI chúng thành một chuỗi có đích đến.
  // Nếu lượt sau ai đó cho nó tự đọc `/readiness` hay tự mở cửa ghi, ca này đỏ.
  const kho = fs.readFileSync(path.join(GOC, "v3/src/ui/bat-dau/kho-bat-dau.js"), "utf8");
  assert.match(kho, /from ['"]\.\.\/san-sang\/kho-san-sang\.js['"]/, "số liệu phải lấy từ /san-sang");
  assert.match(kho, /manSanSang/, "phải gọi manSanSang, KHÔNG tính lại cửa kiểm");
  assert.ok(!/_docSanSang|\/readiness|goiAdminV1/.test(kho), "không được tự đọc cửa kiểm bằng đường riêng");

  const rt = fs.readFileSync(path.join(GOC, "v3/src/ui/bat-dau/router.js"), "utf8");
  const cuaGhi = rt.match(/r\.(post|put|patch|delete)\(/g) || [];
  assert.deepEqual(cuaGhi, [], "màn Bắt đầu KHÔNG được có cửa ghi riêng — nút bật gọi /api/page-bot/:id/bot");

  const trang = fs.readFileSync(path.join(GOC, "v3/src/ui/bat-dau/trang/bat-dau.html"), "utf8");
  assert.match(trang, /\/api\/page-bot\/\$\{encodeURIComponent\(p\.pageId\)\}\/bot/,
    "nút bật phải gọi ĐÚNG đường đã có của màn Page & Bot");
});

test("HK8 · CẦU DI TRÚ phải TEO đi — đếm số màn còn phụ thuộc tên cũ", () => {
  // Cầu di trú (20 token tên cũ trong `ds-dau`) là lớp TẠM. Hai tên cho một thứ chính là
  // mầm lệch nhau; giữ nó chỉ để 25 màn không mất màu giữa đường.
  //
  // Ca này neo CON SỐ. Viết lại một màn theo tên mới thì số giảm và ca đỏ — người sửa hạ
  // con số xuống, và thấy rõ mình vừa đi được một bước. Thêm màn dùng tên cũ thì cũng đỏ.
  // Khi số về 0, xoá cả khối cầu trong `kieu.css` và xoá luôn ca này.
  const UI = path.join(GOC, "v3/src/ui");
  const TEN_CU = /var\(\s*--(bg|panel|ink|muted|xam|line|side|r|sh|pri|priDark|priSoft|ok|okSoft|bad|badSoft|warn|warnSoft|tim|timSoft)\s*\)/;

  const conDung = [];
  for (const d of fs.readdirSync(UI, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const t = path.join(UI, d.name, "trang");
    if (!fs.existsSync(t)) continue;
    for (const f of fs.readdirSync(t).filter((x) => x.endsWith(".html"))) {
      const s = fs.readFileSync(path.join(t, f), "utf8");
      const kieu = (s.match(/<style>[\s\S]*?<\/style>/g) || []).join("\n");
      if (TEN_CU.test(kieu)) conDung.push(`${d.name}/${f}`);
    }
  }

  // 14/09 · 25 → 24: «Công tắc từng page» viết lại trên hệ kiểu, bỏ hết 96 dòng CSS riêng.
  // 14/09 · 24 → 23: «Việc của tôi». 23 → 22: «Kịch bản của page». 22 → 21: «Quy tắc chung».
  //         21 → 20: «Câu trả lời sẵn». 20 → 19: «Chi phí AI».
  //         19 → 18: «Ai đã sửa gì». 18 → 17: «Người và team».
  //         17 → 16: «Kết nối & token». 16 → 15: «Model AI & khoá».
  //         15 → 14: «Page còn thiếu gì». 14 → 13: «Hệ còn sống không».
  //         13 → 11: hai màn của «Việc đang chờ». 11 → 10: «Khách hàng».
  //         10 → 9: «Kỹ năng theo sản phẩm». 9 → 8: «Đơn và tỉ lệ chốt».
  assert.equal(
    conDung.length,
    8,
    `số màn còn phụ thuộc cầu di trú: ${conDung.length} (neo: 8). `
      + "Giảm được thì HẠ con số này. Tăng lên là có màn mới dùng tên cũ — đừng.",
  );

  // Và không màn nào được TỰ KHAI lại token cũ: khai lại là đè hệ kiểu, tức bảng màu mới
  // không tới được màn đó. Đây là chỗ đã đo 14/09 và dọn xong 25/25.
  const tuKhai = [];
  for (const d of fs.readdirSync(UI, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const t = path.join(UI, d.name, "trang");
    if (!fs.existsSync(t)) continue;
    for (const f of fs.readdirSync(t).filter((x) => x.endsWith(".html"))) {
      const s = fs.readFileSync(path.join(t, f), "utf8");
      const kieu = (s.match(/<style>[\s\S]*?<\/style>/g) || []).join("\n");
      if (/(^|[;{\s])--(bg|ink|line|pri|muted|panel|side|sh|r)\s*:/.test(kieu)) tuKhai.push(`${d.name}/${f}`);
    }
  }
  assert.deepEqual(tuKhai, [], `màn TỰ KHAI lại token — hệ kiểu không tới được: ${tuKhai.join(", ")}`);
});

test("HK9 · hệ kiểu và thanh điều hướng KHÔNG được cache dài — lệch bản là tàng hình", () => {
  // ═══ ĐO 14/09/2026, qua ảnh chụp của chủ dự án ═══════════════════════════════════
  // Bản đầu gửi `kieu.css` với `Cache-Control: public, max-age=3600` («tệp này đổi rất
  // thưa»). Trình duyệt giữ bản CSS CŨ — chưa có token cầu `--side` và token `--tren-toi*`
  // — trong khi lấy `dieu-huong.js` MỚI, đã gọi các token ấy. `var()` không giải được thì
  // rơi về màu mặc định, và kết quả trên ảnh:
  //     · thanh bên: chữ TỐI trên nền TỐI, hai nút «Đổi team» «Đăng xuất» chìm hẳn
  //     · tiêu đề màn: chữ TRẮNG trên nền TRẮNG
  // Tám phép canh khác đều xanh. Không phép nào đo được chuyện hai tệp đi LỆCH BẢN nhau,
  // vì trên đĩa chúng khớp — chúng chỉ lệch trong bộ đệm của trình duyệt.
  const rt = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/router-dieu-huong.js"), "utf8");

  for (const tep of ["kieu.css", "dieu-huong.js"]) {
    const i = rt.indexOf(`'/chung/${tep}'`);
    assert.ok(i > 0, `router phải phục vụ /chung/${tep}`);
    const khoi = rt.slice(i, rt.indexOf("});", i));
    assert.ok(!/max-age\s*=\s*[1-9]/.test(khoi),
      `/chung/${tep} KHÔNG được cache dài — hai tệp gọi token của nhau, lệch bản là tàng hình`);
    assert.match(khoi, /no-cache/, `/chung/${tep} phải gửi Cache-Control: no-cache`);
  }

  // Lưới đỡ: thanh điều hướng là thứ DUY NHẤT không bao giờ được tàng hình — mất nó là
  // mất lối đi tới mọi màn khác. Mọi lời gọi token chữ-trên-nền-tối phải có giá trị dự phòng.
  // ⚠️ SIẾT LẠI 14/09 (khung bản 3): bản đầu chỉ soi token chữ-trên-nền-tối. Khung mới
  //    là thanh SÁNG, không còn dùng token ấy — nên phép cũ XANH VÌ KHÔNG CÒN GÌ ĐỂ ĐO,
  //    đúng cảnh «màn trống vẫn đạt». Nay soi MỌI lời gọi token trong khung.
  const nav = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/dieu-huong.js"), "utf8");
  const tatCa = nav.match(/var\(--[a-z0-9-]+[^)]*\)/g) || [];
  assert.ok(tatCa.length > 20, `khung chỉ có ${tatCa.length} lời gọi token — thước đang đo nhầm chỗ`);
  const khongDuPhong = tatCa.filter((v) => !v.includes(","));
  assert.deepEqual(khongDuPhong, [],
    `khung còn ${khongDuPhong.length} lời gọi token KHÔNG có dự phòng — hệ kiểu chưa về là tàng hình`);
});

test("HK10 · tên trên đầu trang KHỚP tên trong menu — «tôi đang ở đâu?»", () => {
  // Mục C của bản đặc tả: mỗi màn phải trả lời trong ~3 giây «tôi đang ở đâu?».
  // Đo 14/09/2026: 17/25 màn có <h1> KHÁC tên menu. Bấm «Công tắc từng page» trên menu
  // thì mở ra trang tên «Page & Bot»; bấm «Ai đã sửa gì» thì ra «Nhật ký thao tác».
  // Người dùng phải tự đoán hai tên ấy là một.
  // Tên màn có MỘT nguồn: `chung/man-hinh.js`. Ca này đỏ khi <h1> trôi khỏi nguồn ấy.
  const UI = path.join(GOC, "v3/src/ui");
  const mh = fs.readFileSync(path.join(UI, "chung/man-hinh.js"), "utf8");
  const bien = Object.fromEntries(
    [...mh.matchAll(/import \* as (\w+) from '\.\.\/([a-z0-9-]+)\/index\.js'/g)].map((m) => [m[1], m[2]]));
  const tenTheoThuMuc = {};
  for (const m of mh.matchAll(/dat\((\w+),\s*'([^']+)'/g)) tenTheoThuMuc[bien[m[1]]] = m[2];

  const lech = [];
  for (const [thuMuc, ten] of Object.entries(tenTheoThuMuc)) {
    const t = path.join(UI, thuMuc, "trang");
    if (!fs.existsSync(t)) continue;
    const tep = fs.readdirSync(t).filter((x) => x.endsWith(".html"));
    const chinh = tep.length === 1 ? tep[0] : tep.find((x) => x === "dieu-phoi.html");
    if (!chinh) continue;
    const h1 = (fs.readFileSync(path.join(t, chinh), "utf8").match(/<h1>([^<]*)<\/h1>/) || [])[1];
    if (h1 == null) continue;
    const giaiMa = h1.replace(/&amp;/g, "&").trim();
    if (giaiMa !== ten) lech.push(`${thuMuc}: đầu trang «${giaiMa}» · menu «${ten}»`);
  }
  assert.deepEqual(lech, [], "đầu trang và menu gọi cùng một màn bằng hai tên:\n  " + lech.join("\n  "));
});

test("HK11 · KHÔNG màn nào tự dựng khung trang — khuôn PageHeader là của hệ", () => {
  // Mục G: mọi màn cùng một khuôn. Đo 14/09: 26/26 màn tự khai CSS cho <header> và
  // `main` — 23 header giống hệt nhau, và `main` có 12 biến thể chỉ khác bề rộng nội
  // dung (900 → 1.440px). Khai lại là đè khuôn chung (CSS không-layer thắng layer).
  const UI = path.join(GOC, "v3/src/ui");
  const tuDung = [];
  for (const d of fs.readdirSync(UI, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const t = path.join(UI, d.name, "trang");
    if (!fs.existsSync(t)) continue;
    for (const f of fs.readdirSync(t).filter((x) => x.endsWith(".html"))) {
      const k = (fs.readFileSync(path.join(t, f), "utf8").match(/<style>[\s\S]*?<\/style>/) || [""])[0];
      if (/^\s*(header(\s+(h1|\.sub|\.sp|a))?|main)\s*\{/m.test(k)) tuDung.push(`${d.name}/${f}`);
    }
  }
  assert.deepEqual(tuDung, [], `màn còn tự dựng khung trang: ${tuDung.join(", ")}`);
});

// ── HK12–HK14 · window.UI — hàm dựng thành phần (giai đoạn 5–6) ──────────────────────
async function napUI() {
  // ui.js là script cổ điển gán `window.UI`. Chạy nó trong một «window» giả để đọc bảng
  // ánh xạ THẬT — không chép lại bảng vào ca kiểm (chép lại thì hai bảng lệch nhau).
  const js = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/ui.js"), "utf8");
  const win = {};
  new Function("window", "document", js)(win, {});
  return win.UI;
}

test("HK12 · ánh xạ trạng thái: «chưa biết» và «không hoạt động» KHÔNG BAO GIỜ tô xanh", async () => {
  // Luật của sổ điều hành: «chưa đo được ≠ đạt». Một ô chưa biết mà tô xanh là cách nhanh
  // nhất để lỗi thật đi qua. Mục H8 của bản đặc tả: ánh xạ ở MỘT chỗ, trang không chọn màu.
  const UI = await napUI();
  const M = UI.TRANG_THAI;
  for (const k of ["unknown", "not_seen", "bot_off", "feature_off", "feature_unavailable",
                   "owner_paused", "owner_closed", "order_collecting", "script_draft"]) {
    assert.ok(M[k], `thiếu trạng thái ${k}`);
    assert.notEqual(M[k].tone, "success", `«${k}» không được tô xanh — chưa biết/không chạy ≠ đạt`);
  }
  // Trạng thái lỗi/chặn phải là danger — không được nhẹ tay thành warning.
  for (const k of ["auto_disabled", "blocked", "check_todo", "order_error", "guard_blocked"]) {
    assert.equal(M[k].tone, "danger", `«${k}» phải là danger`);
  }
  // Trạng thái lạ: HIỆN RA với tone neutral, không nuốt, không đoán màu.
  const la = UI.statusBadge("trang_thai_chua_ai_khai");
  assert.match(la, /data-tone="neutral"/);
  assert.match(la, /trang_thai_chua_ai_khai/);
  // Mọi tone phải là một trong năm nghĩa của hệ (mục E1).
  const hop = new Set(["success", "warning", "danger", "info", "neutral"]);
  for (const [k, v] of Object.entries(M)) assert.ok(hop.has(v.tone), `«${k}» có tone lạ: ${v.tone}`);
});

test("HK13 · hàm dựng THOÁT KÝ TỰ mọi chữ đưa vào — không lỗ chèn HTML", async () => {
  const UI = await napUI();
  const doc = '<img src=x onerror=alert(1)>';
  for (const html of [
    UI.statusBadge("bot_on", { label: doc }),
    UI.button(doc),
    UI.alert({ title: doc, body: doc }),
    UI.emptyState({ title: doc, body: doc }),
    UI.metricRow([{ label: doc, value: doc }]),
    UI.readiness({ title: doc, items: [{ ok: false, name: doc, detail: doc }] }),
  ]) {
    assert.ok(!html.includes("<img"), `hàm dựng để lọt thẻ HTML thô: ${html.slice(0, 80)}`);
  }
});

test("HK14 · biểu tượng có MỘT nguồn, và ba tệp khung đi cùng bản", () => {
  // Mục Q: một bộ biểu tượng. Bản đầu của khung nhúng một bản chép riêng — hai nguồn cho
  // cùng một bộ là mầm lệch nhau. Nay chỉ `ui.js` giữ dữ liệu; khung đọc qua `window.UI`.
  const nav = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/dieu-huong.js"), "utf8");
  const ui = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/ui.js"), "utf8");
  assert.ok(!/<path d=/.test(nav), "khung còn nhúng dữ liệu biểu tượng — phải đọc từ window.UI");
  assert.match(ui, /BIEU_TUONG = Object\.freeze\(\{/, "ui.js phải giữ bộ biểu tượng");
  assert.match(ui, /ISC/, "phải ghi giấy phép của bộ biểu tượng");

  const rt = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/router-dieu-huong.js"), "utf8");
  const i = rt.indexOf("'/chung/ui.js'");
  assert.ok(i > 0, "router phải phục vụ /chung/ui.js");
  assert.match(rt.slice(i, rt.indexOf("});", i)), /no-cache/, "/chung/ui.js phải no-cache — khung gọi nó");

  // Mọi màn nhúng khung phải nạp ui.js ĐỒNG BỘ trong <head> — `defer` chạy SAU khung.
  const UI_DIR = path.join(GOC, "v3/src/ui");
  const sai = [];
  for (const d of fs.readdirSync(UI_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const t = path.join(UI_DIR, d.name, "trang");
    if (!fs.existsSync(t)) continue;
    for (const f of fs.readdirSync(t).filter((x) => x.endsWith(".html"))) {
      const s = fs.readFileSync(path.join(t, f), "utf8");
      if (!s.includes("/chung/dieu-huong.js")) continue;
      const dau = (s.match(/<head>[\s\S]*?<\/head>/) || [""])[0];
      if (!/<script src="\/chung\/ui\.js"><\/script>/.test(dau)) sai.push(`${d.name}/${f}`);
    }
  }
  assert.deepEqual(sai, [], `màn chưa nạp ui.js đồng bộ trong <head>: ${sai.join(", ")}`);
});

test("HK15 · màn ĐÃ DI TRÚ không mọc lại CSS riêng — và danh sách chỉ được DÀI thêm", () => {
  // HK6 canh màn «Bắt đầu». Từ màn thứ hai trở đi, mỗi màn viết lại trên hệ kiểu được ghi
  // tên vào đây. Một <style> hay một `style="…"` mọc lại trong màn đã di trú là CSS tuỳ hứng
  // quay về — đúng bệnh 2.206 dòng vừa chữa. Chỗ sửa là `chung/kieu.css`, không phải trang.
  const DA_DI_TRU = [
    "bat-dau/bat-dau.html",
    "page-bot/page-bot.html",
    "trang-chu/trang-chu.html",
    "kich-ban/kich-ban.html",
    "bo-luat/bo-luat.html",
    "lop-0-dong/lop-0-dong.html",
    "chi-phi/chi-phi.html",
    "nhat-ky/nhat-ky.html",
    "team/cau-hinh-team.html",
    "ket-noi/ket-noi.html",
    "model/model-ai.html",
    "san-sang/san-sang.html",
    "suc-khoe/suc-khoe.html",
    "dispatch/dieu-phoi.html",
    "dispatch/chi-tiet-viec.html",
    "ho-so-khach/ho-so-khach.html",
    "ky-nang/ky-nang.html",
    "bao-cao/bao-cao.html",
  ];
  const UI = path.join(GOC, "v3/src/ui");
  const loi = [];
  for (const ten of DA_DI_TRU) {
    const [thu, tep] = ten.split("/");
    const t = fs.readFileSync(path.join(UI, thu, "trang", tep), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    if (/<style[\s>]/.test(t)) loi.push(`${ten}: có thẻ <style>`);
    const n = (t.match(/\sstyle\s*=\s*["'`$]/g) || []).length;
    if (n) loi.push(`${ten}: ${n} thuộc tính style= gõ thẳng`);
    if (!/\/chung\/kieu\.css/.test(t)) loi.push(`${ten}: không nạp hệ kiểu`);
  }
  assert.deepEqual(loi, [], "màn đã di trú mọc lại CSS riêng:\n  " + loi.join("\n  "));
});
