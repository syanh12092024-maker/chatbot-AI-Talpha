# BÀN GIAO — LƯỢC ĐỒ v1 (điểm bàn giao 1 & 3 cho người B)

> Phiếu **L0-M1** · dựng 22/08/2026 · nguồn sự thật của file này là
> `db/migrate/001_nen.up.sql` (bản hợp nhất sinh ra ở `db/schema.sql`).
> Số nào ở đây cũng đo lại được bằng `bash ops/bin/nghiem-thu/l0-m1.sh`.

## 0 · Chạy thế nào

```bash
npm run migrate                 # áp mọi bản chưa áp, ghi vào bảng _migrations
node db/migrate.js trang-thai   # bản nào đã áp
node db/migrate.js down         # gỡ bản mới nhất  (thêm --het để gỡ hết)
node db/migrate.js schema       # sinh lại db/schema.sql từ db/migrate/*.up.sql
npm run di-tru                  # đọc JSON thật ở gốc repo → ghi CSDL (chạy lại được)
```

CSDL: `DATABASE_URL_V3` trong `.env` — container `talpha-pg`, cổng **5433**, DB `aicloser_v3`.
⛔ Cổng 5544 / 5434 là CSDL của dự án khác trên cùng máy. `db/ket-noi.js` **không** rơi về
`DATABASE_URL` hay localhost mặc định — thiếu biến là ném lỗi.

⛔ `db/schema.sql` là bản **SINH RA**, cấm sửa tay. Đổi lược đồ = thêm một bản
`db/migrate/NNN_*.up.sql|.down.sql` rồi chạy `node db/migrate.js schema`. Ca `S11` đỏ nếu
hai bên trôi khỏi nhau.

## 1 · HAI CÂU HỢP ĐỒNG BẮT BUỘC (đọc trước khi viết truy vấn đầu tiên)

**(i) Màn chọn team CHỈ được hiện team nghiệp vụ:**

```sql
SELECT id, slug, ten FROM team WHERE NOT la_ky_thuat ORDER BY ten;
```

⛔ Cấm hiện `chua-phan` cho người dùng. Nó là **team KỸ THUẬT** — chỗ đậu của toàn bộ dữ
liệu di trú chưa chốt chủ (502 page · 18.790 hội thoại · 69 bản kịch bản). Một Quản trị
chọn được nó là nhìn thấy khách của cả ba team cùng lúc. CSDL đã có rào (trigger cấm gán
thành viên vào team kỹ thuật, và cấm lật cờ kỹ thuật cho team đang có người), nhưng picker
mù vẫn là một đường rò ở tầng màn hình.

**(ii) `bo_luat_chung` đọc bằng hai vế, mọi bảng khác đọc một vế:**

```sql
-- CHỈ bảng bo_luat_chung:
WHERE (team_id = $ctx OR team_id IS NULL)      -- NULL = bộ luật của TOÀN HỆ
-- MỌI bảng nghiệp vụ khác:
WHERE team_id = $ctx
```

Quên vế `IS NULL` thì khối prompt 2.256 token dùng chung 51 page **tàng hình với mọi team**,
và nghiệm thu «thiếu bối cảnh → ném lỗi» của L0-M2 vẫn xanh. Ca `S6` giữ bằng chứng:
`tieu-alpha` thấy 2 dòng · `auus`/`pialpha-eu` thấy 1 dòng · luật một-vế thấy **0**.

## 2 · 19 bảng + `_migrations`

Ba bảng **dùng chung, KHÔNG mang `team_id`**: `team` · `nguoi_dung` · `vai`.
Mọi bảng còn lại có `team_id NOT NULL`; **ngoại lệ duy nhất** là `bo_luat_chung` (NULLABLE).

| Bảng                 | Giữ gì                           | Cột đáng chú ý                                                                                          |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `team`               | 4 dòng: 3 nghiệp vụ + 1 kỹ thuật | `slug` · **`la_ky_thuat`**                                                                              |
| `nguoi_dung`         | người                            | `email` UNIQUE · `mat_khau_hash` (B chốt cách băm ở L0-M3, NULL = chưa đặt)                             |
| `vai`                | 5 vai của 01 §9                  | `ma`: `quan-tri`·`marketer`·`sale`·`quan-ly`·`duyet-kich-ban`                                           |
| `thanh_vien_team`    | ai thuộc team nào, vai gì        | UNIQUE (team, người, vai) · **trigger chặn team kỹ thuật**                                              |
| `cau_hinh_model`     | model + khoá từng team           | `vai_tro` ∈ chinh/du_phong/nen · **`khoa_api_ma` MÃ HOÁ** · `do_ngau_nhien`                             |
| `page`               | sổ cái page                      | `page_id` (id FB, UNIQUE) · **`bot_ai_bat`** · `botcake_tat` · `trong_diem` · `the_pancake` · `mat_dau` |
| `san_pham` `goi_gia` | danh mục                         | **chưa nạp ở L0-M1** — nguồn là POS (L1-M1)                                                             |
| `khach`              | hồ sơ khách                      | `so_dien_thoai` **NULL được**, UNIQUE trong team khi có giá trị · `ti_le_hoan`                          |
| `hoi_thoai`          | trạng thái hội thoại             | UNIQUE (page, psid) · `khach_id` **nullable** · `moc_luot_llm` (sổ ngân sách 24h)                       |
| `so_ai`              | mọi hành động bot                | **CHỈ INSERT** · `ma_model` NOT NULL · `nguon_tep`+`nguon_dong` (neo idempotent)                        |
| `don_hang`           | đơn                              | **`nguon`** ∈ trang_ban_hang/messenger · `trang_thai_he` **tách** `trang_thai_pos`                      |
| `viec_can_xu_ly`     | hàng chờ sale                    | `ly_do_day` · `han_luc` (mốc 10′) · `ket_qua`/`ly_do_dong`/`chi_phi`                                    |
| `hang_cho_tao_don`   | đơn bot chốt chờ duyệt           | `cua_kiem` jsonb (kết quả 4 cửa chống trùng)                                                            |
| `kich_ban`           | kịch bản mọi tầng                | UNIQUE (page, phiên bản) · **`noi_dung_nguoi`** + **`noi_dung_may`** · nhiều nhất 1 LIVE/page           |
| `bo_luat_chung`      | tầng prompt chung                | **`team_id` NULLABLE** — xem hợp đồng (ii)                                                              |
| `ky_nang`            | tầng kỹ năng                     | `bat_cho_nhom_sp text[]`                                                                                |
| `lich_nhac`          | hàng đợi hẹn giờ                 | `hen_luc` · `lan_thu` 1..5 · `trang_thai` cho/da_gui/da_huy                                             |
| `nhat_ky`            | ai đổi gì lúc nào                | **CHỈ INSERT** · `tac_nhan` `'nguoi:<email>'` \| `'may:<job>'` · `truoc`/`sau` jsonb                    |

## 3 · Hình dạng `viec_can_xu_ly` — điểm bàn giao 3 (A ghi, B đọc)

```
id · team_id · loai('hoi_thoai'|'don_hang') · hoi_thoai_id · don_hang_id
ly_do_day (lý do BOT đẩy sang — hiện nguyên văn trên mỗi dòng màn sale)
day_luc · han_luc (mốc 10 phút; quá hạn = báo động)
nguoi_nhan_id · nhan_luc
ket_qua · ly_do_dong · chi_phi · dong_luc
```

CHECK ràng: `loai='hoi_thoai'` bắt buộc có `hoi_thoai_id`, `loai='don_hang'` bắt buộc có
`don_hang_id`. Việc đang mở = `dong_luc IS NULL` (đã có index bộ phận theo `han_luc`).

## 4 · Phán đã chốt ở phiếu này — đừng lật, muốn đổi thì mở phiếu

1. **`chua-phan` là team THẬT có cờ `la_ky_thuat`**, không phải `team_id NULL`. Giữ được
   `NOT NULL` ở mọi bảng nghiệp vụ; rào nằm ở tầng CSDL, không phải quy ước trong code.
2. **`page.bot_ai_bat` chỉ có MỘT nguồn: `ai-enabled.json`.** Không suy ra từ trường nào của
   `pages.json` (đo 22/08: `pages.json` không có bất kỳ khoá nào dạng ai/bot/enabled). Bộ nạp
   đặt cả HAI vế trong một lượt (bật đúng tập, tắt phần ngoài tập).
3. **`kich_ban` giữ hai bản.** `noi_dung_nguoi` = đúng 6 trường marketer viết/sửa
   (`tone` `greeting` `salesPrompt` `fastLanePrice` `fastLaneShip` `fastLaneHowto`).
   `noi_dung_may` = khối chữ nạp vào system prompt, ghép theo `src/prompts.js:99-101` từ ba
   trường `tone`/`greeting`/`salesPrompt` — **`fastLane*` KHÔNG vào prompt** (chúng là câu mẫu
   bắn thẳng cho khách).
4. **`so_ai.ma_model` NOT NULL.** `logAi` của bản đang chạy chưa ghi model, nên bộ nạp Sổ AI
   đòi người chạy KHAI mã model cũ (`--ma-model-cu=`) và **ném lỗi kèm số dòng** nếu thiếu —
   cấm đoán hộ, sổ có cả giai đoạn chạy Claude lẫn Kimi.
5. **`cau_hinh_model.khoa_api_ma` lưu bao thư `v1.<iv>.<tag>.<ct>`** (AES-256-GCM,
   `db/khoa.js`). Khoá gốc đọc từ biến môi trường **`V3_KHOA_MA_HOA`** (32 byte hex/base64);
   thiếu là ném lỗi, không có khoá mặc định trong mã nguồn. ⚠️ Biến này **chưa có trong
   `.env`** — việc NGƯỜI, đã ghi §9 sổ. CHECK ở tầng CSDL chặn mọi giá trị không mở đầu `v1.`.
   Ghi bằng `ghiCauHinhModel()`, đừng tự viết câu INSERT khác.
6. **`san_pham`/`goi_gia` để trống ở L0-M1** — 02 khai nguồn là POS, thuộc L1-M1.

## 5 · Số di trú (đo 22/08/2026 trên cây `f967076`, máy dev)

| Nguồn                                    |                                                                   Vế nguồn |                                           Vế đích |
| ---------------------------------------- | -------------------------------------------------------------------------: | ------------------------------------------------: |
| `pages.json`                             |                                                                   502 page |                                  `page` = **502** |
| `ai-enabled.json`                        |                                                                 47 page_id |           `page.bot_ai_bat` = **46** (1 page lạc) |
| `conv-state.json`                        |                          18.790 khoá hợp khuôn (+33 khoá rác của bộ ca cũ) |                          `hoi_thoai` = **18.790** |
| `script-versions/` + `kb-overrides.json` | 70 tệp = 71 bản · 73 mục kb (70 mục trùng bản LIVE, 3 mục chỉ có sản phẩm) |     `kich_ban` = **69** (71 − 2 bản của page lạc) |
| `ai-messages.jsonl`                      |                                                            chỉ có trên VPS | **hoãn tới cutover** — nợ §9, không tính đạt ở R0 |

**Ba page LẠC** (có dữ liệu nhưng KHÔNG có trong `pages.json`, nên không có dòng `page`):
`1125576063976794` · `1220547807799752` · `1100561323151723`. Đã ghi §9 sổ điều hành.
Tệp nguồn không bị đụng — không mất gì, chỉ là chưa nạp được.

Toàn bộ dữ liệu di trú nằm ở team `chua-phan`. **Chờ H7** (§8 sổ) chốt mapping
page/sản phẩm/thị trường ↔ 3 team rồi UPDATE chuyển. ⛔ Không đoán team theo thị trường.

## 6 · Dặn L0-M2 (chống nghiệm thu ĐẠT RỖNG)

Nghiệm thu «đăng nhập Tiểu Alpha không thấy dữ liệu team khác» **đo trên dữ liệu di trú là
đo trên tập rỗng** — 100% dữ liệu đang ở `chua-phan`, không có dòng nào của `tieu-alpha` hay
`auus` để mà rò. Bộ ca L0-M2 phải tự chèn mẩu dữ liệu trộn ≥2 team nghiệp vụ rồi mới đo cách
ly, và phải có ca hợp đồng `bo_luat_chung` như mục 1(ii).

---

## 7 · THAY ĐỔI — bản 002 (phiếu L1-M1, 22/08/2026)

### 7.1 · Bảng thứ 20: `ket_noi_pos` (migration `002_ket_noi_pos`)

19 bảng của 001 **không có chỗ chứa kết nối POS theo team**, trong khi
`01-QUYET-DINH.md` §8 đòi «mỗi team có kết nối POS riêng». Khoá POS thật đang nằm ở
tệp phẳng `pancake-shops.json` (7 dòng `{market, shop_id, api_key}`) — không mang team,
không mã hoá.

| Cột                | Ghi chú                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `team_id NOT NULL` | như mọi bảng nghiệp vụ                                               |
| `market`           | tên thị trường đúng như `pancake-shops.json` — **khoá gọi cửa POS**  |
| `shop_id`          | id shop POS (text)                                                   |
| `api_key_ma`       | **MÃ HOÁ** `v1.<iv>.<tag>.<ct>` — CHECK `LIKE 'v1.%'` ở tầng CSDL    |
| `bat`              | tắt một kết nối mà không xoá dòng                                    |

UNIQUE `(team_id, market)` và `(team_id, shop_id)`.

⛔ **Bảng này KHÔNG vào `BANG_NGHIEP_VU_CHUAN`** của tầng truy vấn (vẫn 15 tên). Nó chứa
bí mật, nên có bộ đọc/ghi riêng — `src/pos/ket-noi.js` + `db/di-tru/ket-noi-pos.js` —
đúng án lệ `ghiCauHinhModel` của L0-M1. Đừng mở nó ra cho một hàm `SELECT *` dùng chung.

Di trú: `npm run di-tru` nạp 7 thị trường vào team `chua-phan` (chờ H7, ⛔ không đoán
team theo thị trường). Chạy lại được và **ổn định**: chỉ ghi đè khi khoá nguồn thật sự
khác (bao thư AES-GCM có IV ngẫu nhiên — UPDATE mù thì lượt nào cột cũng đổi giá trị).

> 🔴 **Nợ kèm theo:** `test/l0-m1-luoc-do.test.js` (S1 dòng 63, S12 dòng 321) và
> `ops/bin/nghiem-thu/l0-m1.sh` (phép ②) neo cứng con số **19**, nên chúng ĐỎ kể từ
> bản 002. Sửa = 19 → 20 + thêm `ket_noi_pos` vào `NEO_19_BANG`. Ngoài pathspec L1-M1,
> đã ghi §9 sổ điều hành.

### 7.2 · Bảng mã trạng thái đơn POS — ĐO ĐƯỢC, không đoán

Nguồn sự thật trong code: `src/pos/ma-trang-thai.js`. Đo 22/08/2026 trên **7/7 shop
thật**, 3.546 đơn, bằng chính trường `status_name` mà API POS trả kèm mỗi đơn — không
mã nào ra hai nhãn khác nhau.

| Mã  | Nhãn máy         | Mã  | Nhãn máy         |
| --- | ---------------- | --- | ---------------- |
| 0   | `new` (Chờ xác nhận) | 8   | `packing`     |
| 1   | `submitted`      | 9   | `pending`        |
| 2   | `shipped`        | 11  | `waitting`       |
| 3   | `delivered`      | 12  | `wait_print` (**Chờ in**) |
| 4   | `returning`      | 16  | `received_money` |
| 5   | `returned`       | 19  | (API trả nhãn `null`, 1 đơn) |
| 6   | `canceled`       | 20  | `ordered`        |
| 7   | `removed`        | 13  | **chưa xác minh** — có trong `status_history` nhưng 0 đơn đang đứng ở đó |

⚠️ **`docs/TONG-QUAN-HE-THONG.md` §7.5 và `src/pancake-orders.js:13` khai SAI**: nhóm
hủy/hoàn ở đó là `{4,5,6,7,8}`, nhưng **8 = `packing` (đang đóng gói)**, một bước TIẾN.
Bằng chứng — `status_history` đơn 47397 (UAE): `0 → 1 → 12 → 8`; đồ thị chuyển đo trên
1.400 đơn: `12→8` = 986 lượt, `8→9` = 537, `8→2` = 394. Nhóm đúng là **{4,5,6,7}**.
Đã ghi §9 sổ (không sửa bản đang chạy trong phiếu này).

**Bảng chuyển CHO PHÉP** của `ghiNguocTrangThai` chỉ có hai cặp: `0→12` (xác nhận xong
→ Chờ in, 01 §1) và `12→0` (trả về). Deny-by-default; ⛔ không bao giờ có đường tới
`7 = removed`. 🔎 Chiều `12→0` **chưa có bằng chứng ngoài đời** — 0 lượt trong 1.400 đơn
(chiều lùi POS đang dùng là `12→1`, 47 lượt); diễn tập VPS phải trả lời câu đó.

### 7.3 · Ba cột `don_hang` do cửa POS ghi

- `ma_pos` = **`"<shop_id>:<id đơn POS>"`**, KHÔNG phải id trần. Id đơn POS là dãy riêng
  từng shop, cùng đếm từ 1 (đo 22/08: Saudi 62.029 · UAE 47.421 · Kuwait 13.922 ·
  Taiwan 344) — id trần là hai shop tranh nhau một dòng dưới UNIQUE `(team_id, ma_pos)`.
- `nguon`: có `conversation_id` đúng khuôn `<page_id_fb>_<psid>` ⇒ `messenger`; vắng ⇒
  `trang_ban_hang`; **có mà sai khuôn ⇒ không suy được, LIỆT KÊ ra, cấm đoán**. Khuôn
  này khớp đúng khoá `conv-state.json` mà L0-M1 đã nạp, nên nối được thẳng
  `don_hang.hoi_thoai_id`. Phân bố đo trên 2.100 đơn mới nhất: 75,9% có · 24,1% không.
  Ghi MỘT LẦN lúc tạo, lượt sau lệch thì BÁO chứ không tự sửa (L3 rẽ nhánh theo cột này).
- `trang_thai_pos` = mã số POS dạng text, refresh mỗi lượt đọc. `trang_thai_he` cửa POS
  **chỉ gieo `'moi_tu_pos'` lúc tạo** rồi không đụng lại — chủ cột là L3-M1.
- `tong_tien` để **NULL** (fail-CLOSED): POS trả tiền ở đơn vị nhỏ với hệ số khác nhau
  theo tệ (×100 vs ×1000), mà cột là `numeric(14,2)` — chia cho 1.000 là làm tròn mất
  chữ số thứ ba của KWD/OMR/BHD. Quy ước quy đổi phải khai MỘT chỗ cho cả hệ (nợ §9).
  `tien_te` thì có ghi (nhãn, an toàn).

### 7.4 · `san_pham` / `goi_gia` — POS chỉ cấp được một nửa

`docDanhMuc` đóng chỗ hở 01 §12 («suy sản phẩm ngược từ 25 đơn», «tên sản phẩm trống»):
đọc thẳng `GET /shops/<shop>/products/variations` → tên + **tồn kho thật**.
`san_pham.ma` = `"<shop_id>:<variation_id>"`, `ton_kho` giữ nguyên cả số **âm**.

⚠️ **`goi_gia` ra 0 dòng** — `retail_price` = 0 trên **128/128** biến thể mẫu của 3 shop.
Danh mục POS của các shop này KHÔNG mang giá; giá thật sống trong từng đơn
(`cod` = `shipping_fee`). Bộ nạp cố ý KHÔNG ghi dòng giá 0: một bảng giá toàn số 0 nguy
hơn một bảng giá trống, vì nó trông như đã có.

---

## 8 · THAY ĐỔI — bản 004 (phiếu L3-M1, 22/08/2026)

### 8.1 · Hai cột mới trên `don_hang` (migration `004_trang_thai_don`)

**Đo trước khi thêm** (CSDL dev `aicloser_v3`, 26 đơn thật): `don_hang` có ĐÚNG **14
cột**, không cột nào chứa nổi «vì sao đơn này không gửi được WhatsApp» hay «đã thử mấy
lần», và không có cột jsonb để mượn tạm.

| Cột | Ghi chú |
| --- | --- |
| `ly_do_khong_gui text` | `CHECK IN ('thieu_so_wa','mau_chua_duyet','loi_kenh')` — ba lý do nghiệm thu của 02 §L3 |
| `so_lan_thu_wa int NOT NULL 0` | `CHECK >= 0` — số lượt ĐÃ THỬ gửi; chạm trần thì đơn sang `cho_sale` |

Cộng một **bất biến ĐÔI** ở tầng CSDL: `CHECK (ly_do_khong_gui IS NULL OR
trang_thai_he = 'gui_wa_loi')` — lý do cũ không đeo bám sau khi đơn rời trạng thái thất
bại; thiếu ràng buộc này thì mọi phép đếm theo lý do đọc ra số CAO HƠN sự thật.

Vì sao KHÔNG dùng cột có sẵn: nhét lý do vào `trang_thai_he` là hỏng chính cột máy trạng
thái rẽ nhánh (và hỏng index `don_hang_nguon`); nhét vào `nhat_ky` thì phép đếm «3 lý do
1/1/1» phải `DISTINCT ON` trên một bảng chỉ-INSERT, còn số lần thử không có chỗ đứng.

⛔ Số bản **004 do TỔNG cấp** (003 là của phiếu L2-M1 chạy song song — án lệ khe/trùng số
migration). Bản này CHỈ `ALTER TABLE don_hang`, không đụng bảng nào của 003.

### 8.2 · Chủ cột `trang_thai_he` từ đây là L3-M1

Cửa POS gieo `'moi_tu_pos'` một lần lúc tạo dòng rồi không đụng lại (§7.3 vẫn đúng). Mọi
giá trị khác của cột này do máy trạng thái đơn đặt, theo bảng chuyển khai cứng per-nguồn
ở [`./may-trang-thai-don-v1.md`](./may-trang-thai-don-v1.md).

> 🔴 **Nợ kèm theo:** `db/schema.sql` phải được sinh lại (`node db/migrate.js schema`)
> **một lượt duy nhất sau khi CẢ 003 lẫn 004 đã gộp** — phiếu L3-M1 cố ý KHÔNG commit
> file đó, vì regen trong lúc 003 còn nằm ngoài git là kéo migration của thợ khác vào
> commit của mình. Ca `S11` của `test/l0-m1-luoc-do.test.js` đã ĐỎ từ TRƯỚC lượt này
> (đo: gỡ 004 ra khỏi cây thì S11 vẫn đỏ — nguyên nhân là 003). Đã ghi §9 sổ điều hành.

---

## 9 · THAY ĐỔI — bản 003 (phiếu L2-M1, 22/08/2026)

> Mục này viết SAU §8 (bản 004) chỉ vì thứ tự nộp, không phải thứ tự áp. Thứ tự áp vẫn là
> 001 → 002 → 003 → 004; `node db/migrate.js trang-thai` là nguồn sự thật.

### 9.1 · Bảng thứ 21: `tin_cho_xu_ly` (migration `003_tin_cho_xu_ly`)

20 bảng của 001+002 **không có chỗ nhớ «tin này đã xử chưa»**. Bản đang chạy xử lý tin
NGAY TRONG vòng poll (`pancake-poll.js` → `handleIncoming` → `pkSendReply`), nên trạng
thái của một tin chỉ sống trong RAM: tiến trình chết giữa lượt là tin biến mất không dấu
vết, và một lượt model chậm giữ luôn slot của vòng poll. `02-KE-HOACH-CODE.md` §L2 đòi
tách hai việc — **poll chỉ NẠP, worker mới XỬ LÝ** — bảng này là chỗ nối.

| Cột                     | Ghi chú                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `team_id NOT NULL`      | như mọi bảng nghiệp vụ; lấy từ `page.team_id` lúc NẠP, worker không suy lại |
| `page_id`               | **id Facebook dạng TEXT** (khoá cửa Messenger v3 nhận), KHÔNG phải `page.id` bigint · cố ý KHÔNG có FK |
| `psid` · `conv_id`      | GIỮ CẢ HAI — `psid` để tra `hoi_thoai`, `conv_id` để gọi API (cua-messenger §2) |
| `msg_id` · `noi_dung`   | neo chống trùng + cụm tin khách đã gộp                                    |
| `trang_thai`            | `cho`\|`dang_xu`\|`xong`\|`loi`\|**`chan_guard`** — CHECK ở tầng CSDL      |
| `so_lan_thu`            | +1 mỗi lượt worker RÚT được; trần ở `src/queue/worker.js`                 |
| `khoa_worker` · `ly_do` | ai đang giữ · VÌ SAO đứng ở trạng thái đó                                 |

UNIQUE `(page_id, conv_id, msg_id)` — vòng poll 6 giây/lần trả lại y nguyên tin cũ; thiếu
rào này là mỗi vòng đẻ một bản sao ⇒ khách nhận n câu trả lời. Index bộ phận
`WHERE trang_thai='cho'` vì 99% dòng nằm ở `xong` sau vài phút.

⛔ **Không vào `BANG_NGHIEP_VU_CHUAN`** (vẫn 15 tên): worker rút việc bằng
`FOR UPDATE SKIP LOCKED` **CỘNG** `pg_try_advisory_xact_lock(hashtext(conv_id))` — hai thứ
mà `layNhieu/suaTheoId` không diễn đạt được. Bộ đọc/ghi riêng ở `src/queue/kho.js` (luôn
kẹp `team_id`, không có hàm xoá) — cùng tiền lệ `ket_noi_pos` (§7.1) và `ghiCauHinhModel`.

**`chan_guard` là trạng thái RIÊNG, không gộp vào `loi`** — quyết định về TIỀN: lượt gọi
model chạy TRƯỚC lượt gửi, nên thử lại một tin bị cửa chặn là đốt thêm token cho một tin
chắc chắn không gửi được. Chi tiết + cách gỡ thủ công: `duong-tin-v1.md` §2.

### 9.2 · `so_ai` — thêm một cách dùng neo idempotent (không đổi lược đồ)

`so_ai` giữ nguyên cột. Đường RUNTIME (handler v3) dùng neo:
`nguon_tep = 'tin_cho_xu_ly:<loại>'` · `nguon_dong = <id dòng tin>` — tách theo LOẠI vì
`UNIQUE (nguon_tep, nguon_dong)` chỉ cho một dòng mỗi cặp, mà một lượt xử lý sinh tới 4 sự
kiện. Bộ nạp JSONL của L0-M1 vẫn dùng neo «tệp + số dòng» như cũ; hai họ neo không đụng
nhau. ⚠️ `nguon_dong` là `int` ⇒ trần 2,1 tỉ dòng hàng đợi (xa, nhưng có thật).

`ma_model` cho lượt **không gọi model** (Fast Lane, 0 token) khai nhãn vắng mặt
`'khong-goi-model'` — xem `duong-tin-v1.md` §7 về vì sao KHÔNG ghi mã model đang cấu hình.

### 9.3 · Cửa hẹp thứ HAI ghi `hoi_thoai` — nợ N3 lặp lại

`src/chat/kho.js` (`suaHoiThoai` · `baoDamHoiThoai` · `docHoiThoaiTheoPageText`) tồn tại
đúng vì lý do của `src/pos/kho.js`: `suaTheoId` không nhận `ctxHeThong()`, mà worker là job
nền và dữ liệu di trú đậu ở team KỸ THUẬT. Repo nay có **HAI** cửa hẹp cùng một gốc — mở
phiếu `suaTheoId cho ctxHeThong` rồi **xoá cả hai**. Đã ghi §9 sổ điều hành.

> 🔴 **Nợ kèm theo (cùng họ với nợ của §7.1):** `test/l0-m1-luoc-do.test.js` (S1 dòng 65,
> S12 dòng 323) và `ops/bin/nghiem-thu/l0-m1.sh` (biến `NEO`, dòng 112) neo cứng con số
> **20** + danh sách tên bảng, nên chúng ĐỎ kể từ bản 003. Đo 22/08 sau 003: **21 bảng**
> (`l0-m1.sh` = ĐẠT 47 / TRƯỢT 4, cùng 4 mục mà L1-M1 đã gặp). Vá = `20 → 21` ở hai chỗ
> trong test + thêm `tin_cho_xu_ly` vào `NEO_19_BANG` (test) và `NEO` (script). Ngoài
> pathspec L2-M1 (án lệ #25) — TỔNG vá. Bản 004 KHÔNG thêm bảng nào
> (`grep -c '^CREATE TABLE' db/migrate/004_*.up.sql` = 0) nên con số đúng là 21, không phải 22.
