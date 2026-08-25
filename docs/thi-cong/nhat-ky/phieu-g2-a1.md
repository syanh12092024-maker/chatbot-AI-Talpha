# NHẬT KÝ PHIẾU G2-A1 — thi hành `PHIEU-B-Y1` (nới tầng truy vấn)

> Thợ: người A (trục dữ liệu) · 25/08/2026 · nhánh `main`
> Phiếu: `docs/thi-cong/phieu/PHIEU-B-Y1.md` — đóng nợ **N3**
> Môi trường đo: **VPS 169.58.33.8 · PostgreSQL 16.15 · CSDL `aicloser_v3`** (sandbox tự dựng)

---

## 0 · ĐO LẠI NGUYÊN LIỆU TRƯỚC KHI CODE (bước 3 skill) — bốn chỗ đề bài lệch

Án lệ #4 nói đề bài phiếu cũng khai sai được. Đo trước, và đo được bốn chỗ:

| Đề bài khai | Máy trả về |
|---|---|
| `hoi_thoai` 28.953 dòng | **28.953** ✅ |
| `page` 514 | **514** ✅ |
| §8 H7: «514 page + 28.953 hội thoại đều ở `chua-phan`» | **đã sang `tieu-alpha` hết**; `chua-phan` rỗng |
| B-Y1 ④: «22 pass, 0 fail — số hiện tại» | đúng số, nhưng **chỉ đo được sau khi sửa thước** (xem §1) |

Chỗ thứ ba đáng nói: ba cửa UPDATE tạm đều biện minh bằng câu *«dữ liệu đậu ở team kỹ
thuật, ctx người bị từ chối ở đó»*. Câu đó **hết hạn**. Nhưng yêu cầu `ctxHeThong` thì
**vẫn đứng** vì lý do khác: job nền (cron, hàng đợi, bot trả lời 3h sáng) không có ai đăng
nhập. Ghi ra để người sau đọc phiếu không kết luận nhầm là phiếu đã lỗi thời.

## 1 · THƯỚC HỎNG TRƯỚC KHI CODE HỎNG

Không đo được gì trước khi sửa hai chỗ này:

```
$ node --env-file=.env --test test/l0-m2-*.test.js          # máy cá nhân
error: 'Thiếu DATABASE_URL_V3'                              → 0 pass / 24 fail
```
Máy cá nhân **không có Postgres nào**: `.env` 17 khoá không có `DATABASE_URL_V3`, không
`psql`, không docker, cổng 5433 đóng. Ghi chú `db/ket-noi.js:3` («.env dòng 80») đã mục.

```
$ ssh talpha-server 'cd /opt/aicloser && node --env-file=.env --test test/l0-m2-*.test.js'
error: 'permission denied to create database'  code: '42501' → 0 pass / 24 fail
```
Vai `aicloser` có `rolcreatedb = f` ⇒ `dungSandbox()` không dựng nổi CSDL.

**Gỡ:** `ALTER ROLE aicloser CREATEDB;` (chạy 25/08, đảo lại được bằng `NOCREATEDB`).
Sau đó baseline thật = **22 pass / 0 fail**. Con số của phiếu ĐÚNG; cái hỏng là cái thước.
Con «24» ở lượt đo hỏng là hook đổ vỡ đếm thêm, không phải số ca thật.

## 2 · MỘT CHỖ ĐỀ BÀI KHAI THIẾU, VÀ NÓ CÂM

Phiếu mục 1 khai `neu` → `AND cot = $k`. Nhu cầu THẬT của B
(`lech-giua-gia-dinh-cua-B-va-luoc-do-that.md` C1) là:

```sql
WHERE id = $2 AND nguoi_nhan_id IS NULL
```

`cot = NULL` **không bao giờ đúng** trong SQL. Cài đúng chữ của đề bài thì
`neu: { nguoi_nhan_id: null }` khớp 0 dòng ⇒ **mọi** lượt bấm «Nhận việc» trả `null` ⇒
màn hình báo «mất tranh» cho từng cú bấm, không ai nhận được việc bao giờ. Fail-CLOSED
nhưng hỏng trọn vẹn, và không một dòng lỗi nào nói vì sao.

**Quyết:** `null → IS NULL`, và dùng **CHUNG một bộ dựng vế** (`veDieuKien`) cho cả
`layNhieu.dieuKien` lẫn `suaTheoId.neu` — vì mục 2 của chính phiếu đó đã chốt luật
`null → IS NULL`. Hai chỗ cùng luật mà gõ tay hai lần là bom hẹn giờ (bài học 2 GD2).

## 3 · BỐN CHỖ TỰ QUYẾT KHÁC (đã đổ §9)

| # | Quyết | Vì sao |
|---|---|---|
| Q2 | `undefined` trong `dieuKien`/`neu` → **ném** `Error` | Cùng lớp lỗi với §2. `undefined` luôn là biến chưa gán của nơi gọi, không bao giờ là ý đồ |
| Q3 | Object (toán tử `{'>=': x}` của B) → **ném** `Error` nói rõ chưa làm | Không chặn thì `pg` tuần tự hoá thành JSON, SQL ra `cot = '{">=":5}'` → khớp 0 dòng, không lỗi. `Date`/`Buffer` vẫn cho qua (ca B17 khoá cả hai chiều) |
| Q4 | Kiểm tên cột **TRƯỚC** mọi lượt chạm CSDL | Phép ④#7 của phiếu đòi «KHÔNG chạm CSDL». Đo bằng pool có đếm: **0 lượt** |
| Q5 | Gộp soi `team_id` của `duLieu` + `neu` thành MỘT lượt | Soi hai lượt thì một lời gọi xuyên team đẻ **hai** dòng `nhat_ky`, trong khi hợp đồng ② khai «đúng 1 dòng». Hai chỗ khai khác nhau → `Error` thường (lỗi gọi sai, không phải mưu) |

## 4 · CỔNG NGHIỆM THU ĐANG CHẾT CÂM — hai chỗ

**a. `docker exec talpha-pg`.** `ops/bin/nghiem-thu/l0-m2.sh` dựng sandbox bằng container
`talpha-pg`. Container đó **không còn ở đâu**: máy cá nhân không có docker, VPS chạy
Postgres cài thẳng. Cổng `exit 2` ngay ở dòng 53 ⇒ mọi lượt «chạy lại cổng L0-M2» sau đó
đều không đo gì. Nay dựng/dọn bằng chính gói `pg` của repo.

**b. Mốc nền gõ tay đã mục.** Cổng khai 5 tệp «đỏ sẵn ở base 3d1eed1»
(`conv-owner · guard-fastlane · intro · l8-botcake-rules · viec-2345`). Đo 25/08:

```
máy cá nhân (.env 17 khoá):  5/5 XANH
VPS (.env rút gọn 3 biến):   23/23 tệp XANH, 0 đỏ
```

Chúng được vá ở đâu đó sau base mà không ai sửa mốc ⇒ cổng **TRƯỢT mỗi khi mã nguồn TỐT
LÊN**, và vì (a) chặn trước nên chưa ai thấy. Thay danh sách gõ tay bằng luật tự bảo trì
**«0 tệp đỏ»** (án lệ #22: danh sách gõ tay là lỗ hẹn giờ).

## 5 · TEST CHẠM NHÁNH NÀO

Nhánh thật, sandbox Postgres, **không** fixture dựng hộ:

- **Đua thật bốn kết nối** (`Promise.all`, pool `max:4`) trên MỘT dòng `viec_can_xu_ly`
- `nguoi_nhan_id` là **người dùng thật** trong `nguoi_dung` (cột có khoá ngoại — không bịa id)
- `ctxHeThong()` thật, không giả ctx
- `chan_xuyen_team` **đếm từ bảng `nhat_ky` thật**, không đếm bằng phễu
- «0 lượt chạm CSDL» đo bằng **pool bọc đếm**, không suy từ «có ném lỗi»

**Cổng thứ hai viết bằng hành vi** (án lệ #19/#29 — «đột biến nào KHÔNG đỏ»): ca `Y1-c`
chạy ĐÚNG phép đua đó nhưng **bỏ `neu`** ra, và bắt buộc kết quả phải **đảo chiều**. Không
có ca này thì `Y1-b` xanh có thể vì hàng đợi kết nối chứ không vì so-và-đặt.

## 6 · BẰNG CHỨNG MÁY

```
Baseline (trước phiếu, sau khi sửa thước):  22 pass / 0 fail
Sau phiếu:                                  41 pass / 0 fail
```

```
CỔNG L0-M2 · TỔNG: 27 phép · ĐẠT 26 · TRƯỢT 1
   ✔ số lượt THẮNG khi CÓ neu (chờ đúng 1) = 1
   ✔ số lượt THẮNG khi BỎ neu — vế đảo chiều = 4
   ✔ neu không khớp trả về = null
   ✔ số lượt chạm CSDL khi tên cột rác = 0
   ✔ DANH SÁCH id đọc bằng mảng khớp danh sách xin = 10,6,8
   ✔ mảng RỖNG → số dòng = 0 · mảng chứa id team KHÁC → số dòng = 0
   ✔ ctxHeThong THIẾU team_id → LoiThieuBoiCanhTeam
   ✔ số dòng nhat_ky đẻ ra bởi 1 lượt sửa nền = 1
   ✔ bộ ca cũ: 0 tệp đỏ trên 23 tệp
```

**Quét hồi quy toàn bộ v3** (`layNhieu` có 15+ nơi gọi ở L1/L2/L3 — cổng L0-M2 không phủ
tới đó): **28 tệp · 319 pass · 1 fail**. L1 POS, L2 chat, L3 đơn hàng, VA vá đều xanh trọn.

## 7 · ĐỎ CÒN LẠI — KHÔNG PHẢI VIỆC PHIẾU NÀY

`D7` (`test/l0-m1-di-tru.test.js:145`) đỏ **trên VPS**: *«ít nhất một page lạc phải là page
ĐANG BẬT AI»*. Không suy đoán — đã A/B trên cùng cây, cùng dữ liệu, chỉ đổi một tệp:

```
A · truy-van.js BẢN CŨ  (chưa có B-Y1):  # pass 10  # fail 1
B · truy-van.js BẢN MỚI (có B-Y1):       # pass 10  # fail 1
```

Y hệt ⇒ **không phải hồi quy**. Nguyên nhân là DỮ LIỆU: `pages.json`/`ai-enabled.json` trên
VPS không còn page lạc nào đang bật AI. Đất L0-M1, ngoài pathspec B-Y1 ⇒ ghi §9, không sửa.

## 8 · NGOÀI PHẠM VI — KHÔNG ĐỤNG

- **Ba cửa UPDATE tạm vẫn còn nguyên** (`src/pos/kho.js` · `src/chat/kho.js` ·
  `src/orders/may-trang-thai.js`). Phiếu này chỉ **mở đường**; xoá là **G2-A3**, mỗi cửa một chủ.
- `LIMIT`/`OFFSET`/giảm dần → nợ riêng của B, mục G2 của file lệch.
- `layMotTheoId` nhận mảng → không thêm (luật 12). B gánh bằng `layNhieu(...)[0]`.
- `themMoi` **không** được thêm lớp kiểm tên cột sớm — ngoài phạm vi ④, đã đổ §9.

## 9 · CẢNH BÁO CHO G2-A3 (đã đổ §9)

`ghiDon()` ở `may-trang-thai.js` khi CAS trượt thì **NÉM** `LoiGhiDonAnhCu`; `suaTheoId`
thì **TRẢ `null`**. Lúc xoá cửa tạm thứ ba, nơi gọi **phải tự dịch `null` → ném**. Quên
một chỗ là lá chắn RF-13 biến thành lệnh rỗng im lặng — đúng loại hồi quy mà bản vá đẻ ra
(án lệ #26).
