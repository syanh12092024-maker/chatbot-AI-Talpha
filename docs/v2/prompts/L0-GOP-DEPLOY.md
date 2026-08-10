Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page).

# LUỒNG 0 — GỘP · DEPLOY · THEO DÕI 48H
### (chạy MỘT MÌNH, sau khi L1–L4 xong, trước khi mở vòng 2)

## Đọc trước khi làm
1. `docs/v2/06-LO-TRINH.md` — trạng thái từng module
2. `docs/v2/08-SONG-SONG.md` §4 — thứ tự gộp
3. `.claude/skills/chatbot/references/van-hanh.md` — quy trình deploy đang dùng
4. `.claude/skills/chatbot/references/su-co.md` — cách chẩn đoán khi bot im/sai

## Vì sao luồng này tồn tại
Vòng 1 sinh ra 4 nhánh chưa bao giờ chạy trên khách thật. Mọi con số dự phóng
(Fast Lane 36,2% · guard 2,0% · chi phí/lượt 133đ→65đ) đều đo bằng **replay**, không phải
production. Mở vòng 2 trước khi đo thật là xây tiếp trên giả định.

## Phần A · Gộp 4 nhánh

Thứ tự bắt buộc (ít file nhất trước): **L4 → L1 → L2 → L3**

```
git checkout fix-images
git merge v2/l4-prompt      # rồi npm test
git merge v2/l1-do          # rồi npm test
git merge v2/l2-luong-chat  # rồi npm test
git merge v2/l3-nhap-lieu   # rồi npm test
```

Sau MỖI lần gộp: `npm test` xanh + server boot + `/health` = 200. Đỏ ở bước nào thì
dừng, sửa, rồi mới gộp tiếp — đừng gộp dồn.

Điểm xung đột đã lường trước (mỗi chỗ 1 dòng, merge tay 10 giây):
- `src/admin.js` — mỗi luồng thêm 1 dòng `adminRouter.use(...)`
- `public/admin.html` — mỗi luồng thêm 1 dòng link topbar
- `src/handler.js` — chỉ L2 sở hữu; nếu luồng khác đụng vào là họ đã phá luật, phải review kỹ

**Kiểm tra chéo sau khi gộp xong** (đây là chỗ dễ lọt nhất):
- [ ] L4 biến `classify()` thành luật thuần → L2 vẫn gọi được, không lỗi shape
- [ ] L2 (`lead-score`) và L4 (bỏ `score_lead`) không cùng chấm điểm hai nơi
- [ ] L1 (`scriptVersion` trong Sổ AI) và L3 (phiên bản kịch bản) dùng **cùng một** cách đánh version
- [ ] Fast Lane (L4 sửa) + ngân sách lượt (L2) không đá nhau: tin Fast Lane xử lý KHÔNG được trừ ngân sách lượt AI

## Phần B · Chạy lại toàn bộ trên dữ liệu THẬT

Trước khi deploy, kéo dữ liệu thật từ VPS (**chỉ đọc**) và replay:
- ≥5.000 tin khách thật → đo lại tỷ lệ Fast Lane (kỳ vọng ≥36%, nếu tụt phải giải thích)
- ≥4.000 tin AI thật + bảng giá thật **của đúng page đó** → đo lại tỷ lệ guard chặn
  (kỳ vọng ~2%; >5% là luật quá chặt, phải soi lại)
- ≥60 hội thoại thật → đo M05 có nhận nhầm "người thật" hội thoại nào không

⚠️ Bài học đã có: lần đo đầu báo 19% tin AI vi phạm vì dùng KB giả; đo lại với KB thật
của đúng page thì còn 2,0%. **Luôn khớp KB theo đúng pageId.**

## Phần C · Deploy

**Điều kiện tiên quyết — KHÔNG deploy nếu chưa có:**
- [ ] Chủ dự án đã **nạp tiền tài khoản Kimi** (bot đang chết vì hết credit)
- [ ] Chủ dự án **duyệt deploy** bằng lời

Quy trình (xem `van-hanh.md` để biết lệnh chính xác):
1. `ssh root@169.58.33.8` · `cd /opt/aicloser` · **`git status` TRƯỚC** — `git reset --hard`
   an toàn với dữ liệu (mọi file dữ liệu đều gitignore) nhưng **giết code sửa tay chưa commit**
2. Sao lưu `ai-messages.jsonl` + `kb-overrides.json` + `conv-state.json` ra ngoài
3. `git pull` → `systemctl restart aicloser`
4. Theo dõi log 10 phút đầu: `journalctl`/`/var/log/aicloser.log`

**Sẵn sàng lùi:** ghi lại commit hash cũ. Lùi = `git reset --hard <hash cũ>` + restart.

## Phần D · Theo dõi 48 giờ — đây mới là sản phẩm của luồng này

Đo bằng số, không bằng cảm giác. Báo cáo sau **6h · 24h · 48h**:

| Chỉ số | Trước | Ngưỡng LÙI NGAY |
|---|---|---|
| Tỷ lệ tin xử lý ở Fast Lane | 0% | <25% hoặc >60% |
| Chi phí/lượt | 133đ | >100đ |
| calls/lượt | 2,28 | >1,5 |
| Tỷ lệ chốt | 2,0% | **tụt >30%** |
| Hội thoại bị M05 khoá `HANDOFF` | — | >15% tổng hội thoại (nghi im oan) |
| Tin bị M09 chặn | — | >5% |
| Template Botcake xuất hiện trong phiên AI | 75% | không giảm |
| Handoff `kind=error` | — | tăng bất thường |

**Việc phải làm bằng tay, không có cách nào tự động:** đọc **20 hội thoại thật** sau 24h,
chấm tay xem AI có trả lời tệ hơn trước không. Số liệu không bắt được "câu trả lời vô duyên".

## Ràng buộc bắt buộc
- **KHÔNG deploy khi chưa được chủ dự án duyệt bằng lời**
- **Không xoá đơn Pancake** ở bất kỳ trạng thái nào
- Chỉ thao tác repo này + VPS 169.58.33.8
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- Trên VPS, `.env` **KHÔNG** được có `PANCAKE_READONLY` — bật nhầm là bot im hoàn toàn
- Sửa hành vi AI thì cập nhật `README.md` (14 nguyên tắc) cùng lúc

## Đầu ra của luồng này
1. Nhánh `fix-images` đã gộp đủ 4 luồng, test xanh
2. Báo cáo replay trên dữ liệu thật (trước deploy)
3. Bot chạy production
4. **Báo cáo 48h bằng số** — đây là đầu vào để quyết định vòng 2 làm gì trước
