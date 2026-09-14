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
