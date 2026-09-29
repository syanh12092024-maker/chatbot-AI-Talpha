// CỬA RA VÀO CỦA MÀN «CHÍNH SÁCH · FAQ · PHẢN ĐỐI» (VE4 · 29/09 · CR-28-09c).
//
// Ba khối bot trích khi khách hỏi đúng chủ đề, dùng chung MỌI page của team (MN7). Bản vẽ 2d đặt chúng thành một tab
// của Luật chung; trước VE4 trình sửa nằm trong trang một page — một khối cả team mà sửa ở trang của một page.
// Màn này KHÔNG có cửa API riêng: đọc/ghi qua `/api/anh-san-pham/khoi-chung` (van-hanh/router-anh.js) — một cửa ghi.
export { taoRouterKhoiChung, VAI_VAO_DUOC, DUONG_TRANG } from './router.js';
