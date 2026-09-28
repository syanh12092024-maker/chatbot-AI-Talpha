# PHIẾU UI-HT2 · UI-HT3 · UI-HT4 — Bàn hội thoại

**Nguồn:** CR-28-09. **Làn:** 🟩 (giao diện, chỉ đọc). **Phụ thuộc:** UI-HT1.
**Bản dựng được duyệt:** https://claude.ai/artifact/LJcDVTN8GZPyWEtxZnF2yh

## UI-HT2 — Màn «Bàn hội thoại»
Ba cột: danh sách hội thoại (lọc Cần người · Bot đang xử · Tất cả; mỗi dòng: tên, tin cuối, trạng
thái, page, đồng hồ 10 phút) · khung chat (tin khách trái; tin bot phải có nhãn AI; tin sale có nhãn
SALE; mốc «bot đẩy sang người» giữa dòng) · cột bối cảnh. Hàng thao tác: «Trả lời trên Pancake» ·
Nhận việc · Trả lại cho bot · Đóng việc (dùng lại `dong-viec-ui.js`). **KHÔNG ô soạn tin.** Khổ hẹp:
một cột một lúc. Khung trang dùng hệ kiểu bản 4; thành phần mới vào `kieu.css` (HK15).

## UI-HT3 — Cột bối cảnh
Khách (tên, SĐT, địa chỉ, số đơn) · rủi ro hoàn · đơn đang bàn · giai đoạn hội thoại
(`hoi_thoai.trang_thai`) và người giữ (`chu_so_huu`) · lý do cuối · câu AI nói gần nhất ·
kịch bản page đang chạy. Model/chi phí từng câu: hiện «chưa có dữ liệu» khi `so_ai` trống.

## UI-HT4 — Sửa thước
Spec L4-M1 (đã trỏ CR), bộ ca dispatch, HK10 (tên màn trong menu), thước «không có ô soạn tin»
(`<textarea>`/nút gửi) phải phủ cả màn mới.
