// window.UI — HÀM DỰNG THÀNH PHẦN của hệ kiểu v3. Giai đoạn 5–6 của bản đặc tả vận hành.
//
// ═══ VÌ SAO LÀ HÀM DỰNG, KHÔNG PHẢI COMPONENT ═════════════════════════════════════════
// v3 không có framework và không có bước build: 26 màn là HTML máy chủ trả, dựng giao diện
// bằng `innerHTML`. Mục W («API phải nói NGHĨA, không nói màu») vẫn giữ được — bằng hàm trả
// chuỗi HTML đúng khuôn của `chung/kieu.css`:
//     UI.statusBadge("auto_disabled")          // trang nói trạng thái MIỀN, không chọn màu
//     UI.button("Bật bot", { variant: "primary" })
//
// ═══ ĐO TRƯỚC KHI VIẾT (14/09/2026) ═══════════════════════════════════════════════════
//   · `esc()` CHÉP LẠI trong 26/26 màn
//   · trạng thái đặt theo TÊN MÀU trong 25 màn (`pill r/o/g/m`) — trang tự quyết màu
//   · 9 lần `confirm()` gốc của trình duyệt cho thao tác quan trọng
//   · 64 lần emoji ⚠ làm biểu tượng
// Tệp này là MỘT chỗ cho cả bốn.
//
// ⛔ Nạp tệp này TRƯỚC `dieu-huong.js`: khung ứng dụng lấy biểu tượng từ đây. Hỏng thì khung
//    vẫn chạy, chỉ mất biểu tượng — không bao giờ ngược lại.

(function () {
  "use strict";

  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );

  // ── BIỂU TƯỢNG — MỘT bộ, MỘT nguồn (mục Q) ────────────────────────────────────────
  // Lucide 0.453.0 · ISC · © Lucide Contributors · phần gốc Feather © Cole Bemis (MIT).
  // Thuộc tính vẽ đặt THẲNG trên <svg>: hệ kiểu chưa về thì vẫn là nét, không thành khối đen.
  const BIEU_TUONG = Object.freeze({"bot":"<path d=\"M12 8V4H8\" /> <rect width=\"16\" height=\"12\" x=\"4\" y=\"8\" rx=\"2\" /> <path d=\"M2 14h2\" /> <path d=\"M20 14h2\" /> <path d=\"M15 13v2\" /> <path d=\"M9 13v2\" />","chart-no-axes-column":"<line x1=\"18\" x2=\"18\" y1=\"20\" y2=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"20\" y2=\"4\" /> <line x1=\"6\" x2=\"6\" y1=\"20\" y2=\"14\" />","chevron-right":"<path d=\"m9 18 6-6-6-6\" />","circle-alert":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />","circle-check":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m9 12 2 2 4-4\" />","circle-x":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m15 9-6 6\" /> <path d=\"m9 9 6 6\" />","inbox":"<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\" /> <path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\" />","info":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 16v-4\" /> <path d=\"M12 8h.01\" />","layout-dashboard":"<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" /> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" /> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />","log-out":"<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" /> <polyline points=\"16 17 21 12 16 7\" /> <line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\" />","menu":"<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" /> <line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" /> <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />","repeat":"<path d=\"m17 2 4 4-4 4\" /> <path d=\"M3 11v-1a4 4 0 0 1 4-4h14\" /> <path d=\"m7 22-4-4 4-4\" /> <path d=\"M21 13v1a4 4 0 0 1-4 4H3\" />","search":"<circle cx=\"11\" cy=\"11\" r=\"8\" /> <path d=\"m21 21-4.3-4.3\" />","settings":"<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />","triangle-alert":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /> <path d=\"M12 9v4\" /> <path d=\"M12 17h.01\" />","x":"<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />"});
  function icon(ten, opts) {
    const o = opts || {};
    const co = o.size === "lg" ? 18 : 16;
    const nhan = o.label
      ? ` role="img" aria-label="${esc(o.label)}"`
      : ' aria-hidden="true"';
    return (
      `<svg class="icon${o.className ? " " + esc(o.className) : ""}" viewBox="0 0 24 24"` +
      ` width="${co}" height="${co}" fill="none" stroke="currentColor" stroke-width="2"` +
      ` stroke-linecap="round" stroke-linejoin="round" focusable="false"${nhan}>` +
      (BIEU_TUONG[ten] || "") + "</svg>"
    );
  }

  // ── H8 · ÁNH XẠ TRẠNG THÁI — CHỖ DUY NHẤT trong cả sản phẩm quyết màu của trạng thái ──
  // Trang nói trạng thái MIỀN; bảng này nói nghĩa (tone) và chữ mặc định. Thêm trạng thái mới
  // thì thêm MỘT dòng ở đây — không màn nào được tự chọn `success` hay `danger`.
  // Tone: success · warning · danger · info · neutral (mục E1). `neutral` = CHƯA BIẾT hoặc
  // KHÔNG HOẠT ĐỘNG — sổ có luật «chưa đo được ≠ đạt», nên nó KHÔNG BAO GIỜ là màu xanh.
  const TRANG_THAI = Object.freeze({
    // bot của một page
    bot_on:        { tone: "success", label: "Đang chạy" },
    bot_off:       { tone: "neutral", label: "Tắt" },
    auto_disabled: { tone: "danger",  label: "Tự tắt" },
    bot_locked:    { tone: "warning", label: "Đang khoá" },
    // sẵn sàng (mục M4)
    ready:         { tone: "success", label: "Sẵn sàng" },
    blocked:       { tone: "danger",  label: "Chưa bật được" },
    needs_attention: { tone: "warning", label: "Cần để ý" },
    unknown:       { tone: "neutral", label: "Chưa biết" },
    not_seen:      { tone: "neutral", label: "Bot không thấy" },
    // một điều kiện trong danh sách kiểm
    check_done:    { tone: "success", label: "Xong" },
    check_todo:    { tone: "danger",  label: "Chưa xong" },
    check_warn:    { tone: "warning", label: "Cần để ý" },
    // quyền xử lý hội thoại (mục M6)
    owner_ai:      { tone: "info",    label: "AI đang xử lý" },
    owner_waiting: { tone: "warning", label: "Chờ Sale" },
    owner_sale:    { tone: "info",    label: "Sale đang xử lý" },
    owner_paused:  { tone: "neutral", label: "AI tạm dừng" },
    owner_closed:  { tone: "neutral", label: "Đã kết thúc" },
    // đơn (mục M7)
    order_collecting: { tone: "neutral", label: "Đang thu thập" },
    order_complete:   { tone: "info",    label: "Đủ thông tin" },
    order_pending:    { tone: "warning", label: "Chờ tạo đơn" },
    order_created:    { tone: "success", label: "Đã tạo" },
    order_error:      { tone: "danger",  label: "Lỗi" },
    // kịch bản (mục M8)
    script_draft:     { tone: "neutral", label: "Bản nháp" },
    script_published: { tone: "success", label: "Đã xuất bản" },
    script_review:    { tone: "warning", label: "Chờ duyệt" },
    script_archived:  { tone: "neutral", label: "Đã lưu trữ" },
    script_missing:   { tone: "warning", label: "Chưa có kịch bản" },
    // luật AI (mục M9)
    rule_active:        { tone: "success", label: "Đang áp" },
    rule_draft:         { tone: "neutral", label: "Bản nháp" },
    rule_approved:      { tone: "info",    label: "Đã duyệt, chưa áp" },
    rule_ai_unreviewed: { tone: "warning", label: "AI đề xuất, chưa duyệt" },
    rule_inherited:     { tone: "neutral", label: "Kế thừa toàn hệ" },
    guard_passed:  { tone: "success", label: "Đạt" },
    guard_blocked: { tone: "danger",  label: "Đã chặn" },
    // token kết nối (mục M12) — «không đọc được hạn» là CHƯA BIẾT, không phải còn hạn
    token_valid:    { tone: "success", label: "Còn hạn" },
    token_expiring: { tone: "warning", label: "Sắp hết hạn" },
    token_expired:  { tone: "danger",  label: "Đã hết hạn" },
    token_unknown:  { tone: "neutral", label: "Không đọc được hạn" },
    // tính năng (mục N, O)
    feature_on:          { tone: "success", label: "Bật" },
    feature_off:         { tone: "neutral", label: "Tắt" },
    feature_unavailable: { tone: "neutral", label: "Chưa khả dụng" },
  });

  function statusBadge(status, opts) {
    const o = opts || {};
    const m = TRANG_THAI[status];
    if (!m) {
      // Trạng thái lạ: HIỆN RA, không nuốt, và không đoán màu — nuốt đi là bậc thang mới của
      // tầng dưới lặng lẽ biến mất khỏi màn.
      return `<span class="status-badge" data-tone="neutral" data-status="${esc(status)}">${esc(o.label || status)}</span>`;
    }
    return `<span class="status-badge" data-tone="${m.tone}" data-status="${esc(status)}">${esc(o.label || m.label)}</span>`;
  }

  // ── H1 · NÚT ─────────────────────────────────────────────────────────────────────────
  function button(label, opts) {
    const o = opts || {};
    const bien = o.variant || "outline";
    const co = o.size || "md";
    const noiDung = (o.icon ? icon(o.icon) : "") + `<span>${esc(label)}</span>`;
    // `data: { live: id }` → `data-live="…"` — trang gắn việc vào nút qua thuộc tính dữ liệu,
    // không phải chèn chuỗi vào HTML hàm này trả về.
    const duLieu = Object.entries(o.data || {})
      .map(([k, v]) => ` data-${String(k).replace(/[^a-z0-9-]/gi, "")}="${esc(v)}"`).join("");
    const chung = ` class="btn" data-variant="${esc(bien)}" data-size="${esc(co)}"` +
      (o.id ? ` id="${esc(o.id)}"` : "") + (o.title ? ` title="${esc(o.title)}"` : "") + duLieu;
    if (o.href) return `<a${chung} href="${esc(o.href)}">${noiDung}</a>`;
    return `<button type="button"${chung}${o.disabled ? " disabled" : ""}>${noiDung}</button>`;
  }

  // Nút đang chạy GIỮ NGUYÊN BỀ RỘNG (mục H1): chữ tàng hình chứ không bị thay.
  function setBusy(nut, busy) {
    if (!nut) return;
    if (busy) { nut.setAttribute("aria-busy", "true"); nut.disabled = true; }
    else { nut.removeAttribute("aria-busy"); nut.disabled = false; }
  }

  // ── CHỮ CÓ MÃ — chữ máy chủ viết cho người vận hành ────────────────────────────────
  // Tầng kho viết câu kiểu «thiếu `ADMIN_USER` — …» (dấu ` bao tên kỹ thuật). Đo 14/09: 11 màn
  // tự xử theo 3 cách — xoá dấu `, đổi thành <code>, hoặc để nguyên. Nay một cách: THOÁT KÝ TỰ
  // TRƯỚC, rồi mới đổi `…` thành <code> và bỏ `**` — không bao giờ để lọt HTML thô.
  function text(s) {
    return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/`/g, "").replace(/\*\*/g, "");
  }

  // ── H9 · CẢNH BÁO — phải có thông tin HÀNH ĐỘNG được ──────────────────────────────
  // `detail` = chi tiết KỸ THUẬT (tên biến, đường API) cho người quản trị hệ thống. Tách khỏi
  // `body` để câu chính nói bằng lời người dùng; chi tiết nhỏ và mờ hơn, nhưng không giấu —
  // người sửa được lỗi cần đúng những chữ ấy. Đo 14/09 trên ảnh chụp: cảnh báo màn Công tắc
  // mở đầu bằng «thiếu ADMIN_USER/ADMIN_PASS — không gọi được /admin/api».
  const BIEU_TUONG_MUC = { info: "info", success: "circle-check", warning: "triangle-alert", error: "circle-alert" };
  function alert(opts) {
    const o = opts || {};
    const muc = o.level || "info";
    const chiTiet = [].concat(o.detail || []).filter(Boolean);
    return (
      `<div class="alert" data-level="${esc(muc)}" role="${muc === "error" ? "alert" : "status"}">` +
      icon(BIEU_TUONG_MUC[muc] || "info") +
      `<div>${o.title ? `<div class="alert-title">${esc(o.title)}</div>` : ""}` +
      (o.body ? `<div class="alert-body">${text(o.body)}</div>` : "") +
      (chiTiet.length ? `<div class="alert-detail">${chiTiet.map(text).join("<br>")}</div>` : "") + "</div>" +
      (o.actionsHtml ? `<div class="alert-actions">${o.actionsHtml}</div>` : "<span></span>") +
      "</div>"
    );
  }

  // ── TRẠNG THÁI RỖNG — bắt buộc nói VÌ SAO rỗng ─────────────────────────────────────
  function emptyState(opts) {
    const o = opts || {};
    return (
      `<div class="empty-state">${icon(o.icon || "inbox")}` +
      `<div class="empty-state-title">${esc(o.title || "Chưa có gì")}</div>` +
      (o.body ? `<div class="empty-state-body">${esc(o.body)}</div>` : "") +
      (o.actionsHtml || "") + "</div>"
    );
  }

  // ── HÀNG CHỈ SỐ — tối đa 4, CHUNG MỘT viền (mục M1) ─────────────────────────────────
  const soVi = new Intl.NumberFormat("vi-VN");
  const tienVi = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  function metricRow(items) {
    const ds = (items || []).slice(0, 4); // mục M1: 4 chỉ số là trần
    return (
      `<div class="metric-row" data-count="${ds.length}">` +
      ds.map((m) =>
        `<div class="metric"><div class="metric-label">${esc(m.label)}</div>` +
        `<div class="metric-value">${typeof m.value === "number" ? soVi.format(m.value) : esc(m.value)}</div>` +
        (m.statusHtml ? `<div class="metric-delta">${m.statusHtml}</div>` : "") +
        (m.hint ? `<div class="metric-delta">${esc(m.hint)}</div>` : "") +
        "</div>").join("") +
      "</div>"
    );
  }

  // ── M4 · KIỂM TRA SẴN SÀNG ─────────────────────────────────────────────────────────
  // item: { ok: true|false|"warn", name, detail?, actionHtml? }
  // mode: "required" (mặc định) — danh sách BẮT BUỘC: đếm «x/y hoàn thành», có thanh tiến độ.
  //       "advisory" — danh sách KHUYẾN NGHỊ: đếm «n điều cần để ý», KHÔNG thanh tiến độ.
  // ⚠️ Vì sao có hai chế độ (đo 14/09 trên ảnh chụp): danh sách khuyến nghị chỉ hiện KHI CÓ
  //    cảnh báo, nên nó LUÔN là «0/N điều kiện hoàn thành» kèm thanh tiến độ trống — đọc như
  //    đang tụt lại, trong khi thật ra là lời khuyên, không phải việc chưa làm.
  function readiness(opts) {
    const o = opts || {};
    const ds = o.items || [];
    const xong = ds.filter((x) => x.ok === true).length;
    const tong = ds.length;
    const khuyen = o.mode === "advisory";
    const bieu = { true: "circle-check", false: "circle-x", warn: "triangle-alert" };
    const dem = khuyen
      ? `<span class="readiness-count">${tong - xong} điều cần để ý</span>`
      : `<span class="readiness-count">${xong}/${tong} điều kiện hoàn thành</span>`;
    return (
      '<div class="readiness">' +
      '<div class="readiness-head"><div class="readiness-head-row">' +
      `<h2>${esc(o.title || "Khả năng vận hành")}</h2>` + dem + "</div>" +
      (khuyen ? "" :
        `<progress class="readiness-progress" max="${tong || 1}" value="${xong}" aria-label="${xong} trên ${tong} điều kiện hoàn thành"></progress>`) +
      "</div>" +
      '<ul class="readiness-list">' +
      ds.map((x) =>
        `<li class="readiness-item" data-ok="${x.ok === "warn" ? "warn" : String(!!x.ok)}">` +
        icon(bieu[x.ok === "warn" ? "warn" : String(!!x.ok)], { label: x.ok === true ? "Đạt" : x.ok === "warn" ? "Cần để ý" : "Chưa đạt" }) +
        `<div><div class="readiness-name">${esc(x.name)}</div>` +
        (x.detail ? `<div class="readiness-detail">${esc(x.detail)}</div>` : "") + "</div>" +
        (x.actionHtml || "<span></span>") + "</li>").join("") +
      "</ul>" +
      (o.footHtml ? `<div class="readiness-foot">${o.footHtml}</div>` : "") +
      "</div>"
    );
  }

  // ── H10 · THÔNG BÁO NGẮN — chỉ cho việc nền ĐÃ XONG ────────────────────────────────
  function toast(noiDung, opts) {
    const o = opts || {};
    let vung = document.querySelector(".toast-region");
    if (!vung) {
      vung = document.createElement("div");
      vung.className = "toast-region";
      vung.setAttribute("aria-live", "polite");
      document.body.appendChild(vung);
    }
    const t = document.createElement("div");
    t.className = "toast";
    if (o.level) t.dataset.level = o.level;
    t.innerHTML = icon(o.level === "error" ? "circle-alert" : "circle-check") + `<span>${esc(noiDung)}</span>`;
    vung.appendChild(t);
    setTimeout(() => t.remove(), o.duration || 4000);
  }

  // ── L · HỘP XÁC NHẬN — thay cho `confirm()` gốc ───────────────────────────────────
  // `confirm()` không có tiêu đề, không nói hệ quả, không đổi được chữ trên nút, và chặn cả
  // trang. Hộp này dùng <dialog> gốc: bẫy lấy nét và phím Esc có sẵn, trả Promise<boolean>.
  function confirmDialog(opts) {
    const o = opts || {};
    return new Promise((xong) => {
      const h = document.createElement("dialog");
      h.className = "dialog";
      h.dataset.size = "sm";
      h.setAttribute("aria-labelledby", "ui-xn-tieu-de");
      h.innerHTML =
        `<div class="dialog-header"><h2 id="ui-xn-tieu-de">${esc(o.title || "Xác nhận")}</h2></div>` +
        `<div class="dialog-body">${esc(o.body || "")}</div>` +
        '<div class="dialog-footer">' +
        `<button type="button" class="btn" data-variant="ghost" data-act="huy">${esc(o.cancelLabel || "Huỷ")}</button>` +
        `<button type="button" class="btn" data-variant="${o.danger ? "danger" : "primary"}" data-act="dong-y">${esc(o.confirmLabel || "Xác nhận")}</button>` +
        "</div>";
      document.body.appendChild(h);
      const ket = (v) => { h.close(); h.remove(); xong(v); };
      h.querySelector('[data-act="huy"]').onclick = () => ket(false);
      h.querySelector('[data-act="dong-y"]').onclick = () => ket(true);
      h.addEventListener("cancel", (e) => { e.preventDefault(); ket(false); });
      h.showModal();
      // Lấy nét vào nút AN TOÀN trước — với thao tác nguy hiểm, Enter không được là «đồng ý».
      (h.querySelector(o.danger ? '[data-act="huy"]' : '[data-act="dong-y"]') || {}).focus?.();
    });
  }

  // ── TÊN VAI — mã vai là mã máy (`quan-tri`), người đọc thấy tên người (`Quản trị`) ──
  // Cùng bộ mã với `auth/boi-canh.js#VAI`. Mã lạ hiện nguyên, không nuốt.
  const TEN_VAI = Object.freeze({
    "quan-tri": "Quản trị", "quan-ly": "Quản lý", marketer: "Marketer", sale: "Sale",
    "duyet-kich-ban": "Người duyệt kịch bản",
  });
  const roleName = (ma) => TEN_VAI[ma] || String(ma == null ? "" : ma);

  window.UI = Object.freeze({
    esc, text, icon, statusBadge, button, setBusy, alert, emptyState, metricRow, readiness,
    toast, confirmDialog, roleName,
    formatNumber: (n) => soVi.format(Number(n) || 0),
    formatVnd: (n) => tienVi.format(Number(n) || 0),
    TRANG_THAI,
  });
})();
