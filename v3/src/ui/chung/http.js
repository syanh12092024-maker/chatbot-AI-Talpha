// BA MẢNH HTTP DÙNG CHUNG CHO MỌI MÀN v3.
//
// Tách ra khỏi `ui/dispatch/router.js` ngày 25/08 khi màn «Cấu hình team» cần đúng ba mảnh
// này. Lý do tách thay vì chép: `locTiep()` là một BỘ LỌC AN TOÀN (chặn chuyển hướng ra
// ngoài). Hai bản sao của một bộ lọc an toàn là hai bản sẽ lệch — và bản bị bỏ quên luôn là
// bản đang mở cửa. Cùng một lý lẽ với `VAI` và với `trangThaiCua()`.
//
// File này KHÔNG giữ trạng thái, không nối cổng, không import module nào của vai B — nên
// nó không phá luật «bốn module không import lẫn nhau»: nó là nền, giống `auth/boi-canh.js`.

/** Đích mặc định sau khi đăng nhập xong. */
export const TRANG_MAC_DINH = '/dieu-phoi';

/**
 * Yêu cầu này là một CON NGƯỜI đang mở trang, hay là `fetch()` của trang đó?
 *
 * Hỏi `req.accepts(['json','html'])` chứ không hỏi `req.accepts('html')`: tiêu đề Accept
 * mở toang (curl, `fetch` trần, máy gọi máy) khớp CẢ HAI, và với thứ khớp cả hai thì JSON
 * mới là câu trả lời đúng. Chỉ trình duyệt thật mới nói rõ `text/html` được ưu tiên hơn.
 * Không đoán bằng đường dẫn: `fetch()` từ chính trang đó vẫn phải nhận JSON.
 */
export function muonTrang(req) {
  if (req.xhr) return false;
  try {
    return req.accepts(['json', 'html']) === 'html';
  } catch {
    return false;
  }
}

/**
 * Lọc `tiep` — CHỈ ĐƯỜNG DẪN NỘI BỘ.
 * Phải bắt đầu bằng đúng một dấu `/`; `//evil.com` là đường ra ngoài (trình duyệt đọc nó
 * thành `https://evil.com`), `\\` cũng vậy trên vài bộ phân tích. Không đạt → về mặc định.
 */
export function locTiep(tiep) {
  const s = typeof tiep === 'string' ? tiep.trim() : '';
  if (!s.startsWith('/')) return TRANG_MAC_DINH;
  if (s.startsWith('//') || s.startsWith('/\\')) return TRANG_MAC_DINH;
  return s;
}

/** Thoát HTML cho mọi chuỗi nhúng vào trang do máy chủ dựng. */
export const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
