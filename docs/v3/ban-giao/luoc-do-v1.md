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
