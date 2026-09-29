// HỘP THƯ — KHỐI THAO TÁC của sale (phiếu LL2 · CR-28-09c · `01-QUYET-DINH.md` §10 bổ sung).
//
// Trang Hộp thư (`ban-hoi-thoai.html`) vẫn chỉ ĐỌC; mọi lời gọi GHI của nó nằm trong tệp này, và
// chỉ tới `/api/hop-thu/*` (thước `hop-thu.test.mjs` H4 soi từng đường). Không có ô soạn tin:
// ô nhập ở đây chỉ là trường của ĐƠN (tên · số · địa chỉ…) và lý do loại đơn.
//
// window.HopThu = {
//   moDon(id, noiVe, { sauKhiGhi })      — đơn chờ duyệt: sửa · lưu · duyệt (tạo đơn POS) · loại
//   nhanThayBot(hoiThoaiId)              — hội thoại bot đang giữ ⇒ sale giữ, đẻ một dòng việc
//   veDonCho(noiVe, { moHoiThoai })      — tab Đơn chờ; trả về tổng số đơn đang chờ
//   veKhachTheoSo(noiVe, sdt, { moHoiThoai }) — hồ sơ khách mọi kênh, hiện trên kết quả ô tìm; trả danh sách khách
// }
(function () {
  "use strict";
  const UI = window.UI;
  const esc = UI.esc;
  const so = (n) => UI.formatNumber(n);
  const enc = encodeURIComponent;

  async function goi(duong, than) {
    const tuy = than === undefined
      ? { headers: { accept: "application/json" } }
      : { method: "POST",
          headers: { accept: "application/json", "content-type": "application/json", "X-V3-Action": "1" },
          body: JSON.stringify(than) };
    const r = await fetch(duong, tuy);
    if (r.status === 401) {
      location.href = "/dang-nhap?tiep=" + enc(location.pathname);
      throw new Error("hết phiên đăng nhập");
    }
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok !== true) throw new Error((j && j.thongDiep) || ("Máy chủ trả " + r.status));
    return j;
  }

  const lucDay = (v) => {
    const ms = typeof v === "number" ? v : Date.parse(v);
    if (!Number.isFinite(ms)) return "";
    const d = new Date(ms), hai = (n) => String(n).padStart(2, "0");
    return `${hai(d.getDate())}/${hai(d.getMonth() + 1)} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
  };
  const tien = (n, te) => (Number.isFinite(n) ? so(n) + (te ? " " + te : "") : "");
  const huyHieuHoan = (t) => (window.DongViecUI ? window.DongViecUI.huyHieuHoan(t) : esc(t && t.chu));

  /* ═══ ĐƠN CHỜ DUYỆT ═══ */
  const TRUONG = [
    ["ten", "Tên khách", "text"],
    ["sdt", "Số điện thoại", "tel"],
    ["dia_chi", "Địa chỉ", "text"],
    ["thanh_pho", "Thành phố", "text"],
    ["kho_hang", "Mã kho POS", "text"],
  ];
  const CUA_KIEM = {
    "1_du_truong": "Thông tin khách", "2_tien": "Giá bán", "3_chong_trung": "Chống trùng đơn",
    "4_hang_cho": "Hàng chờ", "5_tao_don": "Tạo đơn POS",
  };
  const TRANG_THAI_DON = { cho_duyet: "Chờ duyệt", da_duyet: "Đã duyệt", tu_choi: "Đã loại" };

  async function moDon(id, noi, { sauKhiGhi } = {}) {
    noi.innerHTML = '<p class="text-muted">Đang tải đơn…</p>';
    let d;
    try { d = await goi(`/api/hop-thu/don/${enc(id)}`); } catch (e) {
      noi.innerHTML = UI.alert({ level: "warning", title: "Không mở được đơn", body: e.message });
      return;
    }
    const o = d.item, du = o.du_lieu_don || {};
    const suaDuoc = o.trang_thai === "cho_duyet";
    const heSo = (te) => d.currencyFactors[te] || 1;
    const sp = (d.products || []).map((p) =>
      `<option value="${esc(p.ma)}"${p.ma === du.san_pham_ma ? " selected" : ""}${p.het_hang ? " disabled" : ""}>`
      + `${esc(p.ten || p.ma)}${p.het_hang ? " (hết hàng)" : ""}</option>`).join("");
    const kiem = Object.entries((o.cua_kiem && o.cua_kiem.cong) || {}).map(([k, v]) =>
      `<li>${esc(CUA_KIEM[k] || k)}: ${v.qua === true ? "Đạt" : v.qua === false ? "Chưa đạt" : v.da_chay ? "Đã xử lý" : "Chưa xử lý"}`
      + `${v.ly_do ? " · " + esc(v.ly_do) : ""}</li>`).join("");
    noi.innerHTML = `<form class="form-stack" data-don="${esc(o.id)}" novalidate>
      <p class="field-hint">Đơn #${esc(o.id)} · ${esc(TRANG_THAI_DON[o.trang_thai] || o.trang_thai)} · bot chốt ${esc(lucDay(o.tao_luc))}</p>
      ${TRUONG.map(([k, nhan, kieu]) => `<div class="field"><label for="hd-${k}">${nhan}</label>`
        + `<input id="hd-${k}" name="${k}" type="${kieu}" value="${esc(du[k] ?? "")}" autocomplete="off"></div>`).join("")}
      <div class="field"><label for="hd-sp">Sản phẩm</label><select id="hd-sp" name="san_pham_ma">${sp}</select></div>
      <div class="field"><label for="hd-sl">Số lượng</label><input id="hd-sl" name="so_luong" type="number" min="1" step="1" value="${esc(du.so_luong || 1)}"></div>
      <p class="field-hint" id="hd-gia"></p>
      ${kiem ? `<div class="field"><span class="field-label">Kiểm tra gần nhất</span><ul class="field-hint">${kiem}</ul></div>`
        : '<p class="field-hint">Chưa kiểm tra — hệ kiểm lại đủ các cửa khi duyệt.</p>'}
      ${suaDuoc ? `
      <div class="form-actions"><button type="button" class="btn" data-variant="outline" data-size="sm" data-hanh="luu">Lưu thông tin</button></div>
      <div class="field"><label><input type="checkbox" id="hd-xac"> Tôi đã kiểm tra thông tin đã lưu</label>
        <span class="field-hint">Duyệt dùng thông tin ĐÃ LƯU và có thể tạo đơn thật trên POS.</span></div>
      <div class="form-actions"><button type="button" class="btn" data-variant="primary" data-size="sm" data-hanh="duyet">Duyệt — tạo đơn POS</button></div>
      <div class="field"><label for="hd-lydo">Lý do loại đơn (5–300 ký tự)</label><input id="hd-lydo" type="text" maxlength="300" autocomplete="off"></div>
      <div class="form-actions"><button type="button" class="btn" data-variant="outline" data-size="sm" data-hanh="loai">Loại đơn</button></div>` : ""}
      <div id="hd-tb" role="status" aria-live="polite"></div>
    </form>`;
    const f = noi.querySelector("form");
    const $ = (s) => f.querySelector(s);
    const tb = (cap, chu) => { $("#hd-tb").innerHTML = UI.alert({ level: cap, title: chu }); };
    function hienGia() {
      const p = (d.products || []).find((x) => x.ma === $("#hd-sp").value);
      const g = p && (p.goiGia || []).find((x) => x.so_luong === Number($("#hd-sl").value));
      $("#hd-gia").textContent = g
        ? `Giá cả gói: ${so(Number(g.gia) / heSo(g.tien_te))} ${g.tien_te}. Khi duyệt, hệ kiểm lại giá và chống trùng.`
        : "Không có gói giá cho số lượng này.";
    }
    $("#hd-sp").addEventListener("change", hienGia);
    $("#hd-sl").addEventListener("input", hienGia);
    hienGia();
    if (!suaDuoc) { f.querySelectorAll("input,select").forEach((x) => { x.disabled = true; }); return; }

    const giaTri = () => ({
      ...Object.fromEntries(TRUONG.map(([k]) => [k, $("#hd-" + k).value])),
      san_pham_ma: $("#hd-sp").value, so_luong: Number($("#hd-sl").value),
    });
    const daDoi = () => {
      const g = giaTri();
      return TRUONG.some(([k]) => g[k] !== String(du[k] ?? "")) || g.san_pham_ma !== String(du.san_pham_ma ?? "")
        || g.so_luong !== Number(du.so_luong);
    };
    const chay = (nut, viec) => async () => {
      nut.disabled = true;
      try { await viec(); } catch (e) { tb("danger", e.message); } finally { nut.disabled = false; }
    };
    const nut = (h) => f.querySelector(`[data-hanh="${h}"]`);
    nut("luu").addEventListener("click", chay(nut("luu"), async () => {
      await goi(`/api/hop-thu/don/${enc(o.id)}/luu`, { version: o.version, ...giaTri() });
      await moDon(id, noi, { sauKhiGhi });
      noi.querySelector("#hd-tb").innerHTML = UI.alert({ level: "success", title: "Đã lưu. Kiểm lại rồi duyệt." });
    }));
    nut("duyet").addEventListener("click", chay(nut("duyet"), async () => {
      if (daDoi()) throw new Error("Bạn đã sửa thông tin — lưu đơn trước khi duyệt.");
      if (!$("#hd-xac").checked) throw new Error("Đánh dấu «Tôi đã kiểm tra thông tin đã lưu» trước khi duyệt.");
      const kq = (await goi(`/api/hop-thu/don/${enc(o.id)}/duyet`, { version: o.version })).result || {};
      if (sauKhiGhi) await sauKhiGhi();
      await moDon(id, noi, { sauKhiGhi });
      noi.querySelector("#hd-tb").innerHTML = kq.tao
        ? UI.alert({ level: "success", title: "Đã tạo đơn trên POS." })
        : UI.alert({ level: "warning", title: "Chưa tạo đơn", body: (kq.chan_vi || []).join("; ") || "Một cửa kiểm chưa qua." });
    }));
    nut("loai").addEventListener("click", chay(nut("loai"), async () => {
      const lyDo = $("#hd-lydo").value.trim();
      if (lyDo.length < 5) throw new Error("Lý do loại đơn cần ít nhất 5 ký tự.");
      await goi(`/api/hop-thu/don/${enc(o.id)}/loai`, { reason: lyDo });
      if (sauKhiGhi) await sauKhiGhi();
      await moDon(id, noi, { sauKhiGhi });
    }));
  }

  /* ═══ NHẬN THAY BOT ═══ */
  async function nhanThayBot(hoiThoaiId) {
    return goi(`/api/hop-thu/hoi-thoai/${enc(hoiThoaiId)}/nhan`, {});
  }

  /* ═══ TAB ĐƠN CHỜ ═══ */
  const khoi = (tieuDe, dem, than, rong) => `<div class="bc-khoi"><h3 class="nhan-hoa">${tieuDe} · ${so(dem)}</h3>`
    + (than ? `<ul class="item-list" data-bam>${than}</ul>` : `<p class="bc-cam">${esc(rong)}</p>`) + "</div>";

  async function veDonCho(noi, { moHoiThoai } = {}) {
    noi.innerHTML = '<p class="text-muted">Đang tải đơn chờ…</p>';
    let d;
    try { d = await goi("/api/hop-thu/don-cho"); } catch (e) {
      noi.innerHTML = UI.alert({ level: "warning", title: "Không tải được đơn chờ", body: e.message });
      return null;
    }
    const mess = d.messenger.map((o) => `<li class="item"><div><button type="button" class="lien-ke" data-ht="${esc(o.hoiThoaiId)}">`
      + `${esc(o.ten || "Khách chưa có tên")}</button><div class="item-desc">${esc([o.tenPage, o.soLuong ? o.soLuong + " gói" : "",
        tien(o.tongTien, o.tienTe)].filter(Boolean).join(" · "))}</div></div><span class="item-trail">${esc(lucDay(o.taoLuc))}</span></li>`).join("");
    const viec = d.viecDon.map((v) => `<li class="item"><div><a class="lien-ke" href="/dieu-phoi/viec/${enc(v.id)}">${esc(v.lyDoChu || "Việc đơn")}</a>`
      + `<div class="item-desc">${esc(v.tenNguoiNhan ? v.tenNguoiNhan + " đang xử" : "Chưa ai nhận")}</div></div></li>`).join("");
    const ladi = d.ladi.map((o) => `<li class="item"><div><span class="item-title">${esc(o.maPos || "Đơn #" + o.id)}</span>`
      + `<div class="item-desc">${esc([o.trangThaiChu, o.tenPage, tien(o.tongTien, o.tienTe)].filter(Boolean).join(" · "))}</div></div>`
      + `<span class="item-trail">${esc(lucDay(o.taoLuc))}</span></li>`).join("");
    noi.innerHTML = khoi("Messenger chờ duyệt", d.dem.messenger, mess, "Không có đơn Messenger nào chờ duyệt.")
      + khoi("Đơn không gắn hội thoại", d.dem.viecDon, viec, "Không có việc đơn nào đang mở.")
      + khoi("Ladi chờ xác nhận WhatsApp", d.dem.ladi, ladi,
        "Chưa có đơn nào — luồng xác nhận WhatsApp chưa chạy (cần nối số WhatsApp và mẫu tin Meta duyệt).")
      + (d.catBot ? '<p class="bc-cam">Chỉ hiện 100 đơn mỗi loại.</p>' : "");
    noi.querySelectorAll("[data-ht]").forEach((b) => b.addEventListener("click", () => moHoiThoai && moHoiThoai(b.dataset.ht)));
    return d.dem.messenger + d.dem.viecDon + d.dem.ladi;
  }

  /* ═══ KHÁCH THEO SỐ ĐIỆN THOẠI — hiện TRÊN kết quả của ô tìm hội thoại ═══
     Một ô tìm cho sale: gõ số điện thoại thì vừa ra hội thoại (đường đọc của bàn) vừa ra hồ sơ khách
     gộp mọi kênh ở đây — đơn Ladi không có hội thoại vẫn thấy được. */
  async function veKhachTheoSo(noi, sdt, { moHoiThoai } = {}) {
    noi.innerHTML = "";
    let d;
    try { d = await goi("/api/hop-thu/tim-khach?sdt=" + enc(sdt)); } catch (e) {
      noi.innerHTML = `<div class="bc-khoi">${UI.alert({ level: "warning", title: "Chưa tra được hồ sơ khách", body: e.message })}</div>`;
      return [];
    }
    if (!d.khach.length) return [];
    noi.innerHTML = `<div class="bc-khoi"><h3 class="nhan-hoa">Khách · ${so(d.khach.length)}</h3><ul class="item-list" data-bam>`
      + d.khach.map((k) => `<li class="item"><div>`
        + `<button type="button" class="lien-ke" data-khach="${esc(k.id)}">${esc(k.ten || "Khách chưa có tên")}</button>`
        + `<div class="item-desc">${esc([k.thiTruong, (k.soDon ?? 0) + " đơn", (k.soHoiThoai ?? 0) + " hội thoại"].filter(Boolean).join(" · "))}</div></div>`
        + `<span class="item-trail">${huyHieuHoan(k.tangHoan)}</span></li>`).join("")
      + `</ul></div><div data-ho-so></div>`;
    const hoSo = noi.querySelector("[data-ho-so]");
    noi.querySelectorAll("[data-khach]").forEach((b) => b.addEventListener("click", async () => {
      hoSo.innerHTML = '<p class="text-muted">Đang tải hồ sơ…</p>';
      let h;
      try { h = await goi(`/api/hop-thu/khach/${enc(b.dataset.khach)}`); } catch (e) {
        hoSo.innerHTML = `<div class="bc-khoi">${UI.alert({ level: "warning", title: "Không mở được hồ sơ", body: e.message })}</div>`;
        return;
      }
      const don = h.donHang.map((x) => `<li class="item"><div><span class="item-title">${esc(x.maPos || "Đơn #" + x.id)} `
        + `<span class="meta">${esc(x.nguonChu)}</span></span><div class="item-desc">${esc([x.trangThaiChu, tien(x.tongTien, x.tienTe)].filter(Boolean).join(" · "))}</div></div>`
        + `<span class="item-trail">${esc(lucDay(x.taoLuc))}</span></li>`).join("");
      const ht = h.hoiThoai.map((x) => `<li class="item"><div><button type="button" class="lien-ke" data-ht="${esc(x.id)}">${esc(x.pageTen || "Hội thoại")}</button>`
        + `<div class="item-desc">${esc(x.chuSoHuu === "AI" ? "Bot đang giữ" : x.chuSoHuu === "SALE" ? "Sale đang giữ" : x.chuSoHuu || "")}</div></div>`
        + `<span class="item-trail">${esc(lucDay(x.chamLuc))}</span></li>`).join("");
      hoSo.innerHTML = khoi("Đơn của " + esc(h.khach.ten || "khách"), h.donHang.length, don, "Chưa có đơn nào.")
        + khoi("Hội thoại", h.hoiThoai.length, ht, "Chưa nối hội thoại nào với khách này.");
      hoSo.querySelectorAll("[data-ht]").forEach((x) => x.addEventListener("click", () => moHoiThoai && moHoiThoai(x.dataset.ht)));
    }));
    return d.khach;   // số trong đây đã CHUẨN HOÁ ở máy chủ (`chuanHoaSdt`) — trang dùng lại để tìm hội thoại
  }

  window.HopThu = { moDon, nhanThayBot, veDonCho, veKhachTheoSo };
})();
