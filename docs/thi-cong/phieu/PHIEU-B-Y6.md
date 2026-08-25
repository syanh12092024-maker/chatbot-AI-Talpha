# PHIẾU B-Y6 — Ba chỗ lược đồ chặn sóng 2: kịch bản tầng trên · lớp 0 đồng · thư viện ảnh

**Base:** `8b9ec7a` · **Làn:** 🟨 (không phải đường tiền. Nhưng mục ③ là **lớp chặn ≥33% lưu
lượng** — không có nó thì mọi lượt chat đều gọi model, và đó là tiền)

> Phiếu do **người B** phát, xin **người A** làm — `db/migrate/` là đất của A.
> Ba mục độc lập nhau, A làm riêng từng mục cũng được.

---

## ① Thi hành đoạn spec nào

- `docs/v3/gd2/00-KE-HOACH-GD2.md` §"Sóng 2 · KỊCH BẢN VÀ NỘI DUNG" — năm màn, và bốn tiêu
  chí nghiệm thu của sóng
- `docs/v3/03-MAN-HINH.md` nhóm 5 — «Kịch bản», «Lớp trả lời 0 đồng», «Thư viện ảnh»
- `docs/v3/01-QUYET-DINH.md` §6 — bốn khối prompt

## ② Ba chỗ chặn, đo được

### ⓐ Cây kịch bản KHÔNG có tầng trên để kế thừa

Kế hoạch: *«Cây ba tầng: sản phẩm → nước → page. Tầng dưới ghi rõ **Kế thừa** khi không có
bản riêng.»*

`kich_ban.page_id` là **`bigint NOT NULL REFERENCES page(id)`** — không lưu được một bản
kịch bản ở tầng sản phẩm hay tầng nước. «Kế thừa từ tầng trên» **không có tầng trên nào**.

Và dữ liệu để nhóm cũng chưa có. Đo 25/08 trên `aicloser_v3`:

```
page.nganh_hang khác rỗng : 0/514        ← tầng SẢN PHẨM trống hoàn toàn
san_pham                  : 0 dòng
page.thi_truong khác rỗng : 140/514      (KSA 34 · UAE 32 · Khác 28 · Kuwait 23 · …)
kich_ban LIVE             : 70/514 page  ← 444 page KHÔNG có kịch bản riêng
```

**B đã dựng cây bằng hai tầng có dữ liệu (nước → page) và nói thẳng tầng sản phẩm đang
trống** — dựng đủ ba tầng trên dữ liệu rỗng thì ra một cây có đúng một nhánh «(chưa phân
loại)», trông như màn hình hỏng và che mất sự thật là dữ liệu chưa có.

**Xin:** cho `kich_ban` lưu được bản ở tầng trên. B đề xuất **nới `page_id` thành NULLABLE**
+ hai cột phạm vi:

```sql
ALTER TABLE kich_ban ALTER COLUMN page_id DROP NOT NULL;
ALTER TABLE kich_ban ADD COLUMN pham_vi text NOT NULL DEFAULT 'page'
  CHECK (pham_vi IN ('page','thi_truong','nganh_hang'));
ALTER TABLE kich_ban ADD COLUMN khoa_pham_vi text;   -- 'KSA' / '<ngành hàng>' / NULL khi pham_vi='page'
-- và một CHECK buộc hai vế khớp nhau:
ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_pham_vi_hop_le CHECK (
  (pham_vi = 'page'        AND page_id IS NOT NULL AND khoa_pham_vi IS NULL) OR
  (pham_vi <> 'page'       AND page_id IS NULL     AND khoa_pham_vi IS NOT NULL));
```

⚠️ `CREATE UNIQUE INDEX kich_ban_live_moi_page ON kich_ban (page_id) WHERE trang_thai='LIVE'`
phải sửa theo — hiện `page_id IS NULL` không bị chỉ mục đó ràng, nên hai bản LIVE cùng phạm
vi thị trường sẽ lọt.

**A muốn hình dạng khác thì cứ đổi** — B chỉ cần **một chỗ lưu được kịch bản không gắn page**,
và một cách hỏi «bản nào áp cho page này» có thứ tự ưu tiên rõ ràng.

### ⓑ «Lớp trả lời 0 đồng» KHÔNG có bảng

Màn cần: các mẫu trả lời miễn phí + đối chiếu bộ từ khoá Botcake. Tiêu chí nghiệm thu sóng 2:
**«Lớp 0 đồng chặn ≥33% lưu lượng»**.

Hôm nay ba trường `fastLanePrice` / `fastLaneShip` / `fastLaneHowto` nằm **trong
`kich_ban.noi_dung_nguoi` (jsonb), theo TỪNG PAGE**. Nghĩa là:

- không có mẫu dùng chung — 514 page là 514 lần gõ lại cùng một câu trả lời phí ship;
- không đo được «chặn bao nhiêu %» vì không có chỗ nào đếm;
- không có chỗ để đối chiếu bộ từ khoá Botcake.

**Xin:** một bảng `mau_0_dong` (tên do A đặt) — `team_id`, `ma`, `ten`, `tu_khoa text[]`,
`noi_dung`, `bat`, và một chỗ đếm số lượt chặn được (hoặc B tự đếm từ `so_ai.loai='reply'`
nếu A cho biết cách phân biệt lượt 0 đồng — **xem ⑧**).

### ⓒ «Thư viện ảnh» KHÔNG có bảng

Màn cần: ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc. **Không có bảng nào** trong 22 bảng
hiện tại giữ ảnh. `so_ai.loai` có giá trị `'image'` nên bot ĐANG gửi ảnh — nhưng nguồn ảnh
nằm ngoài CSDL v3.

**Xin:** A cho biết ảnh hiện lưu ở đâu (B chưa tìm ra), rồi mới bàn bảng. Có thể chỉ cần một
bảng nhãn trỏ tới URL sẵn có, không cần lưu tệp.

## ③ File được đụng (pathspec)

```
db/migrate/009_kich_ban_tang_tren.up.sql   (+ .down.sql)
db/migrate/010_mau_0_dong.up.sql           (+ .down.sql)
src/chat/rap-prompt.js                      ← chỉ nếu ⓐ đổi cách chọn kịch bản
test/l0-m1-luoc-do.test.js                  ← neo số bảng
```

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# ⓐ lưu được kịch bản tầng thị trường, và page KHÔNG có bản riêng thì đọc ra bản đó
psql "$DATABASE_URL_V3" -c "INSERT INTO kich_ban (team_id, pham_vi, khoa_pham_vi, phien_ban,
  trang_thai, noi_dung_nguoi, noi_dung_may) VALUES (1,'thi_truong','KSA',1,'LIVE','{}','x');"
# kỳ vọng: chèn được (hôm nay: ERROR null value in column page_id)

# ⓐ hai bản LIVE cùng phạm vi bị chặn
psql "$DATABASE_URL_V3" -c "…chèn bản LIVE thứ hai cho KSA…"   # kỳ vọng: ERROR unique

# ⓑ bảng mẫu 0 đồng tồn tại và có team_id NOT NULL như mọi bảng nghiệp vụ
psql "$DATABASE_URL_V3" -tAc "SELECT count(*) FROM information_schema.columns
  WHERE table_name='mau_0_dong' AND column_name='team_id' AND is_nullable='NO';"   # kỳ vọng: 1

# ⓐⓑ số bảng nghiệp vụ neo trong tầng truy vấn khớp lược đồ
node --test test/l0-m1-luoc-do.test.js                          # kỳ vọng: N passed
```

## ⑤ Test chạm nhánh nào

1. kịch bản `pham_vi='page'` — hành vi CŨ không đổi (70 bản LIVE hiện có vẫn đọc ra đúng)
2. kịch bản `pham_vi='thi_truong'` — page cùng thị trường mà KHÔNG có bản riêng đọc ra nó
3. page CÓ bản riêng → bản riêng THẮNG bản thị trường
4. hai bản LIVE cùng `(pham_vi, khoa_pham_vi)` → bị chặn ở tầng CSDL
5. `CHECK` phạm vi: `pham_vi='page'` mà `page_id IS NULL` → bị chặn

## ⑥ Ngoài phạm vi

- Màn «Kịch bản» + «Soạn kịch bản» — **B đã làm xong** (`/kich-ban`), chạy trên hai tầng có
  dữ liệu. Không chờ phiếu này.
- Màn «Nhập kịch bản từ Pancake» — **B đã nối** vào bộ bóc sẵn có của v1
  (`src/kb.js#parsePancakeScript`), không cần bảng mới.
- `V3_RAP_PROMPT_BAT` — cờ riêng của A, B không đụng.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "page_id" db/migrate/001_nen.up.sql | grep kich_ban -A1
263:  page_id        bigint      NOT NULL REFERENCES page(id) ON DELETE CASCADE,

$ grep -c "^CREATE TABLE" db/migrate/*.up.sql | paste -sd' '
(22 bảng — không bảng nào cho mẫu 0 đồng hay ảnh)

$ psql -tAc "SELECT count(*) FILTER (WHERE nganh_hang<>''), count(*) FILTER (WHERE thi_truong<>''), count(*) FROM page"
0|140|514

$ grep -rn "mau_0_dong\|thu_vien_anh\|lop_0_dong" db/ src/ docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
(không có kết quả)
```

**Quan hệ: MỚI.** Không trùng nợ nào trong §9. Cùng file `db/migrate/` với `PHIEU-B-Y2` (đã
xong) nhưng khác bảng và khác việc.

---

## ⑧ HAI CÂU CẦN A HOẶC TỔNG CHỐT — cắm ngay, đừng đoán

`[NEEDS CLARIFICATION: ảnh của bot hiện lưu ở đâu?]`
`so_ai.loai` có giá trị `'image'` nên bot ĐANG gửi ảnh, nhưng B không tìm ra nguồn ảnh trong
22 bảng. Biết chỗ đó rồi mới bàn được «thư viện ảnh» cần bảng gì — có thể chỉ cần một bảng
nhãn trỏ tới URL sẵn có.

`[NEEDS CLARIFICATION: đếm «lớp 0 đồng chặn bao nhiêu %» bằng cột nào?]`
Tiêu chí sóng 2 đòi **≥33%**. `so_ai.loai` có `'spent_no_send'` và `'yielded'`, `so_ai.lane`
có vẻ là chỗ phân làn — nhưng B chưa rõ lượt nào là «trả lời bằng mẫu 0 đồng, không gọi
model». Không có câu này thì con số 33% không đo được, mà một tiêu chí không đo được thì
không phải tiêu chí.
