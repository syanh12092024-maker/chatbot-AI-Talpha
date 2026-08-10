Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page).

# LUỒNG 7 — MỔ HỘI THOẠI + CẦU NỐI ĐƠN (M15 Conversation Miner · M14 Order Bridge)
### Vòng 2 · chạy sau khi L0 deploy xong

> 🔄 **Cập nhật 11/08/2026** — thêm MỘT module mới vào luồng này: **tự học sổ template**
> (`src/template-learner.js`). Xem `docs/v2/09-VONG-2-CAP-NHAT.md` §1④.

## Đọc trước khi làm
1. `docs/v2/04-TANG-TU-TIEN-HOA.md` § M15 — spec mổ hội thoại
2. `docs/v2/03-TANG-TANG-CHOT.md` § M14 — spec cầu nối đơn
3. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE
4. `src/pancake-orders.js` — POS API hiện có (`api_key` riêng mỗi shop, KHÔNG dùng JWT)

## Số liệu nền
- Hai page **cùng ngành trang sức, kịch bản dài gần bằng nhau** (830 vs 829 token) mà
  chênh **12,7 lần** lượt/đơn: Royal Gold Boutique 34,8 · Royal Birthstone 443.
  **Không ai biết vì sao** — M15 sinh ra để trả lời.
- `AUTO_CREATE_ORDER=0` từ 07/08/2026: AI chốt lời, ghi chú Pancake, **nhân viên tạo đơn tay**.
  M14 làm khâu tay đó nhanh nhất có thể.

## Phạm vi

### ① M15 · `src/miner.js` (mới) — mổ hội thoại mỗi đêm
Chạy 02:00, tuần tự 39 page, giãn 30s/page.

Đầu vào mỗi page: Sổ AI 24h + hội thoại đầy đủ từ Pancake cho **toàn bộ ca CHỐT ĐƯỢC** và
**15 ca KHÔNG chốt nhiều lượt AI nhất** (nơi tốn tiền nhất mà không ra kết quả).

Đầu ra JSON có cấu trúc (schema đầy đủ ở spec §M15): `objections` · `killers` (câu AI nói
xong khách im luôn) · `winners` (câu xuất hiện trước khi chốt) · `dropStage` · `gaps`
(khách hỏi mà KB không có câu trả lời) · `langMix`.

**Ràng buộc cứng:**
- **KHÔNG đưa PII vào prompt.** Che SĐT/địa chỉ/tên khách thành `[SĐT]`, `[ĐỊA CHỈ]`,
  `[TÊN]` **trước khi** gửi model. Kiểm tự động 100 mẫu trong nghiệm thu
- Page <20 hội thoại/24h → gộp 7 ngày rồi mới mổ (mẫu nhỏ thì kết luận là nhiễu)
- Page <5 hội thoại/tuần → bỏ qua, báo "chưa đủ dữ liệu"
- 1 lần gọi model rẻ/page/đêm (~110đ) — **không được vượt**

⚠️ M15 **chỉ mổ và báo cáo**. Việc sinh đề xuất sửa kịch bản là M16 (luồng vòng 3).
Đừng làm lấn.

### ② `src/template-learner.js` (mới) — TỰ HỌC sổ nhận diện tin máy

**Vấn đề:** `src/bot-registry.js` mới phủ **32,1%** tin do page gửi. 67,9% còn lại là
vùng đoán, mà đoán sai thì M05 cho rằng sale đã vào chat → **AI tự khoá vĩnh viễn**.
API Botcake KHÔNG vá được (không trả nội dung flow), và nguồn nhiễu còn có **công cụ RTO
thứ ba** + **tin hệ thống Facebook tiếng Việt** — hai thứ không có API nào.

**Tín hiệu đã kiểm chứng trên dữ liệu thật:** tin lặp **nguyên văn qua ≥3 hội thoại
KHÁC NHAU** và **dài ≥40 ký tự** thì là template. Ngắn hơn là câu đệm người gõ — kiểm
đúng: `"ok dear"` 7×, `"..."` 5×, `"It take 2-5 days to delivery dear"` đều bị loại đúng.

Việc:
- Chạy cùng đường ống đọc hội thoại của M15 (đừng gọi Pancake hai lần)
- Sinh mẫu mới → ghi ra **`botcake-templates.json`** (bot-registry đọc file này sẵn rồi)
- **KHÔNG sửa `src/bot-registry.js`** — đó là file của L6
- Mẫu mới phải qua người duyệt trước khi bật (mẫu sai = AI bỏ sót người thật)
- Báo cáo: độ phủ sổ trước/sau, và tỷ lệ hội thoại bị khoá thay đổi thế nào

### ③ M14 · `src/order-bridge.js` (mới) — chế độ A (bán tự động)
- Ghi chú Pancake theo **MẪU CHUẨN máy đọc được** (khối ở spec §M14) thay cho ghi chú
  tự do hiện tại
- Nút **[Tạo đơn Pancake]** trên dashboard — 1 click, điền sẵn mọi trường từ ghi chú
- **Chống đơn trùng: kiểm đủ 4 nguồn** trước khi tạo (Sổ AI · `ordersForConv` ·
  thẻ trạng thái · dấu hiệu đơn FB Commerce). Bất kỳ nguồn nào dương → KHÔNG tạo
- `total_price` phải khớp **đúng một** gói trong bảng giá — dùng lại `allowedPrices` /
  `extractMoney` đã export trong `src/outbound-guard.js`
- Chế độ B (tự tạo đơn, `AUTO_CREATE_ORDER=1`) **chỉ chuẩn bị code, KHÔNG bật**

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/miner.js` · `src/template-learner.js` · `src/order-bridge.js` · `src/scheduler-miner.js` *(mới)* ·
`src/admin-orders.js` *(mới)* · `public/orders.html` *(mới)* · `src/pancake-orders.js` ·
`test/*.test.mjs` của mình · 1 dòng khởi động trong `server.js` · 1 dòng mount trong `admin.js`

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/prompts.js` · `src/closer.js` ·
`src/kb.js` · `src/fast-lane.js` · `src/economics.js` · `src/experiment.js` ·
`src/followup.js` · `src/admin-ops.js` · `public/admin.html` (ngoài 1 dòng link)

> `src/tools.js` do luồng khác đụng ở vòng 1 — nếu buộc phải sửa `create_draft_order`,
> giữ thay đổi ở mức TỐI THIỂU và ghi rõ trong báo cáo.

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l7-miner-order` (nền là `fix-images` **sau khi L0 gộp xong**)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- **TUYỆT ĐỐI không xoá đơn Pancake** ở bất kỳ trạng thái nào — luật số 1 của dự án
- **Không bật `AUTO_CREATE_ORDER=1`**
- Không đưa PII vào prompt của M15
- VPS chỉ ĐỌC, không ghi, không restart

## Nghiệm thu
- [ ] `npm test` xanh
- [ ] Server boot sạch, `/health` = 200
- [ ] **M15:** chạy hết 39 page trong ≤30 phút · **0 PII lọt vào prompt** (kiểm 100 mẫu) ·
      kết quả `objections` khớp ≥70% với đọc tay 20 hội thoại
- [ ] **M15 phải trả lời được câu hỏi thật:** chạy trên Royal Gold Boutique và Royal
      Birthstone, đưa ra giả thuyết có căn cứ vì sao chênh 12,7 lần
- [ ] **M14:** ghi chú đúng mẫu, sale tạo đơn ≤30 giây từ lúc mở chat · **0 đơn trùng**
      trên mô phỏng 200 đơn · 0 đơn sai tổng tiền
- [ ] Chuyển chế độ A↔B chỉ bằng đổi env, không sửa code

## Cách làm việc mong đợi
M15 là module đầu tiên đọc hội thoại thật ở quy mô lớn — **PII là rủi ro cao nhất**, kiểm
kỹ trước khi chạy. M14 đụng vào tiền và đơn hàng thật — mọi đường đi đều phải có cửa chặn
đơn trùng, thà không tạo còn hơn tạo nhầm.
