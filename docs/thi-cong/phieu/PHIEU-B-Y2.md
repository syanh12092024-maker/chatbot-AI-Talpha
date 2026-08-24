# PHIẾU B-Y2 — Khoá API lưu MỘT bản cho mỗi nhà, không lưu theo từng ô model

**Base:** `474c57c` · **Làn:** 🟨 (máy phán lại — lược đồ thuần + bộ ghi, không đụng đường tiền)

> Phiếu do **người B** phát, xin **người A** làm — `db/migrate/` và `db/khoa.js` là đất của A.
> Việc nhỏ, nhưng bỏ qua thì đẻ ra một lỗi **im lặng**: đổi khoá xong bot chết nửa mà không
> báo gì.

---

## ① Thi hành đoạn spec nào

- `docs/v3/01-QUYET-DINH.md` §7 — *«Bốn nhà: Claude · OpenAI · DeepSeek · Kimi. **Mỗi team
  nhập khoá riêng và chọn model riêng**»* — khoá gắn với **nhà**, model gắn với **ô**
- `docs/v3/ban-giao/luoc-do-v1.md` §4.5 — bao thư `v1.<iv>.<tag>.<ct>`, `db/khoa.js`
- `v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md` mục **C2**

## ② Hợp đồng vào/ra

**Vào — A đo lại:**

`db/migrate/001_nen.up.sql:52` dựng `cau_hinh_model` **ba dòng một team**
(`UNIQUE (team_id, vai_tro)`, `vai_tro ∈ chinh|du_phong|nen`), và **`khoa_api_ma` nằm trên
từng dòng vai trò**.

**Chỗ hỏng:** khoá API thuộc về **nhà cung cấp**, không thuộc về **vai trò**. Một team hoàn
toàn có thể xếp:

```
vai_tro=chinh     nha_cung_cap=kimi     ma_model=kimi-k2.6    khoa_api_ma=<khoá Kimi>
vai_tro=nen       nha_cung_cap=kimi     ma_model=kimi-k2.5    khoa_api_ma=<khoá Kimi>  ← BẢN THỨ HAI
vai_tro=du_phong  nha_cung_cap=claude   ma_model=claude-haiku-4.5  khoa_api_ma=<khoá Claude>
```

**Cùng một khoá Kimi lưu hai bản.** Ngày đổi khoá (hết hạn, rò rỉ, đổi tài khoản) mà chỉ sửa
ô «chính» thì ô «nền» giữ khoá cũ. Hậu quả: **chat với khách vẫn chạy, việc nền chết** — mổ
hội thoại, đề xuất kịch bản, chạy đêm đều im. Không dòng lỗi nào nói «bạn quên một bản khoá»;
triệu chứng chỉ là báo cáo trống dần.

Cùng loại lỗi với `NHOM_HUY_HOAN` ở §9 VA-R2 — *«bản khai thứ hai cùng giá trị»* — và đã có
án lệ ở dự án này rồi.

**Ra:**

Khoá lưu **một bản cho mỗi (team × nhà)**. Hai cách, A chọn:

- **(a) Bảng thứ 22 `khoa_nha`** — `team_id · nha_cung_cap · khoa_api_ma · sua_luc`,
  `UNIQUE (team_id, nha_cung_cap)`. `cau_hinh_model` **bỏ cột `khoa_api_ma`**, chỉ còn
  `vai_tro · nha_cung_cap · ma_model · do_ngau_nhien · bat`. Sạch nhất.
- **(b) Giữ nguyên lược đồ, thêm rào** — `CHECK`/trigger bắt hai dòng cùng `(team_id,
  nha_cung_cap)` phải cùng `khoa_api_ma`. Rẻ hơn, nhưng vẫn hai bản, chỉ là không lệch được.

**B đề xuất (a).** Cột `khoa_api_ma` hiện `NULL` ở mọi dòng (chưa ai nhập khoá — `.env` còn
thiếu `V3_KHOA_MA_HOA`, xem §9 sổ), nên **di trú lúc này giá bằng không**. Để tới lúc ba team
đã nhập khoá thật rồi mới đổi thì phải viết bộ di trú có giải mã — đắt hơn nhiều.

Kèm theo: `ghiCauHinhModel()` nhận `{ nha, khoa }` thay vì `{ vaiTro, khoa }`.

## ③ File được đụng (pathspec)

```
db/migrate/008_khoa_theo_nha.up.sql
db/migrate/008_khoa_theo_nha.down.sql
db/schema.sql
db/khoa.js
src/db/index.js
test/l0-m1-luoc-do.test.js
docs/v3/ban-giao/luoc-do-v1.md
```

Ngoài danh sách = ngoài phạm vi → §9 sổ nợ.

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# 1 · migration lên/xuống sạch trên CSDL trắng
npm run migrate                                  # kỳ vọng: 001→008 áp trọn, rc=0
#    down 008 → up 008 lại: lược đồ khớp byte-for-byte

# 2 · KHÔNG còn cách nào lưu hai bản khoá cho cùng một nhà
psql -c "SELECT team_id, nha_cung_cap, count(DISTINCT khoa_api_ma)
         FROM cau_hinh_model JOIN khoa_nha USING (team_id, nha_cung_cap)
         GROUP BY 1,2 HAVING count(DISTINCT khoa_api_ma) > 1"
#    kỳ vọng: 0 dòng

# 3 · rào cũ còn nguyên: khoá chưa mã hoá bị CSDL từ chối
#    INSERT khoa_api_ma='sk-tran-trui'  → kỳ vọng: CHECK vi phạm (LIKE 'v1.%')

# 4 · đổi khoá MỘT LẦN là đủ cho mọi ô dùng nhà đó
#    team có chinh=kimi-k2.6 và nen=kimi-k2.5 → ghi khoá Kimi mới một lần
#    → cả hai ô đọc ra khoá mới. kỳ vọng: 2/2 ô khớp

# 5 · toàn bộ suite lược đồ hiện có
node --env-file=.env --test test/l0-m1-luoc-do.test.js   # kỳ vọng: không tụt số pass
bash ops/bin/nghiem-thu/l0-m1.sh                          # kỳ vọng: rc=0
```

## ⑤ Test chạm nhánh nào

Nhánh thật: CSDL sandbox thật (`db/sandbox.js`), khoá đi qua `db/khoa.js` thật (mã hoá +
giải mã round-trip), **không** giả bao thư bằng chuỗi `'v1.xxx'` viết tay.

## ⑥ Ngoài phạm vi

- **Không** đụng `v3/src/model/*` — đó là đất B. B tự sửa `cau-hinh.js` sau khi A xong.
- **Không** gộp việc thống nhất `V3_KHOA_CHU`(B) ↔ `V3_KHOA_MA_HOA`(A) vào đây — **B tự bỏ
  bản của mình**, dùng `db/khoa.js` của A. Ghi ở phiếu này để A biết, không phải việc của A.
- `do_ngau_nhien` `CHECK BETWEEN 0 AND 2` rộng hơn `[0,1]` của B → **B nới theo A**, không xin đổi.

## ⑦ ĐÃ TRA CHƯA — OUTPUT MÁY

```
$ grep -rn "khoa_api_ma\|V3_KHOA_MA_HOA" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md docs/v3/ban-giao/
SO-DIEU-HANH-THI-CONG.md:338:  22/08 · thợ L0-M1: `.env` chưa có `V3_KHOA_MA_HOA` (khoá 32 byte để mã hoá
SO-DIEU-HANH-THI-CONG.md:339:  `cau_hinh_model.khoa_api_ma`). Bộ ghi fail-CLOSED khi thiếu, nên người B ở L1-M4 sẽ
SO-DIEU-HANH-THI-CONG.md:394:  KHÔNG export, nên `npm run di-tru` chết ở dòng đầu («Thiếu V3_KHOA_MA_HOA») dù
SO-DIEU-HANH-THI-CONG.md:757:  🟨 2 chốt: `V3_KHOA_CHU`(B) trùng việc `V3_KHOA_MA_HOA`(A) — bao thư jsonb của
ban-giao/luoc-do-v1.md:  §4.5 `cau_hinh_model.khoa_api_ma` lưu bao thư `v1.<iv>.<tag>.<ct>`
```

**Quan hệ: MỚI.** Sổ nợ có nhắc `khoa_api_ma` nhưng **chỉ về chuyện `.env` thiếu biến**
(việc NGƯỜI), **chưa ai nêu chuyện khoá bị lưu hai bản**. Không trùng phán quyết cũ, không
trùng nợ cũ.

---

## Vì sao đáng làm ngay

Cột `khoa_api_ma` đang **`NULL` ở mọi dòng** — chưa ai nhập khoá thật. Đổi lược đồ lúc này
**không phải di trú dữ liệu**, chỉ là đổi hình. Đợi tới lúc ba team đã nhập khoá rồi mới đổi
thì phải viết bộ di trú biết giải mã và mã hoá lại — đắt hơn nhiều mà chẳng được gì thêm.
