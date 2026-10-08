import { tinhTong } from '../core/gia.js';

/** Model đề nghị; backend chỉ nhận các trường hợp lệ và giá của đúng sản phẩm. */
export function chuanBiDon(kb, input) {
  const fail = reason => { throw new Error(`TỪ CHỐI tạo đơn: ${reason}`); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('dữ liệu không hợp lệ');
  if (input.cod_confirmed !== true) fail('khách chưa xác nhận COD');
  const text = (key, max, min = 1) => {
    if (typeof input[key] !== 'string' || input[key].trim().length < min || input[key].length > max)
      fail(`trường ${key} không hợp lệ`);
    return input[key].trim();
  };
  if (typeof input.address !== 'string' || input.address.trim().length < 6) fail('địa chỉ chưa đủ cụ thể');
  if (typeof input.phone !== 'string' || input.phone.replace(/\D/g, '').length < 7) fail('số điện thoại chưa hợp lệ');
  const order = { name: text('name', 120), phone: text('phone', 40), address: text('address', 1000, 6),
    city: text('city', 120), qty: input.qty, cod_confirmed: true,
    variant: input.variant == null ? '' : text('variant', 200, 0) };
  if (!Number.isSafeInteger(order.qty) || order.qty < 1) fail('số lượng phải là số nguyên dương');
  if (input.total_price != null && (typeof input.total_price !== 'number' ||
      !Number.isFinite(input.total_price) || input.total_price <= 0)) fail('tổng tiền không hợp lệ');
  const products = kb?.products || [];
  const product = input.product_id
    ? products.find(p => String(p.id) === String(input.product_id))
    : (products.length === 1 ? products[0] : null);
  if (!product) fail('chưa xác định được sản phẩm của Page');
  if (product.hetHang) fail('sản phẩm hết hàng');
  // RP1 (/code-review #1): nhãn bậc nay là «Tên bậc» tự do ⇒ bước ③ của `chonGoi` (số ĐẦU nhãn) không còn chọn được bậc theo qty
  // («Best Value» so_luong 3), hoặc chọn NHẦM («Buy 2 Get 2 FREE» so_luong 4 cho khách nói 2 cái). Model không nêu gói mà bảng DB có
  // đúng MỘT bậc so_luong = qty ⇒ nêu gói đó (so_luong UNIQUE trong một sản phẩm). Chỉ đặt `variant` — tổng/giá vẫn qua `tinhTong`.
  const theoQty = order.variant ? [] : (product.tiers || []).filter(t => t.qty != null && Number(t.qty) === order.qty);
  const variant = theoQty.length === 1 ? theoQty[0].label : order.variant;
  const price = tinhTong({ kb: { products: [product] }, variant, qty: order.qty, tong: input.total_price });
  if (price.chan) fail(price.lyDo);
  if (!price.goi || !(price.tong > 0)) fail('chưa xác định được gói giá; hỏi lại khách hoặc chuyển nhân viên');
  // Với bảng giá DB có qty rõ ràng, không cho một gói đơn chiếc trả cho nhiều chiếc.
  const explicit = (product.tiers || []).find(t => t.label === price.goi.nhan && Number(t.price) === price.tong);
  let qty = order.qty;
  if (explicit?.qty != null && Number(explicit.qty) !== order.qty) {
    // RP1 ② 3 (review (a) vòng 2 R2-C1) — nhãn bậc nay là «Tên bậc» marketer đặt («Buy 1 Get 1 FREE (2 items)», so_luong 2), và
    // model hay truyền số «MUA» trong nhãn (1) thay vì số món (2). Nhận đúng MỘT ngoại lệ: `qty` = số «mua» ở ĐẦU nhãn VÀ không bậc
    // nào khác của sản phẩm có so_luong bằng số đó ⇒ ghi đơn với qty = so_luong của bậc. Mọi trường hợp khác TỪ CHỐI như cũ — ép
    // qty vô điều kiện là gỡ lưới này: khách muốn 3 cái thành đơn 2 cái, «2» chọn nhầm bậc 4 món thành đơn 159, hai gói nhét vào
    // giá một gói — và `cua2Tien` không bắt lại được vì nó so so_luong đơn với chính so_luong đã bị ép ở đây.
    const coBacKhac = (product.tiers || []).some(t => t !== explicit && Number(t.qty) === order.qty);
    if (soMuaDauNhan(explicit.label) !== order.qty || coBacKhac) fail('số lượng không khớp gói giá');
    qty = Number(explicit.qty);
  }
  return { ...order, qty, product_id: product.id, product_name: product.name || '',
    currency: price.tienTe, total_price: price.tong, variant: price.goi.nhan };
}

/** Số «mua» ở ĐẦU nhãn — cùng regex bước ③ của `core/gia.js#chonGoi` (`^n\b` · `^buy n\b` trên nhãn đã chuẩn hoá). Chuẩn hoá bằng
 *  NFKC (đưa «𝐁𝐮𝐲 𝟏» về «buy 1» như bảng đổi của `chuan` ở đó) — RỘNG hơn `chuan` ở chữ toàn khổ «Ｂｕｙ ２»; chỉ quyết nhận/loại
 *  qty trên bậc `chonGoi` ĐÃ chọn, không mở chọn gói (hai bản chuẩn hoá: nợ N-RP1-CHUAN-NHAN-HAI-BAN). Không số đầu nhãn ⇒ null. */
function soMuaDauNhan(nhan) {
  const n = String(nhan ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const m = /^(?:buy )?(\d+)\b/.exec(n);
  return m ? Number(m[1]) : null;
}

export function ketQuaNhanDon(order, id) {
  return { ok: true, captured: true, draft_id: String(id), order,
    note: 'Đã lưu thông tin vào hàng chờ nhân viên duyệt. Chỉ báo đã nhận thông tin; chưa xác nhận tạo đơn POS, mã đơn hay lịch giao.' };
}
