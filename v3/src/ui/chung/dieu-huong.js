// KHUNG ỨNG DỤNG — thanh bên + thanh trên cùng. Nhúng vào MỌI trang bằng một thẻ <script>.
//
// Không trang nào phải viết lại khung, và thêm một màn mới thì chỉ khai một dòng ở
// `chung/man-hinh.js`.
//
// ⚠️ Menu tải từ `/api/dieu-huong`, đã LỌC THEO VAI ở máy chủ. Trang không tự lọc.
//
// ═══ BẢN 3 · 14/09/2026 — theo mục F của bản đặc tả vận hành ═════════════════════════
// Bản 2 là thanh bên TỐI, mỗi mục HAI dòng (tên + mô tả), tài khoản dưới đáy, và một
// THANH TAB liệt kê các màn cùng mục. Ba chuyện đo được:
//   · thanh tab lặp đúng thứ thanh bên đã hiện — hai nơi điều hướng cho cùng một việc;
//   · chữ trên nền tối là chỗ vừa TÀNG HÌNH khi CSS và JS lệch bản (ảnh chụp 14/09);
//   · không có thanh trên cùng, nên không có chỗ nào nói «tôi đang ở đâu» ngoài <h1>.
// Nay:
//   · THANH BÊN (F1) — sáng, 240px, mục 36px có biểu tượng, nhóm là nhãn gọn. Mục chứa
//     màn đang đứng tự bung. Tối đa HAI tầng (nhóm → màn), không lồng sâu hơn.
//   · THANH TRÊN CÙNG (F2) — 52px. Trái: đường dẫn vị trí «Nhóm / Màn». Phải: menu tài
//     khoản. KHÔNG nút riêng của từng màn — đó là việc của PageHeader.
//   · BỎ THANH TAB — trùng với thanh bên.
//   · Màn hẹp (< 900px): thanh bên thành ngăn kéo, thanh trên cùng có nút mở.
//
// ⛔ LUẬT CỦA TỆP NÀY (mỗi luật là một lần đã hỏng thật):
//   · KHÔNG dấu huyền ngược trong chú thích CSS — CSS nằm TRONG một template literal,
//     một dấu là đóng chuỗi sớm, cả tệp lỗi cú pháp, menu biến mất khỏi mọi trang mà
//     trang vẫn hiện bình thường (01/09). Ca ⑤c canh.
//   · Mọi màu trong khung CÓ GIÁ TRỊ DỰ PHÒNG: khung là thứ duy nhất không được tàng hình,
//     kể cả khi hệ kiểu chưa về kịp (14/09). Ca HK9 canh.
//   · Lối đổi team và đăng xuất KHÔNG lọc theo vai: vai sale cũng phải thoát được. Ca ⑤b.
//   · Menu hỏng KHÔNG được làm hỏng trang: mọi thứ bọc trong try/catch của chính nó.

(function () {
  // ── HỆ KIỂU: nạp `chung/kieu.css` cho MỌI trang ─────────────────────────────────
  // Chèn ở đây để 26 màn không phải tự khai, và màn mới không thể quên. Đặt LÊN ĐẦU <head>;
  // chuyện ai thắng ai do `@layer` trong tệp ấy định, không do thứ tự.
  (function napHeKieu() {
    if (document.querySelector('link[data-ds="v3"]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/chung/kieu.css";
    l.dataset.ds = "v3";
    const dau = document.head || document.documentElement;
    dau.insertBefore(l, dau.firstChild);
  })();

  // ── LỐI BỎ QUA: Tab đầu tiên ở mọi trang là «Tới nội dung» ──────────────────────
  // Không có nó thì người dùng bàn phím phải Tab qua cả thanh bên và thanh trên cùng.
  document.addEventListener("DOMContentLoaded", function catLoiBoQua() {
    if (document.querySelector("a.bo-qua")) return;
    const than = document.querySelector("main");
    if (!than) return;
    if (!than.id) than.id = "noi-dung";
    than.setAttribute("tabindex", "-1");
    const a = document.createElement("a");
    a.className = "bo-qua";
    a.href = "#" + than.id;
    a.textContent = "Tới nội dung";
    document.body.insertBefore(a, document.body.firstChild);
  });

  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );

  // ── BIỂU TƯỢNG — lấy từ `chung/ui.js`, MỘT nguồn (mục Q) ────────────────────────
  // Bản đầu nhúng một bản chép 16 biểu tượng ngay ở đây — hai nguồn cho cùng một bộ là mầm
  // lệch nhau. Nay đọc `window.UI.icon`. ui.js hỏng thì khung VẪN CHẠY, chỉ mất biểu
  // tượng: một menu không có hình vẫn dùng được, một menu lỗi thì không.
  function bieuTuong(ten, lop) {
    try {
      if (window.UI && typeof window.UI.icon === "function") {
        return window.UI.icon(ten, { className: lop });
      }
    } catch { /* rơi về rỗng */ }
    return "";
  }

  const RONG = 240; // mục F1
  const NGUONG = 900; // dưới ngưỡng này thanh bên thành ngăn kéo

  const css = `
    .dh-ngan{position:fixed;top:0;left:0;bottom:0;width:${RONG}px;z-index:9999;display:flex;
      flex-direction:column;background:var(--surface, #ffffff);color:var(--text-primary, #101828);
      border-right:1px solid var(--border-default, #e1e4ea);font-size:14px}
    .dh-dau{flex:none;height:52px;display:flex;align-items:center;gap:10px;padding:0 16px;
      border-bottom:1px solid var(--border-subtle, #eaecf0)}
    .dh-logo{width:26px;height:26px;flex:none;border-radius:6px;display:inline-flex;
      align-items:center;justify-content:center;background:var(--primary, #1d4ed8);
      color:var(--primary-foreground, #ffffff)}
    .dh-ten{font-weight:600;font-size:14px;line-height:1.2}
    .dh-ten small{display:block;font-weight:400;font-size:12px;color:var(--text-muted, #667085)}

    /* DẢI TRẠNG THÁI — trả lời «cái gì đang chạy» (mục C). Số nổi bật là SỐ PAGE ĐANG BẬT;
       tổng page chỉ là mẫu số. Ngày 11/09 người tiếp quản đọc «501 page» thành «đang chạy
       501 page» trong khi thật ra 0 page bật AI. Chấm có HÌNH khác nhau theo nghĩa — mục T. */
    .dh-dai{flex:none;margin:12px 12px 4px;padding:8px 10px;border-radius:6px;font-size:12px;
      line-height:1.4;border:1px solid var(--border-default, #e1e4ea);
      background:var(--surface-subtle, #fafbfc);color:var(--text-muted, #667085)}
    .dh-dai b{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;
      color:var(--text-primary, #101828)}
    .dh-dai b::before{content:"";width:7px;height:7px;flex:none;border-radius:50%;background:currentColor}
    .dh-dai[data-tone="success"] b{color:var(--success, #067647)}
    .dh-dai[data-tone="danger"] b{color:var(--danger, #b42318)}
    .dh-dai[data-tone="danger"] b::before{border-radius:1px}
    .dh-dai[data-tone="neutral"] b::before{background:transparent;box-shadow:inset 0 0 0 1.5px currentColor}

    .dh-than{flex:1;overflow-y:auto;padding:8px;overscroll-behavior:contain}
    .dh-muc{width:100%;height:36px;display:flex;align-items:center;gap:10px;padding:0 10px;
      border:0;border-radius:6px;background:none;cursor:pointer;text-align:left;
      font:inherit;font-size:14px;font-weight:500;color:var(--text-secondary, #475467)}
    .dh-muc:hover{background:var(--surface-hover, #f5f7fa);color:var(--text-primary, #101828)}
    .dh-muc[data-dang-o="true"]{color:var(--text-primary, #101828)}
    .dh-mui{margin-left:auto;color:var(--text-disabled, #98a2b3);transition:transform 120ms ease}
    .dh-muc[aria-expanded="true"] .dh-mui{transform:rotate(90deg)}
    .dh-con{padding:2px 0 8px}
    .dh-con[hidden]{display:none}
    .dh-con a{display:flex;align-items:center;height:32px;padding:0 10px 0 36px;border-radius:6px;
      text-decoration:none;font-size:13px;color:var(--text-secondary, #475467);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .dh-con a:hover{background:var(--surface-hover, #f5f7fa);color:var(--text-primary, #101828)}
    .dh-con a[aria-current="page"]{background:var(--surface-selected, #eef3ff);
      color:var(--primary, #1d4ed8);font-weight:500}

    /* VẠCH «Ít dùng» — ranh giới BÊN TRONG một nhóm. Màn dưới vạch vẫn ở menu: bỏ hẳn
       thì người vào bằng đường dẫn là kẹt. */
    .dh-vach{display:flex;align-items:center;gap:8px;padding:10px 10px 4px 36px;font-size:11px;
      font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--text-disabled, #98a2b3)}
    .dh-vach::after{content:"";flex:1;height:1px;background:var(--border-subtle, #eaecf0)}


    /* THANH TRÊN CÙNG — mục F2. Chỉ thứ dùng chung cho cả sản phẩm. */
    .dh-top{position:sticky;top:0;z-index:9990;height:52px;display:flex;align-items:center;gap:12px;
      padding:0 24px;background:var(--surface, #ffffff);border-bottom:1px solid var(--border-default, #e1e4ea)}
    .dh-dd{display:flex;align-items:center;gap:6px;min-width:0;margin:0;padding:0;list-style:none;
      font-size:13px;color:var(--text-muted, #667085)}
    .dh-dd li{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap}
    .dh-dd li + li::before{content:"/";color:var(--text-disabled, #98a2b3)}
    .dh-dd li[aria-current="page"]{color:var(--text-primary, #101828);font-weight:500;
      overflow:hidden;text-overflow:ellipsis}
    .dh-khoang{flex:1}

    .dh-tai-khoan{position:relative;flex:none}
    .dh-tk-nut{display:flex;align-items:center;gap:8px;height:36px;padding:0 8px 0 4px;border:0;
      border-radius:6px;background:none;cursor:pointer;font:inherit;font-size:13px;
      color:var(--text-primary, #101828)}
    .dh-tk-nut:hover{background:var(--surface-muted, #f2f4f7)}
    .dh-avatar{width:28px;height:28px;flex:none;border-radius:50%;display:inline-flex;
      align-items:center;justify-content:center;font-size:12px;font-weight:600;
      background:var(--surface-muted, #f2f4f7);color:var(--text-secondary, #475467)}
    .dh-tk-ten{display:flex;flex-direction:column;align-items:flex-start;line-height:1.2;text-align:left}
    .dh-tk-ten small{font-size:11px;color:var(--text-muted, #667085)}

    /* KHỐI TÀI KHOẢN — đổi team và đăng xuất. Trước 01/09 chỉ MỘT trong 25 trang có lối
       này: người thuộc nhiều team phải xoá cookie, và vai sale thì kẹt hẳn. */
    .dh-tk{position:absolute;right:0;top:calc(100% + 6px);width:248px;padding:6px;z-index:10000;
      background:var(--surface, #ffffff);border:1px solid var(--border-default, #e1e4ea);border-radius:8px;
      box-shadow:var(--shadow-popover, 0 4px 12px rgba(16,24,40,.08))}
    .dh-tk[hidden]{display:none}
    .dh-tk-dau{padding:8px 10px 10px;margin-bottom:4px;font-size:12px;line-height:1.45;
      color:var(--text-muted, #667085);border-bottom:1px solid var(--border-subtle, #eaecf0)}
    .dh-tk-dau b{display:block;font-size:13px;font-weight:600;color:var(--text-primary, #101828)}
    .dh-tk button{width:100%;height:34px;display:flex;align-items:center;gap:8px;padding:0 10px;
      border:0;border-radius:6px;background:none;cursor:pointer;text-align:left;font:inherit;
      font-size:13px;color:var(--text-primary, #101828)}
    .dh-tk button:hover{background:var(--surface-hover, #f5f7fa)}
    .dh-tk button.ra{color:var(--danger, #b42318)}
    .dh-tk button.ra:hover{background:var(--danger-bg, #fef3f2)}

    .dh-nut{display:none;align-items:center;justify-content:center;width:36px;height:36px;flex:none;
      margin-left:-8px;border:0;border-radius:6px;background:none;cursor:pointer;
      color:var(--text-secondary, #475467)}
    .dh-nut:hover{background:var(--surface-muted, #f2f4f7)}
    .dh-phu{position:fixed;inset:0;z-index:9998;display:none;background:var(--scrim, rgba(16,24,40,.38))}
    .dh-phu.mo{display:block}

    /* Màn HẸP: thanh bên thành ngăn kéo, trang lấy lại toàn bộ bề ngang. */
    @media (max-width:${NGUONG - 1}px){
      .dh-nut{display:inline-flex}
      .dh-ngan{width:280px;max-width:86vw;transform:translateX(-100%);transition:transform 180ms ease;
        box-shadow:var(--shadow-overlay, 0 20px 48px rgba(16,24,40,.18))}
      .dh-ngan.mo{transform:none}
      body{padding-left:0 !important}
      .dh-top{padding:0 16px}
      .dh-tk-ten{display:none}
    }
    @media (prefers-reduced-motion: reduce){
      .dh-ngan,.dh-mui{transition:none}
    }`;

  function chuDau(ten) {
    const t = String(ten || "?").trim();
    return esc((t[0] || "?").toUpperCase());
  }

  // Màn đang đứng: khớp đúng đường, hoặc là màn CON của một màn trong menu
  // (ví dụ `/dieu-phoi/viec/123` là chi tiết của «Việc đang chờ»).
  function timChoDung(d, nay) {
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

  function dung(d) {
    const nay = location.pathname.replace(/\/$/, "") || "/";
    const cho = timChoDung(d, nay);

    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);

    // ── THANH BÊN ─────────────────────────────────────────────────────────────────
    const phu = document.createElement("div");
    phu.className = "dh-phu";
    const ngan = document.createElement("nav");
    ngan.className = "dh-ngan";
    ngan.setAttribute("aria-label", "Điều hướng chính");

    ngan.innerHTML = `
      <div class="dh-dau">
        <span class="dh-logo">${bieuTuong("bot")}</span>
        <span class="dh-ten">AI Closer<small>Vận hành bán hàng có AI</small></span>
      </div>
      <div class="dh-dai" id="dh-dai" data-tone="neutral" aria-live="polite"><b>Đang đọc…</b>bao nhiêu page đang bật bot</div>
      <div class="dh-than">
        ${(d.nhom || [])
          .map((n, i) => {
            const dangO = !!(cho && cho.nhom === n);
            const idCon = "dh-con-" + i;
            return `
          <button type="button" class="dh-muc" data-muc="${i}" data-dang-o="${dangO}"
            aria-expanded="${dangO}" aria-controls="${idCon}" title="${esc(n.mo || "")}">
            ${bieuTuong(n.bieuTuong || "layout-dashboard")}
            <span>${esc(n.ten)}</span>
            ${bieuTuong("chevron-right", "dh-mui")}
          </button>
          <div class="dh-con" id="${idCon}" ${dangO ? "" : "hidden"}>
            ${(n.man || [])
              .map((m, k) => {
                const dauItDung = m.itDung && !(n.man[k - 1] || {}).itDung;
                const laDay = !!(cho && cho.man === m);
                return (
                  (dauItDung ? '<div class="dh-vach">Ít dùng</div>' : "") +
                  `<a href="${esc(m.duong)}" title="${esc(m.moTa || "")}"` +
                  `${laDay ? ' aria-current="page"' : ""}>${esc(m.ten)}</a>`
                );
              })
              .join("")}
          </div>`;
          })
          .join("")}
      </div>
`;

    document.body.appendChild(phu);
    document.body.appendChild(ngan);

    for (const nut of ngan.querySelectorAll(".dh-muc")) {
      const i = Number(nut.dataset.muc);
      const n = d.nhom[i];
      const con = ngan.querySelector("#dh-con-" + i);
      nut.onclick = () => {
        // Nhóm CHỈ CÓ MỘT màn thì bấm là đi thẳng — không bắt bung ra để bấm lần hai.
        if ((n.man || []).length === 1) { location.href = n.man[0].duong; return; }
        const mo = nut.getAttribute("aria-expanded") !== "true";
        nut.setAttribute("aria-expanded", String(mo));
        con.hidden = !mo;
      };
    }

    // ── THANH TRÊN CÙNG ───────────────────────────────────────────────────────────
    const top = document.createElement("div");
    top.className = "dh-top";
    const tenTrang = (document.querySelector("body > header h1") || {}).textContent || "";
    const vungDuong = cho
      ? `<li>${esc(cho.nhom.ten)}</li>` +
        (cho.sau
          ? `<li><a href="${esc(cho.man.duong)}">${esc(cho.man.ten)}</a></li>` +
            `<li aria-current="page">${esc(tenTrang.trim() || "Chi tiết")}</li>`
          : `<li aria-current="page">${esc(cho.man.ten)}</li>`)
      : `<li aria-current="page">${esc(tenTrang.trim() || document.title)}</li>`;
    top.innerHTML = `
      <button type="button" class="dh-nut" aria-label="Mở menu">${bieuTuong("menu")}</button>
      <ol class="dh-dd" aria-label="Vị trí">${vungDuong}</ol>
      <span class="dh-khoang"></span>
      <div class="dh-tai-khoan">
        <button type="button" class="dh-tk-nut" aria-haspopup="menu" aria-expanded="false" aria-controls="dh-tk">
          <span class="dh-avatar">${chuDau(d.tenDangNhap)}</span>
          <span class="dh-tk-ten">${esc(d.tenDangNhap || "")}<small>team ${esc(d.teamId || "?")}</small></span>
        </button>
        <div class="dh-tk" id="dh-tk" role="menu" hidden>
          <div class="dh-tk-dau"><b>${esc(d.tenDangNhap || "")}</b>
            team ${esc(d.teamId || "?")} · vai: ${esc((d.vai || []).join(", ") || "không có")}</div>
          <button type="button" class="doi" role="menuitem">${bieuTuong("repeat")}Đổi team</button>
          <button type="button" class="ra" role="menuitem">${bieuTuong("log-out")}Đăng xuất</button>
        </div>
      </div>`;
    document.body.insertBefore(top, document.body.firstChild);

    const nutTk = top.querySelector(".dh-tk-nut");
    const hopTk = top.querySelector(".dh-tk");
    const dongTk = () => { hopTk.hidden = true; nutTk.setAttribute("aria-expanded", "false"); };
    nutTk.onclick = (e) => {
      e.stopPropagation();
      const mo = hopTk.hidden;
      hopTk.hidden = !mo;
      nutTk.setAttribute("aria-expanded", String(mo));
      if (mo) (hopTk.querySelector("button") || {}).focus?.();
    };
    document.addEventListener("click", (e) => { if (!hopTk.hidden && !hopTk.contains(e.target)) dongTk(); });

    // Đổi team: về đúng màn chọn team của `auth/router.js`, không tự dựng màn thứ hai.
    hopTk.querySelector(".doi").onclick = () => { location.href = "/chon-team"; };

    // Đăng xuất: cửa là POST (xoá cookie ở máy chủ), nên không thể là một thẻ <a>.
    // Hỏng thì vẫn đưa người ta về trang đăng nhập — kẹt lại trong hệ tệ hơn.
    hopTk.querySelector(".ra").onclick = async () => {
      try { await fetch("/api/dang-xuat", { method: "POST", credentials: "same-origin" }); }
      catch { /* mạng hỏng — vẫn đi tiếp */ }
      location.href = "/dang-nhap";
    };

    // Trang chừa chỗ cho thanh bên. Màn hẹp thì media query tự gỡ.
    document.body.style.paddingLeft = `${RONG}px`;

    const dongNgan = () => { phu.classList.remove("mo"); ngan.classList.remove("mo"); };
    phu.onclick = dongNgan;
    top.querySelector(".dh-nut").onclick = () => { phu.classList.add("mo"); ngan.classList.add("mo"); };
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      dongNgan();
      if (!hopTk.hidden) { dongTk(); nutTk.focus(); }
    });

    dungDaiTrangThai(ngan);
  }

  /**
   * Dải trạng thái. Nạp RIÊNG và SAU menu: cửa của nó gọi sang tiến trình bot v1 và có thể
   * mất tới 25 giây. Hỏng thì nói «chưa đọc được» — KHÔNG hiện số 0, vì «0 page đang bật»
   * và «chưa biết page nào đang bật» là hai câu khác hẳn nhau.
   */
  function dungDaiTrangThai(ngan) {
    const o = ngan.querySelector("#dh-dai");
    if (!o) return;
    fetch("/api/trang-thai-bot", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.ok) throw new Error("khong doc duoc");
        if (!d.docDuoc) {
          o.dataset.tone = "neutral";
          o.innerHTML = "<b>Chưa đọc được</b>" + esc(d.viSao || "Không rõ có page nào đang bật bot.");
          return;
        }
        const bat = Number(d.aiBat) || 0;
        const tong = Number(d.tong) || 0;
        o.dataset.tone = bat > 0 ? "success" : "danger";
        o.innerHTML = bat > 0
          ? `<b>Bot đang chạy ${bat}/${tong} page</b>số page còn lại chưa bật`
          : `<b>Bot đang tắt ở mọi page</b>0/${tong} page bật — hệ không phục vụ khách`;
      })
      .catch(() => {
        o.dataset.tone = "neutral";
        o.innerHTML = "<b>Chưa đọc được</b>không rõ có page nào đang bật bot";
      });
  }

  fetch("/api/dieu-huong", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && d.ok) dung(d);
    })
    .catch(() => {
      /* menu hỏng KHÔNG được làm hỏng trang — trang vẫn dùng được */
    });
})();
