# PHIẾU L0-M2 — Tầng truy vấn tự chèn điều kiện team; thiếu bối cảnh → NÉM LỖI

**Base:** `70335be` · **Làn:** 🟥 lõi cách ly team — nhưng thợ **sonnet** (route
tiết kiệm 22/08: nghiệm thu ④ viết sẵn gánh chất lượng); KHÔNG refute per-phiếu

> Phiếu là HỢP ĐỒNG giữa tổng và thợ. Thợ nạp skill `tho-thi-cong` trước khi làm.
> Đọc `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §0a (4 luật dự án) trước khi gõ phím.
> Phát SAU khi L0-M1 ✅ (cần lược đồ + `docs/v3/ban-giao/luoc-do-v1.md` tồn tại).

## ① Thi hành đoạn spec nào

- `docs/v3/02-KE-HOACH-CODE.md` §"L0 · Nền dữ liệu" — mục "Tầng truy vấn tự chèn điều kiện
  team theo người đăng nhập" + mục "Nghiệm thu" (chặn xuyên team ở tầng dữ liệu, có nhật ký).
- `docs/v3/01-QUYET-DINH.md` §8 — luật cứng: "điều kiện team nằm ở TẦNG TRUY VẤN, tự chèn
  theo người đang đăng nhập — không phải bộ lọc trên màn hình".
- `docs/v3/06-PROMPT-GIAO-VIEC.md` khối "② LỚP TEAM" — "Truy vấn không có bối cảnh team
  phải NÉM LỖI, không trả dữ liệu rỗng".
- `docs/v3/ban-giao/luoc-do-v1.md` (L0-M1 sinh) — danh sách bảng + hai câu hợp đồng
  (picker `WHERE NOT la_ky_thuat` · `bo_luat_chung (team_id = $ctx OR team_id IS NULL)`).
- Sổ điều hành §2 khối "Dặn trước cho phiếu L0-M2" — CHỐNG ĐẠT RỖNG (nguồn: verdict
  `nghiep-vu-L0-M1.verdict.yaml` câu 7).
- `docs/v3/05-PHAN-VIEC.md` — điểm bàn giao 2 (hàm gọi + cách truyền bối cảnh team, B dùng)
  và điểm 5 (bối cảnh team SAU đăng nhập là việc của B — phiếu này chỉ ĐỊNH NGHĨA hình dạng
  bối cảnh và nhận nó qua tham số, KHÔNG làm đăng nhập).

## ② Hợp đồng vào/ra

**Vào (thợ ĐO LẠI trước khi code):** lược đồ thật trong `talpha-pg:5433/aicloser_v3`
(19 bảng đã di trú, toàn bộ dữ liệu ở team `chua-phan`) · `db/ket-noi.js` + pool của L0-M1
(dùng lại, không viết pool thứ hai) · `luoc-do-v1.md`.

**Ra (đo được):**

1. `src/db/` — tầng truy vấn v3 (ESM):
   - Khuôn bối cảnh: `ctx = { teamId, nguoiDungId }` — hình dạng CHỐT Ở ĐÂY, ghi vào file
     bàn giao cho B (điểm 5 của 05-PHAN-VIEC: B tạo ctx sau đăng nhập rồi truyền vào đây).
   - Mọi hàm đọc/ghi bảng nghiệp vụ NHẬN `ctx` bắt buộc và TỰ CHÈN `team_id = ctx.teamId`.
   - `ctx` thiếu/không hợp lệ (teamId rỗng, team không tồn tại, team `la_ky_thuat`) →
     **NÉM LỖI có tên riêng** (vd `LoiThieuBoiCanhTeam`) — cấm trả mảng rỗng.
   - Truyền tay `team_id` khác trong tham số/filter → tầng truy vấn CHẶN (lỗi riêng) và
     **ghi một dòng `nhat_ky`** (hành vi xuyên team bị chặn, kèm nguoiDungId + team đích).
   - `bo_luat_chung`: đọc bằng `(team_id = $ctx OR team_id IS NULL)` — đúng nguyên văn
     hợp đồng N3. Bảng dùng chung (`team`,`nguoi_dung`,`vai`) có hàm riêng không đòi ctx,
     nhưng hàm liệt kê team cho picker MẶC ĐỊNH `WHERE NOT la_ky_thuat`.
   - Cửa thoát có kiểm soát cho JOB NỀN (di trú, cron toàn hệ): `ctxHeThong()` trả bối cảnh
     đánh dấu `laHeThong=true` — dùng nó thì mọi lượt gọi ghi `nhat_ky` (máy làm cũng ghi,
     01 §9). Cấm dùng trong đường phục vụ request.
2. `docs/v3/ban-giao/tang-truy-van-v1.md` — điểm bàn giao 2 cho B: danh sách hàm + chữ ký +
   cách truyền ctx + hai lỗi có tên + ví dụ gọi đúng/sai.

## ③ File được đụng (pathspec)

```
src/db/
test/l0-m2-*.test.js
docs/v3/ban-giao/tang-truy-van-v1.md
ops/bin/nghiem-thu/l0-m2.sh
docs/thi-cong/nhat-ky/phieu-l0-m2.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← CHỈ append §9 + §10
```

`src/db/` là THƯ MỤC CON MỚI — ⛔ không sửa file nào ngay dưới `src/` (bản đang chạy),
không đụng `db/` (đất của L0-M1, đã chốt), không đổi `package.json`.

## ④ Nghiệm thu BẰNG NỘI DUNG (viết TRƯỚC) — đóng gói `ops/bin/nghiem-thu/l0-m2.sh`

```bash
# 1. Gọi một hàm truy vấn KHÔNG ctx → ném đúng lỗi có tên (test in tên lỗi bắt được)
# 2. CHỐNG ĐẠT RỖNG (dặn §2 sổ): test tự chèn mẩu dữ liệu TRỘN ≥2 team nghiệp vụ
#    (tieu-alpha + auus, mỗi team ≥1 dòng khach/hoi_thoai) RỒI MỚI đo:
#    ctx tieu-alpha đọc ra ĐÚNG DANH SÁCH dòng của tieu-alpha (so id từng dòng, không so
#    count), 0 dòng của auus lẫn chua-phan; đổi ctx auus → ngược lại
# 3. Truyền tay team_id=auus trong filter khi ctx=tieu-alpha → bị chặn (lỗi có tên) VÀ
#    SELECT count(*) FROM nhat_ky WHERE <dấu vết hành vi bị chặn> tăng đúng 1 (in trước/sau)
# 4. ctx trỏ team la_ky_thuat (chua-phan) → ném lỗi (rào N2 phía đọc)
# 5. bo_luat_chung: chèn 1 dòng NULL + 1 dòng tieu-alpha → ctx tieu-alpha thấy 2, ctx auus
#    thấy 1 (in cả hai số) — hợp đồng N3
# 6. Hàm picker team trả về đúng 3 slug nghiệp vụ, không có chua-phan (in danh sách)
# 7. ctxHeThong: một lượt gọi ghi nhat_ky (count trước/sau lệch 1)
# 8. npm test xanh toàn bộ (test cũ + l0-m1 + l0-m2); mẩu dữ liệu trộn của test tự dọn
#    (DELETE đúng id mình chèn — KHÔNG TRUNCATE, không đụng dữ liệu di trú)
```

Mỗi phép in MỘT CON SỐ hoặc MỘT DIFF DANH SÁCH — cấm "chạy xong không lỗi" suông.

## ⑤ Test chạm nhánh nào

Nhánh thật: DB đã di trú thật (dữ liệu nằm ở `chua-phan`). Mẩu trộn team ở ④#2 là fixture
CÓ NEO (verdict L0-M1 câu 7 + dặn §2 sổ: dữ liệu thật chưa gán team nghiệp vụ nên đo cách ly
trên dữ liệu thật là đo trên tập rỗng) — khai rõ trong nhật ký, dọn sau test.

## ⑥ Ngoài phạm vi

Thấy gì ngoài ③ (kể cả lỗi lược đồ L0-M1 để lại) → APPEND §9 sổ, cấm tiện tay sửa —
lược đồ đã ✅ thì sửa nó là phiếu mới, không phải việc của mày.

## ⑦ ĐÃ TRA CHƯA — OUTPUT MÁY

```
$ grep -rn "truy van\|truy-van\|tang_truy_van\|L0-M2\|src/db" docs/thi-cong/nhat-ky/*.md docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep -v "PHIEU-L0-M2"
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md:115:| L0-M2 | Tầng truy vấn tự chèn... | ⬜ |
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md:121:Dặn trước cho phiếu L0-M2 ... (chống ĐẠT RỖNG)
```

Quan hệ: **thi-hành-nợ** — phiếu này thi hành trực tiếp N3 (hợp đồng `bo_luat_chung`) và
khối dặn-trước chống đạt-rỗng trong §2 sổ (đẻ từ verdict L0-M1 câu 7). Không trùng phiếu nào.

---

**Khi làm:** đề mơ hồ → cắm `[NEEDS CLARIFICATION: câu hỏi]`, làm tiếp phần chắc.

**Khi nộp:** nhật ký `docs/thi-cong/nhat-ky/phieu-l0-m2.md` · APPEND 3 dòng §10 sổ · commit
pathspec ③ (`feat(db): L0-M2 — ...`) · trả lời tổng ≤15 dòng.
