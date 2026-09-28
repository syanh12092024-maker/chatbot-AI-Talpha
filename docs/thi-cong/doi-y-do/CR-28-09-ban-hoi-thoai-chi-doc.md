# CR-28-09 · Bàn hội thoại chỉ đọc thay cho «hai danh sách»

Người yêu cầu: chủ dự án · 28/09/2026 · sau ba lượt soát giao diện (ui-taste) và bản dựng
tương tác https://claude.ai/artifact/LJcDVTN8GZPyWEtxZnF2yh. Người quyết chọn phương án 1.

## 1 · Câu đổi

**Từ** §10 «Màn hình sale chỉ là bảng điều phối: hai danh sách, bấm là nhảy sang Pancake»
**sang** «Bàn hội thoại CHỈ ĐỌC: danh sách hội thoại + khung chat đọc thẳng lịch sử Pancake
+ cột bối cảnh khách. Trả lời VẪN ở Pancake; trên hệ chỉ nhận việc · trả lại bot · đóng việc»,
**vì** khuôn bảng quản trị không cho sale thấy bot đã nói gì trước khi đẩy sang người — phải
mở Pancake mới biết việc gấp tới đâu, và giao diện đọc như «UI slop» chung chung.

**Phạm vi âm** — CR này KHÔNG đụng: ô soạn tin / gửi tin từ hệ (giữ đúng vế «sale trả lời ở
Pancake»); van gửi `V3_PANCAKE_GUI` · `V3_POS_GHI`; bộ não bot (`src/prompts.js` `closer.js`
`tools.js` `fast-lane.js` `outbound-guard.js`); lược đồ; bảng `so_ai`; màn số liệu, cấu hình.

## 2 · Tác động năm lớp (đo 28/09)

| Lớp | Chỗ | Việc phải làm | Ước lượng |
|---|---|---|---|
| 1 · Ý đồ | `01-QUYET-DINH.md` §10 (dòng 205–211); §11 dòng «Chatwoot cho màn hình sale» | Viết lại §10, giữ dòng cũ gạch ngang + trỏ CR; §11 giữ (không di dời sang Chatwoot) | nhỏ |
| 2 · Điều hành | Không phiếu UI nào đang chạy. BH2–BH8 🎫 đều ở bộ não bot, không chạm màn | Không dừng phiếu nào; đẻ phiếu mới (mục 5) | — |
| 3 · Hợp đồng | `03-MAN-HINH.md:18` «Bảng điều phối… hai danh sách»; `v3/docs/spec/L4-M1-bang-dieu-phoi.md`; `chi-tiet.js` ghi chú «đoạn chat đã bỏ 23/08»; `06-PROMPT-GIAO-VIEC.md`, `08-PROMPT-GD2.md` nhắc «mục 10» | Sửa 03 + spec L4-M1; ghi chú chi-tiet.js trỏ CR (lý do cũ — dựng từ `so_ai` — vẫn đúng, đường mới là đọc thẳng Pancake) | vừa |
| 4 · Máy | `v3/src/ui/dispatch/*` (màn + router), `van-hanh/router.js` (đã có `GET /api/van-hanh/conversations/:id` đọc Pancake), `trang-chu`, khung `dieu-huong.js`; bộ ca `dispatch-*.test.mjs`, `giao-dien-kho-hep`, `he-kieu` HK10 (tên màn). Cổng nghiệm thu: không cổng nào đo màn điều phối (đã quét `ops/bin/nghiem-thu/`) | Màn mới + cửa đọc hội thoại cho bàn; sửa thước theo luật mới | lớn |
| 5 · Dữ liệu | Máy chủ: **28.953 hội thoại, 0 có mã hội thoại Pancake** (`tin_cho_xu_ly` chưa có tin nào đi qua v3); **0 việc mở**; **`so_ai` 0 dòng** | Cần đường tra mã hội thoại Pancake cho hội thoại chưa qua v3 (bot cũ có `pkConvId` trong trạng thái của nó; Pancake tra được theo khách). Không sửa dữ liệu cũ | vừa |

## 3 · Giá phải trả

- **Khung chat trống với mọi hội thoại hôm nay** nếu chỉ dựa đường hiện có — phải có phiếu
  tra mã Pancake trước, không thì bàn hội thoại chỉ là danh sách có ô trống ở giữa.
- **Mỗi lần mở một hội thoại là một lượt gọi Pancake** (chỉ đọc, không đụng van gửi). Cần
  nhớ ngắn hạn để 20 sale không gọi lặp — đường đọc hiện tại không nhớ.
- «Model · chi phí từng câu» của bản dựng **chưa có số thật** (`so_ai` trống). Hiện «chưa có
  dữ liệu», không bịa.
- Bỏ khuôn «hai danh sách» ⇒ thước L4-M1 phải viết lại; đã có một lượt gộp hàng đợi (65fd562).
- Rủi ro sale bắt đầu «muốn trả lời luôn ở đây» — vế cấm soạn tin phải giữ bằng thước.

## 4 · Đề nghị ghi §9 SỔ NỢ

- Tóm tắt hội thoại bằng model (một dòng «khách đang muốn gì») — cần gọi model, tốn tiền, tách phiếu sau.
- Chi phí từng câu trong khung chat — chờ bộ nạp Sổ AI (việc người A).

## 5 · Phiếu cần đẻ

| Mã | Việc | Làn | Phụ thuộc |
|---|---|---|---|
| UI-HT1 | Cửa đọc hội thoại cho bàn: tra mã Pancake (trạng thái bot cũ → tra theo khách), nhớ 60 giây, trả lý do khi không đọc được | 🟨 (đọc dữ liệu khách thật) | — |
| UI-HT2 | Màn «Bàn hội thoại»: ba cột, lọc Cần người · Bot đang xử · Tất cả, khổ hẹp một cột; thay màn Việc đang chờ | 🟩 | UI-HT1 |
| UI-HT3 | Cột bối cảnh: khách · rủi ro hoàn · đơn · giai đoạn và người giữ hội thoại · lý do cuối · kịch bản page | 🟩 | UI-HT2 |
| UI-HT4 | Sửa thước: spec L4-M1, 03-MAN-HINH, bộ ca dispatch, thước «không có ô soạn tin» | 🟩 | UI-HT2 |

## 6 · Đường lùi

Màn cũ (hàng đợi `65fd562`) giữ nguyên đường `/dieu-phoi` tới khi UI-HT2 xanh; bàn mới mở ở
đường riêng. Sai thì bỏ đường mới, §10 trả về dòng cũ (còn nguyên dạng gạch ngang). Không có
thay đổi dữ liệu ⇒ không có gì phải lùi ở CSDL.
