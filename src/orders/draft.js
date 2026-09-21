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
  const price = tinhTong({ kb: { products: [product] }, variant: order.variant, qty: order.qty, tong: input.total_price });
  if (price.chan) fail(price.lyDo);
  if (!price.goi || !(price.tong > 0)) fail('chưa xác định được gói giá; hỏi lại khách hoặc chuyển nhân viên');
  // Với bảng giá DB có qty rõ ràng, không cho một gói đơn chiếc trả cho nhiều chiếc.
  const explicit = (product.tiers || []).find(t => t.label === price.goi.nhan && Number(t.price) === price.tong);
  if (explicit?.qty != null && Number(explicit.qty) !== order.qty) fail('số lượng không khớp gói giá');
  return { ...order, product_id: product.id, product_name: product.name || '',
    currency: price.tienTe, total_price: price.tong, variant: price.goi.nhan };
}

export function ketQuaNhanDon(order, id) {
  return { ok: true, captured: true, draft_id: String(id), order,
    note: 'Đã lưu thông tin vào hàng chờ nhân viên duyệt. Chỉ báo đã nhận thông tin; chưa xác nhận tạo đơn POS, mã đơn hay lịch giao.' };
}
