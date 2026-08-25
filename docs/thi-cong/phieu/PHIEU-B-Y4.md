# PHIẾU B-Y4 — Di trú thôi ghi đè cột `marketer` (và mọi cột do NGƯỜI đặt)

**Base:** `9ece196` · **Làn:** 🟨 (không phải đường tiền, nhưng là **mất công sức người** —
một lệnh xoá trắng 514 dòng gán tay, không cảnh báo, không hoàn lại được)

> Phiếu do **người B** phát, xin **người A** làm — `db/di-tru/` là đất của A.
> Phiếu này bảo vệ đúng thứ mà màn `G2-B2 · Page & Bot` vừa sinh ra để làm: gán marketer.

---

## ① Thi hành đoạn spec nào

- `docs/v3/gd2/00-KE-HOACH-GD2.md` §"Sóng 0" — màn **Page & Bot**, dòng *"gán marketer"*;
  và bảng chặn, hàng *"314/315 page chưa gán marketer"*
- `docs/v3/01-QUYET-DINH.md` §9 — *"Marketer chỉ thấy sản phẩm mình phụ trách"* và
  *"314 trên 315 page chưa gán marketer. Báo cáo cắt theo marketer sẽ trống cho tới khi gán xong"*

## ② Hợp đồng vào/ra

### Vào — A phải ĐO LẠI

`db/di-tru/nap.js#napPage`, câu `ON CONFLICT (page_id) DO UPDATE SET`:

```sql
ten = EXCLUDED.ten, thi_truong = EXCLUDED.thi_truong, nganh_hang = EXCLUDED.nganh_hang,
marketer = EXCLUDED.marketer,        -- ← đây
pos_shop_id = EXCLUDED.pos_shop_id, pos_via = EXCLUDED.pos_via,
token_idx = EXCLUDED.token_idx, the_pancake = EXCLUDED.the_pancake,
mat_dau = EXCLUDED.mat_dau, kiem_luc = EXCLUDED.kiem_luc, sua_luc = now()
```

`EXCLUDED.marketer` lấy từ `pages.json`. Đo hôm nay:

```
pages.json (bản local): 47 page · có marketer: 0
page.marketer rỗng trên CSDL thật: 514/514
```

⇒ **`pages.json` không có marketer nào.** Nên câu trên không phải "đồng bộ marketer từ
nguồn" — nó là **`SET marketer = ''` cho mọi page**, mỗi lượt `npm run di-tru`.

Hôm nay chưa ai mất gì vì chưa ai gán. Nhưng màn `Page & Bot` vừa mở đúng chức năng đó, và
việc đầu tiên người ta sẽ làm với nó là gán marketer cho 514 page. Lượt di trú kế tiếp xoá
sạch, **không báo một dòng nào**, và không có bản quay lui vì đây không phải một lượt di
chuyển dữ liệu mà chỉ là một câu `UPDATE` trong một script chạy thường xuyên.

**Đây là cùng một họ lỗi với `suaTheoId` bỏ rơi `team_id` (`PHIEU-B-Y3`):** thao tác trông
như đã thành công, và cái sai chỉ lộ ra rất lâu sau đó, ở một chỗ khác.

### So sánh: cột nào an toàn, cột nào không

| Cột | Trong câu ghi đè | Ai đặt giá trị | Kết luận |
|---|---|---|---|
| `ten` `thi_truong` `nganh_hang` `pos_*` `the_pancake` `mat_dau` `kiem_luc` `token_idx` | có | **máy** (Pancake/pages.json) | ĐÚNG — đây là đồng bộ thật |
| `marketer` | có | **người**, qua màn Page & Bot | ⛔ SAI — xoá công sức người |
| `trong_diem` | **không** | người | đúng, giữ nguyên như vậy |
| `bot_ai_bat` | không (do `napCongTacAi` lo) | người, qua công tắc | ngoài phạm vi phiếu này |

`trong_diem` cho thấy A đã có sẵn ý niệm "cột do người đặt thì di trú không đụng". Phiếu này
chỉ xin xếp `marketer` sang đúng nhóm đó.

### Ra — nói bằng câu đo được

Bỏ `marketer = EXCLUDED.marketer` khỏi câu `DO UPDATE`, và **giữ lại ở `INSERT`** (page mới
lần đầu vẫn nhận giá trị từ nguồn, kể cả khi giá trị đó là chuỗi rỗng).

B đề xuất viết bằng `COALESCE` để nguồn vẫn "điền vào chỗ trống" mà không bao giờ "xoá chỗ đã có":

```sql
marketer = CASE
             WHEN page.marketer <> '' THEN page.marketer      -- người đã đặt → GIỮ
             ELSE EXCLUDED.marketer                            -- chưa ai đặt → nhận từ nguồn
           END,
```

Cách này giữ được cả hai vế, và không đòi thêm cột nào.

⚠️ **Nếu A thấy nên có cột riêng** (`marketer_do_nguoi_dat boolean`, hoặc tách bảng phụ trách
ra khỏi `page`) thì đó là quyết định của A — B chỉ cần cái tính chất: **lượt di trú không
được xoá giá trị người đã đặt.**

## ③ File được đụng (pathspec)

```
db/di-tru/nap.js
test/l0-m5-di-tru-page.test.js      ← hoặc tên bài test di trú đang có
```

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# 1 · gán tay một marketer, chạy lại di trú, marketer PHẢI còn
psql "$DATABASE_URL_V3" -c "UPDATE page SET marketer = 'thu-nghiem-y4' WHERE page_id = '<một page có thật>';"
npm run di-tru
psql "$DATABASE_URL_V3" -tAc "SELECT marketer FROM page WHERE page_id = '<page đó>';"
# kỳ vọng: thu-nghiem-y4     (hôm nay: chuỗi rỗng)

# 2 · page CHƯA ai gán thì vẫn nhận được giá trị từ nguồn (không khoá cứng)
#     — chạy trên một page mà pages.json CÓ marketer, nếu nguồn có; nếu nguồn rỗng hết
#       thì khai rõ là nhánh này chưa chạm được (xem ⑤)

# 3 · các cột MÁY đặt vẫn đồng bộ bình thường
psql "$DATABASE_URL_V3" -tAc "SELECT count(*) FROM page WHERE ten = '';"   # không tăng sau di trú

# 4 · bài test
node --test test/l0-m5-di-tru-page.test.js     # kỳ vọng: N passed
```

## ⑤ Test chạm nhánh nào

1. page có marketer do người đặt → chạy di trú → **giữ nguyên**
2. page marketer rỗng, nguồn có marketer → **nhận từ nguồn**
3. page marketer rỗng, nguồn cũng rỗng → vẫn rỗng, không nổ
4. cột máy đặt (`ten`, `thi_truong`, `mat_dau`) → vẫn ghi đè bình thường

⚠️ Nhánh 2 hôm nay **chưa chạm được bằng dữ liệu thật**: `pages.json` không có marketer nào.
Phải dựng hạt giống riêng cho nhánh đó, và khai rõ trong nhật ký là nó chạy trên hạt giống.

## ⑥ Ngoài phạm vi

- Chuyển page giữa các team → **`PHIEU-B-Y3`**, đang treo
- `napCongTacAi` ghi đè `bot_ai_bat` → **KHÔNG phải lỗi**: nguồn thật của cột đó đúng là
  `ai-enabled.json`, và màn `Page & Bot` không ghi thẳng vào cột mà gọi sang tiến trình bot
  (`v3/src/noi-day/cau-bot-v1.js`). Ghi ở đây để người sau khỏi "sửa" nhầm.
- Đổi `marketer` từ chuỗi tự do thành khoá ngoại sang `nguoi_dung` → đáng làm, nhưng là đổi
  lược đồ và đổi cả màn. Ghi vào sổ nợ, không nhét vào phiếu này.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ sed -n '38,42p' db/di-tru/nap.js
       ON CONFLICT (page_id) DO UPDATE SET
         ten = EXCLUDED.ten, thi_truong = EXCLUDED.thi_truong, nganh_hang = EXCLUDED.nganh_hang,
         marketer = EXCLUDED.marketer, pos_shop_id = EXCLUDED.pos_shop_id, pos_via = EXCLUDED.pos_via,
         token_idx = EXCLUDED.token_idx, the_pancake = EXCLUDED.the_pancake,
         mat_dau = EXCLUDED.mat_dau, kiem_luc = EXCLUDED.kiem_luc, sua_luc = now()

$ node -e '…đếm marketer trong pages.json…'
  page: 47 · có marketer: 0

$ psql -tAc "SELECT count(*) FROM page WHERE marketer = ''"
  514

$ grep -n "trong_diem" db/di-tru/nap.js
  (không có kết quả — cột này KHÔNG nằm trong câu ghi đè)
```

**Quan hệ: MỚI.** Không trùng phán quyết nào đang treo, không trùng nợ nào trong §9. Họ hàng
với `PHIEU-B-Y3` (cùng loại "thao tác trông như thành công") nhưng khác hẳn việc và khác file.
