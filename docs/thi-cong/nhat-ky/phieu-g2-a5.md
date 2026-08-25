# NHẬT KÝ PHIẾU G2-A5 — kịch bản ba tầng có kế thừa

> Người A · 25/08/2026 · nhánh `main` · đo trên **VPS · PostgreSQL 16.15**

---

## 0 · ĐO TRƯỚC KHI THIẾT KẾ — hai trong ba tầng KHÔNG CÓ KHOÁ

Đề bài cho cây `sản phẩm → nước → page`. Đo dữ liệu thật trước khi dựng:

| Khoá của tầng | Dữ liệu thật (25/08, `aicloser_v3`) |
|---|---|
| Tầng **sản phẩm** — `san_pham.ma` | **0 dòng** — tầng này hôm nay không tới được |
| Tầng **nước** — `page.thi_truong` | **140/514** page có giá trị (KSA 34 · UAE 32 · Khác 28 · Kuwait 23 · Bahrain 8) |
| `page.nganh_hang` (khoá thay thế?) | **0/514** — không dùng được |
| `kich_ban` | 71 bản / 70 page có LIVE ⇒ **444/514 page chưa có bản riêng** |

Nghĩa là cấu trúc dựng đúng, nhưng **hôm nay hầu hết page rơi vào «không kế thừa được từ
đâu»**. Đó không phải lỗi — đó là trạng thái thật. Và chính vì vậy mà rủi ro ② của đề bài
(«API phải nói rõ kế thừa từ tầng nào chứ không trả về im lặng») mới là phần đáng giá nhất
của module: nó biến 444 con số 0 im lặng thành 444 câu nói được **thiếu khoá nào**.

## 1 · BỘ GIẢI KHÔNG BAO GIỜ TRẢ VỀ IM LẶNG

`docKichBanChoPage()` luôn trả `{ ban, cap, keThua, tuDau, viSao, khoa }`. Bốn nhánh, và
nhánh thứ tư — nhánh «không có gì» — phân biệt **ba lý do khác hẳn nhau**:

```
[K2] tuDau="kế thừa từ tầng NƯỚC (sp:ao-2 × KSA)"      ← khai luôn KHOÁ, không chỉ tên tầng
[K4] viSao="…chưa có kịch bản riêng, và không tầng nào có bản LIVE cho khoá của page này.
            Khoá đang có: sản phẩm=[sp:nen] · nước="Kuwait"."
[K4] viSao (page không SP)="…page chưa gắn sản phẩm nào (`san_pham.page_id`) nên CẢ HAI
            tầng trên không tới được. Khoá đang có: sản phẩm=[—] · nước="KSA"."
```

Hai câu đó **phải khác nhau** vì cách sửa khác nhau: một bên là «soạn kịch bản đi», một bên
là «gán sản phẩm cho page đã». Ca K4 khẳng định chúng không được giống nhau.

## 2 · CÂY CHỈ CÓ THẬT NẾU BOT ĐI QUA NÓ

`rap-prompt.js#docKichBanLive` trước đây chỉ đọc tầng page. Không nối vào bộ giải thì cây kế
thừa **chỉ là thứ để nhìn trên màn hình**: marketer soạn một bản tầng sản phẩm, màn báo «áp
cho 40 page», mà bot không đổi một chữ. Ca **K14** khoá lại: page kế thừa mà bộ ráp prompt
trả `null` là ca đỏ.

## 3 · MỘT LỖI THẬT CỦA TÔI, VÀ MỘT CHỈ MỤC THỪA

**① Đếm ảnh hưởng trong giao dịch bằng kết nối KHÁC.** `apKichBan` gọi
`docKichBanChoPage(pool, …)` ngay giữa giao dịch đang ghi — tức mượn một kết nối khác từ
pool, mà kết nối đó **chưa thấy thay đổi chưa COMMIT**, nên nó đếm trên ảnh CŨ và trả về 0.
Ca K9 bắt được (`chạm 0 page` trong khi phải là 1). Sửa: tách ruột bộ giải thành
`giaiChoPage(khach, …)` chạy trên chính client của giao dịch.

**② Chỉ mục trùng.** Tôi thêm `kich_ban_mot_live_page`, chạy test mới lộ ra tên thật là
`kich_ban_live_moi_page` — nó **đã có từ migration 001**. Bỏ cái tôi thêm: hai chỉ mục nói
cùng một chuyện đúng là «bản khai thứ hai» mà cả sóng này đang dọn.

## 4 · LƯỚI MIGRATION — chỗ suýt làm chết bot

Cổng phép ⑤ chạy trên CSDL thật trả `LOI-NODE`, và nguyên nhân là
`column "cap" does not exist`: **CSDL thật đang ở migration 008**.

Đó là án lệ #7 đúng nguyên văn: *«reader mới không bọc ⇒ deploy code trước migration = job
chết»*. `docKichBanChoPage` nằm trên đường chat sống — deploy code trước khi áp 010 là **mọi
lượt trả lời khách chết**. Tôi đã bọc lưới ở G2-A2 cho `layModel` rồi **quên ở đây**.

Vá: hỏi `information_schema` một lần, thiếu cột thì lui về bộ đọc một tầng và **kêu ra**.
Hỏi `information_schema` chứ không bắt lỗi `42703` — một câu lỗi giữa giao dịch làm hỏng cả
giao dịch, không lui được nữa. Ca **K16** dựng đúng cảnh đó (DROP cột thật rồi gọi).

Và cổng cũng sửa theo: phép ⑤ nay nói **«CHƯA ĐO ĐƯỢC (chưa áp 010)»** — không đọc thành
đạt, cũng không đọc thành đỏ. Cả hai cách đọc kia đều nói dối.

## 5 · BẰNG CHỨNG MÁY

```
CỔNG G2-A5+A6 · TỔNG: 15 phép · ĐẠT 15 · TRƯỢT 0
   ✔ page có bản riêng → tầng = page          ✔ page không có bản riêng → tầng = nuoc
   ✔ và nó khai là KẾ THỪA                    ✔ page không có gì → có nói VÌ SAO không
   ✔ bộ ráp prompt đi qua bộ giải
   ✔ test/l0-m2-kich-ban.test.js: 16 ca, 0 đỏ
```

Ba chỉ mục CSDL chặn «hai bản LIVE cùng phạm vi» (K6/K7), và một `CHECK` chặn dòng mang khoá
sai tầng (K8) — bản tầng nước mà kèm `page_id` là dòng không ai đọc ra nó thuộc về đâu.

**Quét hồi quy 34 bộ ca v3:** chỉ `l0-m1-di-tru` còn 1 đỏ (D7, đã A/B ở G2-A1).

## 6 · NGOÀI PHẠM VI / NỢ

- Migration 010 **chưa áp** trên CSDL thật. Cho tới lúc áp, cây ba tầng TẮT và bộ giải kêu
  một dòng cảnh báo mỗi lần khởi động.
- Tầng sản phẩm chỉ dùng được sau khi `san_pham` có dòng (hôm nay 0) — việc của L1-M1/POS.
- Tầng nước chỉ với tới 140/514 page cho tới khi ai đó điền `page.thi_truong`.
