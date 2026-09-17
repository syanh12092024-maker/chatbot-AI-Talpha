// MÀN «VẬN HÀNH CHAT V3» — dựng trên HỆ KIỂU v3 (`window.UI` + `/chung/kieu.css`).
//
// 17/09: màn này từng là màn DUY NHẤT của v3 không dùng hệ kiểu — 84 dòng CSS gõ tay trong
// `trang.html` và một hàm `el()` trần dựng DOM. Hệ quả nhìn thấy được: nút xám vuông, bảng
// rỗng ra một dòng chữ trần «Chưa có dữ liệu.», không trạng thái màu, không nhãn trường.
//
// Lượt này CHỈ đổi cách VẼ. Bốn hàm dựng bên dưới giữ NGUYÊN chữ ký cũ (`button` trả về
// phần tử nút, `field`/`select` trả về phần tử nhập), nên toàn bộ luật nghiệp vụ phía sau —
// nhất là bốn chốt của đường duyệt đơn: phải lưu trước khi duyệt, phải tick xác nhận, chỉ
// `quan-tri` thao tác được, và lý do loại đơn 5–300 ký tự — không đổi một chữ.
const { esc, statusBadge, button: nutHtml, alert: canhBao, emptyState, formatNumber } = window.UI;

const $ = (s) => document.querySelector(s);
const gio = (ms) => (ms ? new Date(ms).toLocaleString("vi-VN") : "—");
const el = (tag, text, parent) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (parent) parent.append(n);
  return n;
};

/** Thông báo: lỗi thì hiện thẻ cảnh báo đỏ, xong xuôi thì hiện chữ nhạt — không cùng một kiểu. */
const message = (text, error = false) => {
  const trong = $("#detail").open ? $("#detail-status") : $("#bang-tin");
  if (!text) { trong.innerHTML = ""; return; }
  trong.innerHTML = error
    ? `<div class="duoi-4">${canhBao({ level: "error", title: text })}</div>`
    : `<p class="meta">${esc(text)}</p>`;
};

async function api(path, body) {
  const r = await fetch("/api/van-hanh/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined
        ? {}
        : { "Content-Type": "application/json", "X-V3-Action": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok || !d.ok) throw Error(d.thongDiep || "Không thể tải dữ liệu");
  return d;
}

/** Nút của hệ kiểu. Giữ nguyên chữ ký cũ: trả về PHẦN TỬ để nơi gọi bật/tắt được. */
function button(parent, label, fn, tuyChon = {}) {
  const vo = el("span", undefined, parent);
  vo.innerHTML = nutHtml(label, { size: tuyChon.size || "sm", variant: tuyChon.variant || "outline" });
  const b = vo.firstElementChild;
  b.onclick = async () => {
    b.disabled = true;
    try { await fn(); }
    catch (e) { message(e.message, true); }
    finally { b.disabled = false; }
  };
  return b;
}

function field(parent, label, value = "", type = "text") {
  const khung = el("div", undefined, parent);
  khung.className = type === "checkbox" ? "field field-inline" : "field";
  const id = "f" + Math.random().toString(36).slice(2, 9);
  if (label) {
    const l = el("label", label, khung);
    l.className = "field-label";
    l.htmlFor = id;
  }
  const i = el(type === "textarea" ? "textarea" : "input", undefined, khung);
  i.id = id;
  if (type !== "textarea") i.type = type;
  if (type === "checkbox") i.checked = !!value;
  else i.value = value ?? "";
  return i;
}

function select(parent, label, values, value) {
  const khung = el("div", undefined, parent);
  khung.className = "field";
  const id = "s" + Math.random().toString(36).slice(2, 9);
  if (label) {
    const l = el("label", label, khung);
    l.className = "field-label";
    l.htmlFor = id;
  }
  const s = el("select", undefined, khung);
  s.id = id;
  for (const [v, t] of values) {
    const o = el("option", t, s);
    o.value = v;
  }
  s.value = value;
  return s;
}

/** Một hàng của bảng danh sách: cột nội dung + cột thao tác. */
function hang(bang, cot) {
  const tr = el("tr", undefined, bang);
  for (const c of cot.slice(0, -1)) {
    const td = el("td", undefined, tr);
    if (typeof c === "string") td.textContent = c; else td.innerHTML = c;
  }
  const td = el("td", undefined, tr);
  td.className = "actions";
  return td;
}

let tab = "dien-tap",
  offset = 0,
  request = 0,
  admin = false;
const names = {
  "dien-tap": "Diễn tập (không gửi)",
  pages: "Page & trạng thái",
  products: "Sản phẩm & giá",
  orders: "Đơn chờ duyệt",
  conversations: "Hội thoại",
};
async function load() {
  const token = ++request;
  message("Đang tải…");
  const d = await api(`${tab}?offset=${offset}`);
  if (token !== request) return;
  $("#list").replaceChildren();
  $("#dem").textContent = `${formatNumber(d.items.length)} dòng${offset ? ` · từ dòng ${formatNumber(offset + 1)}` : ""}`;
  if (tab === "dien-tap") veTomTatDienTap(d);
  else if ($("#bang-tin").dataset.tu === "dien-tap") { $("#bang-tin").innerHTML = ""; delete $("#bang-tin").dataset.tu; }
  vePhanTrang(d.items.length);

  if (!d.items.length) {
    // Trống có thể là SỰ THẬT chứ không phải lỗi: hai tab đầu lọc theo TEAM ĐANG MỞ, mà
    // page mới quét về nằm ở team «chưa phân» chờ người gán. Nói ra chỗ đi tiếp.
    $("#list").innerHTML = emptyState({
      icon: "inbox",
      title: "Chưa có dữ liệu ở tab này",
      body: tab === "pages"
        ? "Danh sách lọc theo team đang mở. Page mới quét về nằm ở team «Chưa phân team» — gán chúng ở màn Cấu hình team trước."
        : "Chưa có dòng nào cho team đang mở.",
    });
    message("");
    return;
  }

  const bang = el("table", undefined, $("#list"));
  bang.className = "data-table";
  const dau = el("thead", undefined, bang);
  const trDau = el("tr", undefined, dau);
  const cotDau = {
    "dien-tap": ["Khách nói", "Bot ĐỊNH trả lời", "Độ trễ", ""],
    pages: ["Page", "Trạng thái", "Nguồn tin", ""],
    products: ["Sản phẩm", "Mã POS", "Sản phẩm gốc", ""],
    orders: ["Đơn", "Page", "Trạng thái", ""],
    conversations: ["Hội thoại", "Chủ sở hữu", "Trạng thái", ""],
  }[tab];
  for (const c of cotDau) {
    const th = el("th", c || "", trDau);
    th.scope = "col";
    if (!c) th.className = "actions";
  }
  const than = el("tbody", undefined, bang);

  for (const item of d.items) {
    if (tab === "dien-tap") {
      const tre = item.treLuotMs == null ? null : Math.round(item.treLuotMs / 100) / 10;
      hang(than, [
        `<div class="manh">${esc(item.pageTen)}</div><div class="meta">${esc(item.psid)} · ${esc(gio(item.tinLuc))}</div>`
          + `<pre class="nguyen-van">${esc(String(item.tinKhach || "").slice(0, 400))}</pre>`,
        `<pre class="nguyen-van">${esc(String(item.dinhGui || "").slice(0, 600))}</pre>`
          + `<div class="meta">${esc(item.loai)}${item.maModel ? ` · ${esc(item.maModel)}` : ""}`
          + `${item.lane ? ` · làn ${esc(item.lane)}` : ""}`
          + `${item.tokenVao != null ? ` · ${formatNumber(item.tokenVao)}+${formatNumber(item.tokenRa || 0)} token` : ""}</div>`,
        tre == null
          ? '<span class="meta">chưa đo được</span>'
          : `<span class="manh tabular">${tre}s</span>`
            + (item.treNaoMs != null ? `<div class="meta tabular">bộ não ${Math.round(item.treNaoMs / 100) / 10}s</div>` : ""),
        "",
      ]);
      continue;
    }
    if (tab === "pages") renderPage(than, item);
    if (tab === "products") {
      const o = hang(than, [
        `<div class="manh">${esc(item.ten || item.ma)}</div>`,
        `<code>${esc(item.ma)}</code>`,
        item.ma_goc
          ? `<code>${esc(item.ma_goc)}</code>`
          : '<span class="meta">chưa gán sản phẩm gốc</span>',
        "",
      ]);
      button(o, "Chỉnh sản phẩm và giá", () => product(item), { variant: "primary" });
    }
    if (tab === "orders") {
      const o = hang(than, [
        `<div class="manh">#${esc(item.id)}</div><div class="meta">${esc(item.du_lieu_don.ten || "Thiếu tên")} · ${esc(String(item.du_lieu_don.so_luong || "?"))} sản phẩm</div>`,
        esc(item.page_name || ""),
        statusBadge(item.trang_thai === "cho_duyet" ? "pending" : "unknown", { label: item.trang_thai }),
        "",
      ]);
      button(o, "Xem / xử lý đơn", () => order(item.id), { variant: "primary" });
    }
    if (tab === "conversations") {
      const o = hang(than, [
        `<div class="manh">${esc(item.page_name || "")}</div><div class="meta">${esc(item.psid)}</div>`,
        esc(item.chu_so_huu || ""),
        statusBadge("unknown", { label: item.trang_thai }),
        "",
      ]);
      button(o, "Mở hội thoại", () => conversation(item.id));
    }
  }
  message("");
}

/* Ba con số đọc trước khi đọc từng dòng, và MỘT câu nói rõ chế độ đang bật hay tắt —
 * «không gửi» là lời hứa, nên nó phải được khẳng định bằng trạng thái thật của máy chủ,
 * không phải bằng niềm tin của người đang đo. */
function veTomTatDienTap(d) {
  const t = d.tomTat || {};
  const giay = (ms) => (ms == null ? "—" : `${Math.round(ms / 100) / 10}s`);
  $("#bang-tin").dataset.tu = "dien-tap";
  $("#bang-tin").innerHTML = `<div class="duoi-4">${canhBao(d.dangBat
    ? { level: "info", title: "Chế độ diễn tập ĐANG BẬT — bot không gửi cho khách",
        body: `Bot vẫn đọc tin, gọi model và soạn câu trả lời; tới cửa gửi thì ghi vào sổ rồi dừng. `
          + `${formatNumber(t.soLuot || 0)} lượt · ${formatNumber(t.soKhach || 0)} khách · ${formatNumber(t.soPage || 0)} page. `
          + `Độ trễ giữa ${giay(t.treGiuaMs)} · lâu nhất ${giay(t.treLauNhatMs)}.` }
    : { level: "warning", title: "Chế độ diễn tập đang TẮT",
        body: `Máy chủ không đặt \`V3_DIEN_TAP=1\`, nên những lượt mới KHÔNG được ghi vào đây — và nếu van gửi mở thì bot gửi thật. `
          + `Bảng dưới là ${formatNumber(t.soLuot || 0)} lượt diễn tập cũ.` })}</div>`;
}

function vePhanTrang(soDong) {
  const v = $("#phan-trang");
  v.replaceChildren();
  const lui = button(v, "Trang trước", async () => { offset = Math.max(0, offset - 50); await load(); });
  const toi = button(v, "Trang sau", async () => { offset += 50; await load(); });
  button(v, "Tải lại", () => load());
  lui.disabled = offset === 0;
  toi.disabled = soDong < 50;
}

function modal(title) {
  $("#detail-status").innerHTML = "";
  $("#content").replaceChildren();
  $("#detail-tieu").textContent = title;
  $("#detail-nut").replaceChildren();
  button($("#detail-nut"), "Đóng", () => $("#detail").close());
  if (!$("#detail").open) $("#detail").showModal();
  return $("#content");
}

function renderPage(than, p) {
  const o = hang(than, [
    `<div class="manh">${esc(p.ten || p.page_id)}</div><div class="meta">${esc(p.page_id)}</div>`
      + (p.note ? `<div class="meta">${esc(p.note)}</div>` : "")
      + (p.blockers || []).map((w) => `<div class="meta">Còn thiếu: ${esc(w)}</div>`).join(""),
    statusBadge(p.enabled ? "ready" : "blocked", { label: p.enabled ? "AI bật" : "AI tắt" }),
    "",
    "",
  ]);
  // Ô nguồn tin nằm trong chính hàng: đổi nguồn là việc làm thường xuyên khi cutover từng
  // page, bắt mở hộp thoại cho một cái `select` hai lựa chọn là thêm hai cú bấm mỗi page.
  const oNguon = o.parentElement.children[2];
  oNguon.replaceChildren();
  const source = select(oNguon, "", [["poll", "Pancake polling"], ["webhook", "Webhook"]], p.nguon_tin);
  button(o, "Lưu nguồn", async () => {
    await api(`pages/${p.id}`, { source: source.value, version: p.version });
    await load();
  });
  button(o, p.enabled ? "Tắt AI" : "Bật AI", async () => {
    await api(`pages/${p.id}`, { enabled: !p.enabled, version: p.version });
    await load();
  }, { variant: p.enabled ? "danger" : "primary" });
}

function product(p) {
  const c = modal(`Sản phẩm: ${p.ma}`);
  el(
    "p",
    "Áp dụng cho các Page dùng cùng sản phẩm trong shop này. Giá nhập theo đơn vị tiền hiển thị cho khách.",
    c,
  );
  const name = field(c, "Tên", p.ten),
    desc = field(
      c,
      "Thông tin / công dụng / cách dùng / cảnh báo",
      p.mo_ta,
      "textarea",
    ),
    stock = field(c, "Hết hàng", p.het_hang, "checkbox");
  const table = el("table", undefined, c);
  table.className = "data-table";
  const head = el("tr", undefined, el("thead", undefined, table));
  ["Số lượng", "Giá cả gói", "Tiền tệ", ""].forEach((x) => {
    const th = el("th", x, head);
    th.scope = "col";
    if (!x) th.className = "actions";
  });
  const offers = [];
  function add(g = { so_luong: 1, price: 0, tien_te: "SAR" }) {
    const tr = el("tr", undefined, table),
      q = field(el("td", undefined, tr), "", g.so_luong, "number"),
      price = field(el("td", undefined, tr), "", g.price, "number"),
      currency = field(el("td", undefined, tr), "", g.tien_te);
    const entry = { tr, q, price, currency };
    offers.push(entry);
    button(el("td", undefined, tr), "Bỏ gói", () => {
      tr.remove();
      offers.splice(offers.indexOf(entry), 1);
    });
  }
  p.offers.forEach(add);
  button(c, "Thêm gói giá", () => add());
  button(c, "Lưu sản phẩm", async () => {
    await api(`products/${p.id}`, {
      version: p.version,
      ten: name.value,
      mo_ta: desc.value,
      het_hang: stock.checked,
      offers: offers.map((g) => ({
        so_luong: Number(g.q.value),
        price: Number(g.price.value),
        tien_te: g.currency.value.trim().toUpperCase(),
      })),
    });
    $("#detail").close();
    await load();
  });
}
async function order(id) {
  const d = await api(`orders/${id}`),
    o = d.item,
    c = modal(`Đơn #${id}`);
  el("p", `Trạng thái: ${o.trang_thai}`, c);
  const data = o.du_lieu_don,
    inputs = {};
  for (const [key, label] of Object.entries({
    ten: "Tên khách",
    sdt: "Số điện thoại",
    dia_chi: "Địa chỉ",
    thanh_pho: "Thành phố",
    kho_hang: "Mã kho POS",
  }))
    inputs[key] = field(c, label, data[key]);
  const product = select(
    c,
    "Sản phẩm",
    d.products.map((p) => [p.ma, p.ten || p.ma]),
    data.san_pham_ma || d.products[0]?.ma,
  );
  const qty = field(c, "Số lượng", data.so_luong || 1, "number"),
    price = el("p", "", c);
  function showPrice() {
    const p = d.products.find((p) => p.ma === product.value),
      g = p?.goiGia.find((g) => g.so_luong === Number(qty.value));
    price.textContent = g
      ? `Giá cả gói: ${Number(g.gia) / (d.currencyFactors[g.tien_te] || 1)} ${g.tien_te}. Khi duyệt, hệ thống kiểm tra lại giá và chống trùng.`
      : "Không có gói giá cho số lượng này.";
  }
  product.onchange = showPrice;
  qty.oninput = showPrice;
  showPrice();
  el("h3", "Kết quả kiểm tra gần nhất", c);
  const checks = o.cua_kiem?.cong || {};
  const checkNames = {
    "1_du_truong": "Thông tin khách",
    "2_tien": "Giá bán",
    "3_chong_trung": "Chống trùng đơn",
    "4_hang_cho": "Hàng chờ",
    "5_tao_don": "Tạo đơn POS",
  };
  for (const [key, value] of Object.entries(checks))
    el(
      "p",
      `${checkNames[key] || key}: ${value.qua === true ? "Đạt" : value.qua === false ? "Chưa đạt" : value.da_chay ? "Đã xử lý" : "Chưa xử lý"}${value.ly_do ? " · " + value.ly_do : ""}`,
      c,
    );
  if (!Object.keys(checks).length)
    el("p", "Chưa kiểm tra; hệ thống kiểm tra lại khi duyệt.", c);
  if (o.trang_thai !== "cho_duyet" || !admin) {
    c.querySelectorAll("input,select").forEach((input) => {
      input.disabled = true;
    });
    return;
  }
  button(c, "Lưu thông tin đơn", async () => {
    await api(`orders/${id}/save`, {
      version: o.version,
      ...Object.fromEntries(
        Object.entries(inputs).map(([k, v]) => [k, v.value]),
      ),
      san_pham_ma: product.value,
      so_luong: Number(qty.value),
    });
    await order(id);
    message("Đã lưu. Kiểm tra thông tin trước khi duyệt.");
  });
  el(
    "p",
    "Duyệt dùng thông tin đã lưu. Thao tác này có thể tạo đơn thật trên POS.",
    c,
  );
  const confirm = field(
    c,
    "Tôi đã kiểm tra thông tin đã lưu",
    false,
    "checkbox",
  );
  button(c, "Duyệt tạo đơn POS", async () => {
    const changed =
      Object.entries(inputs).some(
        ([key, input]) => input.value !== String(data[key] ?? ""),
      ) ||
      product.value !== String(data.san_pham_ma ?? "") ||
      Number(qty.value) !== Number(data.so_luong);
    if (changed)
      throw Error("Bạn đã sửa thông tin; hãy lưu đơn trước khi duyệt.");
    if (!confirm.checked)
      throw Error("Cần xác nhận đã kiểm tra thông tin đã lưu");
    const result = await api(`orders/${id}/approve`, { version: o.version });
    await order(id);
    await load();
    message(
      result.result.tao
        ? "Đã tạo đơn POS."
        : `Chưa tạo đơn: ${(result.result.chan_vi || []).join("; ")}`,
      !result.result.tao,
    );
  });
  const reason = field(c, "Lý do loại đơn (5–300 ký tự)");
  button(c, "Loại đơn", async () => {
    await api(`orders/${id}/reject`, { reason: reason.value });
    await order(id);
    await load();
  });
}
async function conversation(id) {
  const d = await api(`conversations/${id}`),
    h = d.item,
    c = modal(`Hội thoại #${id}`);
  el("p", `${h.chu_so_huu} · ${h.trang_thai}`, c);
  el("h3", "Thông tin khách đã thu thập", c);
  const labels = {
    name: "Tên",
    phone: "Số điện thoại",
    address: "Địa chỉ",
    city: "Thành phố",
    qty: "Số lượng",
    tier: "Gói quan tâm",
    total: "Tổng tiền đã chốt",
    cod: "Đồng ý COD",
    ordered: "Đã ghi nhận yêu cầu đặt hàng",
  };
  for (const [key, label] of Object.entries(labels)) {
    const value = h.ho_so?.[key];
    el(
      "p",
      `${label}: ${value === true ? "Có" : value === false ? "Chưa" : value || "Chưa có"}`,
      c,
    );
  }
  if (!admin) {
    el("p", "Bạn có quyền xem. Các thao tác xử lý dành cho quản trị.", c);
  }
  const handoffButton = button(c, "Chuyển nhân viên xử lý", async () => {
    await api(`conversations/${id}/handoff`, {});
    await conversation(id);
    await load();
  });
  handoffButton.disabled = !admin;
  const reason = field(
    c,
    "Lý do tiếp tục / đối soát (5–300 ký tự, không ghi thông tin cá nhân)",
  );
  const resumeButton = button(c, "Cho AI tiếp tục", async () => {
    await api(`conversations/${id}/resume`, { reason: reason.value });
    await conversation(id);
    await load();
  });
  resumeButton.disabled = !admin;
  /* ── MỘT DÒNG THỜI GIAN, BA LOẠI TIN ────────────────────────────────────────────
   * Trước: hai khối rời — «tin khách» rồi «lượt gửi của bot». Đọc kiểu đó không chấm được
   * chất lượng tư vấn, vì thứ cần thấy là bot trả lời CÂU NÀO.
   *
   *   · lịch sử thật trên Pancake  → gồm cả tin sale gõ tay và tin Botcake
   *   · lượt bot ĐỊNH gửi          → chỉ có trong sổ, KHÔNG có trên Pancake (diễn tập)
   *   · tin trong hàng đợi bị lỗi  → để biết vì sao một câu của khách không được trả lời
   */
  el("h3", "Dòng hội thoại", c);
  if (d.lichSuLoi) {
    const v = el("div", undefined, c);
    v.innerHTML = canhBao({ level: "warning", title: "Chưa đọc được lịch sử thật từ Pancake",
      body: "Phần dưới chỉ là tin đã đi qua hàng đợi v3 và lượt của bot — thiếu tin sale gõ tay và tin Botcake.",
      detail: [String(d.lichSuLoi)] });
  }

  const moc = [];
  for (const m of d.lichSu || []) {
    moc.push({ luc: m.luc ? Date.parse(m.luc) : 0, ben: m.laPage ? "page" : "khach", text: m.text, nhan: m.laPage ? "phía page (Pancake)" : "khách" });
  }
  for (const m of d.outgoing || []) {
    const chu = m.noi_dung?.text || m.noi_dung?.url || (typeof m.noi_dung === "string" ? m.noi_dung : "Thao tác trên kênh");
    // Lượt ĐÃ gửi đã nằm trong lịch sử Pancake rồi — thêm lần nữa là đếm đôi. Chỉ chèn
    // những lượt KHÔNG có bên Pancake: diễn tập, đang gửi, không rõ.
    if (m.trang_thai === "da_gui") continue;
    moc.push({ luc: Date.parse(m.tao_luc), ben: "bot", text: chu, nhan: m.trang_thai, trangThai: m.trang_thai });
  }
  for (const m of d.incoming || []) {
    if (!["loi", "chan_guard"].includes(m.trang_thai)) continue;
    moc.push({ luc: Date.parse(m.tao_luc), ben: "loi", text: m.noi_dung, nhan: m.trang_thai, lyDo: m.ly_do, id: m.id });
  }
  moc.sort((a, b) => a.luc - b.luc);

  if (!moc.length) el("p", "Chưa có tin nào.", c).className = "meta";
  for (const m of moc) {
    const a = el("div", undefined, c);
    a.className = "panel";
    const dau = el("div", undefined, a);
    dau.className = "hang";
    dau.innerHTML =
      (m.ben === "khach" ? statusBadge("unknown", { label: "khách" })
        : m.ben === "page" ? statusBadge("ready", { label: "phía page — đã lên Pancake" })
        : m.ben === "bot" ? statusBadge(m.trangThai === "dien_tap" ? "pending" : "blocked",
            { label: m.trangThai === "dien_tap" ? "bot ĐỊNH gửi (diễn tập, chưa bay)" : `bot · ${m.nhan}` })
        : statusBadge("blocked", { label: `tin lỗi · ${m.nhan}` }))
      + `<span class="meta">${esc(m.luc ? new Date(m.luc).toLocaleString("vi-VN") : "—")}</span>`
      + (m.lyDo ? `<span class="meta">${esc(m.lyDo)}</span>` : "");
    const noi = el("pre", m.text, a);
    noi.className = "nguyen-van";
    if (admin && m.ben === "loi")
      button(a, "Đã đối chiếu, bàn giao sale", async () => {
        await api(`messages/${m.id}/reconcile`, { reason: reason.value });
        await conversation(id);
        message("Đã bàn giao sale, không tự gửi lại tin.");
      });
  }

}
$("#close").onclick = () => $("#detail").close();
$("#reload").onclick = () => load().catch((e) => message(e.message, true));
$("#prev").onclick = () => {
  offset = Math.max(0, offset - 50);
  $("#reload").click();
};
$("#next").onclick = () => {
  offset += 50;
  $("#reload").click();
};
try {
  const me = await (await fetch("/api/toi")).json();
  admin = (me.boiCanh?.vai || me.toi?.vai || me.vai || []).includes("quan-tri");
  for (const [key, name] of Object.entries(names)) {
    if (!admin && ["pages", "products"].includes(key)) continue;
    button($("#tabs"), name, async () => {
      tab = key;
      offset = 0;
      await load();
    });
  }
  await load();
} catch (e) {
  message(e.message, true);
}
