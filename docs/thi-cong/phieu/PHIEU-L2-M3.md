# PHIẾU L2-M3 — Ráp prompt BỐN KHỐI từ DB + ngân sách lượt theo độ nóng + cờ page trọng điểm

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟨 (nội bộ src/chat — đổi NGUỒN prompt và NHỊP lượt,
không mở đường gửi mới) · thợ **sonnet** · điểm (a) tổng tự chấm: thi hành 01 §6 («tách
bốn khối ngay từ giai đoạn 1, kể cả khi chưa làm giao diện» — mỗi khối một chủ, một nhịp
đổi) + 02 §L2 («bỏ trần 4 lượt cứng, thay bằng ngân sách theo độ nóng» + «page trọng
điểm»); bỏ phiếu này thì bộ luật chung vẫn chôn trong `prompts.js` — marketer không bao
giờ sửa được thứ «quyết định bot tư vấn giỏi hay dở».

> Thợ nạp skill `tho-thi-cong` (2 bài học mới cuối). Đọc sổ §0a + §7b.
> PHÁT khi src/chat rảnh (sau L2-M2).

## ① Thi hành

- `docs/v3/01-QUYET-DINH.md` §6 — bảng 4 khối (bộ luật chung 2.256 tk · kỹ năng ~180/kn
  «bật theo nhóm sản phẩm» · kịch bản page ~1.400 · dữ liệu SP ~1.500 từ POS).
- `docs/v3/02-KE-HOACH-CODE.md` §L2 — tách 4 khối trong code · ngân sách lượt theo độ
  nóng · page trọng điểm (cờ, bộ ca test rộng hơn — phần «đo hằng ngày» là §7b/T4).
- `docs/v3/ban-giao/luoc-do-v1.md` — bảng `bo_luat_chung` (team_id NULL = toàn hệ, hợp
  đồng đọc OR IS NULL) · `ky_nang` (cột «bật cho nhóm sản phẩm nào») · `kich_ban` (bản
  cho người + bản cho máy) · `page.trong_diem`.
- `docs/v3/ban-giao/duong-tin-v1.md` — handler gọi `buildSystem(kb)` (CẤM SỬA prompts.js)
  và bậc từ-khoá L2-M2 đứng trước.

## ② Vào/ra

**Vào (ĐO LẠI):** `buildSystem(kb)` cần `kb` hình dạng gì (đọc prompts.js + kb.js — CẤM
SỬA, chỉ đọc khuôn) · bảng `bo_luat_chung`/`ky_nang` đang RỖNG (chưa ai nạp) — phiếu này
phải NẠP MỒI (seed di trú: bộ luật chung rút từ prompts.js hiện hành thành BẢN DỮ LIỆU
đầu tiên trong DB, đánh version 1; kỹ năng «hỏi size» làm kỹ năng mẫu đầu — 01 §6 chỉ
đích danh 2 SP có size hoàn 26,8%/19,2% chưa bật kỹ năng size) · `lead-score.js`
(`turnBudget`, `HARD_MAX_TURNS` — cấm sửa, đọc khuôn).

**Ra:**

1. `src/chat/rap-prompt.js` — ráp `kb` cho `buildSystem` từ BỐN NGUỒN DB:
   `bo_luat_chung` (theo hợp đồng `team_id = $ctx OR IS NULL`, lấy version mới nhất) +
   `ky_nang` (CHỈ kỹ năng bật cho nhóm SP của page) + `kich_ban` (bản-cho-máy của page)
   - `san_pham`/`goi_gia` (từ POS — L1-M1 đã đổ). Khối nào RỖNG → khai `nguon:'thieu'`
     trong kết quả + ghi `so_ai`/nhật ký lượt đó (mù-có-nói-ra, không im); fallback về
     đường KB cũ (kb.js) theo cờ config để không gãy 51 page hiện hành lúc cutover từng
     phần.
2. `src/chat/ngan-sach-luot.js` — thay trần 4 lượt cứng: ngân sách theo ĐỘ NÓNG (điểm
   lead từ `lead-score.js` cũ đọc-qua-import): nóng nhiều lượt hơn, nguội ít; trần tuyệt
   đối vẫn tồn tại (an toàn chi phí — lấy `HARD_MAX_TURNS` cũ làm trần trần). Handler
   đọc ngân sách từ đây thay hằng cũ.
3. Cờ `page.trong_diem`: handler ghi `so_ai` kèm `trong_diem` flag (để T4 đo riêng);
   KHÔNG làm dashboard (giai đoạn 2).
4. Append `duong-tin-v1.md` §ráp-prompt: hợp đồng 4 khối + thứ tự ưu tiên khi thiếu.

## ③ Pathspec

```
src/chat/rap-prompt.js
src/chat/ngan-sach-luot.js
src/chat/                          ← CHỈ chỗ đấu 2 module vào handler
db/di-tru/bo-luat-va-ky-nang.js    ← seed mồi bộ luật chung v1 + kỹ năng size
db/di-tru/index.js                 ← CHỈ thêm mục gọi
test/l2-m3-*.test.js
docs/v3/ban-giao/duong-tin-v1.md   ← CHỈ append
ops/bin/nghiem-thu/l2-m3.sh
docs/thi-cong/nhat-ky/phieu-l2-m3.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md ← §9 + §10
```

⛔ Không sửa prompts.js/kb.js/lead-score.js/file phẳng src/ · không đụng src/orders.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/l2-m3.sh`

```bash
# 1. Ráp đủ 4 khối: page có đủ dữ liệu → kb ra ĐỦ 4 phần, buildSystem(kb) chạy không ném,
#    system chứa dấu vết từng khối (grep 4 mẩu — in độ dài từng khối)
# 2. Bộ luật chung: dòng team NULL đọc được từ ctx cả 3 team (hợp đồng N3 — in 3 lượt);
#    version 2 chèn vào → lượt sau ăn version 2 KHÔNG restart (đọc mỗi lượt/cache TTL
#    ngắn — thợ khai cách chọn trong nhật ký)
# 3. Kỹ năng theo nhóm SP: page nhóm có-size → khối kỹ năng chứa size; page nhóm khác →
#    KHÔNG chứa (đối chứng in cả hai)
# 4. Khối RỖNG nói ra: page thiếu kịch bản → kb.nguon_thieu liệt kê đúng khối + fallback
#    cờ config hoạt động (bật cờ → dùng kb.js cũ, spy=1)
# 5. Ngân sách độ nóng: 3 mức điểm lead (nguội/ấm/nóng) → 3 ngân sách tăng dần (in bảng);
#    vượt ngân sách → dừng đúng khuôn cũ (handoff, không im); trần tuyệt đối =
#    HARD_MAX_TURNS cũ không bị vượt (ép ca nóng max — in số lượt chạm trần)
# 6. Seed mồi: bo_luat_chung ≥1 dòng version 1 (nội dung RÚT từ prompts.js — diff mẩu đại
#    diện với nguồn, in 200 ký tự đầu); ky_nang có «hỏi size» gắn nhóm SP có-size
# 7. node --test l2-m3 xanh + hồi quy l2-m1/l2-m2 không gãy
```

## ⑤ Nhánh thật: chạy 3 lượt trên page thử với model thật = §7b T4 (luật «model không tất

định — chạy ít nhất BA lượt» của prompt A). ## ⑥ Ngoài phạm vi → §9.

## ⑦ ĐÃ TRA

```
§9 không nợ vùng rap-prompt. bo_luat_chung/ky_nang rỗng từ L0-M1 (cột đã có, chưa ai
ghi — «bảng có reader mà không ai ghi» chính là phiếu này nối). Không trùng.
```

**Khi nộp:** nhật ký · §10 3 dòng · commit pathspec (`feat(chat): L2-M3 — ...`) · ≤12 dòng.
