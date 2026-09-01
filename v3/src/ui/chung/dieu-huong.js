// MENU ĐIỀU HƯỚNG — nhúng vào MỌI trang bằng một thẻ <script>.
//
// Không trang nào phải viết lại menu, và thêm một màn mới thì chỉ khai một dòng ở
// `chung/man-hinh.js`.
//
// ⚠️ Menu tải từ `/api/dieu-huong`, đã LỌC THEO VAI ở máy chủ. Trang không tự lọc.
//
// ═══ HAI HÌNH DẠNG, MỘT NGUỒN (đổi 01/09) ═══════════════════════════════════════════
// Bản trước là NGĂN KÉO: bật ra, chọn, tắt. Ba cái giá đo được — không thấy mình đang ở
// đâu trong hệ, mỗi lần chuyển màn là hai cú bấm, và danh sách 24 dòng phẳng dài hơn màn
// hình nên hơn chục mục cuối bị cuộn khuất. Nay:
//   · màn RỘNG (≥ 900px): thanh bên CỐ ĐỊNH 244px, luôn thấy sáu mục và chỗ mình đang đứng;
//   · màn HẸP: giữ nguyên ngăn kéo — 244px trên điện thoại là ăn hết chỗ đọc.
// Cùng một dữ liệu, cùng một lớp lọc vai; chỉ khác cách bày.
//
// Sáu mục xếp theo NHỊP LÀM VIỆC (xem `man-hinh.js#NHOM`), mỗi mục bung ra màn con. Mục
// đang đứng tự bung; mục khác đóng — sáu dòng thay vì hai mươi bốn.

(function () {
  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const RONG = 244; // bề ngang thanh bên
  const NGUONG = 900; // dưới ngưỡng này thì quay về ngăn kéo

  const css = `
    .dh-nut{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:8px;
      padding:6px 11px;cursor:pointer;font:inherit;font-size:13px;font-weight:600;margin-right:2px;display:none}
    .dh-nut:hover{background:rgba(255,255,255,.24)}
    .dh-phu{position:fixed;inset:0;background:rgba(11,33,37,.45);z-index:9998;display:none}
    .dh-phu.mo{display:block}

    .dh-ngan{position:fixed;top:0;left:0;bottom:0;width:${RONG}px;background:#0b2125;
      color:#dfeaec;z-index:9999;overflow-y:auto;font-size:13.5px;display:flex;flex-direction:column}
    .dh-dau{padding:15px 16px 12px;border-bottom:1px solid rgba(255,255,255,.1)}
    .dh-dau b{font-size:15px;color:#fff;display:block}
    .dh-dau .m{font-size:11.5px;color:#7fa3a8;margin-top:3px;line-height:1.5}

    /* MỘT MỤC — hàng bấm được, mở/đóng danh sách màn con của nó. */
    .dh-muc{display:block;width:100%;text-align:left;background:none;border:0;color:inherit;
      font:inherit;cursor:pointer;padding:9px 16px;display:flex;gap:10px;align-items:center}
    .dh-muc:hover{background:rgba(255,255,255,.06)}
    .dh-muc.day{background:rgba(159,211,216,.14);box-shadow:inset 3px 0 0 #9fd3d8}
    .dh-muc .t{font-weight:600;font-size:13.5px;color:#dfeaec}
    .dh-muc.day .t{color:#fff}
    .dh-muc .d{font-size:11px;color:#7fa3a8;margin-top:1px;line-height:1.35}
    .dh-muc .than{flex:1;min-width:0}
    .dh-muc .mui{color:#5f8a90;font-size:10px;transition:transform .14s ease;flex-shrink:0}
    .dh-muc.bung .mui{transform:rotate(90deg)}

    .dh-con{display:none;padding:1px 0 6px}
    .dh-con.bung{display:block}
    .dh-con a{display:block;padding:6px 16px 6px 30px;color:#a9c4c8;text-decoration:none;
      line-height:1.35;font-size:12.5px}
    .dh-con a:hover{background:rgba(255,255,255,.07);color:#dfeaec}
    .dh-con a.day{color:#fff;font-weight:600;background:rgba(159,211,216,.1)}

    .dh-chan{padding:12px 16px 18px;font-size:11px;color:#5f8a90;line-height:1.55;
      border-top:1px solid rgba(255,255,255,.1);margin-top:auto}

    /* Màn HẸP: thanh bên thu về ngăn kéo, trang lấy lại toàn bộ bề ngang. */
    @media (max-width:${NGUONG - 1}px){
      .dh-nut{display:inline-block}
      .dh-ngan{width:280px;max-width:86vw;transform:translateX(-100%);transition:transform .16s ease}
      .dh-ngan.mo{transform:none}
      body{padding-left:0 !important}
    }`;

  const MUI =
    '<svg class="mui" width="10" height="10" viewBox="0 0 10 10" fill="none" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3.5 2L6.5 5L3.5 8"/></svg>';

  function dung(d) {
    const nay = location.pathname.replace(/\/$/, "") || "/";
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);

    const phu = document.createElement("div");
    phu.className = "dh-phu";
    const ngan = document.createElement("nav");
    ngan.className = "dh-ngan";

    // Mục nào chứa đường đang mở thì bung sẵn — người dùng phải thấy mình đang đứng ở đâu.
    const mucDangO = (d.nhom || []).findIndex((n) =>
      (n.man || []).some((m) => m.duong === nay),
    );

    ngan.innerHTML = `
      <div class="dh-dau"><b>AI Closer v3</b>
        <div class="m">${esc(d.tenDangNhap || "")}<br>team ${esc(d.teamId || "?")} · vai: ${esc((d.vai || []).join(", ") || "không có")}</div></div>
      <div class="dh-than">
        ${(d.nhom || [])
          .map((n, i) => {
            const bung = i === mucDangO;
            return `
          <button type="button" class="dh-muc ${bung ? "day bung" : ""}" data-muc="${i}">
            <div class="than">
              <div class="t">${esc(n.ten)}</div>
              ${n.mo ? `<div class="d">${esc(n.mo)}</div>` : ""}
            </div>
            ${n.man.length > 1 ? MUI : ""}
          </button>
          <div class="dh-con ${bung ? "bung" : ""}" data-con="${i}">
            ${n.man
              .map(
                (
                  m,
                ) => `<a href="${esc(m.duong)}" class="${m.duong === nay ? "day" : ""}"
              title="${esc(m.moTa || "")}">${esc(m.ten)}</a>`,
              )
              .join("")}
          </div>`;
          })
          .join("")}
      </div>
      <div class="dh-chan">Chỉ hiện màn vai bạn vào được — danh sách lọc ở máy chủ.</div>`;

    document.body.appendChild(phu);
    document.body.appendChild(ngan);

    // Mục CHỈ CÓ MỘT màn thì bấm vào mục là đi thẳng — không bắt bung ra để bấm lần hai.
    for (const nut of ngan.querySelectorAll(".dh-muc")) {
      const i = Number(nut.dataset.muc);
      const n = d.nhom[i];
      const con = ngan.querySelector(`.dh-con[data-con="${i}"]`);
      nut.onclick = () => {
        if (n.man.length === 1) {
          location.href = n.man[0].duong;
          return;
        }
        nut.classList.toggle("bung");
        con.classList.toggle("bung");
      };
    }

    // Trang chừa chỗ cho thanh bên. Chỉ ở màn rộng — media query trên tự gỡ ở màn hẹp.
    document.body.style.paddingLeft = `${RONG}px`;

    const dong = () => {
      phu.classList.remove("mo");
      ngan.classList.remove("mo");
    };
    phu.onclick = dong;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") dong();
    });

    const nut = document.createElement("button");
    nut.className = "dh-nut";
    nut.type = "button";
    nut.innerHTML = "☰ Màn hình";
    nut.onclick = () => {
      phu.classList.add("mo");
      ngan.classList.add("mo");
    };

    const dau = document.querySelector("header");
    if (dau) dau.insertBefore(nut, dau.firstChild);
    else document.body.insertBefore(nut, document.body.firstChild);
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
