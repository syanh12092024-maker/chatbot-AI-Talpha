# PHIẾU L0-M1 — Lược đồ CSDL v3 (~18 bảng, team_id mọi nơi) + di trú dữ liệu thật từ JSON

**Base:** `80f93b2` · **Làn:** 🟥 (tổng phán: nền của mọi module đường đơn/tiền + di trú đụng
dữ liệu khách thật — nghiêng làn cao khi nghi)

> Phiếu là HỢP ĐỒNG giữa tổng và thợ. Thợ nạp skill `tho-thi-cong` trước khi làm.
> Đọc `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §0a (4 luật dự án) trước khi gõ phím.

## ① Thi hành đoạn spec nào

- `docs/v3/02-KE-HOACH-CODE.md` §"Nền dữ liệu — 18 bảng" (danh sách bảng + 2 quyết định:
  `don_hang` trạng thái riêng tách khỏi POS · `so_ai` ghi mã model từ đầu) và §"L0 · Nền
  dữ liệu" (mục "Làm gì" + "Nghiệm thu").
- `docs/v3/01-QUYET-DINH.md` §1 (hai luồng đơn ⇒ `don_hang.nguon` bắt buộc) · §8 (ba team,
  luật cứng: điều kiện team ở tầng truy vấn) · §9 (5 vai, nhật ký không sửa không xoá).
- `docs/v3/05-PHAN-VIEC.md` — L0-M1 thuộc người A; điểm bàn giao 1 & 3 (lược đồ + hình dạng
  `viec_can_xu_ly` công bố cho B).
- `docs/TONG-QUAN-HE-THONG.md` §11.1–11.2 — cấu trúc các file JSON nguồn di trú.

## ② Hợp đồng vào/ra

**Vào (thợ PHẢI ĐO LẠI cấu trúc thật trước khi code — đề bài có thể khai sai):**

- File JSON thật ở GỐC repo (đã trải từ gói bàn giao VPS 19/08, đều gitignore):
  `pages.json` (~sổ cái page) · `kb-overrides.json` (KB/kịch bản theo page — tài sản quan
  trọng nhất) · `script-versions/*.json` (lịch sử kịch bản, ~71 file) · `conv-state.json`
  (trạng thái hội thoại, ~5,4 MB) · `ai-enabled.json` (công tắc AI thật) · `stats.json`.
- `ai-messages.jsonl` (Sổ AI) **KHÔNG có ở local** (chỉ VPS) — dựng schema `so_ai` + bộ nạp
  nhận đường dẫn tham số; lượt nạp thật chạy trên VPS ở đợt cutover, KHÔNG phải trong phiếu này.
- DB đích: Postgres 16 container `talpha-pg`, chuỗi nối `.env` biến `DATABASE_URL_V3`
  (cổng 5433). ⛔ Không đụng DB nào khác trên máy (5544/5434 là của dự án khác).
- Danh sách bảng ước ~18 theo kế hoạch — **đếm lại theo bảng liệt kê trong 02**, danh sách
  thật ghi vào file bàn giao; lệch với "18" thì ghi nhật ký, không ép số.

**Ra (đo được):**

1. `db/schema.sql` — nguồn sự thật lược đồ + `db/migrate/NNN_*.up.sql|.down.sql` chạy bằng
   `npm run migrate` (runner tự viết `db/migrate.js`, bảng `_migrations` ghi bản đã áp).
2. `npm run di-tru` — script `db/di-tru/*.js` đọc các JSON trên, ghi vào DB v3,
   **idempotent** (chạy 2 lần không nhân đôi), **chỉ ĐỌC** file JSON (không sửa/xoá nguồn).
3. Seed 3 team nghiệp vụ `tieu-alpha` · `auus` · `pialpha-eu` + 1 team kỹ thuật `chua-phan`.
   **Phán của tổng:** dữ liệu di trú chưa chốt mapping team (chờ H7 §8 sổ) → toàn bộ gán
   `chua-phan`, giữ được `team_id NOT NULL`; H7 chốt thì UPDATE chuyển. KHÔNG đoán team theo
   thị trường.
4. Cột bắt buộc theo ý đồ: `don_hang.nguon` (`trang_ban_hang|messenger`) NOT NULL ·
   `don_hang` có trạng thái riêng hệ thống TÁCH cột trạng thái POS · `so_ai.ma_model` NOT NULL ·
   `khach.so_dien_thoai` là khoá nối kênh (unique trong team) · `nhat_ky` chỉ INSERT (cấm
   UPDATE/DELETE bằng trigger hoặc REVOKE) · `kich_ban` giữ cả bản-cho-người và bản-cho-máy.
   Bảng dùng chung không mang `team_id`: `team` · `nguoi_dung` · `vai`. `bo_luat_chung.team_id`
   NULLABLE (NULL = toàn hệ) — phán của tổng, ghi chú lại trong file bàn giao.
5. File bàn giao cho người B: `docs/v3/ban-giao/luoc-do-v1.md` — danh sách bảng thật + cột +
   hình dạng `viec_can_xu_ly` (điểm bàn giao 1 & 3) + các phán đã chốt ở trên.

## ③ File được đụng (pathspec)

```
db/
test/l0-m1-*.test.js
package.json
package-lock.json
docs/v3/ban-giao/luoc-do-v1.md
ops/bin/nghiem-thu/l0-m1.sh
docs/thi-cong/nhat-ky/phieu-l0-m1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← CHỈ append §10 (3 dòng, luật 15)
```

`package.json` chỉ được: thêm dep `pg`, thêm script `migrate` / `di-tru`. Ngoài danh sách
= ngoài phạm vi → ghi §9 sổ nợ, cấm sửa. ⛔ Đặc biệt: KHÔNG sửa bất kỳ file nào ngay dưới
`src/` (bản đang chạy), KHÔNG đụng `.env` ngoài việc ĐỌC.

## ④ Nghiệm thu BẰNG NỘI DUNG (viết TRƯỚC khi code) — đóng gói thành `ops/bin/nghiem-thu/l0-m1.sh`

```bash
# PG="docker exec talpha-pg psql -U aicloser -d aicloser_v3 -tAc"
# 1. Migrate idempotent: chạy 2 lần, lần 2 rc=0 và _migrations không thêm dòng
npm run migrate && N1=$($PG "SELECT count(*) FROM _migrations") && npm run migrate \
  && N2=$($PG "SELECT count(*) FROM _migrations") && [ "$N1" = "$N2" ]
# 2. So DANH SÁCH bảng: \dt khớp từng tên với danh sách khai trong luoc-do-v1.md (diff = rỗng)
# 3. Phủ team_id: số bảng nghiệp vụ THIẾU cột team_id = 0
#    (information_schema: mọi bảng public trừ team/nguoi_dung/vai/_migrations phải có team_id;
#     bo_luat_chung được phép NULLABLE, các bảng khác NOT NULL)
# 4. Di trú idempotent + so DANH SÁCH với nguồn:
#    - tập page_id trong pages.json  = tập page_id bảng page   (diff hai danh sách = rỗng)
#    - số hội thoại trong conv-state.json = count(hoi_thoai)   (in cả hai số)
#    - số file script-versions/ + số mục kb-overrides.json khớp count(kich_ban) theo cách
#      quy đổi thợ khai trong nhật ký (in phép quy đổi + hai vế)
#    - chạy di-tru lần 2 → mọi count không đổi
# 5. Seed: $PG "SELECT slug FROM team ORDER BY slug" = auus,chua-phan,pialpha-eu,tieu-alpha
# 6. nhat_ky chỉ-INSERT: UPDATE một dòng nháp phải bị từ chối (bắt lỗi, rc≠0 của lệnh SQL đó)
# 7. Diễn tập down: migrate down hết trên DB ĐÃ SEED rồi up lại + di-tru lại → mục 2–5 vẫn đạt
# 8. npm test xanh (bộ test cũ của bản đang chạy KHÔNG được gãy + test mới của phiếu pass)
```

Mỗi phép in MỘT CON SỐ hoặc MỘT DIFF DANH SÁCH — cấm "chạy xong không lỗi" suông.

## ⑤ Test chạm nhánh nào

Nhánh THẬT: di trú chạy trên chính các file JSON thật ở gốc repo (không fixture bịa).
Nhánh không chạm được ở local (khai vào nhật ký, không giả lập): nạp `ai-messages.jsonl`
(file chỉ có trên VPS) — test bộ nạp `so_ai` bằng 5–10 dòng JSONL mẫu trích ĐÚNG khuôn thật
từ `docs/TONG-QUAN-HE-THONG.md` §11.2, ghi rõ đó là mẫu trích.

## ⑥ Ngoài phạm vi

Thấy gì ngoài ③ (kể cả lỗi trong dữ liệu JSON nguồn, bug bản đang chạy, thiếu sót spec) →
APPEND `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §9. Cấm tiện tay sửa.

## ⑦ ĐÃ TRA CHƯA — OUTPUT MÁY

```
$ grep -rn "schema\|luoc-do\|di-tru\|migrate\|L0-M1" docs/thi-cong/nhat-ky/ ; echo rc=$?
rc=1 (không có gì)
$ ls db → db/ chưa tồn tại
```

Quan hệ: **mới** — sổ nợ rỗng, chưa phiếu nào đụng vùng `db/`. Repo chưa có dep `pg`,
`package.json` là ESM (`"type": "module"`) — code mới viết ESM, test theo khuôn
`node --test test/`.

---

**Khi làm:** đề bài mơ hồ thì cắm `[NEEDS CLARIFICATION: câu hỏi]` ngay chỗ đó rồi làm tiếp
phần chắc — cổng chặng 1 sẽ chặn phiếu còn marker, tổng trả lời rồi thợ đóng.

**Khi nộp:** nhật ký chi tiết vào `docs/thi-cong/nhat-ky/phieu-l0-m1.md` · APPEND đúng 3 dòng
vào §10 sổ · commit pathspec ③ (`feat(db): L0-M1 — ...`) · trả lời tổng ≤15 dòng (trạng thái ·
con số nghiệm thu · commit hash · đường nhật ký).
