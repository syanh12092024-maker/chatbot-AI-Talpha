# PHIẾU B-Y3 — Mở đường CHUYỂN PAGE GIỮA CÁC TEAM (và phần con của page)

**Base:** `8ccba26` · **Làn:** 🟥 (đường tiền gián tiếp: chuyển page là chuyển cả đơn hàng
và hội thoại của page đó sang team khác — sai một lượt là hai team nhìn thấy khách của nhau)

> Phiếu do **người B** phát, xin **người A** làm — `src/db/` là đất của A, B không đụng.
> Phiếu này gỡ chặn **H7** (§8 sổ điều hành, đang 🔴 "CHẶN TOÀN BỘ MÀN HÌNH v3") và gỡ chặn
> lát 4 của màn **Cấu hình team** — màn đầu tiên của sóng 0 giai đoạn 2.

---

## ① Thi hành đoạn spec nào

- `docs/v3/gd2/00-KE-HOACH-GD2.md` §"Sóng 0 · GỠ CHẶN" — màn **Cấu hình team**, dòng
  *"Gán page ↔ team"*, và bảng *"Việc đang chặn giai đoạn 1"* hàng **H7**
- `docs/v3/01-QUYET-DINH.md` §8 — *"điều kiện team nằm ở tầng truy vấn, tự chèn theo người
  đang đăng nhập"*
- `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §8 việc **H7**
- `v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md` — phiếu này là chỗ lệch **thứ tư**,
  kê sau C1/C2/C3

## ② Hợp đồng vào/ra

### Vào — A phải ĐO LẠI, đừng tin đề bài

**(a) `suaTheoId` bỏ rơi `team_id` trong im lặng.** `src/db/truy-van.js:229` và `:259`:

```js
if (k === "team_id") continue;      // ← ở CẢ themMoi (229) VÀ suaTheoId (259)
```

Ở `themMoi` cái `continue` này là ĐÚNG (team_id lấy từ server, không tin caller — đã ghi
rõ trong docstring). Ở `suaTheoId` nó làm mệnh đề `SET` **không bao giờ chứa `team_id`**.
Hệ quả đo được:

| Gọi thế nào | Hôm nay xảy ra gì |
|---|---|
| `suaTheoId(pool, ctx, 'page', 7, { team_id: <team khác> })` | `LoiXuyenTeam` + 1 dòng `nhat_ky` — **đúng, chặn to** |
| `suaTheoId(pool, ctx, 'page', 7, { team_id: <chính ctx> })` | **`UPDATE` chạy, trả về dòng, `team_id` KHÔNG đổi** |
| `suaTheoId(pool, ctx, 'page', 7, { team_id: X, ten: 'a' })` | ném `LoiXuyenTeam` trước khi tới `SET` |

Hàng giữa là chỗ nguy: **không lỗi, không cảnh báo, trả về dòng như đã sửa.** Màn hình gọi
nó sẽ báo "đã gán" và không có gì xảy ra. Đây đúng họ lỗi của bài học ② giai đoạn 1
(`quan_tri` gạch dưới) — *sai mà màn hình trông y hệt chạy đúng*.

**(b) Việc này ĐÃ LÀM MỘT LẦN BẰNG SQL TAY — có chủ đích, có mốc quay lui, KHÔNG có nhật
ký.** Chủ dự án chốt ngày 24/08 (commit `4524294`): gán **toàn bộ về Tiểu Alpha** trong
**một giao dịch** — 514 page · 28.953 hội thoại · 71 kịch bản · 7 kết nối POS — kèm bảng mốc
quay lui **29.545 dòng**, nay vẫn còn: `_quay_lui_gan_team_20260824`.

Nói rõ để phiếu này không bị đọc nhầm thành lời chê: **lượt gán đó làm cẩn thận**, và chính
commit ấy đã ghi đúng yêu cầu mà phiếu này thi hành — *«gán bằng màn hình, và đổi team một
page thì hội thoại của page đó đi theo»*. Thứ duy nhất nó không có là **dòng `nhat_ky`**,
và không phải vì ai quên: chưa có màn hình nào để ghi.

Cái phiếu này xin là **làm cho lần sau không cần tới psql nữa.** Đo trên `aicloser_v3`
(169.58.33.8) hôm nay:

```
page.team_id phan bo: team_id=1 -> 514            (team 1 = tieu-alpha, la_ky_thuat=false)
hoi_thoai: tieu-alpha 28953 | auus 0 | pialpha-eu 0 | chua-phan 0
nhat_ky tong=0
```

`db/di-tru/nap.js:13` là `TEAM_KY_THUAT = "chua-phan"` (bản trên VPS `58cbe03` giống hệt) —
tức là **bộ nạp vẫn đổ vào `chua-phan`**. Chạy lại di trú thì page mới lại rơi vào team kỹ
thuật, và lại phải gọi người chạy SQL để kéo ra. `page` cũng không có trigger `sua_luc` nên
lượt kéo đó không để dấu vết nào ngoài chính dữ liệu.

Nói thẳng cái giá: **cửa duy nhất để gán page cho team hiện là psql tay** — dùng được một
lần vì có người cẩn thận ngồi viết giao dịch và bảng quay lui, nhưng không dùng lại được mỗi
khi thêm một page. Phiếu này thay nó bằng một hàm.

**(c) Chuyển page KHÔNG PHẢI một cột.** `page.id` được năm bảng trỏ tới, và mỗi bảng mang
`team_id` RIÊNG (`db/migrate/001_nen.up.sql`):

| Bảng | Nối vào page qua | Có `team_id` riêng | Số dòng thật hôm nay |
|---|---|---|---|
| `hoi_thoai` | `page_id` (bigint FK) | có | 28.953 |
| `san_pham` | `page_id` (nullable FK) | có | — |
| `kich_ban` | `page_id` | có | — |
| `so_ai` | `page_id` **text = id Facebook**, KHÔNG phải FK sang `page.id` | có | 0 hôm nay. ⚠️ **CHỈ INSERT** — trigger `tg_chi_insert_so_ai` cấm UPDATE |
| `khach`/`don_hang` | gián tiếp qua `hoi_thoai` | có | 0 / 0 |

Chuyển `page.team_id` mà không chuyển `hoi_thoai.team_id` là **bỏ lại 28.953 hội thoại mồ
côi**: page thuộc team mới, hội thoại của nó vẫn ở team cũ, và không màn hình nào của B
nhìn thấy sự lệch đó vì mỗi bảng đều tự lọc theo team của mình.

⚠️ **`so_ai` không UPDATE được.** Trigger cấm. Nên hoặc `so_ai` ở lại team cũ vĩnh viễn (số
liệu lịch sử tách khỏi page), hoặc trigger phải nới. **B không tự quyết cái này — xem ⑧.**

### Ra — nói bằng câu đo được

Một hàm mới trong `src/db/`, B đề xuất tên `chuyenPageSangTeam`:

```js
chuyenPageSangTeam(pool, ctx, { pageId, teamDichId, lyDo })
  → { pageId, teamCu, teamMoi, daChuyen: { hoi_thoai: N, san_pham: N, kich_ban: N }, boLai: { so_ai: N } }
```

Bốn hành vi bắt buộc, mỗi cái một câu đo được:

1. **Chạy trong MỘT giao dịch.** Nửa chừng hỏng thì không có page nào đổi team mà con còn ở
   team cũ. (Tầng truy vấn chưa phơi `giaoDich()` ra — G4 trong file lệch; hàm này tự mở.)
2. **Vai `quan-tri` mới gọi được**, và `ctx` phải thuộc **một trong hai** team (nguồn hoặc
   đích). Người ngoài cả hai team gọi → chặn.
3. **Ghi `nhat_ky` một dòng**, `hanh_dong = 'chuyen_page_team'`, `doi_tuong = 'page'`,
   `doi_tuong_id = <page.id>`, `truoc`/`sau` mang team cũ/mới và số dòng con đã chuyển.
   Không ghi được nhật ký → **giao dịch cuộn lại**. (Đây là thao tác đổi chủ dữ liệu; không
   truy ngược được thì không được phép làm.)
4. **`teamDichId` là team KỸ THUẬT → từ chối.** Chuyển page vào `chua-phan` là làm nó tàng
   hình với mọi màn (`la_ky_thuat` bị `xacDinhTeamId` chặn). Muốn "gỡ gán" thì phải có
   đường riêng, không mượn đường này.

## ③ File được đụng (pathspec)

```
src/db/chuyen-team.js          ← mới
src/db/index.js                ← thêm đúng một dòng export
test/l0-m2-chuyen-team.test.js ← mới
```

**Cố ý KHÔNG đụng `src/db/truy-van.js`.** Sửa cái `continue` ở dòng 259 để `suaTheoId` nhận
`team_id` là mở một cửa rộng cho **cả 15 bảng nghiệp vụ** chỉ để phục vụ một bảng — và mở
đúng cái cửa mà `xacDinhTeamId` sinh ra để đóng. Cửa hẹp riêng là đúng án lệ đang có:
`suaTheoIdPos` (L1-M1) · `ghiDon` (L3-M1) · `CAU_GHI_CHAM` (L3-M2) · `ghiLich` (L3-M3) —
sổ điều hành §9 gọi cái sau cùng là *"cửa hẹp thứ NĂM"*. Đây là **thứ SÁU**, và nó khác bốn
cái kia ở một điểm: bốn cái kia sinh ra vì `suaTheoId` không nhận `ctxHeThong`; cái này sinh
ra vì `suaTheoId` **cố ý** không cho đổi `team_id`, và đó là một quyết định đúng cần giữ.

## ④ Nghiệm thu BẰNG NỘI DUNG (viết TRƯỚC khi code)

```bash
# 1 · con của page đi theo page — không còn dòng mồ côi nào
#     (đã chạy 25/08 trên aicloser_v3: cả bốn câu ra 0 — xem ghi chú dưới khối)
psql "$DATABASE_URL_V3" -tAc "
  SELECT count(*) FROM hoi_thoai h JOIN page p ON p.id = h.page_id
  WHERE h.team_id <> p.team_id;"                                  # kỳ vọng: 0
psql "$DATABASE_URL_V3" -tAc "
  SELECT count(*) FROM kich_ban k JOIN page p ON p.id = k.page_id
  WHERE k.team_id <> p.team_id;"                                  # kỳ vọng: 0
psql "$DATABASE_URL_V3" -tAc "
  SELECT count(*) FROM san_pham s JOIN page p ON p.id = s.page_id
  WHERE s.page_id IS NOT NULL AND s.team_id <> p.team_id;"        # kỳ vọng: 0

# 2 · mọi lượt chuyển đều để lại dấu — số dòng nhật ký = số lượt chuyển
psql "$DATABASE_URL_V3" -tAc "
  SELECT count(*) FROM nhat_ky WHERE hanh_dong = 'chuyen_page_team';"  # kỳ vọng: = số lượt đã gọi

# 3 · chuyển vào team kỹ thuật bị từ chối
node -e "... chuyenPageSangTeam(pool, ctx, {pageId:1, teamDichId:<chua-phan>})"  # kỳ vọng: ném, 0 dòng đổi

# 4 · bộ bài test
node --test test/l0-m2-chuyen-team.test.js                        # kỳ vọng: N passed, 0 failed

# 5 · so_ai nối bằng id FACEBOOK, không phải khoá ngoại — câu join phải viết đúng kiểu
psql "$DATABASE_URL_V3" -tAc "
  SELECT count(*) FROM so_ai a JOIN page p ON p.page_id = a.page_id
  WHERE a.team_id <> p.team_id;"                                  # kỳ vọng: 0
```

Câu 1 là câu quan trọng nhất: **chạy được NGAY BÂY GIỜ, trước khi sửa gì**, và nó phải ra
`0` cả trước lẫn sau. B đã chạy 25/08 trên `aicloser_v3`:

```
hoi_thoai mo coi: 0     kich_ban mo coi: 0     san_pham mo coi: 0     so_ai mo coi: 0
```

Ra `0` vì cả 514 page lẫn 28.953 hội thoại cùng ở team 1 — người gõ SQL tay đã nhớ chuyển
cả hai. Lần sau chưa chắc ai còn nhớ; đó là lý do phiếu này tồn tại.

⚠️ `so_ai` hiện **0 dòng** nên câu ⑤#5 chưa chạm được nhánh thật. Khi bộ nạp Sổ AI chạy
xong (52.036 dòng theo §L0) thì phải chạy lại — chỗ này là chỗ dễ nhầm nhất vì `so_ai` nối
page bằng **id Facebook** chứ không bằng khoá ngoại, nên nó KHÔNG tự hỏng khi join sai kiểu,
nó chỉ ra kết quả rỗng.

## ⑤ Test chạm nhánh nào

Nhánh THẬT phải chạm, không fixture tự dựng:

1. chuyển một page có ≥1 hội thoại → hội thoại đổi team theo
2. chuyển page KHÔNG có con nào → vẫn ghi nhật ký, `daChuyen` toàn 0
3. `teamDichId` = team kỹ thuật → ném, và **đếm lại: 0 dòng nào đổi**
4. `ctx` không thuộc cả team nguồn lẫn team đích → chặn
5. vai không phải `quan-tri` → chặn
6. giao dịch cuộn lại: cho `ghiNhatKy` ném giữa chừng → `page.team_id` **giữ nguyên**
7. `so_ai` của page đó: khẳng định nó **ở lại** team cũ và con số đó có mặt trong `boLai`
   (khoá lại hành vi, để người sau không tưởng là bug)

## ⑥ Ngoài phạm vi

- `suaTheoId` nhận `ctxHeThong` và nhận điều kiện thêm → **`PHIEU-B-Y1`, đang treo**
- `cau_hinh_model` một-bản-khoá-mỗi-nhà → **`PHIEU-B-Y2`, đang treo**
- Nới trigger `tg_chi_insert_so_ai` → **⑧ dưới đây, chờ chốt, KHÔNG tự làm**
- Màn hình gọi hàm này → đất người B (`v3/src/ui/team/`), không phải phiếu này

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -rn 'k === "team_id"' src/db/truy-van.js
src/db/truy-van.js:229:    if (k === "team_id") continue;
src/db/truy-van.js:259:    if (k === "team_id") continue;

$ grep -rniE "chuyenPageSangTeam|chuyen page|doi team cho page" docs/thi-cong/
(khong co ket qua)

$ grep -rn "cửa hẹp thứ" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md:481:  cửa hẹp thứ HAI `src/chat/kho.js` ...
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md:623:  ... — cửa hẹp thứ NĂM sau `suaTheoId` gốc,
```

**Quan hệ: MỚI.** Không trùng phán quyết nào đang treo, không trùng nợ nào. Có **họ hàng**
với N3 (`suaTheoId` hẹp) mà `PHIEU-B-Y1` đang xử, nhưng khác việc: Y1 xin *điều kiện thêm
trong `WHERE`*, phiếu này xin *đổi được chính cột `team_id` trong `SET`, kèm phần con*. Làm
xong Y1 cũng không làm được việc của Y3, và ngược lại.

---

## ⑧ MỘT CÂU CẦN TỔNG/NGƯỜI A CHỐT — cắm ngay, đừng đoán

`[NEEDS CLARIFICATION: so_ai của page được chuyển thì đi hay ở?]`

`so_ai` có trigger `tg_chi_insert_so_ai` **cấm UPDATE**, cấm cả với chủ CSDL. Ba đường:

| | Được gì | Mất gì |
|---|---|---|
| **(a) Để ở lại team cũ** — B nghiêng cách này | Không đụng trigger. Trigger đó là rào thật, nới nó ra là mở cho mọi thứ khác | Số liệu lịch sử của page nằm ở team cũ. Màn "Chi phí AI" của team mới **không thấy** phần chi tiêu trước ngày chuyển |
| (b) Nới trigger cho đúng cột `team_id` | Số liệu đi theo page, báo cáo liền mạch | Bảng "chỉ INSERT" hết còn là "chỉ INSERT" — và đó là một trong hai rào của `01-QUYET-DINH` §9 |
| (c) Cột `team_id_goc` giữ nguyên, thêm cột team hiện tại | Không mất gì | Đổi lược đồ, mọi truy vấn `so_ai` phải biết đọc cột nào |

B **không tự quyết** — (b) tháo một rào mà chính chủ dự án đặt, và (c) đổi lược đồ. Chưa có
câu trả lời thì A làm (a) và ghi rõ số dòng bỏ lại vào `boLai.so_ai`, để nó **hiện ra trên
màn hình** chứ không âm thầm.
