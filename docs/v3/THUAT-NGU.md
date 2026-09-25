# THUẬT NGỮ TRÊN MÀN — một thứ, một tên

> Lập 24/09/2026 trong phiếu GD4 (`09-KE-HOACH-GIAO-DIEN.md` mục 5).
> Đây là bảng từ cho **chữ hiện trên màn**. Tên biến, tên bảng, tên tệp trong mã nguồn giữ
> nguyên — đổi tên mã nguồn không phải việc của bảng này.

## Vì sao

Đo 22/09 trên 26 màn: 6.849 chữ diễn giải, 80 chỗ lộ tên bảng / tên tệp / biến môi trường, và
cùng một thứ mang nhiều tên. Người vận hành đọc «token», «POS», «v1/v3», «CSDL» rồi phải tự
dịch sang thứ họ biết — mỗi lần dịch là một lần đoán, và đoán sai thì họ đi sửa nhầm chỗ.

## Bảng từ

| Trên màn nói | Không nói | Vì sao |
|---|---|---|
| **tài khoản Pancake** | token, JWT, `token_pancake` | Người dùng lấy nó trong tài khoản Pancake của họ; chữ «token» là chữ của người viết mã |
| **kho hàng** | POS, `ket_noi_pos`, shop POS | Nơi đơn chạy về và nơi lấy sản phẩm. «POS» chỉ có nghĩa với người đã đọc tài liệu |
| **cửa hàng** | shop id, `pos_shop_id` | Một kho hàng có nhiều cửa hàng theo thị trường |
| **bot cũ · bot mới** | v1 · v3 · legacy · runtime | Hai bộ máy chạy song song. Người dùng cần biết page mình chạy bằng bộ nào, không cần biết tên phiên bản |
| **máy chạy bot** | worker, `aicloser-worker-v3` | Thứ đang thật sự trả lời khách |
| **cơ sở dữ liệu** (chỉ trong ô «Nguồn số») | CSDL, Postgres, `so_ai` | Trên mặt màn thì không nhắc tới; cần khai nguồn thì nói trong ô gập |
| **cho chạy** | LIVE, publish, áp bản | Việc người dùng làm: cho một bản kịch bản chạy với khách |
| **đang chạy thử** | diễn tập, `V3_DIEN_TAP` | Bot soạn câu trả lời nhưng không gửi |
| **kịch bản** | script, prompt của page | Lời bot nói riêng trên một page |
| **quy tắc chung** | bộ luật chung, CORE | Áp cho mọi page của team |
| **câu trả lời sẵn** | lớp 0 đồng, fast lane | Câu khớp từ khoá, không gọi model |
| **đoạn chữ gửi cho AI** | prompt | Thứ model đọc trước khi trả lời |
| **người quản trị hệ thống** | sysadmin, devops, «bạn» | Người sửa được cấu hình máy chủ — KHÁC với quản trị team |
| **cấu hình máy chủ** | `.env`, biến môi trường | Chỗ người vận hành không sửa được bằng màn |

## Ba luật đi kèm

1. **Mặt màn không có tên bảng, tên tệp, biến môi trường, mã phiếu, số hiệu tài liệu.**
   Cần khai nguồn (luật 8 của sổ điều hành) thì dùng ô **«ⓘ Nguồn số»** ở chân màn:
   `window.UI.nguonSo({ dong: [{ ten, tu }], chuY })`.
2. **Tối đa MỘT hộp cảnh báo ở đầu màn, và chỉ khi có việc phải làm.** Câu «số này chưa chắc»
   là chú thích cạnh con số; câu «tính năng chưa dựng» không hiện trên màn.
3. **Lỗi phải kèm bước tiếp theo**, và nói rõ AI làm được hay phải nhờ người quản trị hệ thống.

## Chỗ chưa dọn (cập nhật khi làm tiếp)

| Màn | Còn gì |
|---|---|
| Menu (`chung/man-hinh.js`) | ✅ 25/09 — «Kết nối & token» → «Kết nối», «Vận hành chat V3» → «Hội thoại và đơn». Còn «Model AI & khoá» dùng chữ viết tắt |
| Bảy màn ẩn khỏi menu (cờ `thuNghiem`) | đường dẫn vẫn sống, nhưng mới «Gợi ý từ AI» có lối vào từ màn khác — sáu màn còn lại chưa có |
| Đoạn chữ gửi cho AI | ✅ 25/09 — 5 hộp cảnh báo → 0, đã đổi tên năm khối |
| Sản phẩm & kho · Gợi ý từ AI · Khách vào từ đâu · Ai đã sửa gì · Việc của tôi | ✅ 25/09 dọn chữ; Sản phẩm & kho còn 4 mã và 3 hộp cảnh báo |
| Điều kiện `MISSING_TAGS` | còn nhắc thao tác bên Pancake bằng lời cũ |
