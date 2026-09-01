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
// Mục xếp theo NHỊP LÀM VIỆC (xem `man-hinh.js#NHOM`), mỗi mục bung ra màn con. Mục đang
// đứng tự bung; mục khác đóng — sáu dòng thay vì hai mươi bốn. Sổ khai BẢY mục; mục
// `nhan-cho-khach` chưa có màn nào (giai đoạn 3) nên `menuCua` tự ẩn.
//
// Chân thanh bên là KHỐI TÀI KHOẢN: đổi team và đăng xuất. Trước 01/09 chỉ MỘT trong 25
// trang có lối này, nên người thuộc nhiều team (01 §8 chốt ba team) phải xoá cookie mới
// sang được team khác, còn vai `sale` — không vào được màn Cấu hình team — thì kẹt hẳn.

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

    /* KHỐI TÀI KHOẢN — đổi team và đăng xuất. Trước đây chỉ MỘT trong 25 trang có lối này,
       nên người thuộc nhiều team phải xoá cookie mới sang được team khác, và vai sale
       (không vào được màn Cấu hình team) thì kẹt hẳn. 01 §8 chốt BA team.
       ⚠️ KHÔNG dùng dấu huyền ngược trong comment CSS: cả khối này nằm TRONG một template
       literal, một dấu là đóng chuỗi sớm và cả tệp thành lỗi cú pháp — menu biến mất khỏi
       25 trang mà trang vẫn hiện bình thường (đã dính thật 01/09). */
    .dh-tk{border-top:1px solid rgba(255,255,255,.1);padding:10px 16px 12px;margin-top:auto}
    .dh-tk .ai{font-size:11.5px;color:#7fa3a8;line-height:1.5;margin-bottom:8px;word-break:break-word}
    .dh-tk .ai b{color:#dfeaec;font-weight:600;display:block;font-size:12.5px}
    .dh-tk .hang{display:flex;gap:7px}
    .dh-tk button{flex:1;background:rgba(255,255,255,.08);color:#dfeaec;border:0;border-radius:7px;
      padding:6px 9px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;text-align:center}
    .dh-tk button:hover{background:rgba(255,255,255,.16);color:#fff}
    .dh-tk button.ra:hover{background:rgba(220,38,38,.22);color:#fff}

    /* THANH TAB CỦA MỘT MỤC — các màn cùng mục nằm cạnh nhau ngay dưới thanh tiêu đề.
       Mỗi màn vẫn giữ ĐƯỜNG RIÊNG của nó (không gộp 24 trang thành 6): thanh này chỉ nói
       ra rằng chúng thuộc cùng một việc, và cho đi ngang giữa chúng bằng MỘT cú bấm thay
       vì quay lại menu. Mục chỉ có một màn thì không có thanh — một tab đơn độc là nhiễu. */
    .dh-tab{background:#fff;border-bottom:1px solid #e4e9ee;padding:0 22px;display:flex;
      gap:2px;overflow-x:auto;scrollbar-width:none}
    .dh-tab::-webkit-scrollbar{display:none}
    .dh-tab a{padding:11px 13px 9px;color:#344054;text-decoration:none;font-size:13px;
      font-weight:600;border-bottom:2px solid transparent;white-space:nowrap;
      display:flex;gap:6px;align-items:center}
    .dh-tab a:hover{color:#0e7c86}
    .dh-tab a.day{color:#0e7c86;font-weight:700;border-bottom-color:#0e7c86}
    .dh-tab .muc{font-size:11px;color:#8b95a1;font-weight:600;align-self:center;
      padding-right:9px;margin-right:4px;border-right:1px solid #e4e9ee;white-space:nowrap}

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
        <div class="m">Bot bán hàng Messenger &amp; WhatsApp</div></div>
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
      <div class="dh-tk">
        <div class="ai">
          <b>${esc(d.tenDangNhap || '')}</b>
          team ${esc(d.teamId || '?')} · vai: ${esc((d.vai || []).join(', ') || 'không có')}
        </div>
        <div class="hang">
          <button type="button" class="doi">Đổi team</button>
          <button type="button" class="ra">Đăng xuất</button>
        </div>
        <div style="font-size:10.5px;color:#5f8a90;line-height:1.5;margin-top:9px">
          Chỉ hiện màn vai bạn vào được — danh sách lọc ở máy chủ.
        </div>
      </div>`;

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

    // Đổi team: về đúng màn chọn team của `auth/router.js`, không tự dựng màn thứ hai.
    ngan.querySelector('.dh-tk .doi').onclick = () => { location.href = '/chon-team'; };

    // Đăng xuất: cửa là POST (xoá cookie ở máy chủ), nên không thể là một thẻ <a>.
    // Hỏng thì vẫn đưa người ta về trang đăng nhập — kẹt lại trong hệ tệ hơn.
    ngan.querySelector('.dh-tk .ra').onclick = async () => {
      try { await fetch('/api/dang-xuat', { method: 'POST', credentials: 'same-origin' }); }
      catch { /* mạng hỏng — vẫn đi tiếp */ }
      location.href = '/dang-nhap';
    };

    dungThanhTab(d, nay);

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

  /**
   * Thanh tab của MỤC đang đứng — chèn ngay dưới `<header>` của trang.
   *
   * Không gộp 24 trang thành 6: mỗi màn giữ đường riêng, giữ router riêng, giữ lớp vai
   * riêng. Thanh này chỉ làm một việc — nói ra rằng những màn này thuộc CÙNG một việc, và
   * cho đi ngang giữa chúng bằng một cú bấm thay vì quay lại menu rồi bấm tiếp.
   *
   * Trang không có `<header>` thì bỏ qua trong im lặng: thanh tab là thứ thêm vào, không
   * được phép làm hỏng một trang vốn chạy được.
   */
  function dungThanhTab(d, nay) {
    const muc = (d.nhom || []).find((n) => (n.man || []).some((m) => m.duong === nay));
    if (!muc || (muc.man || []).length < 2) return;

    const dau = document.querySelector("header");
    if (!dau) return;

    const tab = document.createElement("nav");
    tab.className = "dh-tab";
    tab.innerHTML =
      `<div class="muc">${esc(muc.ten)}</div>` +
      muc.man
        .map(
          (m) =>
            `<a href="${esc(m.duong)}" class="${m.duong === nay ? "day" : ""}"` +
            ` title="${esc(m.moTa || "")}">${esc(m.ten)}</a>`,
        )
        .join("");

    dau.insertAdjacentElement("afterend", tab);
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
