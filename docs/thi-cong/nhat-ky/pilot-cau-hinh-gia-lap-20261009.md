# Pilot — bước ② cấu hình 4 page trên prod + giả lập độ chính xác trên hội thoại thật · 09/10/2026

> Người quyết giao 09/10: «Soothing cooling cũng được. Bạn cấu hình sẵn toàn bộ mọi thứ để tôi kiểm tra → quét hội thoại 3 ngày gần nhất, soạn câu
> trả lời định rep và so sánh với câu trả lời hiện tại… kể cả cách phân tích, ghi nhận hội thoại, memory khách hàng», rồi chọn thêm 3 page đo
> (AskUserQuestion: Soothing Cooling Gel Saudi · Healthy Figure PH Saudi · Kreain Nature UAE). Bot v3 vẫn TẮT trên mọi page (0/582) — không bậc phơi
> nào mở; đây là ghi DỮ LIỆU cấu hình qua đúng cửa ghi của giao diện, không phải mở van.
> ⚠️ Repo công khai: nhật ký này KHÔNG chép tên/SĐT/địa chỉ khách. Bản đối chiếu đầy đủ (che tên) chỉ nằm ở máy dev, ngoài git.

## 1 · Ghi gì trên prod (CSDL `aicloser_v3`, qua `saveProduct` chỉ-giá · `ganPageVaoGoc` · `apGiaTuDon` · `doiSoatDonVi` — nhật ký ghi `nguoi:2`)

| Page (id v3) | Gắn gốc × shop | Giá (nguồn) | Tên bậc | Ảnh | Bản sao kịch bản |
|---|---|---|---|---|---|
| Soothing Cooling Gel in UAE (275) | `soothing-cooling-gel` × 1635200759 (món 454, SKU 222) | 2 = 99 · 4 = 149 AED, miễn ship — «Điền giá» 87 đơn POS 60 ngày (9/10 · 3/3) | «Buy 1 Get 1 FREE (Total 2 items)» · «Buy 2 Get 2 FREE (Total 4 items)» | 8 | #62 → «giữ giá món» (bản sao ghi `so_luong` 1/2 — sai bậc khuyến mãi) |
| Soothing Cooling Gel in Saudi (276) | `soothing-cooling-gel` × 1328205216 (món 257) | 2 = 109 · 4 = 159 SAR — «Điền giá» (10/10 · 10/10) | như trên | 8 | #39 → «giữ giá món» |
| Kreain Nature PH in Uae (340) | `oxyelle-warm-soothing-cream` × 1635200759 (món 467) — **gợi ý tự động sai** (Kreain 162); gắn theo SKU đơn POS 30 ngày thật (205, 209 đơn) | 2 = 99 · 4 = 149 AED — «Điền giá» (10/10 · 10/10) | như trên | 7 | #59 → «giữ giá món» |
| Healthy Figure PH in Saudi (335) | `fitgum-acai-berry` × 1328205216 (món 314) — gợi ý tự động sai; gắn theo SKU 125 (200 đơn) | 2 = 99 · 4 = 149 · 6 = 199 SAR (đơn POS 10/10 mỗi bậc; ghi bằng cửa giá tay) | + «Buy 3 Get 3 FREE (Total 6 items)» | 9 | #38 → «giữ giá món» |

Lượt áp «Điền giá» thứ hai trong cùng lượt chạy trả 409 `xem_truoc_da_doi` (dấu xem trước đổi vì page trước vừa có giá) — rào đúng; chạy lại thì qua.
⚠️ Món 314 (Fitgum) POS đang báo **hết hàng** ⇒ đường CSDL bỏ món hết hàng ⇒ pilot thật bot giao sale mọi lượt ở page này cho tới khi POS có tồn.
Kịch bản LIVE KHÔNG sửa: page 275/276 còn lỗi chữ «Buy 2 Get 2 FREE ( Total 2 iteam )» (marketer sửa ở màn Kịch bản — lưu là chạy).

## 2 · Cách giả lập (không gửi gì, không đụng CSDL prod)

- Prod chỉ ~400 MB RAM trống (pancake-tool + ai_sale chạy khách thật cùng máy) ⇒ KHÔNG chạy giả lập trên prod.
- Bản chép cấu hình: `pg_dump --exclude-table-data` cho bảng khách/đơn/nhật ký/hội thoại/tài khoản/khoá (`ket_noi_pos` chép riêng, khoá POS giả) →
  CSDL `aicloser_gialap_pilot` / `aicloser_gialap_2` trên Postgres.app máy dev; bật `bot_ai_bat` CHỈ trong CSDL giả lập; món 314 coi còn hàng (chỉ trong CSDL giả lập).
- Hội thoại: `pkGetConversations`/`pkGetMessages` trên prod (chỉ đọc) — Pancake chỉ trả 60 hội thoại mới nhất ⇒ page đông chỉ phủ ~1–1,5 ngày.
- Chạy: bản mở rộng của `ops/bin/gia-lap-mot-minh.mjs` (chụp trạng thái · điểm lead · hồ sơ · việc · đơn nháp sau mỗi lượt), `V3_RAP_PROMPT_BAT=1`,
  `--khong-nhuong-sale`, Kimi k2.6 bằng khoá riêng team 1 (truyền vào biến môi trường lúc chạy, không ghi đĩa), nhịp 25 giây/lượt gọi model.
- Bẫy gặp: (a) khoá `KIMI_API_KEY` trong `.env` prod + dev đều 401 — bot sống nhờ khoá `khoa_nha` của team; model dự phòng/nền KHÔNG có khoá;
  (b) **Kimi của team giới hạn 3 lượt/phút toàn tổ chức** — lượt đầu 33/109 lượt hỏng 429; (c) khối đọc `.env` của công cụ giả lập giữ chú thích đuôi
  ⇒ `FASTLANE_TEMPLATES` · `FASTLANE_INTRO` · `HUMAN_TAKEOVER` bị đọc thành BẬT (prod đọc `"0"`) — các lượt giả lập trước dùng công cụ này đều lệch (phiếu GL8 ② B).

## 3 · Kết quả page 275 (UAE) — 109 lượt khách · 52 hội thoại · 06/10 04:36 → 09/10 03:29 UTC

Bot trả lời 64 lượt (74 lần gọi model · 6.342đ ≈ 58đ/lượt · trễ p50 2,8s / p90 4,7s; ai_sale p50 34s). Lúc pilot thật bot gửi ~42 lượt (nhường Botcake 20 ·
sale đang nhắn 13 · đã giao sale 9 · im/chặn/lỗi 23 · thẻ đơn 2).

- Đúng: 0 lượt sai giá/số món/tệ; giữ giá khi mặc cả (ai_sale tự hạ 90 AED); trả lời tiếng Ả Rập khi khách viết Ả Rập; chốt đơn đủ dữ liệu + đơn nháp
  khi khách gửi gọn một lần; im đúng lúc với «Start»/«hi»/«ok».
- Sai (phải sửa trước pilot): ① **bịa trạng thái đơn** với khách sau bán («chưa có đơn, thông báo gửi nhầm» khi đơn đang giao — 3 lượt) và nói sai
  sản phẩm; ② **chốt đơn hụt** — 4 hội thoại khách gửi đủ SĐT + địa chỉ, chốt được 1; hỏi lại thứ hồ sơ đã có ⇒ cửa chặn trùng ⇒ giao sale;
  ③ **trích tên sai** 5 hội thoại («finished», «working f.», tên lấy từ địa chỉ / tin POS); ④ lời y tế chưa xác minh («FDA approved» — có trong kịch bản
  marketer), khách báo chảy máu không được khuyên đi khám; ⑤ lỗi cắt emoji (GL8) gặp lại; Kimi 429 còn 3 lượt dù giãn 25s.
- Chờ người quyết: giao hàng 2–4 ngày (khối Chính sách) ≠ 2–5 ngày (kịch bản, sale) ≠ 3–5 (tin POS) · «kiểm hàng rồi trả tiền» · «hoàn tiền 30 ngày»
  · được nói «FDA approved» không · chính sách giảm giá khi mặc cả.

(Page 276 · 335 · 340: bổ sung khi giả lập xong.)

## 4 · Nợ phát sinh → §9

N-PILOT-AI-BACK-SALE (thẻ bàn giao không có trên cả 4 page — pancake-tool xoá mỗi 30′) · N-PILOT-KIMI-RPM3 (nâng hạn mức hoặc thêm khoá dự phòng) ·
N-PILOT-KHOA-ENV-CHET (`KIMI_API_KEY` .env prod/dev 401) · N-PILOT-GOI-Y-GOC-SAI (gợi ý gắn gốc 0,25–0,33 chọn sai sản phẩm ở 2/4 page — gắn theo
SKU đơn thật mới đúng) · N-PILOT-HET-HANG-VAN-BAN (POS báo hết hàng món đang bán 200 đơn/30 ngày) · N-PILOT-CHINH-SACH-MAU-THUAN (khối chung ↔ kịch bản).
