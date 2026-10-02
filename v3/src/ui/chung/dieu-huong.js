// KHUNG ỨNG DỤNG — phần CHẠY trên trình duyệt. Nhúng vào MỌI trang bằng một thẻ <script>.
//
// ═══ BẢN 5 · 29/09/2026 — LL18 (CR-28-09c) ═══════════════════════════════════════════
// Bản 4 dựng cả thanh bên tối 240px lẫn thanh trên cùng bằng JS, SAU một lượt hỏi `/api/dieu-huong`.
// Người dùng báo 29/09: «bấm menu để chuyển màn bị nhảy màn, mất menu sau đó mới hiện lại», «load chậm»,
// và giao diện «không giống bản artifact». Đo cùng ngày: RTT ~320 ms tới prod; chụp liền 150 ms dưới mạng
// giả lập thấy trang hiện TRẦN ~0,4 s rồi menu mới chèn vào, đẩy cả trang sang phải 240px.
// Nay:
//   · MÁY CHỦ vẽ sẵn khung vào HTML (`khung-may-chu.js` gọi `khung.js`) — menu có ngay lần vẽ đầu;
//   · khung theo BẢN VẼ: thanh NGANG — logo · team · năm đích · tài khoản — và dải «Trong mục X» bên dưới;
//   · tệp này chỉ GẮN HÀNH VI (menu tài khoản · đăng xuất · dải trạng thái bot). Trang nào không đi qua máy
//     chủ vẽ thì tệp này tự dựng khung từ CÙNG `khung.js` (đường lùi — một nguồn markup, không hai).
//   · CSS khung nằm trong `kieu.css` (cùng tệp với token): khung và màu của nó về CÙNG lúc, không thể lệch.
//
// ⛔ LUẬT CỦA TỆP NÀY (mỗi luật là một lần đã hỏng thật):
//   · Lối đổi team và đăng xuất KHÔNG lọc theo vai: vai sale cũng phải thoát được. Ca ⑤b.
//   · Menu hỏng KHÔNG được làm hỏng trang: mọi thứ bọc trong try/catch của chính nó.
//   · Tệp phải parse được như script thường (ca ⑤c) — không `import` tĩnh; đường lùi dùng `import()`.

(function () {
  // ── HỆ KIỂU: trang nào chưa tự khai <link> tới `kieu.css` thì chèn (đường lùi — máy chủ đã chèn sẵn) ──
  (function napHeKieu() {
    if (document.querySelector('link[data-ds="v3"], link[href^="/chung/kieu.css"]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/chung/kieu.css";
    l.dataset.ds = "v3";
    const dau = document.head || document.documentElement;
    dau.insertBefore(l, dau.firstChild);
  })();

  // ── CHỮ BẢN 4: IBM Plex Sans + Plex Mono (máy chủ đã chèn sẵn, KHÔNG chặn vẽ; đây là đường lùi) ──
  (function napChu() {
    if (document.querySelector('link[data-ds="chu"]')) return;
    const dau = document.head || document.documentElement;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500"
      + "&family=IBM+Plex+Sans:wght@400;500;600&display=swap&subset=vietnamese";
    l.dataset.ds = "chu";
    dau.appendChild(l);
  })();

  // ── LỐI BỎ QUA: Tab đầu tiên ở mọi trang là «Tới nội dung» ──────────────────────
  // Không có nó thì người dùng bàn phím phải Tab qua cả thanh trên cùng.
  function catLoiBoQua() {
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
  }

  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );

  // Biểu tượng lấy từ `chung/ui.js` (MỘT nguồn, mục Q). ui.js hỏng thì khung VẪN CHẠY, chỉ mất hình.
  function bieuTuong(ten) {
    try {
      if (window.UI && typeof window.UI.icon === "function") return window.UI.icon(ten);
    } catch { /* rơi về rỗng */ }
    return "";
  }

  // ── MENU ĐỔI TEAM NHỎ (LL15c · 02/10) — người nhiều team mà không phải quản trị: chip team mở menu ngay tại chỗ,
  // bấm một team ⇒ `POST /api/chon-team` (cửa đổi team có sẵn) ⇒ về màn đầu của vai. Quản trị vẫn sang màn chọn team.
  // Trả hàm mở menu (cho mục «Đổi team» của menu tài khoản), hoặc null khi khung không có menu này.
  function noiMenuTeam(khung) {
    const nut = khung.querySelector("button.kh-team");
    const hop = khung.querySelector(".kh-team-hop");
    if (!nut || !hop) return null;
    const dong = () => { hop.hidden = true; nut.setAttribute("aria-expanded", "false"); };
    const mo = () => { hop.hidden = false; nut.setAttribute("aria-expanded", "true"); (hop.querySelector("button") || {}).focus?.(); };
    nut.onclick = (e) => { if (e && e.stopPropagation) e.stopPropagation(); if (hop.hidden) mo(); else dong(); };
    document.addEventListener("click", (e) => { if (!hop.hidden && !hop.contains(e.target) && e.target !== nut) dong(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !hop.hidden) { dong(); nut.focus(); } });
    for (const b of hop.querySelectorAll("button[data-team-id]")) {
      b.onclick = async () => {
        b.disabled = true;
        try {
          const r = await fetch("/api/chon-team", { method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ teamId: b.dataset.teamId }) });
          const j = await r.json().catch(() => null);
          if (!r.ok || !j || !j.ok) throw new Error((j && j.thongDiep) || "máy chủ trả " + r.status);
          location.href = j.diTiep || "/";
        } catch (e) {
          b.disabled = false;
          let loi = hop.querySelector(".kh-team-loi");
          if (!loi) { hop.insertAdjacentHTML("beforeend", '<div class="kh-team-loi" role="alert"></div>'); loi = hop.querySelector(".kh-team-loi"); }
          if (loi) loi.textContent = "Không đổi được team: " + ((e && e.message) || e);
        }
      };
    }
    return mo;
  }

  // ── GẮN HÀNH VI vào khung đã có trong trang ──────────────────────────────────────
  function noi(khung) {
    const moMenuTeam = noiMenuTeam(khung);
    const nutTk = khung.querySelector(".kh-tk-nut");
    const hopTk = khung.querySelector(".kh-tk-hop");
    if (nutTk && hopTk) {
      const doi = hopTk.querySelector(".doi");
      const ra = hopTk.querySelector(".ra");
      // Hình cho hai lối ra — thêm SAU, vì hộp đang ẩn: vẽ đầu không cần chúng.
      if (doi && !doi.querySelector("svg")) doi.insertAdjacentHTML("afterbegin", bieuTuong("repeat"));
      if (ra && !ra.querySelector("svg")) ra.insertAdjacentHTML("afterbegin", bieuTuong("log-out"));

      const dongTk = () => { hopTk.hidden = true; nutTk.setAttribute("aria-expanded", "false"); };
      nutTk.onclick = (e) => {
        e.stopPropagation();
        const mo = hopTk.hidden;
        hopTk.hidden = !mo;
        nutTk.setAttribute("aria-expanded", String(mo));
        if (mo) (hopTk.querySelector("button") || {}).focus?.();
      };
      document.addEventListener("click", (e) => { if (!hopTk.hidden && !hopTk.contains(e.target)) dongTk(); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !hopTk.hidden) { dongTk(); nutTk.focus(); }
      });

      // Đổi team: QUẢN TRỊ về đúng màn chọn team của `auth/router.js` (không tự dựng màn thứ hai); người nhiều team khác
      // (LL15c) mở menu đổi team nhỏ của chip.
      if (doi) doi.onclick = (e) => {
        if (doi.getAttribute("data-mo-team") != null && moMenuTeam) { if (e && e.stopPropagation) e.stopPropagation(); dongTk(); moMenuTeam(); return; }
        location.href = "/chon-team";
      };

      // Đăng xuất: cửa là POST (xoá cookie ở máy chủ), nên không thể là một thẻ <a>.
      // Hỏng thì vẫn đưa người ta về trang đăng nhập — kẹt lại trong hệ tệ hơn.
      if (ra) ra.onclick = async () => {
        try { await fetch("/api/dang-xuat", { method: "POST", credentials: "same-origin" }); }
        catch { /* mạng hỏng — vẫn đi tiếp */ }
        location.href = "/dang-nhap";
      };
    }
    dungDaiTrangThai(khung);
  }

  /**
   * Dải trạng thái bot. Nạp RIÊNG và SAU khung: cửa của nó gọi sang tiến trình bot v1 và có thể mất tới
   * 25 giây. Hỏng thì nói «chưa đọc được» — KHÔNG hiện số 0, vì «0 page đang bật» và «chưa biết page nào
   * đang bật» là hai câu khác hẳn nhau.
   */
  function dungDaiTrangThai(khung) {
    const o = khung.querySelector("#dh-dai");
    if (!o) return;
    doDai(o);
    // ĐỌC LẠI ĐỊNH KỲ. Tiêu chí của phiếu GD5: tắt máy chạy bot thì trong HAI PHÚT dải phải chuyển đỏ.
    setInterval(() => doDai(o), 45_000);
  }

  function doDai(o) {
    fetch("/api/trang-thai-bot", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.ok) throw new Error("khong doc duoc");
        // MÁY CHẠY BOT ĐỨNG THÌ NÓ LÀ CÂU DUY NHẤT ĐÁNG HIỆN.
        if (d.may && d.may.muc === "do") {
          o.dataset.tone = "danger";
          o.innerHTML = "<b>" + esc(d.may.nhan) + "</b>";
          o.title = [d.may.nhan, d.may.so, d.may.viec].filter(Boolean).join(" · ");
          return;
        }
        if (!d.docDuoc) {
          o.dataset.tone = "neutral";
          o.innerHTML = "<b>Bot: chưa đọc được</b>";
          o.title = d.viSao || "Không rõ có page nào đang bật bot.";
          return;
        }
        const bat = Number(d.aiBat) || 0;
        const tong = Number(d.tong) || 0;
        o.dataset.tone = bat > 0 ? "success" : "danger";
        // MẪU SỐ PHẢI NÓI RÕ LÀ CỦA AI: «1/1 page» của toàn hệ khác «1/4 page của team».
        const cua = d.theoTeam === false ? "trên toàn hệ" : "trong team đang mở";
        o.innerHTML = bat > 0 ? `<b>Bot chạy ${bat}/${tong} page</b>` : `<b>Bot tắt · 0/${tong} page</b>`;
        o.title = bat > 0
          ? `Bot đang chạy ${bat}/${tong} page ${cua} · số còn lại chưa bật`
          : `Bot đang tắt ở mọi page — 0/${tong} page ${cua}, hệ không phục vụ khách`;
      })
      .catch(() => {
        o.dataset.tone = "neutral";
        o.innerHTML = "<b>Bot: chưa đọc được</b>";
        o.title = "Không rõ có page nào đang bật bot";
      });
  }

  // ── LIÊN KẾT TRONG TRANG mà vai này không mở được ⇒ tắt, nói vì sao (LL18 · e2e 29/09) ──
  // Menu đã lọc ở máy chủ; thân trang thì còn nút sang màn khác («Mở màn Model AI» ở Cài đặt team…), và nhiều
  // nút do dữ liệu vẽ SAU. Nên canh cả lúc trang đổi (MutationObserver, gom 400 ms). Chỉ hỏi đường CHƯA hỏi.
  const daHoi = new Map(); // đường → true (cấm) | false (mở)
  function tatLienKet() {
    for (const a of document.querySelectorAll('a[href^="/"]:not([data-khung] a)')) {
      let d;
      try { d = new URL(a.href, location.href).pathname.replace(/\/$/, "") || "/"; } catch { continue; }
      if (daHoi.get(d) !== true) continue;
      a.dataset.href = a.getAttribute("href");
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.classList.add("lien-cam");
      a.title = "Màn này cần vai Quản trị — nhờ quản trị làm việc này";
    }
  }
  function kiemLienKet() {
    const moi = new Set();
    for (const a of document.querySelectorAll('a[href^="/"]:not([data-khung] a)')) {
      try {
        const d = new URL(a.href, location.href).pathname.replace(/\/$/, "") || "/";
        if (!daHoi.has(d) && !d.startsWith("/api/") && !d.startsWith("/chung/")) moi.add(d);
      } catch { /* bỏ qua */ }
    }
    if (!moi.size) return tatLienKet();
    for (const d of moi) daHoi.set(d, false);
    const q = [...moi].slice(0, 80).map((d) => "d=" + encodeURIComponent(d)).join("&");
    fetch("/api/dieu-huong/cam?" + q, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { for (const d of (j && j.cam) || []) daHoi.set(d, true); tatLienKet(); })
      .catch(() => { /* không hỏi được thì để nguyên — máy chủ vẫn chặn ở cửa */ });
  }
  function canhLienKet() {
    kiemLienKet();
    let hen = null;
    new MutationObserver(() => { clearTimeout(hen); hen = setTimeout(kiemLienKet, 400); })
      .observe(document.body, { childList: true, subtree: true });
  }

  // ── ĐƯỜNG LÙI: trang không đi qua máy chủ vẽ ⇒ tự dựng từ CÙNG `khung.js` ─────────
  function dungLui() {
    fetch("/api/dieu-huong", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.ok) return;
        return import("/chung/khung.js").then((k) => {
          if (document.querySelector("[data-khung]")) return; // ai đó đã dựng trong lúc chờ
          const nay = location.pathname.replace(/\/$/, "") || "/";
          const v = k.veKhung(d, nay);
          document.body.insertAdjacentHTML("afterbegin", v.html);
          document.body.dataset.khungHang = String(v.soHang);
          const dauTrang = document.querySelector("body > header");
          const tab = k.veTabCum(d, nay);
          if (tab && dauTrang && !dauTrang.querySelector(".tabs[data-cum]")) dauTrang.insertAdjacentHTML("beforeend", tab);
          noi(document.querySelector("[data-khung]"));
        });
      })
      .catch(() => { /* menu hỏng KHÔNG được làm hỏng trang — trang vẫn dùng được */ });
  }

  function chay() {
    try {
      catLoiBoQua();
      const khung = document.querySelector("[data-khung]");
      if (khung) { noi(khung); canhLienKet(); }
      else dungLui();
    } catch { /* như trên */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", chay);
  else chay();
})();
