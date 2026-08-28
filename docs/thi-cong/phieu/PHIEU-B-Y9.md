# PHIẾU B-Y9 — `hoi_thoai.khach_id` rỗng 28.953/28.953, kênh thứ ba của hồ sơ khách không nối được

**Base:** `HEAD lúc phát` · **Làn:** 🟨 (một màn đã dựng đang thiếu một cột, không ai bấm sai vì nó)

## ① Thi hành đoạn spec nào

- `07-KE-HOACH-GD2.md` dòng 202 — «Hồ sơ khách hàng: **gộp BA kênh** theo số điện thoại»

## ② Hợp đồng vào/ra

**Vào — đo trên máy chủ 28/08/2026** (người A đang nhập, số còn tăng):

```
hoi_thoai   28.953 dòng
  có psid       28.953   ← khoá nối tự nhiên, đủ 100%
  có khach_id        0   ← KHÔNG dòng nào
khach       89.484 dòng
  có số điện thoại 89.484
don_hang    có khach_id  ← đã nối, kênh này chạy tốt
```

Cột `hoi_thoai.khach_id` **có mặt trong lược đồ** nhưng chưa lần nào được ghi. Hai kênh kia
(khách ↔ đơn) đã nối và chạy; kênh hội thoại đứng riêng.

**Hệ quả đang thấy trên màn:** `v3/src/ui/ho-so-khach` hiện cột «hội thoại» là **chưa biết**
cho mọi khách, và khai thẳng kênh thứ ba chưa gộp được. Nó KHÔNG hiện 0 — vì một hồ sơ 0
hội thoại trông y hệt một khách chưa từng nhắn tin, mà 28.953 hội thoại kia nói ngược lại.

**Ra:** `hoi_thoai.khach_id` được ghi cho những dòng nối được, và một con số nói rõ bao nhiêu
dòng KHÔNG nối được (cùng lý do).

## ③ File được đụng (pathspec)

```
src/db/di-tru/*.js
db/migrate/*_noi_hoi_thoai_khach.up.sql
test/l0-m1-di-tru.test.js
```

**Ngoài phạm vi:** `v3/src/ui/ho-so-khach/*` đã dựng xong và tự đọc `hoi_thoai.khach_id`.
Cột có giá trị thì màn tự hiện, không cần sửa gì.

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# ① Cột không còn rỗng hoàn toàn
psql "$DATABASE_URL_V3" -tAc "select count(khach_id) from hoi_thoai"        # kỳ vọng: > 0

# ② Số KHÔNG nối được phải đếm được, không im lặng
psql "$DATABASE_URL_V3" -tAc "select count(*) from hoi_thoai where khach_id is null"

# ③ Không nối bừa: mỗi hoi_thoai.khach_id phải trỏ tới một khach có thật, cùng team
psql "$DATABASE_URL_V3" -tAc "
select count(*) from hoi_thoai h left join khach k
  on k.id = h.khach_id and k.team_id = h.team_id
 where h.khach_id is not null and k.id is null"                              # kỳ vọng: 0
```

## ⑤ Test chạm nhánh nào

Nhánh THẬT phải chạm: **hội thoại KHÔNG nối được về khách nào**. `psid` là khoá của
Facebook, `so_dien_thoai` là khoá của POS — không phải hội thoại nào cũng đi tới một đơn để
có số. Nối được bao nhiêu thì nối, phần còn lại phải **đếm được và nói ra**, không nối bừa
theo tên hay theo page.

⚠️ Nối sai còn tệ hơn không nối: gán nhầm hội thoại của người này sang hồ sơ người kia thì
màn Hồ sơ khách và màn Rủi ro hoàn đều đọc sai, và không ai nhìn ra vì con số vẫn «có».

## ⑥ Ngoài phạm vi

Chuyện `khach` có 89.484 dòng cho ~29k hội thoại (khách nhập từ POS gồm cả khách không qua
Messenger) là bình thường, không phải lỗi — đừng «sửa» bằng cách xoá bớt.

## ⑦ ĐÃ TRA CHƯA — dán OUTPUT MÁY

```
$ psql -tAc "select string_agg(column_name,' ') from information_schema.columns
             where table_name='hoi_thoai' and column_name in ('psid','khach_id','page_id')"
page_id khach_id psid

$ grep -rn "hoi_thoai.*khach_id\|khach_id.*hoi_thoai" docs/thi-cong/phieu/
(không có)
```

**Quan hệ: MỚI.** B-Y8 chạm `khach.so_don_ket` (cột có mà toàn 0); phiếu này chạm
`hoi_thoai.khach_id` (cột có mà toàn NULL) — hai cột khác nhau, hai bảng khác nhau, nhưng
cùng một họ lỗi: **cột tồn tại nên nhìn qua tưởng đã nối**.
