# NHẬT KÝ PHIẾU B-Y3 — chuyển page giữa các team

> Thợ: người A (trục dữ liệu) · 25/08/2026 · nhánh `main`
> Phiếu: `docs/thi-cong/phieu/PHIEU-B-Y3.md` — gỡ chặn **H7** và lát ④ màn Cấu hình team
> Môi trường đo: **VPS 169.58.33.8 · PostgreSQL 16.15** · sandbox tự dựng + một phép
> CHỈ-ĐỌC trên CSDL thật `aicloser_v3`

---

## 0 · ĐO LẠI NGUYÊN LIỆU — phiếu kê SÓT HAI BẢNG, một trong đó là bảng tiền

Phiếu kê tay bốn bảng con: `hoi_thoai` · `san_pham` · `kich_ban` · `so_ai`, và xếp
`don_hang` vào ô *«nối gián tiếp qua hoi_thoai»*. Đo lại lược đồ:

```
$ grep -n "REFERENCES page(id)" db/schema.sql   →  4 khoá ngoại, không phải 3
dòng 106  bảng san_pham        page_id bigint REFERENCES page(id)
dòng 148  bảng hoi_thoai       page_id bigint NOT NULL REFERENCES page(id)
dòng 227  bảng don_hang        page_id bigint REFERENCES page(id)      ← phiếu khai NHẦM
dòng 274  bảng kich_ban        page_id bigint NOT NULL REFERENCES page(id)

$ grep -nE "^  page_id" db/schema.sql            →  thêm hai cột page_id dạng TEXT
dòng 187  bảng so_ai           page_id text     (id Facebook)
dòng 515  bảng tin_cho_xu_ly   page_id text     ← phiếu KHÔNG nhắc tới
```

Hai chỗ sót:

- **`don_hang`** có `page_id` trỏ **THẲNG** vào `page(id)` và mang `team_id` riêng. Đây là
  **bảng tiền**. Bỏ lại nó khi chuyển page nghĩa là đơn của page nằm ở team cũ: báo cáo
  doanh thu của team mới thiếu, team cũ vẫn thấy đơn của một page nó không còn sở hữu.
- **`tin_cho_xu_ly`** (hàng đợi tin, migration 003) cũng có `team_id` + `page_id`. Bỏ lại
  nghĩa là worker của team CŨ vẫn xử tin cho page đã sang team khác.

`khach` thì phiếu nói ĐÚNG: nó không có `page_id`, nối gián tiếp qua `hoi_thoai`, và một
khách không thuộc về một page — nên nó **không** đi theo. Giữ nguyên.

## 1 · HỆ QUẢ THIẾT KẾ: danh mục con KHÔNG GÕ TAY

Chuyện phiếu sót hai bảng không phải lỗi của người viết phiếu — nó là bằng chứng rằng
**bản kê tay sẽ sai**, lần này hay lần sau. Án lệ #22: *«danh sách gõ tay là lỗ hẹn giờ»*.

Nên `danhMucCon()` sinh danh mục **từ `information_schema` mỗi lượt gọi**: bảng nào có CẢ
`page_id` LẪN `team_id` thì vào lưới, trừ chính `page` và trừ danh sách ở-lại-có-chủ-đích.
Kiểu cột quyết cách nối: `bigint` → `page.id`, `text` → `page.page_id` (id Facebook). Kiểu
khác ⇒ **NÉM**, không đoán.

Thêm một bảng mới có `page_id` ở migration sau là nó tự vào lưới. Không ai phải nhớ.

## 2 · CHỖ PHIẾU KHÔNG NÓI RÕ: VAI LẤY TỪ ĐÂU

Phiếu đòi *«vai `quan-tri` mới gọi được»*, nhưng `ctx` của `src/db/` chỉ có
`{ teamId, nguoiDungId }` — **không có `vai`**. Hai đường:

| | |
|---|---|
| Nhận `ctx.vai` do nơi gọi khai | Nơi gọi tự khai vai của chính mình — bịa được |
| **Đọc từ `thanh_vien_team` + `vai`** ← chọn | Nguồn sự thật, không bịa được, tốn một câu SELECT trong giao dịch |

Và hằng `'quan-tri'` chính là chuỗi đã gây **bài học 2 của giai đoạn 2** (gõ `quan_tri` gạch
dưới ở hai chỗ ⇒ mọi người dùng thành không có vai ⇒ cửa chặn sạch, *trông y hệt phân quyền
chạy đúng*). Nên ngoài việc khai hằng đúng một lần, hàm **đối chiếu nó với bảng `vai` mỗi
lượt gọi** và ném to nếu không khớp: gõ sai thì ĐỎ, không phải CÂM. Ca `Y3-m` khoá lại cả
hai chiều — `quan-tri` phải có, `quan_tri` phải KHÔNG có.

## 3 · MỘT THIẾT KẾ TÔI SỬA GIỮA CHỪNG: `demMoCoi` tách hai nhóm

Bản đầu `demMoCoi()` trả một bảng phẳng và ca `Y3-b` đỏ ngay: `so_ai: 1`.

Đúng — vì `so_ai` **cố ý** ở lại. Gộp nó vào "mồ côi" nghĩa là phép đo sẽ đỏ **vĩnh viễn**
ngay sau thao tác hợp lệ đầu tiên, và một cái đèn đỏ vĩnh viễn thì người ta học cách không
nhìn nó nữa. Nên tách:

```
moCoi          → phải LUÔN 0. Khác 0 = có ai đổi team_id ngoài cửa này.
boLaiCoChuDich → so_ai, CỐ Ý > 0 sau lượt chuyển đầu. Hiện, nhưng không báo động.
```

⚠️ Kèm theo: ④#5 của phiếu khai *«so_ai mồ côi: 0»* — đúng **tại thời điểm đo** (chưa page
nào được chuyển), và thôi đúng ngay sau lượt chuyển đầu tiên. Đã ghi vào docstring để người
sau không đọc nhầm thành hỏng.

## 4 · CÂU HỎI ⑧ CỦA PHIẾU — VẪN ĐỂ MỞ

`[NEEDS CLARIFICATION: so_ai của page được chuyển thì đi hay ở?]`

Làm theo đúng chỉ dẫn của phiếu cho trạng thái chưa-trả-lời: **cách (a)** — để `so_ai` ở lại,
không đụng trigger `tg_chi_insert_so_ai`, và trả số dòng bỏ lại ra `boLai` để nó **hiện lên
màn hình** chứ không âm thầm.

**Marker CHƯA gỡ.** Cái giá của (a) là thật và cần người quyết biết: sau khi chuyển page,
màn *«Chi phí AI»* của team mới **không thấy** phần chi tiêu trước ngày chuyển. Hôm nay
`so_ai` có 0 dòng nên chưa ai đau; khi bộ nạp Sổ AI chạy (52.036 dòng theo §L0) thì đau.

## 5 · TEST CHẠM NHÁNH NÀO

Nhánh thật, sandbox Postgres, không fixture dựng hộ:

- **Giao dịch cuộn lại** đo bằng một **trigger THẬT** dựng trên `nhat_ky` để ép `INSERT`
  ném, rồi dọn đi — không mock. Mock chỉ chứng minh mock chạy.
- **Vai** đọc từ `thanh_vien_team` thật, người dùng thật (cột có khoá ngoại — không bịa id).
- **`so_ai` ở lại** khẳng định bằng cách đọc lại `team_id` của nó từ CSDL.
- **Ca vá lệch cũ** (`Y3-n`): bịa một dòng `hoi_thoai` mồ côi bằng SQL thẳng — đúng cảnh
  *«ai đó gõ psql tay rồi quên con»* — rồi chuyển page và khẳng định nó được kéo về đúng
  team. Cửa này vừa chuyển vừa VÁ.

## 6 · BẰNG CHỨNG MÁY

```
node --test test/l0-m2-chuyen-team.test.js     →  14 pass / 0 fail   (Postgres 16.15 thật)

   [Y3-a] daChuyen = {"don_hang":1,"hoi_thoai":1,"kich_ban":1,"san_pham":1,"tin_cho_xu_ly":1}
   [Y3-b] moCoi={...tất cả 0} boLaiCoChuDich={"so_ai":1}
   [Y3-c] boLai = {"so_ai":1}
   [Y3-m] VAI_DUOC_CHUYEN="quan-tri" · bảng vai trả "quan-tri"
```

```
bash ops/bin/nghiem-thu/b-y3.sh   →  TỔNG: 14 phép · ĐẠT 14 · TRƯỢT 0
   ✔ bảng con đã chuyển = don_hang,hoi_thoai,kich_ban,san_pham,tin_cho_xu_ly
   ✔ page + 5 bảng con cùng một team đích = DONG-BO
   ✔ so_ai còn ở team cũ = SO_AI-O-LAI          ✔ boLai = {"so_ai":1}
   ✔ tổng mồ côi = 0                            ✔ nhat_ky chuyen_page_team = 1
   ✔ teamDich kỹ thuật / vai sale / team thứ ba → LoiXuyenTeam · page GIU-NGUYEN
   ✔ tổng dòng mồ côi trên CSDL THẬT (aicloser_v3) = 0
```

**④#1 trên CSDL THẬT, chỉ đọc:**

```
moCoi          = {"don_hang":0,"hoi_thoai":0,"kich_ban":0,"san_pham":0,"tin_cho_xu_ly":0}
boLaiCoChuDich = {"so_ai":0}
```

**Quét hồi quy** (`src/db/index.js` đổi ⇒ mọi module v3 đi qua): **31 bộ ca · 375 pass /
1 fail**. Đỏ duy nhất là `D7`, đã A/B chứng minh ở G2-A1 là điều kiện dữ liệu của VPS.

## 7 · NGOÀI PHẠM VI — KHÔNG ĐỤNG

- **`src/db/truy-van.js` KHÔNG đụng một dòng**, đúng như phiếu dặn. Cái `continue` bỏ
  `team_id` khỏi `SET` là rào cố ý, giữ nguyên.
- Trigger `tg_chi_insert_so_ai` không nới — chờ câu trả lời ⑧.
- `db/di-tru/nap.js` vẫn đổ vào `chua-phan` (phiếu nêu ở mục (b)): chạy lại di trú thì page
  mới lại rơi vào team kỹ thuật. Nay đã có đường kéo ra bằng hàm thay vì psql, nhưng **bộ
  nạp thì chưa đổi** — ghi §9, không phải việc phiếu này.
- Màn hình gọi hàm này là đất người B (`v3/src/ui/team/`).
