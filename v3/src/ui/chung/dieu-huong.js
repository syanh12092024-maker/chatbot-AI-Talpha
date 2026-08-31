// MENU ĐIỀU HƯỚNG — nhúng vào MỌI trang bằng một thẻ <script>.
//
// Nó tự chèn nút ☰ vào thanh tiêu đề và dựng ngăn kéo. Không trang nào phải viết lại menu,
// và thêm một màn mới thì chỉ khai một dòng ở `chung/man-hinh.js`.
//
// ⚠️ Menu tải từ `/api/dieu-huong`, đã LỌC THEO VAI ở máy chủ. Trang không tự lọc.

(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const css = `
    .dh-nut{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:8px;
      padding:6px 11px;cursor:pointer;font:inherit;font-size:13px;font-weight:600;margin-right:2px}
    .dh-nut:hover{background:rgba(255,255,255,.24)}
    .dh-phu{position:fixed;inset:0;background:rgba(11,33,37,.45);z-index:9998;display:none}
    .dh-phu.mo{display:block}
    .dh-ngan{position:fixed;top:0;left:0;bottom:0;width:300px;max-width:86vw;background:#0b2125;
      color:#dfeaec;z-index:9999;transform:translateX(-100%);transition:transform .16s ease;
      overflow-y:auto;font-size:13.5px}
    .dh-ngan.mo{transform:none}
    .dh-dau{padding:15px 17px 12px;border-bottom:1px solid rgba(255,255,255,.1)}
    .dh-dau b{font-size:15px;color:#fff;display:block}
    .dh-dau .m{font-size:11.5px;color:#7fa3a8;margin-top:3px;line-height:1.5}
    .dh-nhom{padding:13px 17px 4px;font-size:10.5px;text-transform:uppercase;
      letter-spacing:.06em;color:#5f8a90;font-weight:700}
    .dh-ngan a{display:block;padding:8px 17px;color:#dfeaec;text-decoration:none;line-height:1.4}
    .dh-ngan a:hover{background:rgba(255,255,255,.07)}
    .dh-ngan a.day{background:rgba(159,211,216,.14);box-shadow:inset 3px 0 0 #9fd3d8}
    .dh-ngan a .t{font-weight:600}
    .dh-ngan a .d{font-size:11px;color:#7fa3a8;margin-top:1px}
    .dh-chan{padding:12px 17px 18px;font-size:11px;color:#5f8a90;line-height:1.55;
      border-top:1px solid rgba(255,255,255,.1);margin-top:8px}
    @media (max-width:520px){ .dh-ngan{width:270px} }`;

  function dung(d) {
    const nay = location.pathname.replace(/\/$/, '') || '/';
    const s = document.createElement('style'); s.textContent = css;
    document.head.appendChild(s);

    const phu = document.createElement('div'); phu.className = 'dh-phu';
    const ngan = document.createElement('nav'); ngan.className = 'dh-ngan';
    ngan.innerHTML = `
      <div class="dh-dau"><b>AI Closer v3</b>
        <div class="m">${esc(d.tenDangNhap || '')}<br>team ${esc(d.teamId || '?')} · vai: ${esc((d.vai || []).join(', ') || 'không có')}</div></div>
      ${d.nhom.map((n) => `
        <div class="dh-nhom">${esc(n.ten)}</div>
        ${n.man.map((m) => `<a href="${esc(m.duong)}" class="${m.duong === nay ? 'day' : ''}">
          <div class="t">${esc(m.ten)}</div>
          ${m.moTa ? `<div class="d">${esc(m.moTa)}</div>` : ''}</a>`).join('')}`).join('')}
      <div class="dh-chan">Chỉ hiện màn vai bạn vào được — danh sách lọc ở máy chủ.</div>`;

    document.body.appendChild(phu);
    document.body.appendChild(ngan);

    const dong = () => { phu.classList.remove('mo'); ngan.classList.remove('mo'); };
    phu.onclick = dong;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dong(); });

    const nut = document.createElement('button');
    nut.className = 'dh-nut'; nut.type = 'button';
    nut.innerHTML = '☰ Màn hình';
    nut.onclick = () => { phu.classList.add('mo'); ngan.classList.add('mo'); };

    const dau = document.querySelector('header');
    if (dau) dau.insertBefore(nut, dau.firstChild);
    else document.body.insertBefore(nut, document.body.firstChild);
  }

  fetch('/api/dieu-huong', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && d.ok) dung(d); })
    .catch(() => { /* menu hỏng KHÔNG được làm hỏng trang — trang vẫn dùng được */ });
})();
