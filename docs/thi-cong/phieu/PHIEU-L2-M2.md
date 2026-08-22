# PHIẾU L2-M2 — Lớp từ khoá v3 trước bộ não: 2 luật Botcake chưa phủ + vá `paano mag order`

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟨 (nội bộ src/chat, không gửi gì mới ra ngoài) ·
thợ **sonnet** · điểm (a) tổng tự chấm: thi hành 01 §2 bảng đối chiếu 10 page + §12 lỗ
`paano`; bỏ đi thì tắt Botcake (T3) là mất 2 nhóm câu khách hỏi nhiều nhất chưa ai đỡ.

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a + §7b (T3 là phần thật của phiếu này — tắt
> Botcake 3 page + bật 2 lớp cũ là việc buổi chạy thử, KHÔNG phải của mày).

## ① Thi hành

- `docs/v3/01-QUYET-DINH.md` §2 — bảng đối chiếu: 3 luật trùng (giá/ngày giao/freeship —
  lớp 0 đồng cũ ĐÃ phủ) · **2 luật PHẢI NHẬP trước khi tắt: nhận diện thật/giả (0/10) ·
  hỏi size (0/10)** · «chưa có tiền» để AI xử, KHÔNG làm luật.
- `docs/v3/01-QUYET-DINH.md` §12 — lỗ `paano mag order` (tiếng Philippines viết tách)
  lớp cũ không bắt.
- `docs/v3/02-KE-HOACH-CODE.md` §L2 — "nhập 2 luật từ khoá Botcake chưa phủ" + "sửa lỗ
  paano mag order".
- `docs/v3/ban-giao/duong-tin-v1.md` §0 — handler v3 là nhạc trưởng; lớp này đứng TRƯỚC
  `classify`/`fastLane` trong handler.

## ② Vào/ra

**Vào (ĐO LẠI):** `src/fast-lane.js` (CẤM SỬA) — đọc để biết khuôn luật cũ + vì sao
`paano mag order` trượt (họ từ khoá `how to order`); `src/chat/` handler v3 (đất L2-M1
đã ✅ — mày THÊM bậc, không đảo kiến trúc); KB per-page (kb.js) cho câu trả lời size.

**Ra:**

1. `src/chat/lop-tu-khoa.js` — bậc từ-khoá v3 chạy TRƯỚC classify/fastLane trong handler:
   - Luật `thật/giả`: bộ từ khoá đa ngôn ngữ (AR/EN/PH — thợ rút từ 10 page thật trong
     kb-overrides nếu đo được, ghi nguồn từng cụm vào nhật ký) → câu trả lời khẳng định
     hàng thật theo KB page (không bịa nội dung — thiếu KB thì NHƯỜNG bộ não, không đáp
     bừa).
   - Luật `hỏi size`: bắt câu hỏi size → trả bảng size từ KB page; page không có dữ liệu
     size → NHƯỜNG bộ não (fail-open về phía AI, không im lặng).
   - Vá `paano`: họ từ khoá how-to-order thêm biến thể tách chữ PH (`paano mag order`,
     `paano umorder`, `pano mag order`…) — thợ đo thêm biến thể thật từ dữ liệu nếu có.
   - Mỗi lượt bắt được → ghi `so_ai` sự kiện `reply` với `lane='tu_khoa_v3'`, 0 token.
2. Đấu vào handler (`src/chat/`): bắt được → trả lời qua cửa + DỪNG (không gọi model);
   không bắt được → đường cũ nguyên vẹn.

## ③ Pathspec

```
src/chat/lop-tu-khoa.js
src/chat/                         ← CHỈ chỗ đấu bậc mới vào handler
test/l2-m2-*.test.js
ops/bin/nghiem-thu/l2-m2.sh
docs/v3/ban-giao/duong-tin-v1.md  ← CHỈ append §bậc-từ-khoá
docs/thi-cong/nhat-ky/phieu-l2-m2.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md  ← §9 + §10
```

⛔ Không sửa `fast-lane.js`/file phẳng src/ · không đụng src/orders src/pos src/channels.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/l2-m2.sh`

```bash
# 1. Bắt đúng: bộ ca ≥12 câu thật/giả + ≥8 câu size (đa ngôn ngữ, in từng câu + lane) →
#    trả lời từ KB, model 0 lượt (spy layModel=0)
# 2. paano: «paano mag order» + ≥3 biến thể → bắt (trước đây trượt — in đối chứng bản cũ
#    fastLane không bắt)
# 3. NHƯỜNG đúng: page KHÔNG có KB size → bậc từ-khoá không đáp, model được gọi (spy=1)
# 4. Không cướp diễn đàn: 10 câu KHÔNG thuộc 2 luật (hỏi giá, địa chỉ…) → bậc mới không
#    bắt (đường cũ nguyên — fastLane/classify vẫn nhận)
# 5. so_ai: lượt bắt được ghi lane='tu_khoa_v3', token=0 (SELECT in ra)
# 6. node --test test/l2-m2 xanh + hồi quy l2-m1 không gãy
```

## ⑤ Nhánh thật: bộ câu rút từ dữ liệu thật nếu đo được (kb-overrides/conv mẫu §11.2);

đo hiệu quả trên khách thật = §7b T3/T4. ## ⑥ Ngoài phạm vi → §9.

## ⑦ ĐÃ TRA

```
Sổ §9: không nợ nào vùng src/chat/lop-tu-khoa. 01 §2 là neo duy nhất — «chưa có tiền»
CỐ Ý không làm luật (để AI thương lượng), đừng thêm.
```

**Khi nộp:** nhật ký · §10 3 dòng · commit pathspec (`feat(chat): L2-M2 — ...`) · ≤12 dòng.
