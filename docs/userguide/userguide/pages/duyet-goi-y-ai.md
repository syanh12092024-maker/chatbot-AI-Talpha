# Duyệt hoặc từ chối gợi ý từ AI

> Trang này hướng dẫn người quản trị đưa một bản quy tắc chung do AI đề xuất vào hàng chờ, duyệt nó, rồi sang áp — và nói rõ việc «từ chối» hôm nay làm thế nào.

**Ai làm được:** Quản trị. Marketer và Sale không mở được màn này.

__Khi nào dùng:__ có một bản quy tắc chung do AI viết (ví dụ bạn nhờ một công cụ AI rút gọn bộ quy tắc) và cần đưa nó qua người duyệt trước khi cho chạy; màn «Quy tắc chung mọi page» báo «… bản do AI đề xuất chưa ai duyệt».

__Trước khi bắt đầu:__
- **Hai đường vào bộ quy tắc.** Bản người viết: «Lưu → Áp · 2 bước» (ở màn Quy tắc chung). Bản AI đề xuất: «Nhận → Duyệt → Áp · 3 bước». Màn ghi: «Duyệt là «nội dung này chấp nhận được». Áp là «từ giờ mọi page của team nói theo bản này».»
- Bản AI đề xuất chưa duyệt thì **không áp được** — hệ chặn ở tầng dữ liệu, không chỉ ẩn nút.
- Màn này **không tự sinh đề xuất**: nó chỉ nhận đề xuất do người (hoặc một việc nền) đưa vào. Không ai đưa vào thì danh sách trống — đó là trạng thái bình thường.

## Các bước — đưa một đề xuất vào hàng chờ

1. Mở **Page → Luật chung**, bấm tab «Đề xuất chờ duyệt» (đường dẫn `/ai-de-xuat`).
   → *Kết quả:* trang «Gợi ý từ AI». Hộp đầu trang nhắc «Duyệt xong vẫn chưa áp» kèm nút «Mở Quy tắc chung».
2. Ở khung «Nhận một đề xuất», dán toàn văn bản AI đề xuất vào ô «Nội dung đề xuất».
   → *Kết quả:* nội dung phải dài ít nhất 200 ký tự.
3. Gõ «Lý do» (bắt buộc): đề xuất đổi cái gì và vì sao.
   → *Kết quả:* người duyệt đọc lý do này để cân nhắc.
4. Bấm «Đưa vào hàng chờ».
   → *Kết quả:* thông báo «Đã vào hàng chờ — bản v…. Chưa áp.»; bản mới xuất hiện ở bảng «Đang chờ duyệt» với nhãn «Chờ duyệt».

## Các bước — duyệt rồi áp

1. Ở bảng «Đang chờ duyệt», đọc cột «Bản» (cỡ), «Lý do», «Đưa vào» (ai, lúc nào), «Trạng thái».
   → *Kết quả:* góc bảng ghi «… bản chờ duyệt» hoặc «Không có bản nào chờ».
2. Muốn xem nội dung khác bản đang chạy ở dòng nào: mở **Page → Luật chung** (tab «Luật»), bấm «So sánh» ở dòng bản mang nhãn «AI đề xuất».
   → *Kết quả:* ngăn kéo so sánh hiện từng dòng thêm/bỏ so với bản đang áp.
3. Bấm «Duyệt» ở dòng bản cần duyệt (hoặc «Duyệt bản v…» trong ngăn kéo so sánh).
   → *Kết quả:* hộp «Duyệt bản v… do AI đề xuất?» — «Duyệt KHÔNG phải là áp: bản này vẫn chưa nói với khách. Sau khi duyệt, phải sang màn Quy tắc chung bấm áp.»
4. Bấm «Duyệt bản này».
   → *Kết quả:* thông báo «Đã duyệt v…. Chưa áp — sang màn Quy tắc chung để áp.» Trạng thái đổi thành «Đã duyệt, chưa áp» kèm người duyệt và giờ duyệt; nút ở cuối dòng thành «Sang áp».
5. Bấm «Sang áp», rồi áp bản đó như một bản thường.
   → *Kết quả:* xem [Soạn bản mới cho quy tắc chung mọi page](./sua-quy-tac-chung.md), bước «So sánh» và «Áp bản v…».

![Màn «Gợi ý từ AI» — bảng «Đang chờ duyệt» có một bản «Chờ duyệt» và nút «Duyệt»](images/duyet-goi-y-ai.png)

<!-- CHỤP: anh=duyet-goi-y-ai · vai=quan-tri · duong=/ai-de-xuat · cho=«Đang chờ duyệt»
     thao_tac=
     trang_thai=bảng «Đang chờ duyệt» có ít nhất một bản nhãn «Chờ duyệt» với nút «Duyệt»; bên dưới thấy khung «Nhận một đề xuất»
     danh_dau=(1) «Đang chờ duyệt» · (2) «Duyệt» · (3) «Nhận một đề xuất» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Bảng «Đang chờ duyệt» | Các bản AI đề xuất, mới nhất trước |
| (2) | Nút «Duyệt» | Duyệt — chưa áp |
| (3) | Khung «Nhận một đề xuất» | Dán nội dung + lý do để đưa vào hàng chờ |

## Từ chối một đề xuất

Hệ chưa làm được việc này — màn không có nút «Từ chối» hay «Xoá». Hiện tại: **không duyệt** bản đó. Bản chưa duyệt nằm nguyên trong danh sách với nhãn «Chờ duyệt» và không áp được, nên không ảnh hưởng tới bot.
<!-- TBD: cách đánh dấu một đề xuất là «đã từ chối» (để nó rời hàng chờ) chưa có trên hệ — OQ-SP-1 -->

## Ba tầng

Mục «Ba tầng» cho biết tầng nào nhận được đề xuất của AI hôm nay:

| Tầng | Trạng thái trên màn | Vì sao |
|---|---|---|
| «Bộ luật chung» | «Nhận được đề xuất» | — |
| «Thư viện kỹ năng» | «Chưa nhận được» | «Tầng này chưa lưu được «ai đề xuất» và «ai đã duyệt», nên chưa dựng được đường duyệt. …» |
| «Kịch bản page» | «Chưa nhận được» | «Kịch bản có trạng thái «chờ duyệt», nhưng chưa phân biệt được bản người viết với bản AI đề xuất …» |

Lời bot của page do người viết thì lưu là chạy, không qua duyệt (xem [Viết và lưu lời bot cho một page](./viet-loi-bot.md)).

## Trạng thái trống và lỗi

| Màn ghi | Nghĩa | Làm gì |
|---|---|---|
| «Chưa có đề xuất nào đang chờ» — «… Đây là trạng thái bình thường …» | Không ai đưa đề xuất vào | Không cần làm gì |
| «Chưa dán nội dung đề xuất.» | Ô nội dung trống | Dán nội dung |
| «Lý do là bắt buộc — người duyệt cần biết đổi cái gì và vì sao.» | Ô lý do trống | Gõ lý do |
| «đề xuất chỉ có … ký tự — quá ngắn (tối thiểu 200).» | Nội dung quá ngắn | Dán đủ toàn văn |
| «Không duyệt được đề xuất» · «bản v… đã duyệt rồi.» | Bản đã được duyệt ở lượt khác | Tải lại trang |
| «Không tải được danh sách đề xuất» | Máy chủ không trả được dữ liệu | Kiểm kết nối rồi tải lại trang |

## Liên quan

[Soạn bản mới cho quy tắc chung mọi page](./sua-quy-tac-chung.md) · [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md) · [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md)
