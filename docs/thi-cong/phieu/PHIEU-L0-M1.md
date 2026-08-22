# PHIẾU L0-M1 — Lược đồ CSDL v3 (19 bảng, team_id mọi nơi) + di trú dữ liệu thật từ JSON

**Base:** `80f93b2` · **Làn:** 🟥 (tổng phán: nền của mọi module đường đơn/tiền + di trú đụng
dữ liệu khách thật — nghiêng làn cao khi nghi)

> Phiếu là HỢP ĐỒNG giữa tổng và thợ. Thợ nạp skill `tho-thi-cong` trước khi làm.
> Đọc `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §0a (4 luật dự án) trước khi gõ phím.
> Bản v2 — đã sửa theo review nghiệp vụ điểm (a):
> `docs/thi-cong/nhat-ky/nghiep-vu-L0-M1.verdict.yaml` (N1–N8).

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

**Vào (thợ PHẢI ĐO LẠI cấu trúc thật trước khi code — đề bài có thể khai sai; số dưới đây
là số tổng + reviewer đo 22/08):**

- File JSON thật ở GỐC repo (trải từ gói bàn giao VPS 19/08, đều gitignore):
  - `pages.json` — sổ cái page, **502 page** (không phải 315 của 01-QUYET-DINH — số đó là
    thời điểm khác; lấy số đo thật làm chuẩn, ghi nhật ký).
  - `ai-enabled.json` — **CÔNG TẮC AI THẬT**: mảng phẳng **47 page_id** đang bật AI
    (TONG-QUAN §11.1: "vòng poll chạy theo file này"). ⚠️ Có ít nhất 1 page bật AI **không
    nằm trong `pages.json`** (`1125576063976794`) — mọi page lạc kiểu này phải được **LIỆT KÊ
    RA nhật ký + APPEND §9 sổ**, cấm nuốt im (UPDATE chạm 0 dòng là mất công tắc câm).
  - `kb-overrides.json` (~73 mục, KB/kịch bản theo page — tài sản quan trọng nhất) ·
    `script-versions/*.json` (~70 file lịch sử kịch bản) · `conv-state.json` (**~18.790 hội
    thoại**, ~5,4 MB).
  - **KHÔNG nạp:** `stats.json` (TONG-QUAN §11.2: Sổ AI là "nguồn số duy nhất — không có
    bảng thống kê song song") · `page-*-cache.json`, `health-state.json`, `miner-state.json`
    (cache/trạng thái tự sinh lại được). Cấm đẻ bảng đích cho chúng.
- `ai-messages.jsonl` (Sổ AI) **KHÔNG có ở local** (chỉ VPS) — dựng schema `so_ai` + bộ nạp
  nhận đường dẫn tham số; lượt nạp thật + đối chiếu số dòng chạy trên VPS đợt cutover
  (đã mở nợ §9 sổ — vế này KHÔNG tính là đạt ở GATE R0).
- DB đích: Postgres 16 container `talpha-pg`, chuỗi nối `.env` biến `DATABASE_URL_V3`
  (cổng 5433). ⛔ Không đụng DB nào khác trên máy (5544/5434 là của dự án khác).

**Ra (đo được):**

1. `db/schema.sql` — nguồn sự thật lược đồ + `db/migrate/NNN_*.up.sql|.down.sql` chạy bằng
   `npm run migrate` (runner tự viết `db/migrate.js`, bảng `_migrations` ghi bản đã áp).
   Danh sách bảng = **19 tên trích từ 02** (team · nguoi_dung · vai · thanh_vien_team ·
   cau_hinh_model · page · san_pham · goi_gia · khach · hoi_thoai · so_ai · don_hang ·
   viec_can_xu_ly · hang_cho_tao_don · kich_ban · bo_luat_chung · ky_nang · lich_nhac ·
   nhat_ky) + `_migrations`. Thêm/bớt bảng nào phải khai lý do trong `luoc-do-v1.md`.
2. `npm run di-tru` — script `db/di-tru/*.js` đọc các JSON trên, ghi vào DB v3,
   **idempotent** (chạy 2 lần không nhân đôi), **chỉ ĐỌC** file JSON (không sửa/xoá nguồn).
3. Team: seed 3 team nghiệp vụ `tieu-alpha` · `auus` · `pialpha-eu` + 1 team kỹ thuật
   `chua-phan`. **Rào cứng cho team kỹ thuật (N2):** cột
   `team.la_ky_thuat boolean NOT NULL DEFAULT false`, `chua-phan` = true; **cấm gán thành
   viên vào team kỹ thuật** — thi hành ở mức DB (trigger/constraint trên `thanh_vien_team`),
   không chỉ ở code. Dữ liệu di trú chưa chốt mapping team (chờ H7 §8 sổ) → toàn bộ gán
   `chua-phan`; H7 chốt thì UPDATE chuyển. KHÔNG đoán team theo thị trường.
4. Cột bắt buộc theo ý đồ:
   - `page.bot_ai_bat boolean NOT NULL DEFAULT false` — nguồn DUY NHẤT là `ai-enabled.json`
     (N1); page ngoài danh sách = false.
   - `don_hang.nguon` (`trang_ban_hang|messenger`) NOT NULL · `don_hang` có trạng thái riêng
     hệ thống TÁCH cột trạng thái POS.
   - `so_ai.ma_model` NOT NULL · `so_ai` chỉ-INSERT như `nhat_ky`.
   - `khach.so_dien_thoai` khoá nối kênh, **NULL được** (khách Messenger giữa chừng chưa có
     số — UNIQUE Postgres cho nhiều NULL), unique trong team khi có giá trị;
     `hoi_thoai.khach_id` **nullable** (N8).
   - `nhat_ky` chỉ INSERT (cấm UPDATE/DELETE bằng trigger hoặc REVOKE).
   - `kich_ban` giữ cả bản-cho-người và bản-cho-máy.
   - `cau_hinh_model`: cột khoá API lưu **dạng mã hoá**, không nguyên văn (N7 — 02 §"Nền
     dữ liệu"; hình dạng cột chốt ở đây, người ghi là B ở L1-M4).
   - Bảng dùng chung không mang `team_id`: `team` · `nguoi_dung` · `vai`.
   - `bo_luat_chung.team_id` NULLABLE, NULL = toàn hệ. **Hợp đồng đọc (N3):** mọi truy vấn
     `bo_luat_chung` dùng `(team_id = $ctx OR team_id IS NULL)` — các bảng khác dùng luật
     đồng nhất `team_id = $ctx`. Câu này phải nằm NGUYÊN VĂN trong `luoc-do-v1.md` và có ca
     test SQL trong phiếu này.
5. File bàn giao cho người B: `docs/v3/ban-giao/luoc-do-v1.md` — danh sách bảng thật + cột +
   hình dạng `viec_can_xu_ly` (điểm bàn giao 1 & 3) + các phán đã chốt ở trên + **hai câu
   hợp đồng bắt buộc**: (i) màn chọn team CHỈ `SELECT … WHERE NOT la_ky_thuat` — cấm hiện
   `chua-phan` cho người dùng; (ii) hợp đồng đọc `bo_luat_chung` như mục 4.

## ③ File được đụng (pathspec)

```
db/
test/l0-m1-*.test.js
package.json
package-lock.json
docs/v3/ban-giao/luoc-do-v1.md
ops/bin/nghiem-thu/l0-m1.sh
docs/thi-cong/nhat-ky/phieu-l0-m1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← CHỈ append §9 (nợ phát sinh) + §10 (3 dòng, luật 15)
```

`package.json` chỉ được: thêm dep `pg`, thêm script `migrate` / `di-tru`. Ngoài danh sách
= ngoài phạm vi → ghi §9 sổ nợ, cấm sửa. ⛔ Đặc biệt: KHÔNG sửa bất kỳ file nào ngay dưới
`src/` (bản đang chạy), KHÔNG đụng `.env` ngoài việc ĐỌC.

## ④ Nghiệm thu BẰNG NỘI DUNG (viết TRƯỚC khi code) — đóng gói thành `ops/bin/nghiem-thu/l0-m1.sh`

```bash
# PG="docker exec talpha-pg psql -U aicloser -d aicloser_v3 -tAc"
# 1. Migrate idempotent: chạy 2 lần, lần 2 rc=0 và _migrations không thêm dòng
# 2. So DANH SÁCH bảng với NEO NGOÀI (N5): diff \dt ↔ 19 tên trích từ 02 (+_migrations);
#    lệch thì LIỆT KÊ TỪNG TÊN thừa/thiếu kèm lý do đã khai trong luoc-do-v1.md — cấm in tổng
# 3. Phủ team_id: bảng nghiệp vụ THIẾU cột team_id = 0
#    (mọi bảng public trừ team/nguoi_dung/vai/_migrations; bo_luat_chung được NULLABLE,
#     các bảng khác NOT NULL)
# 4. Di trú idempotent + so DANH SÁCH với nguồn (in cả hai vế mỗi phép):
#    a. tập page_id pages.json = tập page_id bảng page (diff = rỗng)
#    b. CÔNG TẮC AI (N1): count(page WHERE bot_ai_bat) in ra; diff tập page bật trong DB ↔
#       tập trong ai-enabled.json = rỗng; page bật AI KHÔNG có trong pages.json → LIỆT KÊ
#       từng id + xác nhận đã APPEND §9 (grep sổ ra dòng đó)
#    c. số hội thoại conv-state.json = count(hoi_thoai)
#    d. số file script-versions/ + số mục kb-overrides.json khớp count(kich_ban) theo phép
#       quy đổi thợ khai trong nhật ký (in phép quy đổi + hai vế)
#    e. chạy di-tru lần 2 → mọi count không đổi
#    (vế Sổ AI: KHÔNG đo ở đây — nợ §9, chạy trên VPS đợt cutover)
# 5. Team + rào kỹ thuật (N2):
#    a. SELECT slug FROM team ORDER BY slug = auus,chua-phan,pialpha-eu,tieu-alpha
#    b. SELECT count(*) FROM thanh_vien_team tv JOIN team t ON t.id=tv.team_id
#       WHERE t.la_ky_thuat = 0
#    c. INSERT thử thành viên vào chua-phan → bị DB TỪ CHỐI (rc≠0 của lệnh SQL đó)
# 6. Chỉ-INSERT: UPDATE một dòng nháp nhat_ky VÀ một dòng so_ai đều bị từ chối
# 7. Hợp đồng bo_luat_chung (N3): test chèn 1 dòng team_id=NULL + 1 dòng team tieu-alpha;
#    query theo hợp đồng (team_id=$ctx OR team_id IS NULL) từ bối cảnh CẢ 3 team nghiệp vụ:
#    tieu-alpha thấy 2 dòng, auus/pialpha-eu thấy 1 dòng
# 8. Khoá mã hoá (N7): chèn dòng nháp cau_hinh_model qua bộ ghi của phiếu → SELECT cột khoá
#    không ra chuỗi mở đầu sk-/ey (in giá trị đã lưu, cắt 10 ký tự đầu)
# 9. Diễn tập down: migrate down hết trên DB ĐÃ SEED + ĐÃ DI TRÚ rồi up lại + di-tru lại
#    → mục 2–8 vẫn đạt
# 10. npm test xanh (bộ test cũ của bản đang chạy KHÔNG gãy + test mới của phiếu pass)
```

Mỗi phép in MỘT CON SỐ hoặc MỘT DIFF DANH SÁCH — cấm "chạy xong không lỗi" suông.

## ⑤ Test chạm nhánh nào

Nhánh THẬT: di trú chạy trên chính các file JSON thật ở gốc repo (không fixture bịa).
Nhánh không chạm được ở local (khai vào nhật ký, không giả lập): nạp `ai-messages.jsonl`
(file chỉ có trên VPS) — test bộ nạp `so_ai` bằng 5–10 dòng JSONL mẫu trích ĐÚNG khuôn thật
từ `docs/TONG-QUAN-HE-THONG.md` §11.2, ghi rõ đó là mẫu trích.

## ⑥ Ngoài phạm vi

Thấy gì ngoài ③ (kể cả lỗi trong dữ liệu JSON nguồn, bug bản đang chạy, thiếu sót spec) →
APPEND `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §9. Cấm tiện tay sửa. Riêng hai dòng nợ đã
biết trước (Sổ AI cutover · page lạc ngoài pages.json) tổng đã/sẽ mở — thợ chỉ bổ sung số đo.

## ⑦ ĐÃ TRA CHƯA — OUTPUT MÁY

```
$ grep -rn "schema\|luoc-do\|di-tru\|migrate\|L0-M1" docs/thi-cong/nhat-ky/ ; echo rc=$?
rc=1 (không có gì)                       # lượt tra 1, trước khi có verdict
$ ls db → db/ chưa tồn tại
```

Quan hệ: **mới** — sổ nợ rỗng lúc tra, chưa phiếu nào đụng vùng `db/`. Sau lượt tra, review
điểm (a) đã sinh `nghiep-vu-L0-M1.verdict.yaml` — bản phiếu này CHÍNH LÀ bản đã đóng N1–N8
của verdict đó, không phải phiếu trùng. Repo chưa có dep `pg`, `package.json` là ESM
(`"type": "module"`) — code mới viết ESM, test theo khuôn `node --test test/`.

---

**Khi làm:** đề bài mơ hồ thì cắm `[NEEDS CLARIFICATION: câu hỏi]` ngay chỗ đó rồi làm tiếp
phần chắc — cổng chặng 1 sẽ chặn phiếu còn marker, tổng trả lời rồi thợ đóng.

**Khi nộp:** nhật ký chi tiết vào `docs/thi-cong/nhat-ky/phieu-l0-m1.md` · APPEND đúng 3 dòng
vào §10 sổ · commit pathspec ③ (`feat(db): L0-M1 — ...`) · trả lời tổng ≤15 dòng (trạng thái ·
con số nghiệm thu · commit hash · đường nhật ký).
