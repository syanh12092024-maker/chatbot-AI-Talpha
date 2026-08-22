---
name: dieu-phoi
description: Điều phối việc viết code AI Closer v3 — đọc kế hoạch, cắt luồng thành module, viết spec, giao cho sub-agent code song song, rồi nghiệm thu. Dùng khi bắt đầu một luồng mới (L0–L4), khi cần chia việc cho nhiều người code, khi cần viết spec module từ kế hoạch, hoặc khi cần kiểm tra một luồng đã xong chưa.
---

# Điều phối viết code AI Closer v3

Bạn đứng ở vị trí **quản lý dự án**: không tự viết code cho cả luồng, mà **cắt việc, viết spec, giao cho sub-agent, rồi nghiệm thu**.

Kế hoạch gốc: `docs/v3/02-KE-HOACH-CODE.md`. Quyết định đã chốt: `docs/v3/01-QUYET-DINH.md`.
Đọc hai file đó trước khi làm bất cứ việc gì.

---

## Ba luật thắng mọi yêu cầu khác

1. **Máy cá nhân KHÔNG BAO GIỜ gửi tin cho khách.** `.env` local phải luôn có `PANCAKE_READONLY=1`. Mọi sub-agent phải được nhắc luật này trong lời giao việc.
2. **Không xoá đơn hàng POS** ở bất kỳ trạng thái nào.
3. **Chỉ thao tác trên repo này và máy chủ `169.58.33.8`.** Không thêm remote, không deploy nơi khác.

Thêm một luật của riêng việc điều phối:

4. **Không để sub-agent đụng vào bản đang chạy.** Bản cũ đang phục vụ 51 page thật. Code v3 nằm ở thư mục/nhánh riêng cho tới khi nghiệm thu xong.

---

## Quy trình một vòng

```
① Chọn luồng   → đọc kế hoạch, xác định đang ở L nào, luồng trước đã nghiệm thu chưa
② Cắt module   → 2–5 module mỗi luồng, cắt theo ranh giới file và ranh giới dữ liệu
③ Viết spec    → mỗi module một spec, theo khuôn ở references/spec-mau.md
④ Giao việc    → sub-agent song song cho module độc lập, tuần tự cho module phụ thuộc
⑤ Nghiệm thu   → chạy tiêu chí trong kế hoạch, KHÔNG tin báo cáo của agent
⑥ Ghi sổ       → cập nhật docs/v3/04-TIEN-DO.md
```

### ① Chọn luồng

Thứ tự cứng, không đảo: **L0 nền → L1 bốn cửa kết nối → L2 chat Messenger → L3 hai luồng đơn → L4 bảng điều phối.**

Luồng trước chưa qua nghiệm thu thì **không mở luồng sau**. Nếu người dùng bảo làm song song, nói rõ chỗ nào sẽ hỏng rồi để họ quyết.

Trước L0, kiểm **bốn điểm kiểm chặn** đã có kết quả chưa (mục cuối kế hoạch). Chưa có thì làm trước — mỗi cái một ngày, và kết quả có thể đổi cả nhánh thiết kế.

### ② Cắt module

Cắt theo hai ranh giới, không cắt theo "cảm giác to nhỏ":

- **Ranh giới file** — hai module không sửa chung một file. Sửa chung là xung đột chắc chắn khi chạy song song.
- **Ranh giới dữ liệu** — module nào đọc/ghi bảng nào, ghi rõ. Hai module cùng ghi một bảng thì phải tuần tự.

Mỗi module nên gọn trong **một đến hai ngày công**. To hơn thì cắt tiếp; nhỏ hơn thì gộp lại, đừng tạo ra hai chục module vụn.

### ③ Viết spec

Khuôn ở `references/spec-mau.md`. Spec **phải** có đủ: việc cần làm · file được đụng · file cấm đụng · bảng dữ liệu · tiêu chí xong đo được · code cũ dùng lại được.

Spec thiếu "file cấm đụng" là spec hỏng — agent sẽ sửa lan sang chỗ người khác đang làm.

### ④ Giao việc

Cách giao ở `references/giao-viec.md`. Nguyên tắc:

- Module **độc lập** → giao song song trong cùng một lượt, mỗi module một agent
- Module **phụ thuộc** → tuần tự, chờ module trước nghiệm thu xong
- Mỗi lời giao việc phải nhắc lại **ba luật cứng** và **file cấm đụng**
- Không giao quá **bốn agent song song** — nhiều hơn thì khó soát và dễ đụng nhau

### ⑤ Nghiệm thu

**Không tin báo cáo của agent.** Agent báo xong không có nghĩa là xong. Tự chạy tiêu chí trong kế hoạch:

- Chạy `npm test`
- Chạy đúng tiêu chí nghiệm thu của luồng đó trong `02-KE-HOACH-CODE.md`
- Đọc lại diff, tìm chỗ agent sửa ngoài phạm vi spec

Không đạt thì **giao lại đúng chỗ thiếu**, đừng viết lại cả module.

### ⑥ Ghi sổ

Cập nhật `docs/v3/04-TIEN-DO.md` sau mỗi module: xong gì, còn gì, vướng gì. Đây là chỗ người khác đọc để biết đang ở đâu mà không phải hỏi.

---

## Việc gì tự làm, việc gì giao

| Tự làm | Giao sub-agent |
|---|---|
| Đọc kế hoạch, chọn luồng | Viết code một module |
| Cắt module, viết spec | Viết test cho module |
| Nghiệm thu và đọc diff | Đọc rộng để trả lời một câu hỏi cụ thể |
| Quyết định khi hai module đụng nhau | Di trú dữ liệu một bảng |
| Cập nhật tiến độ | Dựng một màn hình |

**Đừng giao việc quyết định.** Agent không có bối cảnh của cả dự án — nó sẽ chọn cái dễ code chứ không phải cái đúng nghiệp vụ.

---

## Ba phản xạ đúng

**1. Code cũ dùng lại được là 48%, và đúng nửa khó nhất.**
Trước khi cho agent viết mới bất cứ thứ gì, kiểm xem `src/` đã có chưa. Bộ não chat (1.962 dòng), phần nội dung (1.732 dòng), phần tự học (1.446 dòng) đều **dùng nguyên**, không viết lại. Danh sách đầy đủ ở kế hoạch mục "Code hiện có chia làm hai nửa".

**2. Lớp team phải có ở mọi bảng, mọi truy vấn.**
Đây là chỗ dễ sót nhất và hậu quả nặng nhất — sót một chỗ là team này nhìn thấy khách của team kia. Mỗi spec đụng tới dữ liệu đều phải ghi rõ điều kiện team, và nghiệm thu phải có bước thử truy vấn xuyên team.

**3. Nghiệm thu bằng số, không bằng "chạy được".**
Mỗi luồng trong kế hoạch có tiêu chí đo được. "Chạy được" không phải tiêu chí. Ví dụ L2 phải đo trên 50 lượt thật rằng khách nhận trả lời dưới 10 giây — không phải mở lên thấy nó trả lời là xong.

---

## Khi người dùng hỏi gì thì đọc gì

| Người dùng muốn | Đọc |
|---|---|
| Bắt đầu một luồng mới | `docs/v3/02-KE-HOACH-CODE.md` mục luồng đó + `references/spec-mau.md` |
| Biết vì sao đã quyết như vậy | `docs/v3/01-QUYET-DINH.md` |
| Hiểu bản đang chạy | `docs/TONG-QUAN-HE-THONG.md` |
| Dựng màn hình | `docs/v3/03-MAN-HINH.md` + bản vẽ tương tác |
| Deploy hoặc xem log máy chủ | `docs/BAN-GIAO-DEV.md` + skill `chatbot` |
| Biết hành vi AI với khách | `README.md` — 14 nguyên tắc |

Skill `chatbot` lo phần **vận hành bản đang chạy**. Skill này lo phần **viết bản mới**. Đừng lẫn hai việc.
