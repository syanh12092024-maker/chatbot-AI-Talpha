// KHUNG ỨNG DỤNG — MỘT nguồn markup cho thanh trên cùng (LL18 · 29/09 · CR-28-09c).
//
// Hàm THUẦN, không import gì: máy chủ gọi để vẽ khung VÀO SẴN trong HTML trả về (`khung-may-chu.js`), và
// trình duyệt nạp đúng tệp này (`/chung/khung.js`) làm đường lùi khi một trang không đi qua máy chủ vẽ.
//
// VÌ SAO VẼ Ở MÁY CHỦ. Đo 29/09 từ máy người dùng tới prod: RTT ~320 ms, tải 2–54 KB/s. Bản trước dựng menu
// bằng JS ở CUỐI trang, SAU một lượt hỏi `/api/dieu-huong` ⇒ mỗi lần bấm menu, trang mới hiện ra TRẦN (không
// menu, không thanh trên), rồi menu chèn vào và đẩy cả trang sang phải 240px. Chụp liền 150 ms dưới mạng giả
// lập: trang hiện ở ~0,75 s, menu tới ~1,15 s. Vẽ sẵn trong HTML thì menu có ngay ở lần vẽ đầu tiên.
//
// BỐ CỤC THEO BẢN VẼ «AI Closer — làm lại từ đầu» (artifact A6D68jyQ…, bản 5): thanh NGANG trên cùng —
// logo · team · NĂM ĐÍCH · tài khoản — và một dải «Trong mục X» ngay dưới cho các mục con của đích. Thay
// thanh bên tối 240px. Ba tầng, không hơn: đích (hàng 1) → mục (hàng 2) → tab cụm trong trang.

const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** Tên vai người đọc được, cho góc tài khoản («Linh · Sale» như bản vẽ). Mã lạ thì in nguyên mã. */
export const TEN_VAI = Object.freeze({
  "quan-tri": "Quản trị", marketer: "Marketer", sale: "Sale",
  "quan-ly": "Quản lý", "duyet-kich-ban": "Duyệt kịch bản",
});

/**
 * Màn đang đứng: khớp đúng đường, hoặc là màn CON của một màn trong menu (`/dieu-phoi/viec/123` là chi tiết
 * của «Việc đang chờ», `/page/42` là chi tiết của page). Đường lạ ⇒ null, không đoán bừa.
 */
export function timChoDung(d, nay) {
  for (const n of d.nhom || []) {
    for (const m of n.man || []) {
      if (m.duong === nay) return { nhom: n, man: m, sau: null };
    }
  }
  for (const n of d.nhom || []) {
    for (const m of n.man || []) {
      if (m.duong !== "/" && nay.startsWith(m.duong + "/")) return { nhom: n, man: m, sau: true };
    }
  }
  return null;
}

const hienCum = (n, cum) => (n.man || []).filter((x) => x.cum === cum && (!x.an || x.trongCum));

/**
 * Hàng 2 — «Trong mục X». Luật (một chỗ, cả máy chủ lẫn trình duyệt đọc):
 *   · mục có MỘT dòng hiện và dòng ấy đứng đầu một cụm (Số liệu · Cài đặt) ⇒ hàng 2 là CÁC TAB của cụm —
 *     không bắt người dùng đi qua một tầng chỉ có một lựa chọn;
 *   · mục có ≥ 2 dòng hiện (Hộp thư · Page) ⇒ hàng 2 là các dòng ấy; cụm của dòng đang đứng thành tab trong trang;
 *   · dưới hai mục thì không vẽ hàng 2 (Sản phẩm).
 * Trả `{ muc: [{duong, ten, dangO}], laCum }`.
 */
export function hangHai(n, cho) {
  if (!n) return { muc: [], laCum: false };
  const hien = (n.man || []).filter((m) => !m.an);
  if (hien.length === 1 && hien[0].cum) {
    const tab = hienCum(n, hien[0].cum);
    return {
      laCum: true,
      muc: tab.map((m) => ({ duong: m.duong, ten: m.nhanCum || m.tenMenu || m.ten, dangO: !!cho && cho.man === m })),
    };
  }
  return {
    laCum: false,
    muc: hien.map((m) => ({
      duong: m.duong,
      ten: m.tenMenu || m.ten,
      // `nhaCum` (VE2): màn chi tiết có nhà là một cụm (trang một page ∈ «Tất cả page») ⇒ sáng mục của cụm ấy.
      dangO: !!cho && (cho.man === m || (!!m.cum && (cho.man.cum === m.cum || cho.man.nhaCum === m.cum))),
    })),
  };
}

/** Đường của một đích = dòng hiện đầu tiên của nó (đầu cụm nếu là cụm). */
const duongDich = (n) => ((n.man || []).find((m) => !m.an) || (n.man || [])[0] || {}).duong || "/";

/**
 * Vẽ khung. `d` = đúng dạng `/api/dieu-huong` trả (tenDangNhap · teamId · tenTeam · vai · nhom).
 * Trả chuỗi HTML một khối `<div class="kh" data-khung>`; `soHang` cho CSS tính chiều cao vùng làm việc.
 */
export function veKhung(d, nay) {
  const cho = timChoDung(d, nay);
  const nhom = d.nhom || [];
  const hai = hangHai(cho && cho.nhom, cho);
  const coHai = hai.muc.length >= 2;
  const tenTeam = d.tenTeam || (d.teamId != null ? "team " + d.teamId : "");
  const vai = (d.vai || []).map((v) => TEN_VAI[v] || v).join(", ");
  const chuDau = esc((String(d.tenDangNhap || "?").trim()[0] || "?").toUpperCase());
  const dauTien = nhom.length ? duongDich(nhom[0]) : "/";

  const dich = nhom.map((n) => {
    const o = !!cho && cho.nhom === n;
    return `<a href="${esc(duongDich(n))}"${o ? ' aria-current="page"' : ""}>${esc(n.ten)}</a>`;
  }).join("");

  const hang2 = coHai
    ? `<nav class="kh-hai" aria-label="Trong mục ${esc(cho.nhom.ten)}">` +
      hai.muc.map((m) => `<a href="${esc(m.duong)}"${m.dangO ? ' aria-current="page"' : ""}>${esc(m.ten)}</a>`).join("") +
      "</nav>"
    : "";

  const html =
    `<div class="kh" data-khung data-so-hang="${coHai ? 2 : 1}">` +
    `<header class="kh-tren">` +
    `<a class="kh-logo" href="${esc(dauTien)}"><span class="kh-logo-o" aria-hidden="true">AC</span><span class="kh-logo-chu">AI Closer</span></a>` +
    (tenTeam ? `<a class="kh-team" href="/chon-team" title="Đổi team">${esc(tenTeam)}<span aria-hidden="true"> ▾</span></a>` : "") +
    `<nav class="kh-dich" aria-label="Chính">${dich}</nav>` +
    `<span class="kh-khoang"></span>` +
    `<span class="kh-bot" id="dh-dai" data-tone="neutral" aria-live="polite" title="Bao nhiêu page đang bật bot"><b>Bot: đang đọc…</b></span>` +
    `<div class="kh-tk">` +
    `<button type="button" class="kh-tk-nut" aria-haspopup="menu" aria-expanded="false" aria-controls="kh-tk-hop">` +
    `<span class="kh-avatar" aria-hidden="true">${chuDau}</span>` +
    `<span class="kh-tk-ten">${esc(d.tenDangNhap || "")}${vai ? ` · ${esc(vai)}` : ""}</span></button>` +
    `<div class="kh-tk-hop" id="kh-tk-hop" role="menu" hidden>` +
    `<div class="kh-tk-dau"><b>${esc(d.tenDangNhap || "")}</b>${esc(tenTeam)}${vai ? ` · vai: ${esc(vai)}` : ""}</div>` +
    `<button type="button" class="doi" role="menuitem" data-di="/chon-team">Đổi team</button>` +
    `<button type="button" class="ra" role="menuitem">Đăng xuất</button>` +
    `</div></div>` +
    `</header>` +
    hang2 +
    `</div>`;
  return { html, soHang: coHai ? 2 : 1, cho };
}

/**
 * Tab CỤM trong trang (LL3): màn thuộc một cụm có ≥ 2 màn vai này mở được, và cụm đó CHƯA nằm ở hàng 2.
 * Trả chuỗi `<nav class="tabs" data-cum>` để đặt cuối `body > header` của trang, hoặc "".
 */
export function veTabCum(d, nay) {
  const cho = timChoDung(d, nay);
  if (!cho || !cho.man.cum || cho.sau) return "";
  if (hangHai(cho.nhom, cho).laCum) return "";
  const tab = hienCum(cho.nhom, cho.man.cum);
  if (tab.length < 2) return "";
  const dau = tab.find((x) => x.tenMenu) || cho.man;
  return `<nav class="tabs" data-cum="${esc(cho.man.cum)}" aria-label="Trong ${esc(dau.tenMenu || dau.ten)}">` +
    tab.map((x) => `<a class="tab" href="${esc(x.duong)}"${x === cho.man ? ' aria-current="page"' : ""}>${esc(x.nhanCum || x.ten)}</a>`).join("") +
    "</nav>";
}
