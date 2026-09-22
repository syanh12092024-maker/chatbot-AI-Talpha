// Bộ lọc bảo thủ, 0 token: chỉ dùng mẫu cho một ý rõ ràng, không sửa/cancel đơn.
const TOPICS = [
  /\b(price|cost|much|magkano|presyo)\b|giá|bao nhiêu|السعر/iu,
  /\b(cod|cash on delivery)\b|الدفع عند الاستلام/iu,
  /\b(ship|shipping|delivery|deliver)\b|giao hàng|vận chuyển|توصيل/iu,
  /\b(size|sizes|sizing|fit|wrist|sukat)\b|kích thước|cổ tay|مقاس/iu,
  /\b(real|fake|authentic|legit|original|genuine)\b|chính hãng|hàng giả|اصلي/iu,
  /\b(use|usage|benefit|ingredients)\b|công dụng|cách dùng|thành phần/iu,
];
export function templateSafety(text, profile = {}) {
  const s = String(text || '').normalize('NFC');
  const authOnly = /^(?:hindi(?: po)? peke|(?:is it )?not (?:a )?fake)[?!.\s]*$/iu.test(s.trim());
  if (!authOnly && /\b(no longer|do not|don't|dont|cannot|can't|cancel|refund|change|instead|already|stop|not|hindi|ayaw)\b|không\s+(?:nhận|cần|muốn|mua|lấy|đồng ý)|đã nói|đổi\s+(?:địa chỉ|số|sang)|hủy|huỷ|لا أريد/iu.test(s))
    return { safe: false, reason: 'phủ định, sửa thông tin hoặc yêu cầu xử lý riêng' };
  // "cash on delivery" thuộc một ý COD, không coi chữ delivery là ý thứ hai.
  const topics = TOPICS.map((r, i) => r.test(i === 2 ? s.replace(/cash on delivery/giu, '') : s)).filter(Boolean).length;
  if (topics > 1 || /\b(and|also|but|pero|at saka)\b|\s(?:và|nhưng|còn)\s|[?？].*\p{L}.*[?？]/iu.test(s))
    return { safe: false, reason: 'nhiều ý hoặc có điều kiện bổ sung' };
  if ((profile.name || profile.phone || profile.address) && /\b(how.*order|paano.*order)\b|cách đặt/iu.test(s))
    return { safe: false, reason: 'đã có dữ liệu khách, chỉ hỏi trường còn thiếu' };
  return { safe: true, reason: '' };
}
