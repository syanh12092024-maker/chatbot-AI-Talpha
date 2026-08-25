# NHẬT KÝ PHIẾU B-Y4 — di trú thôi ghi đè cột NGƯỜI đặt

> Thợ: người A (trục dữ liệu) · 25/08/2026 · nhánh `main`
> Phiếu: `docs/thi-cong/phieu/PHIEU-B-Y4.md` · bảo vệ chức năng gán marketer của màn `G2-B2`
> Môi trường đo: **VPS 169.58.33.8 · PostgreSQL 16.15**, sandbox tự dựng

---

## 0 · ĐO LẠI NGUYÊN LIỆU — vế chính đúng, một con số của phiếu là của máy khác

| Phiếu khai | Máy trả về (VPS) |
|---|---|
| `pages.json`: **47** page | **514** page — phiếu đo bản `pages.json` ở máy cá nhân |
| trong đó có marketer: **0** | **0** ✅ |
| `page.marketer` rỗng 514/514 trên CSDL thật | ✅ |

Con số 47 lệch nhưng **không đổi kết luận**, và kết luận mới là thứ quan trọng: nguồn có
**0** marketer ⇒ câu `marketer = EXCLUDED.marketer` **không phải «đồng bộ từ nguồn»**, nó là
`SET marketer = ''` cho mọi page, mỗi lượt `npm run di-tru`.

Cổng nghiệm thu in cả hai con số và **không** khẳng định «phải bằng 0» — ngày nào nguồn có
marketer thật thì phép đo chính vẫn đúng, chỉ là lý do đổi.

## 1 · CÓ ĐÚNG MỘT CỘT NHƯ VẬY, KHÔNG PHẢI NHIỀU

Tên phiếu nói *«và mọi cột do NGƯỜI đặt»*. Đo lại câu `ON CONFLICT DO UPDATE` thì trong đó
chỉ có **một** cột người đặt:

| Cột | Trong câu ghi đè | Chủ giá trị | Kết luận |
|---|---|---|---|
| `ten` `thi_truong` `nganh_hang` `pos_*` `token_idx` `the_pancake` `mat_dau` `kiem_luc` | có | máy | ĐÚNG — đồng bộ thật |
| **`marketer`** | có | **người** (màn Page & Bot) | ⛔ đã vá |
| `trong_diem` · `botcake_tat` | không | người | đúng, giữ nguyên |
| `bot_ai_bat` | không (`napCongTacAi` lo) | người, qua công tắc | ngoài phạm vi ⑥ |

Vá theo đúng đề xuất của phiếu — nguồn **điền vào chỗ trống**, không bao giờ **xoá chỗ đã có**:

```sql
marketer = CASE WHEN page.marketer <> '' THEN page.marketer
                ELSE EXCLUDED.marketer END,
```

Kèm một khối ghi chú đầu `napPage` trả lời đúng một câu cho người sau: **«ai là chủ giá trị
của cột này?»** — vì cái bẫy này sẽ quay lại đúng lúc ai đó thêm cột mới vào câu upsert.

## 2 · MỘT CHỖ CỐ Ý KHÔNG LÀM CHO "ĐẸP"

Ý đầu của tôi là khai hai danh sách (`COT_MAY_DAT` / `COT_NGUOI_DAT`) rồi **sinh** mệnh đề
`SET` từ đó — tên khái niệm rõ hơn, thêm cột sau này là sửa một chỗ.

**Bỏ ý đó**, vì `v3/test/b/page-bot.test.mjs` **đọc thẳng văn bản SQL** của `nap.js` và đối
chiếu (`ON CONFLICT \(page_id\) DO UPDATE SET([\s\S]*?)` + `(\w+)\s*=\s*EXCLUDED\.`). Sinh
SQL động là làm bộ đọc của người B **mù** — họ sẽ thấy «không tìm thấy câu ON CONFLICT» thay
vì thấy tín hiệu thật. Phá một hợp đồng liên-người đang chạy để đổi lấy một cái đẹp hơn về
hình thức là lỗ (án lệ #24). Giữ SQL ở dạng CHỮ, và **ghi vào chú thích** rằng phải giữ vậy.

## 3 · BẪY NGƯỢC CỦA NGƯỜI B — kiểm cả hai chiều

B giăng sẵn ở `page-bot.test.mjs` một khẳng định sẽ đỏ đúng lúc tôi vá xong. Chạy lại thì
**21 pass / 0 fail** — nhưng «xanh» một mình chưa nói được gì, nên đo cả hai bản bằng CHÍNH
regex của B:

```
BẢN CŨ (HEAD)  có marketer: true   · 10 cột
BẢN MỚI        có marketer: false  ·  9 cột
KẾT: test của B xanh ĐÚNG NHỜ bản vá (bản cũ sẽ đỏ)
```

Tức hợp đồng hai chiều còn sống: A vá thì B xanh, A lùi thì B đỏ. (B đã tự bỏ `marketer`
khỏi hằng `COT_BI_DI_TRU_GHI_DE` phía họ — không phải việc tôi sửa.)

## 4 · BẰNG CHỨNG MÁY

```
CỔNG B-Y4 · TỔNG: 6 phép · ĐẠT 6 · TRƯỢT 0
   ✔ nguồn có 0 marketer trên 514 page — đúng cảnh phiếu mô tả
   ✔ marketer NGAY SAU khi gán tay = thu-nghiem-y4
   ✔ marketer SAU một lượt `npm run di-tru` trọn vẹn = thu-nghiem-y4
   ✔ cột `ten` (máy đặt) sau di trú = DA-DONG-BO-LAI
   ✔ cột NGƯỜI đặt lọt vào câu ghi đè = khong-co
   ✔ chỉ D7 đỏ — đỏ sẵn từ trước phiếu này
```

Phép ② cố ý chạy **`npm run di-tru` ĐẦU-CUỐI**, không gọi thẳng `napPage`: cái người vận
hành gõ là lệnh đó, và cái đã xoá 514 marketer (nếu không vá) cũng là lệnh đó. Gọi hàm con
thì đo một thứ gần giống, không đo thứ thật.

Bộ ca `test/l0-m1-di-tru.test.js`: **15 pass / 1 fail** (11 → 16 ca; đỏ duy nhất là D7).

```
[Y4-1] sau di trú: marketer="chi-lan-y4"          ← người đặt, sống sót
[Y4-2] từ hạt giống: marketer="anh-tuan-y4"       ← nguồn điền chỗ trống
[Y4-4] ten: sửa tay → "Zahra Luxe Jewelry Oman"   ← cột máy vẫn đồng bộ lại
[Y4-5] cột bị ghi đè thẳng: ten, thi_truong, nganh_hang, pos_shop_id, pos_via,
       token_idx, the_pancake, mat_dau, kiem_luc  ← 0 cột người đặt
```

⚠️ **Ca Y4-2 chạy trên HẠT GIỐNG, không trên nguồn thật** — `pages.json` có 0 marketer nên
nhánh «nguồn điền vào chỗ trống» không chạm được bằng dữ liệu thật. Ca dựng một gốc tạm
mang đúng một page có marketer. Khai ra theo đúng dặn dò ⑤ của phiếu.

## 5 · NGOÀI PHẠM VI

- `napCongTacAi` ghi đè `bot_ai_bat` — **không phải lỗi**, nguồn thật của cột đó đúng là
  `ai-enabled.json`. Phiếu ⑥ đã dặn, ghi lại để người sau khỏi "sửa" nhầm.
- Page **MỚI** vẫn rơi vào team kỹ thuật (`team_id` chỉ ở vế INSERT). Đã ghi §9 từ B-Y3.
- `marketer` là chuỗi tự do, chưa phải khoá ngoại sang `nguoi_dung` — đáng làm nhưng đổi cả
  lược đồ lẫn màn hình. Ghi §9, không nhét vào phiếu này.
