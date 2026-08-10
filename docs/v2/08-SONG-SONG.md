# Chạy song song — phân luồng & quyền sở hữu file

> Mục tiêu: 4 phiên làm việc chạy cùng lúc mà **không đụng nhau ở cùng một file**.
> Kèm prompt sẵn để ném vào từng phiên ở §5.

---

## 1. Ràng buộc thật sự — cái gì chặn cái gì

Chỉ có **ba** phụ thuộc cứng. Ngoài ba cái này, mọi thứ khác song song được:

```
Sổ AI ghi scriptVersion ──▶ M17 A/B ──▶ M16 Script Optimizer
        (Luồng 1)                            (Luồng 4, đợt sau)

M05 Conversation Owner ──▶ M16
   (✅ đã xong)

Bảng giá KB ──▶ validator M02
  (đã có)        (Luồng 3)
```

**Điều nhiều người hiểu sai:** M02 (Script Studio) **không** chặn M11/M13/M07. Kịch bản
page đã có sẵn và đang chạy — sửa luồng chat không cần chờ công cụ sửa kịch bản.

---

## 2. Bốn luồng song song

| Luồng | Nội dung | Ngày | Chặn ai không |
|---|---|---|---|
| **L1 · ĐO** | M20 Unit Economics + Sổ AI đầy đủ | 3 | **Chặn L4** — làm trước |
| **L2 · LUỒNG CHAT** | M11 ngân sách lượt · M13 hậu bán · M07 nén ngữ cảnh | 4 | Không |
| **L3 · NHẬP LIỆU** | M01 registry · M02 Script Studio · M03 cảnh báo | 6,5 | Không |
| **L4 · PROMPT** | Bỏ classifier · gộp `BASE`+`HARD_RULES` | 1,5 | Không |

**L1 + L2 + L3 + L4 chạy đồng thời được.** Tổng thời gian thực tế = **6,5 ngày** (L3 dài
nhất) thay vì 15 ngày làm tuần tự.

Đợt sau (M12 follow-up · M15 miner · M16 optimizer · M17 A/B · M18 console · M04 webhook)
**phải chờ L1 xong** vì không đo được thì không A/B được.

---

## 3. Quyền sở hữu file — luật chống đụng độ

Mỗi luồng **chỉ được sửa file trong cột "sở hữu"**. Muốn đụng file của luồng khác thì
dừng lại và báo, không tự sửa.

| Luồng | SỞ HỮU (được sửa/tạo) | CẤM đụng |
|---|---|---|
| **L1** | `src/economics.js` *(mới)* · `src/ai-log.js` · `src/admin-economics.js` *(mới)* · `public/economics.html` *(mới)* | handler · pancake-poll · prompts · closer · kb · fast-lane |
| **L2** | `src/handler.js` · `src/lead-score.js` *(mới)* · `src/post-sale.js` *(mới)* · `src/context.js` *(mới)* · `src/conv-owner.js` · `src/conv-state.js` | prompts · closer · classifier · kb · admin* |
| **L3** | `src/kb.js` · `src/page-registry.js` *(mới)* · `src/readiness.js` *(mới)* · `src/admin-scripts.js` *(mới)* · `public/scripts.html` *(mới)* | handler · pancake-poll · prompts · closer · ai-log |
| **L4** | `src/prompts.js` · `src/closer.js` · `src/classifier.js` · `src/fast-lane.js` | handler · pancake-poll · kb · ai-log · admin* |

### Hai mẹo để không đụng nhau

**① Giao diện: tạo trang riêng, đừng sửa `admin.html`.**
`public/admin.html` là 1 file gộp CSS+JS inline — hai luồng cùng sửa là xung đột chắc
chắn. L1 và L3 mỗi bên tạo file HTML riêng, rồi **thêm đúng 1 dòng link** vào topbar.

**② Route: tạo router riêng, đừng sửa `admin.js`.**
Mỗi luồng viết `src/admin-<tên>.js` export một Express router, rồi **thêm đúng 1 dòng**
`adminRouter.use('/x', xRouter)` vào `admin.js`. Xung đột 1 dòng thì merge tay 10 giây.

**③ `src/classifier.js` — L4 giữ NGUYÊN chữ ký hàm.**
Bỏ classifier KHÔNG có nghĩa là xoá file và sửa `handler.js` (file của L2). Thay vào đó
biến `classify()` thành **bộ luật thuần, không gọi LLM, trả đúng shape cũ**
(`{intent, lang, lead_quality, urgency, is_spam_conf}`). `handler.js` không phải đổi
một dòng nào → L4 và L2 không đụng nhau.

---

## 4. Nhánh git & thứ tự gộp

```
Nhánh nền: fix-images  (đang chứa Đợt 1 + M05, CHƯA deploy)

  ├─ v2/l1-do          (L1)
  ├─ v2/l2-luong-chat  (L2)
  ├─ v2/l3-nhap-lieu   (L3)
  └─ v2/l4-prompt      (L4)
```

**Thứ tự gộp:** L4 → L1 → L2 → L3
(ít file nhất gộp trước; L3 nhiều file UI nhất nên gộp cuối, dễ xử lý xung đột)

Mỗi luồng trước khi báo xong phải: `npm test` xanh · server boot được · `/health` = 200.

---

## 5. Prompt cho từng phiên

Sao nguyên khối bên dưới, dán vào phiên mới. Mỗi phiên làm việc trong cùng repo
`/Users/syanh/Desktop/Chat Bot AI/messenger-closer`, mỗi phiên một nhánh riêng.

Nội dung prompt đầy đủ nằm ở `docs/v2/prompts/L1..L4.md`.
