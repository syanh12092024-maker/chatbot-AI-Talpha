# PHIẾU B-Y1 — Nới tầng truy vấn: `suaTheoId` nhận điều kiện, và `layNhieu` nhận `IN`

**Base:** `474c57c` · **Làn:** 🟥 (máy phán lại — phiếu này gỡ rào cho đường **duyệt đơn**
và đường **ghi ngược trạng thái POS**, cả hai là đường tiền)

> Phiếu do **người B** phát, xin **người A** làm — `src/db/` là đất của A, B không đụng.
> Đây **không phải** việc riêng của B: nó đóng nợ **N3** đang mở từ 22/08 và **xoá ba cửa
> tạm** mà chính A đã khai là nợ trong mã nguồn.

---

## ① Thi hành đoạn spec nào

- `docs/v3/ban-giao/tang-truy-van-v1.md` §3 — chính file này khai: *«chưa có bản `suaTheoId`
  cho `ctxHeThong`, ngoài phạm vi ④ của phiếu này, **mở phiếu mới nếu L1+ cần**»*. L1, L2,
  L3 và L4 đều đã cần.
- `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §9 — nợ **N3** (22/08, thợ L1-M1)
- `v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md` mục **C1**

## ② Hợp đồng vào/ra

**Vào — A phải đo lại, đừng tin đề bài:**

`src/db/truy-van.js:248` — `suaTheoId(pool, ctx, tenBang, id, duLieu)` sinh
`UPDATE ... WHERE <team> AND id = $n`. Hai chỗ hẹp:

1. không nhận `ctxHeThong()` (ném `LoiThieuBoiCanhTeam`)
2. không nhận **điều kiện thêm** trong `WHERE`

**Bốn lần đã bị cắn vì đúng hai chỗ hẹp đó:**

| Lần | Ai | Cần gì | Đã làm gì thay thế |
|---|---|---|---|
| 1 | L1-M1 (A) | refresh `trang_thai_pos`/`ton_kho`, dữ liệu đậu ở team kỹ thuật ⇒ buộc `ctxHeThong` | dựng cửa tạm `src/pos/kho.js` |
| 2 | L2-M1 (A) | ghi `hoi_thoai` | dựng cửa tạm thứ hai `src/chat/kho.js` |
| 3 | VA-R3 / RF-13 (A) | **so-và-đặt** `trang_thai_he` — không CAS thì ảnh cũ ghi đè, POS ở 12 «Chờ in» mà sổ hệ ghi `cho_sale` | viết `UPDATE` tay trong `src/orders/may-trang-thai.js:290` |
| 4 | L4-M2 (B) | **so-và-đặt** `nguoi_nhan_id`/`dong_luc` khi sale nhận & đóng việc | **chưa có đường nào** — B đang kẹt |

Chính `may-trang-thai.js:258-259` đã khai:

> *«Giá phải trả (nói ra theo luật 13): repo tạm có **ba đường UPDATE hẹp thay vì một**.
> Đã ghi §9 — **bản vá đúng là `suaTheoId` cho `ctxHeThong()` ở `src/db/`, đất L0-M2**.»*

**Ra — nói bằng câu đo được:**

```js
suaTheoId(pool, ctx, tenBang, id, duLieu, { neu } = {})
```

- `neu` là object phẳng `{ cot: giaTri }`, ánh xạ thành `AND cot = $k` **nối vào `WHERE`
  sau vế team và vế id**. Tên cột kiểm bằng đúng `kiemTraTenCot()` đang có.
- `neu` chứa `team_id` → ném `LoiXuyenTeam` như `dieuKien` hiện nay (đừng mở lỗ mới).
- **0 dòng khớp → trả `null`**, không ném. Trùng đúng ngữ nghĩa `suaTheoId` đang có
  («không có dòng đó trong team của bạn»), nên nơi gọi phân biệt được «mất tranh» với «lỗi».
- Chấp nhận `ctxHeThong()`: khi đó **bắt buộc** `duLieu.team_id` hoặc `neu.team_id` tường
  minh — y hệt luật `themMoi` + `ctxHeThong` ở `tang-truy-van-v1.md` §4. Thiếu → `LoiThieuBoiCanhTeam`.
- Ghi `nhat_ky` giữ nguyên nếp cũ: `ctxHeThong` thì **mọi lượt** ghi; ctx người thì chỉ ghi
  khi bị chặn xuyên team.

**Không đổi chữ ký cũ.** `neu` là tham số thứ sáu tuỳ chọn — 100% lời gọi hiện có chạy y nguyên.

## ②b · MỤC HAI — `layNhieu` không có `IN` (thêm 24/08, phát hiện khi viết mảnh nối)

**Vào:** `src/db/truy-van.js:177` dựng mỗi điều kiện thành `cot = $n`. Truyền một **mảng**
id vào là sinh `id = '{1,2,3}'` → Postgres ném lỗi kiểu.

**Chỗ hỏng:** cả bốn mẻ gộp của bảng điều phối đều **gom id rồi đọc một lần bằng mảng** —
đó chính là cách nó không N+1 (có bài test đo: 10 dòng và 100 dòng phải tốn bằng nhau).
Không có `IN` thì chỉ còn hai đường, cả hai đều xấu:

| Đường | Giá |
|---|---|
| Đọc từng id một | **N+1** — 100 việc thành 400 lời gọi. Chính thứ bài test cấm |
| Đọc trọn bảng của team rồi lọc trong JS | mỗi lượt mở bảng điều phối **kéo trọn `hoi_thoai`**. Hôm nay **28.953 dòng** |

Mảnh nối đang gánh bằng đường thứ hai, có kêu cảnh báo kèm số dòng — nhưng đó là băng dán,
không phải bản vá.

**Ra:** `layNhieu` (và `layMotTheoId` nếu tiện) nhận giá trị **mảng** trong `dieuKien`:

```js
// giá trị mảng → = ANY($n)   ·  giá trị null → IS NULL  ·  còn lại giữ nguyên = $n
if (Array.isArray(v)) { params.push(v); return `${k} = ANY($${params.length})`; }
if (v === null)       {                 return `${k} IS NULL`; }
```

Mảng **rỗng** → phải ra `false` (0 dòng), đừng dựng `= ANY('{}')` rồi tuỳ Postgres.
`team_id` trong mảng vẫn bị soi xuyên team như hiện nay, không mở lỗ mới.

**Nghiệm thu thêm:**

```bash
# gieo 5 dòng khach, đọc bằng { id: [id1, id3, id5] } → đúng 3 dòng, đúng 3 id đó
# { id: [] }                    → 0 dòng, KHÔNG ném
# { id: [id_cua_team_khac] }    → 0 dòng (rào team vẫn ăn trước)
# { team_id: ['9'] } với ctx team 1 → LoiXuyenTeam như cũ
```

---

## ③ File được đụng (pathspec)

```
src/db/truy-van.js
src/db/index.js
test/l0-m2-boi-canh.test.js
test/l0-m2-cach-ly.test.js
ops/bin/nghiem-thu/l0-m2.sh
docs/v3/ban-giao/tang-truy-van-v1.md
```

**Ngoài danh sách này = ngoài phạm vi.** Đặc biệt: **KHÔNG xoá ba cửa tạm trong phiếu này** —
xoá chúng là phiếu riêng, mỗi cửa một chủ (`src/pos/kho.js` của L1-M1, `src/chat/kho.js` của
L2-M1, `may-trang-thai.js` của L3-M1). Phiếu này chỉ **mở đường** để phiếu sau xoá được.

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# 1 · chữ ký cũ không vỡ — toàn bộ suite L0-M2 hiện có
node --env-file=.env --test test/l0-m2-boi-canh.test.js test/l0-m2-cach-ly.test.js
#    kỳ vọng: 22 pass, 0 fail  (số hiện tại, không được tụt)

# 2 · SO-VÀ-ĐẶT: hai lượt sửa đua nhau trên CÙNG một dòng → đúng MỘT lượt thắng
#    (ca thật: hai sale cùng bấm "Nhận việc" trên một dòng viec_can_xu_ly)
#    kỳ vọng: 1 lượt trả về dòng · 1 lượt trả về null · cột nguoi_nhan_id chỉ mang MỘT giá trị

# 3 · điều kiện không khớp → null, KHÔNG ném
#    suaTheoId(pool, ctx, 'viec_can_xu_ly', id, {...}, { neu: { dong_luc: <sai> } })
#    kỳ vọng: null

# 4 · neu.team_id lệch ctx → LoiXuyenTeam + đúng 1 dòng nhat_ky hanh_dong='chan_xuyen_team'
# 5 · ctxHeThong() KHÔNG kèm team_id tường minh → LoiThieuBoiCanhTeam
# 6 · ctxHeThong() CÓ kèm team_id → chạy, và ghi nhat_ky (mọi lượt, theo §4)
# 7 · tên cột rác trong neu ('a b'/'a;drop') → Error thường, KHÔNG chạm CSDL

bash ops/bin/nghiem-thu/l0-m2.sh    # kỳ vọng: rc=0, 8 phép cũ + các phép mới
```

## ⑤ Test chạm nhánh nào

Nhánh **thật**, không fixture dựng hộ: ① đua thật hai lượt `suaTheoId` đồng thời trên sandbox
(`db/sandbox.js`) · ② `ctxHeThong()` thật, không giả ctx · ③ `chan_xuyen_team` đọc từ bảng
`nhat_ky` thật, không đếm bằng phễu.

## ⑥ Ngoài phạm vi

- Xoá ba cửa tạm → **ba phiếu riêng sau phiếu này**, ghi §9
- `layNhieu` thiếu `LIMIT`/`OFFSET`/thứ tự giảm dần → nợ riêng của B, ghi ở
  `v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md` mục G2; **đừng gộp vào đây**
- `layMotTheoId` chỉ theo id → B tự gánh bằng `layNhieu(...)[0]`, không xin

## ⑦ ĐÃ TRA CHƯA — OUTPUT MÁY

```
$ grep -rn "suaTheoId\|CAS\|RF-13" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md docs/thi-cong/nhat-ky/
nhat-ky/phieu-l2-m1.md:164:  **Cửa hẹp thứ HAI ghi `hoi_thoai`** (`src/chat/kho.js`) vì `suaTheoId` không nhận
nhat-ky/phieu-l2-m1.md:167:  `suaTheoId cho ctxHeThong` xong. Đã ghi §9.
nhat-ky/phieu-l2-m1.md:268:  **Cửa hẹp thứ hai ghi `hoi_thoai`** — nợ N3 (`suaTheoId` cho `ctxHeThong`) lặp lại.
SO-DIEU-HANH-THI-CONG.md:290:  🔴 **RF-13 (CHẶN):** `ghiDon()` UPDATE mù không CAS `trang_thai_he` ⇒ ảnh cũ ghi đè
SO-DIEU-HANH-THI-CONG.md:380:  22/08 · thợ L1-M1 (nợ N3): `suaTheoId` của tầng L0-M2 **chưa có bản cho `ctxHeThong()`**

$ grep -n "ba đường UPDATE hẹp" src/orders/may-trang-thai.js
258:// Giá phải trả (nói ra theo luật 13): repo tạm có ba đường UPDATE hẹp thay vì một. Đã
259:// ghi §9 — bản vá đúng là `suaTheoId` cho `ctxHeThong()` ở `src/db/`, đất L0-M2.
```

**Quan hệ: TRÙNG-NỢ.** Đây chính là nợ **N3**, đã lặp **ba lần** (L1-M1 · L2-M1 · VA-R3/RF-13)
và nay là lần **thứ tư** (L4-M2 của B). Ba lần trước đều vá bằng cửa tạm vì phiếu này chưa
được mở. Phiếu này **đóng nợ N3**, không phải đẻ việc mới.

---

## Vì sao B xin thay vì tự làm

`src/db/` là đất của A (`docs/v3/05-PHAN-VIEC.md`). B viết SQL tay thì thành **cửa tạm thứ
tư**, và lớp team lại phải tự chèn thêm một lần nữa — đúng cái lỗ mà tầng truy vấn sinh ra
để bịt. B chờ.

**Hỏng gì nếu không làm:** hai sale bấm «Nhận việc» cùng lúc thì **cả hai cùng thắng**, người
sau ghi đè người trước. Ở dòng `loai='don_hang'` (duyệt đơn) nghĩa là **hai người cùng duyệt
một đơn** — cùng loại hậu quả với RF-12 «bấm duyệt lại = POST lần hai». Tiêu chí nghiệm thu
13 của L4-M2 sinh ra đúng để chặn ca này, và hiện B **chỉ chặn được trên bản cài giả**, không
chặn được trên cơ sở dữ liệu thật.
