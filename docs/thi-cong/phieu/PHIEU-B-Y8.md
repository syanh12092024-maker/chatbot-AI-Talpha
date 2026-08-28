# PHIẾU B-Y8 — `khach.so_don_ket` / `so_don_hoan` là cột KHÔNG NULL nhưng toàn số 0

**Base:** `HEAD lúc phát` · **Làn:** 🟨 (số dẫn xuất sai, chưa ai bấm nút dựa trên nó)

## ① Thi hành đoạn spec nào

- `01-QUYET-DINH.md` §11 — «chia bốn tầng thay vì một ngưỡng», đang **Chờ chốt**
- `07-KE-HOACH-GD2.md` nghiệm thu 4 — «tách ra đúng 144 khách hoàn 30–65%»

## ② Hợp đồng vào/ra

**Vào — đo trên máy chủ 28/08/2026:**

```
khach                     : 10.693 dòng
  co_so_don_ket           : 9.719  (không NULL)
  co_so_don_hoan          : 9.719  (không NULL)
  MÀ sum(so_don_ket + so_don_hoan) = 0 cho TOÀN BỘ
don_hang                  : 11.824 dòng (đang nhập tiếp lúc đo)
  có khach_id             : 11.695
  có trang_thai_pos       : đủ, mã POS thật
```

⚠️ **Cột không NULL nhưng toàn 0.** `count(so_don_ket)` trả về 9.719 nên nhìn qua tưởng đã
tính. Đây là biến thể của cái bẫy đã gặp ba lần: `page.bot_ai_bat` lệch (B-Y7), `san_pham`
rỗng, `so_ai` rỗng. Lần này cột **có mặt và có giá trị**, chỉ là giá trị vô nghĩa.

**Tính ngược từ `don_hang` thì ra ngay** (mã hoàn `{4,5,6,7,8}` theo `src/pancake-orders.js:13`):

| Nhóm tỉ lệ hoàn | Khách | Đơn |
|---|---|---|
| 0% | 5.770 | 6.359 |
| 10–29% | 34 | 159 |
| **30–64%** | **638** | 1.494 |
| 65–99% | 110 | 402 |
| **100%** | **4.436** | 4.939 |

Và chiều thứ hai, quan trọng hơn cả bảng trên: trong 4.436 khách «hoàn 100%», **4.139 chỉ
có ĐÚNG MỘT đơn**. Chỉ **77 khách** vừa hoàn 100% vừa có từ 3 đơn.

**Ra:** một hàm tổng hợp ở `src/db/so-lieu.js` trả phân bố tỉ lệ hoàn **theo hai chiều: tỉ
lệ × số đơn**, và ghi `khach.so_don_ket` / `so_don_hoan` cho đúng.

## ③ File được đụng (pathspec)

```
src/db/so-lieu.js
test/l0-m2-so-lieu.test.js
```

**Ngoài phạm vi:** `v3/src/ui/rui-ro-hoan/*` đã dựng xong và đang TỰ ĐẾM từ `don_hang` —
bản khai thứ hai của cùng chỉ số. Có hàm của A rồi thì màn cắt sang, xoá phép đếm tay.

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# ① Hai cột không còn toàn 0
psql "$DATABASE_URL_V3" -tAc "select sum(so_don_ket+so_don_hoan) from khach"   # kỳ vọng: > 0

# ② Hàm trả phân bố HAI CHIỀU, không chỉ một danh sách xếp theo tỉ lệ
grep -n "so_don\|tong_don" src/db/so-lieu.js    # kỳ vọng: có nhóm theo SỐ ĐƠN

# ③ Con số khớp phép tính ngược từ don_hang
psql "$DATABASE_URL_V3" -tAc "
with d as (select khach_id, count(*) filter (where trang_thai_pos::text in ('4','5','6','7','8')) h,
                  count(*) t from don_hang where khach_id is not null group by khach_id)
select count(*) from d where h=t and t>=3"      # kỳ vọng: khớp số hàm trả về
```

## ⑤ Test chạm nhánh nào

Nhánh THẬT phải chạm: khách **1 đơn hoàn** và khách **nhiều đơn hoàn hết**. Hai người đó có
cùng tỉ lệ 100% và **phải ra hai kết luận khác nhau** — nếu hàm gộp họ thì nó tái tạo đúng
cái ngưỡng cứng mà bốn tầng sinh ra để thay.

## ⑥ Ngoài phạm vi

Chốt bốn ngưỡng cụ thể là quyết định của chủ dự án (`01-QUYET-DINH §11` — Chờ chốt). Phiếu
này chỉ xin phép ĐO, không xin chốt.

## ⑦ ĐÃ TRA CHƯA — dán OUTPUT MÁY

```
$ grep -rn "so_don_ket\|so_don_hoan\|tang_hoan" src/ db/migrate/
db/migrate/013_khoa_dinh_danh_khach.up.sql:  (cột được tạo ở đây)

$ grep -rn "so_don_ket" docs/thi-cong/phieu/ docs/thi-cong/nhat-ky/
(không có)
```

**Quan hệ: MỚI.** Chưa phiếu nào chạm hai cột này. B-Y7 chạm `page.bot_ai_bat` — cùng loại
lỗi (bản sao không khớp nguồn) nhưng khác bảng, khác cột, và đã đóng.
