// KHỐI «ĐÁNH DẤU ĐÃ XỬ» — DÙNG CHUNG cho trang chi tiết và ô xem nhanh của bảng điều phối.
//
// ═══ VÌ SAO TÁCH RA ĐÂY (11/09) ════════════════════════════════════════════════════
// Bản vẽ gộp bảng điều phối và trang chi tiết thành ba cột, để sale đóng việc mà không
// phải rời danh sách. Cách sai là chép khối này sang trang thứ hai: hai chỗ cùng GHI một
// dòng `viec_can_xu_ly`, và cái thứ hai bao giờ cũng là cái trôi — đúng lúc luật đóng việc
// đổi thì một trong hai chỗ ghi theo luật cũ mà không ai thấy.
//
// Nên chỉ có MỘT bản, ở đây, và hai trang cùng gọi:
//     DongViecUI.gan(d, { sauKhiGhi })
//
// `d` là nguyên bản dữ liệu của `/api/dieu-phoi/viec/:id`. `sauKhiGhi` là việc trang tự lo
// sau khi ghi xong: trang chi tiết tải lại chính nó, bảng điều phối tải lại cả danh sách.
//
// ⚠️ MỌI lệnh ghi nằm trọn trong tệp này. Trang nào cũng KHÔNG được tự gọi `/nhan` hay
//    `/dong` — thấy một lời gọi như thế ở trang khác là dấu hiệu khối này đã bị chép.

(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const gio2 = (t) => (t ? new Date(t).toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }) : '—');

  /* KIỂU CỦA KHỐI — bơm một lần, ngay tại đây.
     Chép sang trang thứ hai là sinh bản thứ hai, rồi một hôm sửa một bên: hai trang cùng
     một nút mà hai màu. Cách này giống `chung/dieu-huong.js` — tệp tự mang kiểu của nó.
     KHÔNG dùng dấu huyền ngược trong khối dưới (án lệ 01/09: một dấu là đóng chuỗi sớm,
     cả tệp thành lỗi cú pháp, mà trang vẫn hiện bình thường). */
  (function bomKieu() {
    if (document.getElementById('dv-kieu')) return;
    const st = document.createElement('style');
    st.id = 'dv-kieu';
    st.textContent = [
      ".chu-nut{font-size:11.5px;color:var(--muted);margin-top:5px}",
      ".dv-de{font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);",
      "font-weight:700;margin:0 0 6px}",
      ".dv-de .buoc{color:var(--bad);text-transform:none;letter-spacing:0;font-weight:600}",
      ".seg{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}",
      ".seg button{background:#fff;border:1px solid var(--line);border-radius:20px;padding:8px 15px;",
      "font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;font-family:inherit}",
      ".seg button:hover{border-color:var(--pri);color:var(--pri)}",
      ".seg button.on{background:var(--pri);border-color:var(--pri);color:#fff}",
      ".o-nhap{margin-bottom:14px}",
      ".o-nhap select,.o-nhap input{width:100%;max-width:420px;padding:9px 11px;border:1px solid var(--line);",
      "border-radius:9px;font-size:13.5px;font-family:inherit;color:var(--ink);background:#fff}",
      ".o-nhap select:focus,.o-nhap input:focus{outline:2px solid var(--priSoft);border-color:var(--pri)}",
      ".o-nhap .goi-y{font-size:11.5px;color:var(--muted);margin-top:5px}",
      ".dv-hang{display:flex;gap:12px;align-items:center;flex-wrap:wrap}",
      ".dv-giu{background:var(--warnSoft);color:#8a4a06;border:1px solid #f0d3a4;border-radius:9px;",
      "padding:9px 12px;margin-bottom:13px;line-height:1.5}",
      ".dv-loi{background:var(--badSoft);color:#991b1b;border:1px solid #f4bcbc;border-radius:9px;",
      "padding:9px 12px;margin-bottom:13px;font-weight:600;line-height:1.5}",
      ".da-xu{background:var(--okSoft);border:1px solid #bfe6cd;border-radius:9px;padding:12px 14px;line-height:1.6}",
      ".da-xu .to{font-size:15px;font-weight:700;color:#166534}",
      ".da-xu .them{color:var(--muted);font-size:12.5px;margin-top:4px}",
    ].join('\n');
    document.head.appendChild(st);
  })();

  let _id = '';
  let _sauKhiGhi = async () => {};

/* ══════════════════════ KHỐI 4 · ĐÁNH DẤU ĐÃ XỬ (L4-M2) ══════════════════════
   Máy trạng thái: `cho` ──nhận──▶ `dang_xu` ──đóng──▶ `da_xu`. Không có đường mở lại ở
   giai đoạn 1, nên trạng thái `da_xu` KHÔNG CÓ NÚT NÀO — bấm nhầm một cái là chốt vĩnh viễn.

   Lỗi 409 hiện NGUYÊN VĂN thông điệp máy chủ ("Việc này Bình đang giữ từ 14:32"). Nuốt nó
   thành "có lỗi xảy ra" là để sale bấm lại năm lần rồi đi hỏi người khác. */

let VIEC = null;                        // dòng việc đang mở
let BANG_KQ = null;                     // { loai, ds } — bảng kết quả tải từ máy chủ, nhớ một lần
const chon = { ketQua: null, lyDo: null, ghiChu: '', chiPhi: '' };

const tien = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('vi-VN') : '');

async function goiApi(duong, than) {
  const r = await fetch(duong, {
    method: than === undefined ? 'GET' : 'POST',
    headers: { accept: 'application/json', ...(than === undefined ? {} : { 'content-type': 'application/json' }) },
    body: than === undefined ? undefined : JSON.stringify(than),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.ok !== true) {
    // Thông điệp của máy chủ đi thẳng ra màn hình.
    const e = new Error((j && j.thongDiep) || ('Máy chủ trả ' + r.status));
    e.ma = j && j.ma;
    throw e;
  }
  return j;
}

/** Bảng kết quả hợp lệ cho ĐÚNG loại việc này. Máy chủ quyết, trang không tự đoán lại. */
async function bangKetQua(loai) {
  if (BANG_KQ && BANG_KQ.loai === loai) return BANG_KQ.ds;
  const j = await goiApi('/api/dieu-phoi/bang-ket-qua?loai=' + encodeURIComponent(loai || ''));
  BANG_KQ = { loai, ds: j.ketQua || [] };
  return BANG_KQ.ds;
}

const timKq = (ma) => (BANG_KQ ? BANG_KQ.ds.find((k) => k.ma === ma) : null) || null;

/* `ly_do_dong` là MỘT cột chở hai thứ (mã lý do + ghi chú) — lược đồ thật không có cột
   `ghi_chu`. Máy chủ đã tách sẵn thành `lyDoDongMa` và `lyDoDongGhiChu`; trang KHÔNG tự
   cắt chuỗi, để khuôn ghép/tách chỉ có một bản (`kho-viec.js`). */
function khoiDaXu(v) {
  const k = timKq(v.ket_qua);
  const ld = k && (k.lyDo || []).find((x) => x.ma === v.lyDoDongMa);
  const doi = [
    (k && k.chu) || v.ket_qua || '(không ghi kết quả)',
    ld ? ld.chu : (v.lyDoDongMa || null),
  ].filter(Boolean).map(esc).join(' · ');
  const them = [
    v.lyDoDongGhiChu ? 'Ghi chú: ' + esc(v.lyDoDongGhiChu) : null,
    v.chi_phi != null && v.chi_phi !== '' ? 'Chi phí: ' + esc(tien(v.chi_phi)) + ' đ' : null,
  ].filter(Boolean).join(' · ');

  return '<section class="panel"><h2>Đã xử</h2><div class="body">'
    + '<div class="da-xu"><div class="to">✔ Đã xử bởi '
      + esc(v.tenNguoiNhan || '(không rõ)')
      + ' lúc ' + esc(gio2(Number(v.dong_luc))) + ' · ' + doi + '</div>'
    + (them ? '<div class="them">' + them + '</div>' : '')
    + '</div></div></section>';
}

function veOThem() {
  const k = timKq(chon.ketQua);
  const o = document.getElementById('dv-them');
  if (!o) return;
  if (!k) { o.innerHTML = ''; return; }

  const dsLyDo = k.lyDo || [];
  const canGhiChu = chon.lyDo === 'khac';

  // Ô lý do chỉ hiện SAU KHI chọn kết quả cần lý do — hiện sẵn cả sáu ô thì màn này thành
  // một cái biểu mẫu, mà sale chỉ có mười giây cho mỗi việc.
  const oLyDo = dsLyDo.length
    ? '<div class="o-nhap"><div class="dv-de">Lý do <span class="buoc">· bắt buộc</span></div>'
      + '<select id="dv-ly-do"><option value="">— chọn lý do —</option>'
      + dsLyDo.map((x) => '<option value="' + esc(x.ma) + '"' + (chon.lyDo === x.ma ? ' selected' : '') + '>'
          + esc(x.chu) + '</option>').join('')
      + '</select>'
      + '<div class="goi-y">Đây là thứ dùng để sửa bot — không có lý do thì con số sau này không nói lên gì.</div>'
      + '</div>'
    : '';

  const oGhiChu = '<div class="o-nhap"><div class="dv-de">Ghi chú'
    + (canGhiChu ? ' <span class="buoc">· bắt buộc, ít nhất 5 ký tự</span>' : ' <span class="buoc" style="color:var(--muted)">· không bắt buộc</span>')
    + '</div><input type="text" id="dv-ghi-chu" maxlength="500" value="' + esc(chon.ghiChu) + '" '
    + 'placeholder="' + (canGhiChu ? 'Chọn “khác” thì phải ghi rõ ra' : 'Điều gì đáng nhớ về lần này') + '" /></div>';

  // Ô chi phí: chỉ đơn đã chốt được mới có. Cờ này do MÁY CHỦ tính, trang không tự suy lại.
  const oChiPhi = k.coChiPhi
    ? '<div class="o-nhap"><div class="dv-de">Chi phí đóng đơn (đồng)</div>'
      + '<input type="text" inputmode="numeric" id="dv-chi-phi" value="' + esc(chon.chiPhi) + '" placeholder="để trống nếu chưa biết" />'
      + '<div class="goi-y">Số nguyên đồng, để trống được. Không biết thì bỏ trống, đừng gõ 0.</div></div>'
    : '';

  o.innerHTML = oLyDo + oGhiChu + oChiPhi;

  const sel = document.getElementById('dv-ly-do');
  if (sel) sel.addEventListener('change', (ev) => { chon.lyDo = ev.target.value || null; veOThem(); dongMo(); });
  const gc = document.getElementById('dv-ghi-chu');
  if (gc) gc.addEventListener('input', (ev) => { chon.ghiChu = ev.target.value; dongMo(); });
  const cp = document.getElementById('dv-chi-phi');
  if (cp) cp.addEventListener('input', (ev) => { chon.chiPhi = ev.target.value; });
  dongMo();
}

/** Bật/tắt nút "Đóng việc" theo đúng luật máy chủ, để sale không bấm rồi mới bị 400. */
function dongMo() {
  const nut = document.getElementById('dv-dong');
  if (!nut) return;
  const k = timKq(chon.ketQua);
  let duoc = Boolean(k);
  if (k && (k.lyDo || []).length && !chon.lyDo) duoc = false;
  if (chon.lyDo === 'khac' && chon.ghiChu.trim().length < 5) duoc = false;
  nut.disabled = !duoc;
}

function baoLoi(chu) {
  const o = document.getElementById('dv-loi');
  if (!o) return;
  if (!chu) { o.hidden = true; o.textContent = ''; return; }
  o.hidden = false;
  o.textContent = chu;
}

async /**
 * HỒ SƠ KHÁCH — tên, số, địa chỉ, tầng rủi ro hoàn, mấy đơn gần đây.
 *
 * Hai luật của khối này:
 *   ① Không có khách thì NÓI VÌ SAO. Khách Messenger giữa chừng chưa đưa số điện thoại là
 *      cảnh thường, không phải lỗi — một khối trống trông y hệt «hệ hỏng».
 *   ② Tầng rủi ro ĐỌC từ cột đã chấm sẵn. Chưa chấm thì hiện «Chưa chấm», KHÔNG hiện
 *      «Mua tốt» — chìa một lời bảo đảm không ai ký là cách mất tiền (án lệ H10, 28/08).
 */
function veHoSoKhach(h) {
  if (!h) return '';
  if (!h.co) {
    return '<section class="panel"><h2>Hồ sơ khách</h2>'
      + '<div class="empty">' + esc(h.viSao || 'Không có hồ sơ khách') + '</div></section>';
  }
  const mauTang = h.tangHoan.muc === 'chan' ? 'r' : h.tangHoan.muc === 'nhac' ? 'o'
    : h.tangHoan.muc === 'san' ? 'g' : 'm';
  const hang = (nhan, gia) => gia
    ? '<div class="dv-hang" style="gap:8px"><span class="chu" style="min-width:96px;color:var(--muted)">'
      + nhan + '</span><span>' + esc(gia) + '</span></div>'
    : '';
  const don = (h.donGanDay || []).map((x) =>
    '<div class="dv-hang" style="gap:8px;padding:3px 0">'
    + '<span class="pill m">' + esc(x.nguon) + '</span>'
    + '<span>' + esc(x.maPos || '(chưa có mã POS)') + '</span>'
    + '<span class="chu" style="color:var(--muted)">' + esc(x.trangThai) + '</span></div>').join('');

  return '<section class="panel"><h2>Hồ sơ khách'
      + '<span class="pill ' + mauTang + '">' + esc(h.tangHoan.chu) + '</span></h2>'
    + '<div class="body">'
      + hang('Tên', h.ten)
      + hang('Số điện thoại', h.soDienThoai || '(khách chưa đưa số)')
      + hang('Địa chỉ', h.diaChi)
      + hang('Tỉ lệ hoàn', h.tiLeHoan == null ? 'chưa chấm' : h.tiLeHoan + '%')
      + hang('Tổng số đơn', String(h.soDon))
      + (don ? '<div style="margin-top:9px;border-top:1px solid var(--line);padding-top:8px">'
          + '<div class="chu" style="color:var(--muted);margin-bottom:4px">Đơn gần đây</div>'
          + don + '</div>' : '')
    + '</div></section>';
}

async function veDongViec(d) {
  const o = document.getElementById('o-dong-viec');
  if (!o) return;
  VIEC = d.viec || {};
  chon.ketQua = null; chon.lyDo = null; chon.ghiChu = ''; chon.chiPhi = '';

  let ds;
  try {
    ds = await bangKetQua(VIEC.loai);
  } catch (e) {
    o.innerHTML = '<div class="banner o">Không tải được danh sách kết quả.<span class="s">'
      + esc(e && e.message ? e.message : 'lỗi mạng') + '</span></div>';
    return;
  }

  // `trangThai` do máy chủ suy sẵn — công thức nằm ở `kho-viec.js`, trang không chép lại.
  if (VIEC.trangThai === 'da_xu') { o.innerHTML = khoiDaXu(VIEC); return; }

  const giu = VIEC.tenNguoiNhan;
  o.innerHTML = '<section class="panel"><h2>Đánh dấu đã xử<span class="sp"></span>'
      + '<span class="hint">chọn kết quả rồi bấm “Đóng việc”</span></h2><div class="body">'
    + (VIEC.trangThai === 'dang_xu' && giu
        ? '<div class="dv-giu">Đang do <b>' + esc(giu) + '</b> giữ từ ' + esc(gio2(Number(VIEC.nhan_luc)))
          + '. Nếu không phải bạn thì hỏi họ một câu trước khi đóng.</div>'
        : '')
    + (VIEC.trangThai === 'cho'
        ? '<div class="dv-hang" style="margin-bottom:14px">'
          + '<button type="button" class="nut phu" id="dv-nhan">Nhận việc</button>'
          + '<span class="chu-nut" style="margin:0">hoặc chọn thẳng kết quả bên dưới — hệ thống tự nhận hộ</span></div>'
        : '')
    + '<div class="dv-de">Kết quả</div>'
    + '<div class="seg" id="dv-kq">'
      + ds.map((k) => '<button type="button" data-kq="' + esc(k.ma) + '">' + esc(k.chu) + '</button>').join('')
    + '</div>'
    + '<div id="dv-them"></div>'
    + '<div class="dv-loi" id="dv-loi" hidden></div>'
    + '<div class="dv-hang"><button type="button" class="nut" id="dv-dong" disabled>Đóng việc</button></div>'
    + '</div></section>';

  document.getElementById('dv-kq').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-kq]');
    if (!b) return;
    chon.ketQua = b.getAttribute('data-kq');
    chon.lyDo = null;
    for (const x of document.querySelectorAll('#dv-kq button')) x.classList.toggle('on', x === b);
    baoLoi('');
    veOThem();
  });

  const nhan = document.getElementById('dv-nhan');
  if (nhan) nhan.addEventListener('click', () => gui(nhan, '/nhan'));
  document.getElementById('dv-dong').addEventListener('click', (ev) => gui(ev.currentTarget, '/dong', {
    ketQua: chon.ketQua,
    lyDo: chon.lyDo || undefined,
    ghiChu: chon.ghiChu.trim() || undefined,
    chiPhi: chon.chiPhi.trim() || undefined,
  }));
}

async function gui(nut, duoi, than) {
  nut.disabled = true;
  baoLoi('');
  try {
    await goiApi('/api/dieu-phoi/viec/' + encodeURIComponent(_id) + duoi, than || {});
    BANG_KQ = null;
    await _sauKhiGhi();                  // tải lại để thấy đúng trạng thái vừa ghi
  } catch (e) {
    baoLoi(e && e.message ? e.message : 'Không gửi được, thử lại.');
    nut.disabled = false;
    dongMo();
  }
}


  window.DongViecUI = {
    /**
     * Đắp khối vào ô `#o-dong-viec` của trang đang mở.
     * @param {object} d          dữ liệu `/api/dieu-phoi/viec/:id`
     * @param {object} tuyChon    `{ sauKhiGhi }` — chạy sau mỗi lần ghi thành công
     */
    gan(d, tuyChon = {}) {
      _id = String((d && d.viec && d.viec.id) || '');
      _sauKhiGhi = typeof tuyChon.sauKhiGhi === 'function' ? tuyChon.sauKhiGhi : (async () => {});
      return veDongViec(d);
    },
  };
})();
