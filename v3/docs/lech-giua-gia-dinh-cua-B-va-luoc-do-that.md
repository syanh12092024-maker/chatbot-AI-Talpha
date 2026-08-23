# CHỖ LỆCH — GIẢ ĐỊNH CỦA B ↔ LƯỢC ĐỒ VÀ TẦNG TRUY VẤN THẬT CỦA A

> Người B kê, 23/08/2026, **trước khi viết một dòng mảnh nối nào**.
> Nguồn đối chiếu: `db/migrate/001_nen.up.sql` · `src/db/truy-van.js` ·
> `docs/v3/ban-giao/luoc-do-v1.md` · `docs/v3/ban-giao/tang-truy-van-v1.md`.
> Đối chiếu với: `v3/testkit/db-gia.js` · `v3/docs/hop-dong-b-voi-a.md` mục 3–4 · code L0/L1/L4 của B.
>
> **B KHÔNG đổi lược đồ của A.** File này chỉ kê ra để A và chủ dự án quyết chỗ nào B
> gánh trong mảnh nối, chỗ nào phải mở phiếu cho A.

---

## Tóm tắt: 3 chỗ CHẶN, 6 chỗ B tự gánh được, 2 chỗ cần một câu chốt

| # | Chỗ lệch | Mức | Ai xử |
|---|---|---|---|
| C1 | `suaTheoId` chỉ sửa theo `id` → **so-và-đặt của L4-M2 không diễn đạt được** | 🟥 CHẶN | cần A hoặc chốt cách khác |
| C2 | `cau_hinh_model` là **ba dòng/team**, B viết như **một dòng/team** | 🟥 CHẶN | B viết lại lớp cấu hình |
| C3 | `so_ai` **không có cột `ben`/`chu`** → đoạn chat màn chi tiết không dựng được | 🟥 CHẶN | cần chốt nguồn đoạn chat |
| G1 | 4 hàm rời thay cho đối tượng `db.*` | 🟩 gánh được | B, trong mảnh nối |
| G2 | Không có `gioiHan`/`buoc`/`giảm dần` | 🟩 gánh được | B, cắt trang trong JS |
| G3 | Không có `dem()` | 🟨 gánh được, tốn | B, đếm bằng độ dài |
| G4 | Không có `giaoDich()` | 🟨 gánh được | B, bỏ lớp thứ hai |
| G5 | Tên cột `viec_can_xu_ly` lệch 8 chỗ | 🟩 gánh được | B, bản đồ tên |
| G6 | `nguoi_dung`/`vai` lệch tên và giá trị | 🟩 gánh được | B, bản đồ tên |
| Q1 | Hai biến môi trường cho cùng một việc: `V3_KHOA_CHU` ↔ `V3_KHOA_MA_HOA` | 🟨 chốt | chủ dự án |
| Q2 | Hai cửa ghi `nhat_ky`: `ghiNhatKy` của A ↔ module L0-M4 của B | 🟨 chốt | chủ dự án |

---

## 🟥 C1 · So-và-đặt của L4-M2 không diễn đạt được

**Thật:** `suaTheoId(pool, ctx, tenBang, id, duLieu)` → `UPDATE ... WHERE team AND id = $n`.
Không có tham số nào cho điều kiện thêm.

**B đang cần:** `dong-viec.js` chống hai sale bấm cùng lúc bằng **so-và-đặt** — mọi lệnh sửa
kèm trạng thái đã đọc vào điều kiện:

```sql
UPDATE viec_can_xu_ly SET nguoi_nhan_id = $1, nhan_luc = now()
WHERE id = $2 AND nguoi_nhan_id IS NULL          -- ← vế này không truyền được
```

Bỏ vế đó thì hai sale bấm cùng lúc **cả hai cùng thắng**, người sau ghi đè người trước —
đúng cái tiêu chí nghiệm thu số 13 của L4-M2 sinh ra để chặn.

**Ba đường ra, B đề xuất đường 1:**

1. **A thêm một hàm** `suaCoDieuKien(pool, ctx, tenBang, id, dieuKienThem, duLieu)` — trả
   `null` khi 0 dòng khớp. Đúng chỗ, đúng người, và L3 của A cũng đã cần so-và-đặt
   (`RF-13 CAS ghiDon` trong sổ nợ §9 — nghĩa là A đã tự giải bài này ở chỗ khác rồi).
2. B viết SQL trực tiếp qua `db/ket-noi.js` cho đúng hai lệnh này. **B không thích**: phá
   luật "mọi truy vấn bảng nghiệp vụ đi qua tầng truy vấn", và lớp team lại phải tự chèn tay.
3. Chấp nhận đọc-rồi-ghi có khe hở, ghi rõ giới hạn. **B không đề xuất** — cửa duyệt đơn là
   đường tiền.

---

## 🟥 C2 · `cau_hinh_model` — ba dòng một team, không phải một

**Thật:** mỗi team **ba dòng**, khoá `UNIQUE (team_id, vai_tro)`, `vai_tro ∈ chinh|du_phong|nen`:

```
id · team_id · vai_tro · nha_cung_cap · ma_model · khoa_api_ma · do_ngau_nhien · bat · sua_luc
```

**B viết:** một dòng/team, các cột `chinh_ma_model` `du_phong_ma_model` `nen_ma_model`
`khoa_ma_hoa jsonb` `do_ngau_nhien` `do_ngau_nhien_nen`.

Đây **không phải đổi tên cột** mà là đổi hình dạng dữ liệu — bản đồ tên không cứu được.
`v3/src/model/cau-hinh.js` phải viết lại phần đọc/ghi: đọc ba dòng rồi gộp, ghi thì
`UNIQUE (team_id, vai_tro)` nên phải nâng-hoặc-chèn từng vai trò.

Ba hệ quả kèm theo:

- **Khoá API theo NHÀ hay theo VAI TRÒ?** B lưu theo nhà (`{kimi:…, claude:…}`) vì một khoá
  Kimi dùng cho cả ô chính lẫn ô nền. Lược đồ thật gắn khoá vào **dòng vai trò** — nên cùng
  một khoá Kimi bị lưu **hai lần** nếu chính và nền cùng nhà. Đổi khoá thì phải nhớ sửa hai
  chỗ, quên một chỗ là lệch âm thầm. **Cần A xác nhận đây là ý đồ.**
- `do_ngau_nhien` nằm trên từng dòng → `do_ngau_nhien_nen` của B chính là `do_ngau_nhien`
  của dòng `vai_tro='nen'`. Chỗ này khớp được, chỉ cần bỏ cột thứ hai.
- `CHECK (do_ngau_nhien BETWEEN 0 AND 2)` — B đang chặn `[0,1]`. B nới theo A.

---

## 🟥 C3 · `so_ai` không có cột nội dung tin

**Thật:**

```
page_id · psid · xay_ra_luc · loai(reply|order|handoff|image|other_bot|yielded|spent_no_send)
ma_model · lane · trang_thai · ban_kich_ban · ly_do
token_vao · token_ra · cache_doc · cache_ghi · so_lan_goi
du_lieu jsonb · nguon_tep · nguon_dong
```

**Không có `ben`, không có `chu`.** Mà màn chi tiết của L4-M1 dựng **đoạn chat** từ đúng hai
cột đó — chính là chỗ tôi đã chốt vào hợp đồng mục 4 hôm qua và A không đọc kịp trước khi
migrate.

Ba điều kéo theo:

- `cust_id` của B ↔ **`psid`** của A (đổi tên được).
- `thoi_gian` ↔ **`xay_ra_luc`** (đổi tên được).
- Nội dung tin: có thể nằm trong `du_lieu jsonb`, nhưng **chưa ai khai khoá nào**. Và
  `so_ai` chỉ ghi **hành động của BOT** — tin của **khách** có thể không có dòng nào.

**Cần chốt:** đoạn chat trên màn sale lấy từ đâu?
(a) `du_lieu jsonb` — A khai khoá chuẩn, B đọc theo · (b) bỏ đoạn chat, sale bấm thẳng sang
Pancake đọc (đúng tinh thần "sale không làm việc trên hệ thống này", và **B nghiêng về
cách này**) · (c) bảng tin riêng — mở phiếu mới.

---

## 🟩 G1–G4 · Hình dạng tầng truy vấn — B gánh trong mảnh nối

| B cần | A có | B làm gì trong mảnh nối |
|---|---|---|
| `db.chon(bang, dk, {sapXep, giamDan, gioiHan, buoc})` | `layNhieu(pool, ctx, bang, {dieuKien, thuTu})` | gọi `layNhieu` rồi **đảo/cắt trang trong JS** |
| `db.mot(bang, dk)` | `layMotTheoId(pool, ctx, bang, id)` | `layNhieu(...)[0]` khi điều kiện không phải id |
| `db.dem(bang, dk)` | — | `layNhieu(...).length` |
| `db.giaoDich(fn)` | — | chạy thẳng `fn`, **bỏ lớp an toàn thứ hai** (xem C1) |
| `db.xoa()` | — | giữ nguyên: ném lỗi, vai B không xoá |

⚠️ **Giá phải trả, ghi rõ để sau này không ai ngạc nhiên:** `thuTu` chỉ **tăng dần một cột**,
`layNhieu` **không có `LIMIT`**. Nên "20 tin gần nhất" và "100 việc đang chờ" đều **kéo cả
bảng của team về rồi cắt trong JS**. Chấp nhận được ở quy mô giai đoạn 1 (18.790 hội thoại,
52.036 dòng Sổ AI), **không chấp nhận được** khi Sổ AI lên vài triệu dòng. Đã ghi thành nợ.

---

## 🟩 G5 · Tên cột `viec_can_xu_ly` — lệch 8 chỗ, đổi tên là xong

| B viết | Thật | Ghi chú |
|---|---|---|
| `loai: 'don'` | `loai: 'don_hang'` | ⚠️ **giá trị**, không phải tên cột |
| `ly_do_ma` / `ly_do` | `ly_do_day` | một cột, hiện nguyên văn |
| `trang_thai` (`cho`/`dang_xu`/`da_xu`) | **không có cột này** | mở = `dong_luc IS NULL`; đang xử = `nguoi_nhan_id IS NOT NULL AND dong_luc IS NULL` |
| `tao_luc` | `day_luc` | |
| `nhan_boi` | `nguoi_nhan_id` | **bigint FK `nguoi_dung`**, không phải chuỗi |
| `ket_qua_ly_do` | `ly_do_dong` | |
| `chi_phi_dong` | `chi_phi` | `numeric(14,2)` — B đang ép số nguyên đồng, phải nới |
| `page_id` `cust_id` `conv_id` | `hoi_thoai_id` `don_hang_id` | ⚠️ **đổi cách nối**: B phải qua `hoi_thoai` mới ra page/psid/khách |

Chỗ cuối là việc thật, không phải đổi tên: `kho-viec.js` đang gộp `khach`/`page` theo
`cust_id`/`page_id` lấy thẳng từ dòng việc. Nay phải: việc → `hoi_thoai` → `khach`+`page`.
Thêm một mẻ đọc nữa (từ 3 lên 4 lời gọi cho danh sách), vẫn không phải N+1.

**Máy trạng thái ba trạng thái của B vẫn giữ được**, chỉ đổi cách suy ra:

```
cho     = nguoi_nhan_id IS NULL     AND dong_luc IS NULL
dang_xu = nguoi_nhan_id IS NOT NULL AND dong_luc IS NULL
da_xu   = dong_luc IS NOT NULL
```

---

## 🟩 G6 · `nguoi_dung` và `vai`

| B viết | Thật |
|---|---|
| `ten_dang_nhap` (UNIQUE) | **`email`** (UNIQUE) — màn đăng nhập của B phải đổi nhãn thành Email |
| `mat_khau_bam` | `mat_khau_hash` |
| `bat` | `hoat_dong` |
| `ho_ten` | `ten` |
| `vai.ma = 'quan_tri'` \| `'sale'` | `'quan-tri'` \| `'sale'` — ⚠️ **gạch ngang**, và `VAI.QUAN_TRI` của B đang là gạch dưới |
| `thanh_vien_team` 3 cột khoá chính | có `id` riêng + `UNIQUE (team, người, vai)` |

`vai.ma` lệch dấu gạch là loại lỗi im lặng nhất trong cả danh sách: so chuỗi không khớp thì
**mọi người dùng đều thành không có vai**, và cửa `batBuocVaiHTTP` chặn sạch — trông y hệt
"phân quyền chạy đúng".

---

## 🟨 Q1 · Hai biến môi trường cho cùng một việc

| | B | A |
|---|---|---|
| Biến | `V3_KHOA_CHU` | **`V3_KHOA_MA_HOA`** |
| Định dạng khoá | 32 byte base64 | 32 byte hex **hoặc** base64 |
| Bao thư lưu | jsonb `{v, iv, the, mat}` | chuỗi **`v1.<iv>.<tag>.<ct>`**, có `CHECK ... LIKE 'v1.%'` |
| Cửa ghi | `v3/src/model/kho-khoa.js` | `db/khoa.js` + `ghiCauHinhModel()` |

Hai bản cài mã hoá cho cùng một cột. **B đề xuất: bỏ bản của B, dùng `db/khoa.js` của A** —
vì `CHECK` ở tầng CSDL đã chặn theo khuôn của A, bản của B ghi xuống là bị từ chối ngay.
Đổi lại `V3_KHOA_CHU` biến mất khỏi tài liệu của B. **Cần một câu chốt.**

## 🟨 Q2 · Hai cửa ghi `nhat_ky`

A ghi: *"Cửa RA DUY NHẤT của bảng `nhat_ky` — mọi module gọi thẳng hàm này, đừng tự viết câu
INSERT khác."* Nhưng L0-M4 của B **là** một cửa ghi `nhat_ky`, có bản đồ hành động riêng,
có lớp Express tự ghi, có luật "bốn mã bắt buộc thì ghi hỏng phải ném".

Lệch cụ thể:

| | B | A |
|---|---|---|
| `tac_nhan` | `'nguoi'` \| `'may'` | `'nguoi:<email>'` \| `'may:<job>'` |
| Cột loại đối tượng | `doi_tuong_loai` | `doi_tuong` |
| `ip` | có | **không có cột** |
| Thời gian | `thoi_gian` | `xay_ra_luc` |

**B đề xuất:** giữ module L0-M4 làm **lớp trên** (bản đồ hành động, che chỗ nhạy cảm, luật
bốn mã bắt buộc, lớp Express) nhưng **ruột gọi xuống `ghiNhatKy` của A**, không tự INSERT.
Cột `ip` thì bỏ vào `ghi_chu` hoặc `sau`. **Cần một câu chốt.**

---

## Việc B đề nghị làm ngay sau khi có câu trả lời

1. `v3/src/noi-day/cong-du-lieu-that.js` — mảnh nối `taoTruyVan(boiCanh)` /
   `taoTruyVanHeThong()` gọi xuống `src/db/`, kèm bản đồ tên cột của G5/G6. **Không sửa
   `src/db/`.**
2. Sửa `v3/src/model/cau-hinh.js` theo hình dạng ba dòng (C2).
3. Sửa `v3/src/ui/dispatch/kho-viec.js` + `chi-tiet.js` theo G5 và kết luận của C3.
4. Sửa `v3/src/auth/*` theo G6 (email thay tên đăng nhập, `quan-tri` gạch ngang).
5. Cập nhật `v3/testkit/db-gia.js` cho khớp tên thật — **để bản giả và bản thật không còn
   nói hai thứ tiếng.** Đây là gốc của cả danh sách trên: bản giả được viết lúc chưa có
   lược đồ, và nó dễ tính hơn bản thật.
