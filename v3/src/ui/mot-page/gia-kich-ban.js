// GIÁ GÕ CỨNG TRONG KỊCH BẢN — tìm ra, và nói nó có còn khớp bảng giá không (28/09/2026).
//
// ═══ VÌ SAO CÓ TỆP NÀY ═════════════════════════════════════════════════════════════════
// Giả lập Minty KSA trên hội thoại thật: câu bot gửi cho khách hỏi giá — «Buy 1 Get 1 –
// 109 SAR · Buy 2 Get 2 – 159 SAR» — là CHỮ GÕ TAY trong ô `fastLanePrice` của kịch bản, không
// lấy từ bảng giá. Hôm nay hai bên khớp (bảng giá 10900 / 15900 đơn vị nhỏ = 109 / 159 SAR).
//
// Nhưng tab «Sản phẩm & giá» của trang page (GD3) làm việc SỬA GIÁ dễ hơn bao giờ hết. Sửa
// 109 thành 119 ở đó thì bảng giá đổi, đơn tạo ra tính 119 — còn bot VẪN báo 109, vì câu ấy
// nằm trong kịch bản. Bot hứa một đằng, cửa tiền tính một nẻo. Rủi ro này do chính GD3 làm
// tăng lên, nên GD3 phải trả.
//
// ═══ LÀM GÌ ════════════════════════════════════════════════════════════════════════════
// Không sửa kịch bản hộ ai (câu mẫu là lời đã được người duyệt). Chỉ TÌM mọi con số đi kèm
// một mã tiền tệ trong các ô chữ của kịch bản, rồi nói từng con số có nằm trong bảng giá
// đang bật hay không. Màn hiện ra:
//   · còn khớp  ⇒ nhắc: «giá này gõ cứng, đổi bảng giá thì phải sửa cả ô ấy»
//   · lệch      ⇒ báo đỏ: «bot đang báo cho khách một giá không có trong bảng giá»

/** Mã tiền tệ các page đang dùng. `SR` là cách khách và người soạn hay viết tắt riyal Ả Rập. */
const TIEN_TE = 'SAR|SR|AED|KWD|QAR|OMR|BHD|USD';
const SAU_SO = new RegExp(`(\\d{1,6}(?:[.,]\\d{1,2})?)\\s*(${TIEN_TE})\\b`, 'gi');
const TRUOC_SO = new RegExp(`\\b(${TIEN_TE})\\s*(\\d{1,6}(?:[.,]\\d{1,2})?)`, 'gi');

const chuanTe = (t) => {
  const u = String(t || '').toUpperCase();
  return u === 'SR' ? 'SAR' : u;
};
const chuanSo = (s) => Number(String(s).replace(',', '.'));

/**
 * @param {Record<string,string>|null} noiDung  các ô chữ của bản kịch bản (`noi_dung_nguoi`)
 * @param {{gia:number, tienTe:string}[]} bangGia  giá ĐƠN VỊ LỚN của các bậc đang BẬT
 * @param {Record<string,string>} [nhan]  tên hiển thị của từng ô
 * @returns {{o:string, nhanO:string, gia:number, tienTe:string, khop:boolean}[]}
 */
export function timGiaGoCung(noiDung, bangGia, nhan = {}) {
  if (!noiDung || typeof noiDung !== 'object') return [];
  const coTrongBang = (gia, te) => (bangGia || []).some(
    (g) => chuanTe(g.tienTe) === te && Math.abs(Number(g.gia) - gia) < 0.001,
  );
  const ra = [];
  const daThay = new Set();
  for (const [o, giaTri] of Object.entries(noiDung)) {
    if (typeof giaTri !== 'string' || !giaTri) continue;
    const them = (so, te) => {
      const gia = chuanSo(so);
      const tienTe = chuanTe(te);
      if (!Number.isFinite(gia) || gia <= 0) return;
      const khoa = `${o}|${tienTe}|${gia}`;
      if (daThay.has(khoa)) return;
      daThay.add(khoa);
      ra.push({ o, nhanO: nhan[o] || o, gia, tienTe, khop: coTrongBang(gia, tienTe) });
    };
    for (const m of giaTri.matchAll(SAU_SO)) them(m[1], m[2]);
    for (const m of giaTri.matchAll(TRUOC_SO)) them(m[2], m[1]);
  }
  return ra;
}
