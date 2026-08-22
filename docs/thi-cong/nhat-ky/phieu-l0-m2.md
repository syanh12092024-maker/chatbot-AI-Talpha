# NHẬT KÝ PHIẾU L0-M2 — tầng truy vấn v3 (tự chèn team_id, thiếu ctx → ném lỗi)

**Thợ:** session thợ thi công (Sonnet 5) · **Ngày:** 22/08/2026
**Base:** `70335be` · **Cây lúc nộp:** xem hash commit ở dòng §10 sổ điều hành
**Làn:** 🟥 (lõi cách ly team) nhưng route **sonnet** · **Skill nạp:** `tho-thi-cong`
**Cổng:** `bash ops/bin/nghiem-thu/l0-m2.sh` → **16 phép · ĐẠT 16 · TRƯỢT 0**

---

## 1 · ĐO LẠI NGUYÊN LIỆU trước khi code (bước 3 của skill)

Không chép số đề bài — đo trực tiếp trên CSDL thật (`aicloser_v3`, container `talpha-pg:5433`)
và trên cây trước khi viết dòng code đầu tiên:

| Nguồn                                   | Phiếu/luoc-do-v1 khai                                  | ĐO THẬT 22/08                                                                                                                                                                             | Kết                                                   |
| --------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Số bảng                                 | 19 (16 nghiệp vụ + 3 dùng chung)                       | `information_schema.tables` = **19** đúng tên                                                                                                                                             | khớp                                                  |
| `team_id` kiểu dữ liệu                  | không khai rõ                                          | **bigint**, PostgreSQL trả **string** qua `pg` (vd `"3"`) — quan trọng cho mọi phép so `===`                                                                                              | ghi nhận, không phải lệch                             |
| `team` seed                             | 3 nghiệp vụ + 1 kỹ thuật                               | `auus, chua-phan(kỹ thuật), pialpha-eu, tieu-alpha` — seed nằm NGAY trong `001_nen.up.sql` (không cần di trú mới thấy)                                                                    | khớp                                                  |
| `db/sandbox.js`                         | không nhắc trong phiếu, chỉ nhắc "dùng lại ket-noi.js" | **đã có sẵn** `dungSandbox(hau)` — đúng cơ chế L0-M1 dùng cho test của chính nó                                                                                                           | dùng lại, không viết pool thứ hai (đúng ⛔ của phiếu) |
| `nhat_ky.nguoi_dung_id`                 | không khai trong ②                                     | có **FK** `REFERENCES nguoi_dung(id)` — một `nguoiDungId` bịa trong ctx test làm chính lượt ghi audit ném lỗi FK, CHE MẤT lỗi có tên đang đo (bắt được lúc viết smoke-test tay, xem §3.4) | phát hiện, đã xử + ghi vào bàn giao                   |
| Tổng "16 bảng nghiệp vụ" của luoc-do-v1 | 3 dùng chung (`team`,`nguoi_dung`,`vai`)               | đúng, nhưng đếm ra 16 nghiệp vụ gồm CẢ `thanh_vien_team` (có `team_id NOT NULL`) — phiếu ② không nhắc tới bảng này                                                                        | quyết định phạm vi, xem §3.2                          |

## 2 · Đối chiếu nợ cũ (⑦ ĐÃ TRA CHƯA)

Không có `docs/thi-cong/SO-NO.md` trong repo này (khác dự án LevelUp-Sales-OS mà skill v3
bổ sung nhắc tới). Grep neo theo đúng câu phiếu đã cho sẵn ở ⑦:

```
$ grep -rn "truy van\|truy-van\|tang_truy_van\|L0-M2\|src/db" docs/thi-cong/nhat-ky/*.md docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
```

Kết quả trùng khớp đúng những gì phiếu đã liệt kê (dòng bảng §2 sổ, dặn chống ĐẠT RỖNG).
Không có phán/nợ nào khác đụng `src/db/` hay tầng truy vấn — không ai đã làm việc này
trước, không có gì để hoà giải.

## 3 · Quyết định chốt trong lượt (nói ra tradeoff, luật 13)

### 3.1 · Hai lỗi RIÊNG, không dùng chung một tên

`LoiThieuBoiCanhTeam` (ctx thiếu/sai — ④#1, #4) và `LoiXuyenTeam` (ctx hợp lệ nhưng
truyền tay `team_id` khác — ④#3) là HAI class riêng. Lý do: ② hợp đồng của phiếu dùng
hai cụm khác nhau cho hai tình huống ("NÉM LỖI có tên riêng" cho ctx sai, "(lỗi riêng)"
cho xuyên team) — và hành vi PHỤ đi kèm cũng khác nhau (xuyên team CÓ ghi `nhat_ky`, ctx
sai thì KHÔNG — chưa có team hợp lệ nào mà ghi). Gộp một tên sẽ làm `catch` phía B/L1
không phân biệt được "tôi gọi sai" với "tôi bị chặn vì cố vượt rào".

### 3.2 · Phạm vi 15 bảng, KHÔNG gồm `thanh_vien_team`

luoc-do-v1.md tính "16 bảng nghiệp vụ" = 19 − 3 dùng chung, gồm cả `thanh_vien_team`.
Phiếu L0-M2 ② không nhắc bảng này trong hợp đồng, và về nghiệp vụ nó có vấn đề
con-gà-quả-trứng: xác định "người này thuộc team nào" (đọc `thanh_vien_team`) là bước
XÁC ĐỊNH ctx, xảy ra TRƯỚC khi có ctx để mà truyền vào một hàm đòi ctx. Đây là việc của
B ở L0-M3 (đăng nhập). **Chọn loại `thanh_vien_team` khỏi `BANG_NGHIEP_VU_CHUAN`**, ghi
rõ lý do + hướng dẫn B trong `tang-truy-van-v1.md` §6 thay vì âm thầm bỏ sót. Giá phải
trả: nếu sau này có module A cần đọc `thanh_vien_team` cho mục đích KHÁC xác định ctx
(vd màn quản trị liệt kê ai ở team nào), sẽ phải mở rộng allowlist ở một phiếu sau — chấp
nhận được, vì thêm một tên vào `Set` là việc nhỏ, còn âm thầm cho qua bảng này bây giờ
có nguy cơ che lấp đúng cái vòng con-gà-quả-trứng cần được nhìn thấy.

### 3.3 · `ctxHeThong()` đòi `team_id` TƯỜNG MINH, không suy luận hộ

② hợp đồng nói cửa thoát "dùng cho JOB NỀN (di trú, cron toàn hệ)" nhưng không nói rõ
cửa này có "team cố định" hay không. Quyết định: **không** — job nền có thể cần chạm
NHIỀU team trong một lượt chạy (vd cron quét nhắc mọi team), nên `ctxHeThong()` không
mang `teamId`. Đổi lại, MỌI hàm khi dùng ctx này **bắt buộc** `team_id` tường minh trong
`dieuKien`/`duLieu` — không có "mặc định" nào để đoán nhầm. Giá phải trả: `layMotTheoId`
và `suaTheoId` KHÔNG hỗ trợ được `ctxHeThong()` (không có tham số nào để nhét `team_id`
tường minh qua `id`) — đã CHẶN TƯỜNG MINH bằng `LoiThieuBoiCanhTeam` thay vì để hành vi
mù mờ; job nền cần tra/sửa theo id thì dùng `layNhieu(..., { dieuKien: { id, team_id }
})`. Chưa có bản sửa-theo-id cho job nền — ngoài phạm vi ④, ghi rõ trong bàn giao cho
L1+ mở phiếu nếu cần thật.

### 3.4 · `ctx.nguoiDungId` phải là id THẬT hoặc null — phát hiện qua smoke-test tay

Trước khi viết `node --test`, chạy tay một kịch bản smoke bằng `dungSandbox` (không tính
vào bộ test chính thức) để dò lỗi sớm — bắt được: gọi `layNhieu(ctx, ...)` với
`ctx.nguoiDungId` là số bịa (không có dòng `nguoi_dung` tương ứng) khi cố kích hoạt
`LoiXuyenTeam` thì lượt bắt lỗi ra một exception có `.name === "error"` (chữ thường —
đặc trưng của `pg` khi lỗi đến từ chính CSDL, không phải `throw` của code), KHÔNG phải
`LoiXuyenTeam` — vì hàm `ghiNhatKy` bên trong (ghi audit trước khi throw) tự nó ném lỗi
FK-violation (`nhat_ky.nguoi_dung_id REFERENCES nguoi_dung(id)`), che mất lỗi có tên
đang định báo. **Không sửa bằng cách nuốt lỗi FK** (sẽ làm mất đúng cái audit trail mà
④#3 đòi phải có) — sửa bằng cách **ghi rõ hợp đồng**: `ctx.nguoiDungId` phải là id thật
trong `nguoi_dung` hoặc `null`, đây là việc B đảm bảo lúc dựng ctx (ngoài phạm vi tầng
truy vấn tự validate thêm — sẽ tốn một round-trip cho một điều kiện lẽ ra đã đúng nếu
luồng đăng nhập làm đúng việc của nó). Đã ghi rõ trong `tang-truy-van-v1.md` §1 (cảnh
báo ⚠️) — không phải marker cần làm rõ, là một quyết định có lý do.

### 3.5 · `bo_luat_chung`: đặc cách hai vế CHỈ ở phía ĐỌC, ghi luôn một vế

`suaTheoId`/`themMoi` trên `bo_luat_chung` dùng `team_id = ctx.teamId` (một vế) dù bảng
này có đặc cách đọc hai vế. Lý do: nếu GHI cũng theo hai vế, một ctx thường (khoá vào một
team cụ thể) có thể lỡ tay SỬA được dòng "luật toàn hệ" (`team_id IS NULL`) — không có
khái niệm "ctx của toàn hệ" nên không có ai ĐƯỢC PHÉP sửa dòng đó qua đường ctx thường.
Ca `C11` (test) là bằng chứng: `suaTheoId` nhắm vào dòng `team_id IS NULL` từ `ctxA` trả
`null` (0 dòng khớp, không phải lỗi) — dòng NULL không đổi.

## 4 · Kết quả nghiệm thu ④ (cổng `ops/bin/nghiem-thu/l0-m2.sh`, sandbox `aicloser_v3_nt_l0m2`)

| Phép                               | Số đo                                                                                                    | Kết |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | --- |
| ① ctx thiếu → tên lỗi              | `LoiThieuBoiCanhTeam`                                                                                    | ✔   |
| ② chống ĐẠT RỖNG (so DANH SÁCH id) | chèn tieu-alpha `1,2` → đọc lại `1,2` (khớp) · chèn auus → đọc lại đúng 1 dòng, KHÔNG lẫn vào tieu-alpha | ✔   |
| ③ xuyên team (ĐỌC + GHI)           | cả hai → `LoiXuyenTeam` · `nhat_ky(chan_xuyen_team)` 0→1 (đọc) →2 (ghi), mỗi lượt đúng +1                | ✔   |
| ④ ctx = team kỹ thuật → tên lỗi    | `LoiThieuBoiCanhTeam`                                                                                    | ✔   |
| ⑤ `bo_luat_chung` 2/1/1            | tieu-alpha=2 · auus=1 · pialpha-eu=1                                                                     | ✔   |
| ⑥ picker team                      | `auus,pialpha-eu,tieu-alpha` (không `chua-phan`)                                                         | ✔   |
| ⑦ `ctxHeThong` 1 lượt → `nhat_ky`  | 2→3 (đúng +1)                                                                                            | ✔   |
| ⑧ test                             | l0-m1+l0-m2: **52 xanh/0 đỏ** · bộ cũ **18/5** đúng mốc nền L0-M1                                        | ✔   |

**TỔNG (gate script): 16 phép · ĐẠT 16 · TRƯỢT 0.** `node --test test/l0-m2-*.test.js`
riêng: **22 ca xanh / 0 đỏ**.

Sandbox tự dọn — đã đối chiếu sau mỗi lượt chạy (`SELECT datname FROM pg_database WHERE
datname LIKE 'aicloser_v3%'` → chỉ còn đúng `aicloser_v3`, không có `_test_*`/`_nt_*` sót
lại). `git status --porcelain` trong lúc phát triển chỉ hiện đúng file mới của phiếu này
— bộ test cũ (đã trỏ `CONV_STATE_FILE` ra thư mục tạm) không đụng `conv-state.json` thật.

## 5 · Test — nhánh nào chạm, nhánh nào không

**22 ca, 2 tệp**, đều tự dựng CSDL sandbox riêng rồi tự dọn (`db/sandbox.js`, mẫu của
L0-M1) — KHÔNG chạy trên `aicloser_v3` (CSDL dev/di-trú thật):

- `test/l0-m2-boi-canh.test.js` (11 ca) — ctx thiếu/rỗng/team-không-tồn-tại/team-kỹ-thuật
  đều ném `LoiThieuBoiCanhTeam` (áp cho cả 4 hàm, không chỉ `layNhieu`) · bảng lạ bị chặn
  deny-by-default · picker 3 slug · `ctxHeThong` (thiếu team_id → lỗi, đủ team_id → ghi
  `nhat_ky` +1 cho CẢ đọc lẫn ghi) · `layMotTheoId`/`suaTheoId` từ chối `ctxHeThong`.
- `test/l0-m2-cach-ly.test.js` (11 ca) — **CHỐNG ĐẠT RỖNG**: tự chèn 3 `khach` + 2
  `hoi_thoai` trộn team (tieu-alpha, auus) NGAY BẰNG `themMoi` (dogfood — vừa dựng
  fixture vừa là bằng chứng ghi đúng `team_id` từ lúc TẠO, không chỉ lúc đọc lại), rồi so
  DANH SÁCH id (không so count, luật 8 skill) theo cả hai chiều ctx · xuyên team chặn ở
  CẢ đọc (`layNhieu`) lẫn ghi (`themMoi`, `suaTheoId`), đếm `nhat_ky` trước/sau từng lượt
  · `bo_luat_chung` 2/1/1 + ca đối chứng "luật đồng nhất sẽ mất dòng toàn hệ" (giữ lại lý
  do đặc cách tồn tại, giống ca S6 của L0-M1) · `suaTheoId` không đụng được dòng
  `team_id IS NULL` (đặc cách chỉ ở phía đọc, xem §3.5).

**Nhánh KHÔNG chạm:** đường phục vụ request thật (chưa tồn tại — L1+ mới xây, cấm dùng
`ctxHeThong` ở đó là quy ước theo dõi bằng review, không có code để test lúc này) ·
`layMotTheoId`/`suaTheoId` phối hợp `ctxHeThong` (đã CHẶN chủ đích thay vì để mù, xem
§3.3, nên "không chạm" ở đây nghĩa là "chạm đúng nhánh từ chối", có ca `B11`).

## 6 · Ngoài phạm vi

Không phát hiện gì cần APPEND §9 sổ điều hành trong lượt này — mọi chỗ phải quyết đều
nằm TRONG quyền quyết của phiếu này (định hình `ctx`, phạm vi bảng, hành vi `ctxHeThong`)
và đã ghi thành quyết định có lý do ở §3, không phải nợ để lại. Không đụng `db/`,
không đụng file phẳng dưới `src/`, không đổi `package.json` — pathspec ③ giữ nguyên.

Không còn marker `[NEEDS CLARIFICATION]` nào trong lượt này.
