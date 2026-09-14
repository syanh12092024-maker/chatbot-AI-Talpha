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

  assert.equal(
    conDung.length,
    25,
    `số màn còn phụ thuộc cầu di trú: ${conDung.length} (neo: 25). `
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
  const nav = fs.readFileSync(path.join(GOC, "v3/src/ui/chung/dieu-huong.js"), "utf8");
  const khongDuPhong = nav.match(/var\(--(tren-toi[a-z0-9-]*|toi)\)/g) || [];
  assert.deepEqual(khongDuPhong, [],
    `thanh bên còn ${khongDuPhong.length} lời gọi token chữ-trên-nền-tối KHÔNG có dự phòng`);
});
