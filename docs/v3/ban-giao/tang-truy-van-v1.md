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
suaTheoId(pool, ctx, tenBang, id, (duLieu = {}), ({ neu } = {})); // → dòng đã sửa | null
```

> **Nới 25/08/2026 · PHIEU-B-Y1** — hai chỗ hẹp cũ đã mở, chữ ký cũ KHÔNG vỡ (tham số mới
> đều tuỳ chọn). Xem §3b và §3c.

- `tenBang` phải nằm trong `BANG_NGHIEP_VU_CHUAN` (15 bảng — xem §6), gõ tay nhầm hoặc
  bảng lạ ⇒ `Error` thường (không phải hai lỗi có tên ở trên — đây là lỗi GỌI SAI của
  code, không phải chuyện team).
- `dieuKien`/`duLieu` là object phẳng `{ tên_cột: giá_trị }`, nối bằng AND. Tên cột được
  kiểm bằng regex (chỉ chữ thường/số/gạch dưới) **TRƯỚC mọi lượt chạm CSDL** — tên rác là
  lỗi gọi sai của code, không đáng một vòng hỏi bảng `team`. Cách một GIÁ TRỊ được dịch:

  | Giá trị trong `dieuKien`/`neu` | SQL sinh ra |
  |---|---|
  | thường (chuỗi, số, Date…) | `cot = $n` |
  | **mảng** | `cot = ANY($n)` |
  | **mảng rỗng** | `false` — 0 dòng, KHÔNG ném |
  | **`null`** | `cot IS NULL` |
  | `undefined` | **ném `Error`** — luôn là biến chưa gán của nơi gọi; viết `null` nếu thật sự muốn `IS NULL` |
  **`team_id` trong `dieuKien`/`duLieu` không bao giờ được DÙNG trực tiếp** — nó chỉ
  được SOI để phát hiện xuyên team; giá trị ghi xuống DB luôn là `ctx.teamId` (hoặc
  `team_id` tường minh khi dùng `ctxHeThong()`, xem §4).
- `suaTheoId` trả `null` khi **0 dòng khớp** (id không tồn tại, hoặc tồn tại nhưng thuộc
  team khác) — đây KHÔNG phải lỗi, coi như "không có dòng đó trong team của bạn". Khác
  với `LoiXuyenTeam` (bị chặn vì **cố ý** truyền tay `team_id` khác trong `duLieu`).
- `layMotTheoId` **không hỗ trợ `ctxHeThong()`** (ném `LoiThieuBoiCanhTeam`) — không có
  tham số nào để truyền `team_id` tường minh qua `id`. Job nền tra theo id thì dùng
  `layNhieu(pool, ctxHeThong(), tenBang, { dieuKien: { id, team_id } })`.
  `suaTheoId` thì **CÓ** — xem §3c.

### 3b · `neu` — điều kiện thêm, và cách diễn đạt SO-VÀ-ĐẶT

```js
suaTheoId(pool, ctx, tenBang, id, duLieu, { neu });
```

`neu` là object phẳng, nối vào `WHERE` **sau** vế team và vế id, dịch bằng ĐÚNG bảng giá
trị ở §3 (cùng một bộ dựng vế với `layNhieu` — một bản khai, không hai).

```js
// Sale bấm "Nhận việc": chỉ thắng nếu NGAY LÚC GHI vẫn chưa ai nhận.
const thang = await suaTheoId(
  pool, ctx, "viec_can_xu_ly", viecId,
  { nguoi_nhan_id: toi, nhan_luc: new Date() },
  { neu: { nguoi_nhan_id: null } },
);
if (thang === null) {
  /* người khác nhận trước — KHÔNG phải lỗi, hiện "việc đã có người nhận" */
}
```

Ba điều phải nhớ:

- **`null` là nhánh quan trọng nhất.** `neu: { cot: null }` ra `cot IS NULL`. Nếu tầng này
  dịch thành `cot = NULL` thì không dòng nào khớp và **mọi** lượt nhận việc đều trượt —
  hỏng câm, màn hình báo "mất tranh" cho từng cú bấm. Có bài test khoá nhánh này.
- **0 dòng khớp → `null`, không ném.** Ba chuyện cùng ra `null`: id không tồn tại · dòng
  thuộc team khác · `neu` không còn đúng (mất tranh). Nơi gọi nào coi mất tranh là LỖI
  (máy trạng thái đơn: ảnh cũ ghi đè = hai sổ lệch) thì **tự dịch `null` thành ném** —
  tầng này không đoán hộ ngữ nghĩa đó.
- **`neu.team_id` lệch ctx → `LoiXuyenTeam`** + đúng **một** dòng `nhat_ky`, y hệt
  `dieuKien`/`duLieu`. Khai `team_id` ở CẢ `duLieu` lẫn `neu` mà hai giá trị khác nhau
  → `Error` thường (lỗi gọi sai, không phải mưu xuyên team).

### 3c · `suaTheoId` + `ctxHeThong()` — job nền sửa được

Đòi `team_id` tường minh, đặt ở **`duLieu` HOẶC `neu`** đều được — y hệt luật `themMoi`
(§4). Thiếu → `LoiThieuBoiCanhTeam`. **Mọi** lượt gọi bằng `ctxHeThong` đều ghi `nhat_ky`,
kể cả lượt khớp 0 dòng: một lượt so-và-đặt trượt vẫn là việc máy đã làm, bỏ nó đi thì sổ
chỉ còn kể những lần thắng.

```js
await suaTheoId(pool, ctxHeThong(), "don_hang", id,
  { team_id, trang_thai_he: "cho_sale" },
  { neu: { trang_thai_he: anhDaDoc } });   // CAS của máy trạng thái đơn
```

**Việc này đóng nợ N3** (mở 22/08, cắn bốn lần, đẻ ba cửa UPDATE tạm ở `src/pos/kho.js` ·
`src/chat/kho.js` · `src/orders/may-trang-thai.js`). Ba cửa đó **chưa bị xoá** — xoá là
phiếu **G2-A3**, mỗi cửa một chủ. Đừng dựng cửa thứ tư.

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

## 6b · `chuyenPageSangTeam` — cửa DUY NHẤT đổi chủ một page (25/08, PHIEU-B-Y3)

```js
import { chuyenPageSangTeam, demMoCoi } from "../../src/db/index.js";

const kq = await chuyenPageSangTeam(pool, ctx, { pageId, teamDichId, lyDo });
// → { pageId, teamCu, teamMoi, daChuyen: {bảng: số dòng}, boLai: {so_ai: n}, nhatKyId }
```

`suaTheoId` **không đổi được `team_id`** — cột đó bị bỏ khỏi mệnh đề `SET` một cách CỐ Ý, và
đó là quyết định đúng cần giữ. Nên đổi chủ page đi bằng cửa riêng này.

**Chuyển page KHÔNG phải đổi một cột.** Năm bảng con mang `team_id` riêng và phải đi theo:

| Bảng | Nối qua | Ghi chú |
|---|---|---|
| `hoi_thoai` `kich_ban` `san_pham` `don_hang` | `page_id` = `page.id` (bigint) | `don_hang` là bảng **tiền** |
| `tin_cho_xu_ly` | `page_id` = id **Facebook** (text) | hàng đợi tin |
| `so_ai` | id Facebook (text) | **Ở LẠI** team cũ — trigger cấm UPDATE. Số dòng bỏ lại trả về ở `boLai`, hãy HIỆN nó lên màn hình |

⛔ Danh mục trên **không gõ tay trong code** — nó được sinh từ `information_schema` mỗi lượt
gọi («bảng nào có CẢ `page_id` LẪN `team_id`»). Thêm một bảng mới có `page_id` là nó tự vào
lưới. Lý do rất cụ thể: bản kê tay đầu tiên **sót hai bảng**, một trong đó là `don_hang`.

Bốn rào, mỗi rào một câu đo được:

- **Một giao dịch.** Nửa chừng hỏng → không dòng nào đổi. Nhật ký ghi hỏng cũng cuộn lại tất.
- **Vai `quan-tri`**, đọc từ `thanh_vien_team` — KHÔNG tin `ctx.vai` do nơi gọi khai.
- **`ctx` phải thuộc team nguồn HOẶC team đích.** Người ngoài cả hai → `LoiXuyenTeam`.
- **Team đích là team KỸ THUẬT → từ chối.** Page sẽ tàng hình với mọi màn.

`ctxHeThong()` **bị từ chối** ở cửa này: đổi chủ dữ liệu đòi một VAI, job nền không có vai.

```js
const { moCoi, boLaiCoChuDich } = await demMoCoi(pool);
// moCoi          → phải LUÔN bằng 0. Khác 0 = có ai đổi team_id ngoài cửa này.
// boLaiCoChuDich → `so_ai`, CỐ Ý > 0 sau lượt chuyển đầu tiên. Hiện, nhưng đừng báo động.
```

## 6c · Bộ luật chung & kỹ năng — phiên bản, duyệt, đo ảnh hưởng (25/08, G2-A4)

```js
import {
  taoBanBoLuat, duyetBoLuat, apBoLuat, soSanhBoLuat, xemAnhHuongBoLuat,
  suaKyNang, luiKyNang, lichSuKyNang, xemAnhHuongKyNang, apDungChoPage,
} from "../../src/db/index.js";
```

| Cần gì | Gọi hàm nào |
|---|---|
| Soạn bản mới (KHÔNG áp ngay) | `taoBanBoLuat(pool, ctx, { noiDung, ghiChu, nguon })` |
| Đóng dấu duyệt | `duyetBoLuat(pool, ctx, { id })` — **người soạn không tự duyệt được** |
| Áp **hoặc lùi** | `apBoLuat(pool, ctx, { id, lyDo })` → `{ ban, banCu, laLui, anhHuong }` |
| Khác bản trước chỗ nào | `soSanhBoLuat(pool, ctx, { tuPhienBan, denPhienBan })` |
| Bao nhiêu page bị chạm | `xemAnhHuongBoLuat` · `xemAnhHuongKyNang(pool, ctx, { ma, batChoNhomSp })` |
| Sửa / lùi / xem lịch sử kỹ năng | `suaKyNang` · `luiKyNang` · `lichSuKyNang` |

**Ba điều đáng đổi sang dùng:**

- `apBoLuat()` chạy **MỘT GIAO DỊCH**. Bản hiện tại của màn hạ bản cũ rồi dựng bản mới bằng
  hai lời gọi rời — hạ xong mà dựng hỏng thì team không còn bản nào đang áp và prompt rơi về
  bản toàn hệ, tức mọi page đang bật bot đổi cách nói mà không ai bấm nút nào.
- Migration 009 thêm chỉ mục `bo_luat_chung_mot_ban_dang_ap`: **hai bản cùng `dang_dung`
  không tồn tại được nữa** (RF-17). Thứ tự hạ-trước-dựng-sau của màn vẫn hợp lệ.
- `xemAnhHuongKyNang` nhận `batChoNhomSp` **định đặt** (chưa ghi xuống) — xem trước rồi mới
  bấm. Nó dùng CHUNG vị từ `apDungChoPage()` với bộ ráp prompt, nên con số nó nói đúng bằng
  số page bot thật sự đổi giọng (đo 25/08: **0/514 page lệch**).

`ky_nang` **vẫn đúng một dòng mỗi (team, ma)** — lịch sử nằm ở bảng riêng `ky_nang_lich_su`.
Cố ý, để màn «Thư viện kỹ năng» không phải đổi hình.

⚠️ Chưa siết `CHECK (NOT dang_dung OR duyet_luc IS NOT NULL)` ở tầng CSDL vì màn còn ghi
thẳng qua `db.sua()`. Sẽ siết sau khi màn đổi sang gọi `apBoLuat()` — cutover hai bước.

## 7 · Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l0-m2.sh        # 8 phép L0-M2 + 4 phép B-Y1, tự dựng/dọn sandbox
node --test test/l0-m2-boi-canh.test.js test/l0-m2-cach-ly.test.js   # 40 ca chi tiết
```

⚠️ **Cổng này từng chết câm.** Tới 25/08 nó còn dựng sandbox bằng `docker exec talpha-pg`,
mà container đó không còn tồn tại ở đâu (máy dev không có docker, VPS chạy Postgres cài
thẳng) ⇒ mọi lượt "chạy lại cổng L0-M2" đều `exit 2` mà không đo gì. Nay nó dựng/dọn bằng
chính gói `pg` của repo, chạy ở đâu có `DATABASE_URL_V3` là chạy. Vai CSDL phải có quyền
`CREATEDB` (trên VPS: `ALTER ROLE aicloser CREATEDB`, cấp 25/08).

Không đo trên `aicloser_v3` (CSDL dev/di-trú) — cả cổng lẫn test đều tự dựng CSDL sandbox
riêng rồi `DROP DATABASE` khi xong (mẫu `dungSandbox()` của `db/sandbox.js`, L0-M1), nên
không có rủi ro đụng dữ liệu di trú thật, và không cần "DELETE đúng id" thủ công.
