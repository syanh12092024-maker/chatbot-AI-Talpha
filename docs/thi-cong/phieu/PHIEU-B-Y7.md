# PHIẾU B-Y7 — cột `page.bot_ai_bat` đã lệch khỏi sự thật, và con số ② của màn nguy hiểm nhất đang lấy từ nó

**Base:** `14fa7fa` · **Làn:** 🟥 (sửa số đếm mà màn «Bộ luật chung» dùng để cho phép bấm áp)

> Người B phát cho người A. Người B **không** sửa `src/db/noi-dung.js` — đó là đất của A.

## ① Thi hành đoạn spec nào

- `docs/v3/01-QUYET-DINH.md` §9 — bộ luật chung, điều kiện được bấm áp
- Tiêu chí nghiệm thu giai đoạn 2, màn «Bộ luật chung»: *trước khi cho áp phải hiện **bao
  nhiêu page bị ảnh hưởng***

## ② Hợp đồng vào/ra

**Vào — ĐO ĐƯỢC THẬT trên `169.58.33.8` ngày 25/08/2026, không phải suy đoán:**

| Nguồn | Câu lệnh | Kết quả |
|---|---|---|
| CSDL v3 | `select count(*) filter (where bot_ai_bat) from page` | **50** |
| Tiến trình bot (file) | `cat /opt/aicloser/ai-enabled.json` | **`[]`** — 0 page, 2 byte |
| Tiến trình bot (RAM) | `GET /admin/api/readiness` → `aiEnabled` | **0/676 page** |

File và RAM khớp nhau ⇒ **sự thật là 0**. Cột `page.bot_ai_bat` lệch đúng 50.

**Chuỗi bằng chứng về nguyên nhân — đã loại trừ ba khả năng:**

1. *Không phải màn của người B gạt.* `select hanh_dong, count(*) from nhat_ky group by 1`
   → chỉ có `doc | 1043`. Không một dòng bật/tắt bot nào.
2. *Không phải `readiness.js` tự tắt.* `.env` dòng 50: `READINESS_AUTO_DISABLE=0`.
3. *Không phải khởi động lại làm mất RAM.* `systemctl show aicloser` → `NRestarts=0`,
   `ActiveEnterTimestamp=2026-08-23 05:23`. Tiến trình chạy liên tục **trước** lúc file đổi.

`stat ai-enabled.json` → sửa lúc **2026-08-24 12:13:32**, tức là trong lúc bot đang chạy.
`setAiEnabled()` vừa đổi RAM vừa ghi file, nên cả hai cùng rỗng ⇒ 50 page đã bị tắt qua
dashboard v1 hôm 24/08, và CSDL v3 không hề biết.

**Ra:** con số *«bao nhiêu page đang bật bot»* mà `apBoLuat`/`demAnhHuong` trả về phải là
con số của tiến trình bot, hoặc — nếu vẫn đọc cột — phải kèm cờ báo cột đang cũ.

## ③ File được đụng (pathspec)

```
src/db/noi-dung.js
test/l0-m2-noi-dung.test.js
```

**Ngoài phạm vi (người B đã tự làm, A không cần đụng):** `v3/src/ui/san-sang/*` đã hiện
chỗ lệch ra màn, có ví dụ từng page — xem `manSanSang().lech`.

## ④ Nghiệm thu BẰNG NỘI DUNG

```bash
# ① Con số ảnh hưởng KHÔNG được lấy mù từ cột nữa
grep -n "FILTER (WHERE bot_ai_bat)" src/db/noi-dung.js      # kỳ vọng: 0 dòng, HOẶC kèm cờ `nguon_cu`

# ② Lệch phải lộ ra ở tầng dữ liệu, không chỉ ở màn của B
node --test test/l0-m2-noi-dung.test.js                      # kỳ vọng: có bài «cột lệch → báo»

# ③ Đo lại trên máy chủ sau khi sửa
psql "$DATABASE_URL_V3" -tAc "select count(*) filter (where bot_ai_bat) from page"
curl -s -u "$ADMIN_USER:$ADMIN_PASS" localhost:3100/admin/api/readiness \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).pages.filter(p=>p.aiEnabled).length))'
# kỳ vọng: hai số bằng nhau, HOẶC màn/API báo lệch
```

## ⑤ Test chạm nhánh nào

Nhánh THẬT phải chạm: `demAnhHuong` khi cột và bot **khác nhau**. Không dựng fixture cho
cả hai bằng nhau rồi coi là xong — cảnh bằng nhau chính là cảnh bài test cũ đã xanh trong
khi thực tế đã lệch 50 page suốt từ 24/08.

## ⑥ Ngoài phạm vi

Câu hỏi **ai được quyền sửa cột `bot_ai_bat`** (đồng bộ ngược từ bot xuống CSDL, hay bỏ hẳn
cột và luôn hỏi bot) là quyết định kiến trúc, không thuộc phiếu này → ghi sổ nợ.

## ⑦ ĐÃ TRA CHƯA — dán OUTPUT MÁY

```
$ grep -rn "bot_ai_bat" src/db/
src/db/kich-ban.js:365:      "SELECT id, page_id, bot_ai_bat FROM page WHERE team_id = $1 ORDER BY page_id",
src/db/noi-dung.js:133:              count(*) FILTER (WHERE bot_ai_bat)::int dang_bat
src/db/noi-dung.js:174:      `SELECT p.id, p.page_id, p.ten, p.bot_ai_bat,
src/db/noi-dung.js:189:        soPageDangBatBot: cham.filter((p) => p.bot_ai_bat).length,
src/db/noi-dung.js:414:      `SELECT count(*)::int tong, count(*) FILTER (WHERE bot_ai_bat)::int dang_bat
src/db/so-lieu.js:103:      `SELECT p.page_id, p.ten, p.bot_ai_bat, p.marketer,

$ grep -rn "bot_ai_bat" docs/thi-cong/phieu/ docs/thi-cong/nhat-ky/
(không có)
```

**Quan hệ: MỚI.** Chưa phiếu nào và chưa dòng nhật ký nào chạm cột này. Phiếu B-Y4 trước đó
chạm cột `marketer` cùng bảng nhưng khác vấn đề (bị migration ghi đè, đã đóng).
