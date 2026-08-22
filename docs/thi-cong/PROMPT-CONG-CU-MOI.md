# PROMPT DÁN VÀO CÔNG CỤ MỚI

> Dán nguyên khối dưới đây vào phiên làm việc mới. Tự chứa — người nhận không cần đọc gì trước.

````text
Bạn tiếp quản phần việc CODER A của dự án AI Closer v3 — bot bán hàng Messenger/WhatsApp
cho ~478 page, thị trường Trung Đông + Philippines, hàng COD. Repo nằm ở thư mục hiện tại.

═══ ĐỌC TRƯỚC KHI GÕ PHÍM (theo thứ tự) ═══
1. docs/thi-cong/BAN-GIAO-CHUYEN-CONG-CU.md  ← trạng thái, việc còn lại, cách dựng môi trường
2. docs/thi-cong/SO-DIEU-HANH-THI-CONG.md    ← sổ điều hành: §0a luật · §7b chạy thử · §8 việc
                                                người · §9 sổ nợ · §9b 10 CHẶN refute · §10 nhật ký
3. docs/v3/01-QUYET-DINH.md                  ← ý đồ nghiệp vụ, THẮNG mọi tài liệu khác
4. docs/v3/ban-giao/                         ← 8 file hợp đồng giữa các module

═══ BỐN LUẬT THẮNG MỌI YÊU CẦU KHÁC ═══
1. File .env ở máy này PHẢI luôn có PANCAKE_READONLY=1. Máy dev không được gửi tin / ghi
   dữ liệu ra khách thật — máy chủ đang phục vụ khách thật song song.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào, kể cả đơn test hay đơn trùng.
3. Chỉ thao tác trên repo này và máy chủ 169.58.33.8. Không thêm git remote, không deploy
   nơi khác, không đẩy dữ liệu ra dịch vụ thứ ba.
4. KHÔNG đụng bản đang chạy: 62 file phẳng ngay dưới src/ đang phục vụ 51 page khách thật.
   Code v3 sống ở src/db · src/pos · src/channels · src/chat · src/orders · src/queue + db/.
   Bộ não chat DÙNG NGUYÊN, cấm sửa: prompts.js closer.js tools.js fast-lane.js outbound-guard.js

═══ ĐANG Ở ĐÂU ═══
12/12 module phần A đã code xong + 4 phiếu vá; gate máy 13/13 cổng xanh; đã chạy refute
đối kháng 5 mảng, lộ 10 lỗi CHẶN đường tiền/gửi tin → sóng vá 4 cụm, ĐÃ ĐÓNG 2/4:
  ✅ VA-R3 (CAS máy trạng thái + nhặt đơn kẹt) · ✅ VA-R4 (đọc ý: phủ định không thành xác nhận)
  ❌ VA-R1 — CHƯA LÀM. Phiếu: docs/thi-cong/phieu/PHIEU-VA-R1.md
  ⚠️ VA-R2 — DỞ DANG ở nhánh wip/va-r2. Phiếu: docs/thi-cong/phieu/PHIEU-VA-R2.md
~106 commit local trên main, CHƯA push.

═══ VIỆC CỦA BẠN, THEO THỨ TỰ ═══
1. VA-R1 (nặng nhất): bộ não cũ đang bắn HTTP GHI thật ra Pancake TRƯỚC khi qua cửa v3 —
   vi phạm luật 1. Chặn ở đất được phép (src/chat/handler-v3.js, src/queue/worker.js,
   src/queue/nap.js), KHÔNG sửa file cấm. Chi tiết + thước trong phiếu.
2. VA-R2: cụm tiền + tạo đơn, 6 lỗi (thu sai ×hệ-số tệ, mã 8 đọc nhầm thành hủy, nguồn
   chống trùng không phân trang, idempotent mù ca POST-rollback, khoá theo dòng thay vì
   theo hội thoại, thiếu page_id). Dự án ĐA TỆ (HE_SO_TE: AED/SAR ×100 · KWD/OMR/BHD ×1000),
   KHÔNG có VND, KHÔNG dựng máy tỷ giá.
3. Gate chốt: chạy 13 cổng ops/bin/nghiem-thu/{l*,va-*}.sh (đo rc TÁCH DÒNG) + toàn bộ
   node --env-file=.env --test test/l0-* test/l1-* test/l2-* test/l3-* test/va-* +
   hai repro docs/thi-cong/nhat-ky/refute-MANG-2.repro.mjs và refute-tong-the-1.repro.mjs
   phải sạch dấu 🔴 (đếm bằng grep -c "🔴" rồi IN TỪNG DÒNG — repro luôn thoát rc=0 kể cả
   khi đỏ, tin exit code là cổng hổng).
4. Sau đó mới bàn push + §7b «chạy thử một lần» + việc người H1–H9 trong sổ.

═══ CÁCH LÀM VIỆC (đã trả giá để rút ra) ═══
- Mỗi phiếu là hợp đồng: làm ĐÚNG phạm vi pathspec ③, nghiệm thu bằng NỘI DUNG (mỗi phép
  in một con số hoặc một danh sách), đóng gói thành ops/bin/nghiem-thu/<mã>.sh chạy lại được.
- ĐO LẠI nguyên liệu trước khi code — đề bài có thể khai sai. Án lệ thật: mã 8 của POS là
  "đang đóng gói" chứ không phải hủy (tài liệu cũ sai) · variation_id là UUID không phải số ·
  endpoint WhatsApp của Pancake CHƯA TỒN TẠI.
- Gate xanh không có nghĩa là đúng: 13/13 cổng + 328 test xanh mà refute vẫn lộ 10 lỗ tiền.
- Commit phải mang pathspec: git commit -- <đường dẫn>. Cấm git add -A. Không tự push.
- Thấy lỗi NGOÀI phạm vi phiếu → ghi §9 sổ nợ, cấm tiện tay sửa.

Bắt đầu: đọc 4 tài liệu ở trên, rồi báo lại bạn hiểu trạng thái thế nào và định làm VA-R1
ra sao. Chưa viết code vội.
````
