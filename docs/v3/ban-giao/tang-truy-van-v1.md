# BÀN GIAO — TẦNG TRUY VẤN v1 (điểm bàn giao 2 cho người B)

> Phiếu **L0-M2** · dựng 22/08/2026 · nguồn sự thật của file này là `src/db/*.js`.
> Số nào ở đây cũng đo lại được bằng `bash ops/bin/nghiem-thu/l0-m2.sh`.
> Đọc trước: [`docs/v3/ban-giao/luoc-do-v1.md`](./luoc-do-v1.md) (điểm bàn giao 1 — lược đồ).

## 0 · Import từ đâu

```js
import {
  layNhieu,
  layMotTheoId,
  themMoi,
  suaTheoId, // đọc/ghi bảng nghiệp vụ
  layDanhSachTeamChon, // picker team (không đòi ctx)
  ctxHeThong, // cửa thoát job nền
  ghiNhatKy, // ghi nhật ký thao tác (dùng chung)
  LoiThieuBoiCanhTeam,
  LoiXuyenTeam, // hai lỗi có tên
  BANG_NGHIEP_VU_CHUAN, // Set 15 tên bảng được tầng này bao phủ
} from "../../src/db/index.js"; // (sửa lại số cấp `../` theo vị trí file gọi)
```

Không viết SELECT/INSERT/UPDATE tay có `team_id` ở nơi khác trong code v3 — mọi truy vấn
bảng nghiệp vụ đi qua các hàm này. `pool` truyền vào lấy từ `db/ket-noi.js` (`taoPool()`
hoặc `voiPool()`), giống hệt L0-M1 — tầng này **không mở pool riêng**.

## 1 · Bối cảnh `ctx` — hình dạng CHỐT ở phiếu này

```js
ctx = { teamId, nguoiDungId };
```

Một **object literal thường**, không phải class. B tạo giá trị này ở L0-M3 **sau khi**
đăng nhập + chọn team, rồi truyền vào mọi hàm ở đây (điểm bàn giao 5 của
`docs/v3/05-PHAN-VIEC.md` — "Bối cảnh team": B ghi, A dùng — chính là tầng này).

- `teamId` — id (bigint, PostgreSQL trả về dạng **string**, vd `"3"`) của team đang đăng
  nhập. Tầng truy vấn tự tra `team` để xác nhận **tồn tại** và **không phải team kỹ
  thuật** ở MỌI lượt gọi (không cache — cờ `la_ky_thuat` đổi giữa hai lượt gọi vẫn được
  bắt đúng).
- `nguoiDungId` — id của người dùng, hoặc `null`. ⚠️ **Phải là id THẬT trong bảng
  `nguoi_dung`, hoặc `null`** — cột `nhat_ky.nguoi_dung_id` có khoá ngoại
  (`REFERENCES nguoi_dung(id)`); một `nguoiDungId` bịa (không tồn tại) làm chính lượt
  ghi nhật ký của tầng này ném lỗi FK thay vì lỗi có tên đang mong đợi, che mất tín hiệu
  thật (đo được khi viết phiếu — xem §5 "quyết định" trong nhật ký `phieu-l0-m2.md`).
  Đây là việc B đảm bảo lúc dựng ctx, tầng này không tự validate thêm (ngoài phạm vi).

## 2 · Hai lỗi có tên — bắt bằng `err.name` hoặc `instanceof`

| Lỗi                   | Khi nào ném                                                                                                                                                                | Có ghi `nhat_ky` không                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `LoiThieuBoiCanhTeam` | ctx vắng mặt/rỗng · `ctx.teamId` không tồn tại trong bảng `team` · `ctx.teamId` là team **kỹ thuật** (`chua-phan`) · dùng `ctxHeThong()` mà không kèm `team_id` tường minh | KHÔNG (chưa có team hợp lệ nào để mà ghi)                                                                          |
| `LoiXuyenTeam`        | ctx **hợp lệ**, nhưng `dieuKien`/`duLieu` truyền tay `team_id` KHÁC `ctx.teamId`                                                                                           | CÓ — 1 dòng `nhat_ky` (`hanh_dong='chan_xuyen_team'`, `doi_tuong=<tên bảng>`, `doi_tuong_id=<team_id bị từ chối>`) |

Cả hai hàm đọc (`layNhieu`, `layMotTheoId`) lẫn ghi (`themMoi`, `suaTheoId`) đều ném
đúng như bảng trên — không có hàm nào "quên" áp rào.

## 3 · Bốn hàm đọc/ghi bảng nghiệp vụ

```ts
layNhieu(pool, ctx, tenBang, ({ dieuKien = {}, thuTu } = {})); // → mảng dòng
layMotTheoId(pool, ctx, tenBang, id); // → dòng | null
themMoi(pool, ctx, tenBang, (duLieu = {})); // → dòng vừa tạo
suaTheoId(pool, ctx, tenBang, id, (duLieu = {})); // → dòng đã sửa | null
```

- `tenBang` phải nằm trong `BANG_NGHIEP_VU_CHUAN` (15 bảng — xem §6), gõ tay nhầm hoặc
  bảng lạ ⇒ `Error` thường (không phải hai lỗi có tên ở trên — đây là lỗi GỌI SAI của
  code, không phải chuyện team).
- `dieuKien`/`duLieu` là object phẳng `{ tên_cột: giá_trị }`, ánh xạ thẳng sang
  `cột = giá_trị` (AND). Tên cột được kiểm bằng regex (chỉ chữ thường/số/gạch dưới) —
  không tự bịa cột không tồn tại, Postgres sẽ báo lỗi cột lạ như bình thường.
  **`team_id` trong `dieuKien`/`duLieu` không bao giờ được DÙNG trực tiếp** — nó chỉ
  được SOI để phát hiện xuyên team; giá trị ghi xuống DB luôn là `ctx.teamId` (hoặc
  `team_id` tường minh khi dùng `ctxHeThong()`, xem §4).
- `suaTheoId` trả `null` khi **0 dòng khớp** (id không tồn tại, hoặc tồn tại nhưng thuộc
  team khác) — đây KHÔNG phải lỗi, coi như "không có dòng đó trong team của bạn". Khác
  với `LoiXuyenTeam` (bị chặn vì **cố ý** truyền tay `team_id` khác trong `duLieu`).
- `layMotTheoId`/`suaTheoId` **không hỗ trợ `ctxHeThong()`** (ném `LoiThieuBoiCanhTeam`
  nếu dùng chung) — không có tham số nào để truyền `team_id` tường minh qua `id`. Job
  nền cần tra/sửa theo id thì dùng `layNhieu(pool, ctxHeThong(), tenBang, { dieuKien: {
id, team_id } })` (đọc) — **chưa có bản `suaTheoId` cho ctxHeThong**, ngoài phạm vi ④
  của phiếu này, mở phiếu mới nếu L1+ cần.

### Đặc cách `bo_luat_chung` — CHỈ khi ĐỌC

```
layNhieu/layMotTheoId trên bo_luat_chung  →  WHERE (team_id = ctx.teamId OR team_id IS NULL)
mọi bảng khác                             →  WHERE  team_id = ctx.teamId
themMoi/suaTheoId trên bo_luat_chung      →  WHERE  team_id = ctx.teamId   (MỘT vế, luôn luôn)
```

Không có cách nào tạo dòng `team_id IS NULL` ("luật toàn hệ") qua tầng truy vấn này —
cả ctx thường lẫn `ctxHeThong()` đều đòi một `team_id` cụ thể. Dòng "toàn hệ" là dữ liệu
seed/admin, chèn bằng SQL trực tiếp (giống `test/l0-m1-luoc-do.test.js` ca S6) — ngoài
phạm vi phiếu này.

### Ví dụ gọi ĐÚNG / SAI

```js
const ctx = { teamId: "3", nguoiDungId: "7" }; // sau đăng nhập, team = tieu-alpha

// ĐÚNG — đọc khách của chính team đang đăng nhập
const ds = await layNhieu(pool, ctx, "khach", {
  dieuKien: { trang_thai: "GREET" },
});

// ĐÚNG — thêm một khách, team_id tự chèn = ctx.teamId, không cần truyền
const kh = await themMoi(pool, ctx, "khach", { ten: "Nguyễn Văn A" });

// SAI — truyền tay team_id khác ctx trong filter ⇒ LoiXuyenTeam + ghi nhat_ky
await layNhieu(pool, ctx, "khach", { dieuKien: { team_id: "2" } }); // ném lỗi

// SAI — quên ctx ⇒ LoiThieuBoiCanhTeam, KHÔNG trả mảng rỗng
await layNhieu(pool, null, "khach"); // ném lỗi, không phải []
```

## 4 · `ctxHeThong()` — cửa thoát cho job nền

```js
import { ctxHeThong, themMoi } from "../../src/db/index.js";

// Job nền (cron toàn hệ, di trú...) — PHẢI kèm team_id tường minh trong dieuKien/duLieu,
// tầng truy vấn không suy luận hộ team nào. MỌI lượt gọi đều ghi nhat_ky (01-QUYET-DINH
// §9 "ghi cả việc máy làm"), khác ctx người dùng chỉ ghi khi bị chặn xuyên team.
await themMoi(pool, ctxHeThong(), "lich_nhac", { team_id: mucTieuTeamId, ... });
```

⛔ **Cấm dùng trong đường phục vụ request** — đây là quyền của job nền chạy ngoài
request người dùng, không phải quyền người dùng qua API. Không có cơ chế code nào chặn
việc này (không có "đường phục vụ request" nào tồn tại ở phiếu L0-M2 để mà chặn) — đây
là **quy ước bắt buộc theo dõi bằng review code**, B/L1+ đọc kỹ trước khi dùng.

## 5 · Picker team & nhật ký dùng chung

```js
await layDanhSachTeamChon(pool);
// → [{ id, slug, ten }, ...] đúng 3 team NGHIỆP VỤ, KHÔNG bao giờ có `chua-phan`.
// Không đòi ctx — dùng ngay ở màn chọn team TRƯỚC KHI có ctx (L0-M3).

await ghiNhatKy(pool, {
  teamId,
  tacNhan, // bắt buộc — tacNhan: 'nguoi:<id>' | 'may:<job>'
  nguoiDungId,
  hanhDong, // hanhDong bắt buộc, vd 'doi_trang_thai_don'
  doiTuong,
  doiTuongId,
  truoc,
  sau,
  ghiChu, // tuỳ chọn
});
// Cửa RA DUY NHẤT của bảng nhat_ky — mọi module (L1+ ghi ngược trạng thái đơn, v.v.)
// gọi thẳng hàm này, đừng tự viết câu INSERT khác vào nhat_ky.
```

## 6 · 15 bảng được bao phủ — và 4 bảng KHÔNG

`BANG_NGHIEP_VU_CHUAN` (src/db/truy-van.js): `cau_hinh_model` `page` `san_pham`
`goi_gia` `khach` `hoi_thoai` `so_ai` `don_hang` `viec_can_xu_ly` `hang_cho_tao_don`
`kich_ban` `bo_luat_chung` `ky_nang` `lich_nhac` `nhat_ky`.

**KHÔNG bao phủ** (gọi tầng này với 4 bảng dưới ⇒ `Error` "không nằm trong
BANG_NGHIEP_VU_CHUAN"):

- `team` `nguoi_dung` `vai` — bảng DÙNG CHUNG, không mang `team_id`. `team` có hàm
  riêng (`layDanhSachTeamChon`, §5); `nguoi_dung`/`vai` chưa có hàm ở phiếu này (chưa ai
  cần — L0-M3 sẽ cần, mở rộng lúc đó).
- `thanh_vien_team` — **quyết định có chủ đích**, không phải thiếu sót: bảng này CÓ
  `team_id NOT NULL` nhưng việc dùng nó (tra "người này thuộc những team nào") xảy ra
  **TRƯỚC KHI có ctx** (đó chính là bước xác định ctx ở L0-M3) — đưa nó qua một tầng ĐÒI
  ctx là chuyện con-gà-quả-trứng. B viết truy vấn riêng cho bảng này ở L0-M3 (SQL trực
  tiếp qua `db/ket-noi.js`, không qua `src/db/`).

## 7 · Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l0-m2.sh        # 8 phép của PHIẾU L0-M2 ④, tự dựng/dọn sandbox
node --test test/l0-m2-boi-canh.test.js test/l0-m2-cach-ly.test.js   # 22 ca chi tiết
```

Không đo trên `aicloser_v3` (CSDL dev/di-trú) — cả cổng lẫn test đều tự dựng CSDL sandbox
riêng rồi `DROP DATABASE` khi xong (mẫu `dungSandbox()` của `db/sandbox.js`, L0-M1), nên
không có rủi ro đụng dữ liệu di trú thật, và không cần "DELETE đúng id" thủ công.
