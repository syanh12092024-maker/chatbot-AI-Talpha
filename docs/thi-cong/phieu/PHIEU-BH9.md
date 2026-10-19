# PHIẾU BH9 — Bộ não pilot: nhận ra khách sau bán ⇒ câu nhận cố định + giao sale · không bịa trạng thái đơn / không tự hứa · chốt đơn không hỏi lại (COD ngầm · tên Facebook) · tên chỉ từ lời khách · dấu hiệu y tế

**Base:** `a6f670d` · **Làn:** 🟥 (đổi thứ bot NÓI + lúc bot thôi bán / giao sale + cổng tạo đơn + dữ liệu đơn nháp sale duyệt; ba tệp bộ não dùng chung v1/v3)
**Soát (a):** 19/10 — SỬA PHIẾU (13 điểm: S1 bộ dò khách bắt nhầm người đang mua · S2 khuôn page điều kiện/tương lai · S3 cờ không tới Hộp thư · S4 câu cố định KHÔNG vào `fixed` · S5 ảnh `xaAnh(false)` vẫn gửi · S6 token tính đôi · S7 luật mới chỉ cho chữ model · S8 lượt tóm tắt đơn bị chặn · S9 y tế: kích ứng trước dùng + Ả Rập «دم» · S10 COD trang phủ định · S11 tiền tố «Bước còn thiếu» (C11) · S12 hai bộ ca cũ phải đổi · S13 #n + GL9). Mỗi chỗ sửa đánh dấu `[S<n>]`.
**Nguồn:** giả lập pilot 09/10 (CSDL giả lập dev `aicloser_gialap_pilot` page 275 UAE 109 lượt · `aicloser_gialap_2` page 276 Saudi 83 lượt; Kimi k2.6 thật, van đóng) — nhật ký `docs/thi-cong/nhat-ky/pilot-cau-hinh-gia-lap-20261009.md`; bản đọc từng lượt + đối chiếu mã: `scratchpad/bh9-nghien-cuu.md` (ngoài git, có dữ liệu khách — KHÔNG commit) — **[S13] ĐÃ MẤT** (máy dev khởi động lại 18/10, `/private/tmp` sạch; `scratchpad/bh9/tra/tra-luat.mjs` cũng mất). Ánh xạ «#n» (soát (a) đo lại): **UAE #n = `row_number() OVER (ORDER BY tin_cho_xu_ly.id)`** của `aicloser_gialap_pilot` (= id − 175; #47 ⇒ ht 43877, #82/#90/#102 ⇒ ht 43779); **Saudi #n = `so_ai.nguon_dong`** của page 1188130791056549 trong `aicloser_gialap_2` (tin đã xoá; #4 #5 #37 #54 khớp đúng câu đã trích). Cùng CSDL còn **60 tin khách page 340 Kreain Nature UAE** (`aicloser_gialap_2.tin_cho_xu_ly`) — kho ca âm thứ hai cho ④9. Người quyết 15/10 (sổ §10): COD ngầm = CÓ · khi bot KHÔNG được tự trả lời ⇒ câu nhận CỐ ĐỊNH + chuyển sale · tên Facebook làm tên người nhận + cờ «chưa xác nhận» · «FDA approved» ĐƯỢC nói · chảy máu/kích ứng ⇒ khuyên ngừng dùng/đi khám + chuyển sale · thẻ bàn giao `PK_TAG_HANDOFF=AI CHAT` (tổng đặt trên prod). BH2/BH3 để sau.
**Đụng bộ não:** src/context.js src/lead-score.js src/outbound-guard.js — bộ dò «đơn đang trong cuộc» + trích tên/COD + dòng hồ sơ (context.js), một luật tên dùng chung (lead-score.js), bốn luật cửa ra mới chặn câu bịa trạng thái đơn · tự hứa · bán lại khách sau bán · thiếu lời khuyên y tế (outbound-guard.js). KHÔNG đụng `src/prompts.js` (CORE còn 65/159 ký tự tới trần `test/l4-prompt.test.mjs:129,133`) · `tools.js` · `closer.js` · `fast-lane.js` · `conv-owner.js`; buộc phải đụng ⇒ DỪNG, báo tổng.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong ⇒ `/code-review` · review nghiệp vụ (a)+(b) (bắt buộc 🟥) · đối kháng `phan-bien-refute`.

> Ca dưới đây dẫn bằng «UAE #n / Saudi #n» (số lượt của bản đọc từng lượt) + `hoi_thoai.id` (ht) trong CSDL giả lập. Câu khách trích NGẮN, không tên/SĐT/địa chỉ.
> Câu ca test là câu THẬT đã ẩn danh: giữ khuôn chữ, đổi tên/số/địa chỉ thành giả («Maria Santos» · 0501234567 · «Marina island»).

## ① Thi hành đoạn nào

**Lỗi 1 — bịa trạng thái đơn với khách sau bán, nói sai sản phẩm (3 hội thoại · 8 lượt).** UAE ht 43779 #82–#85: khách «I didn't finish ordering those
things why did you deliver» ⇒ bot «no active order was placed under your name yet… delivery notice by mistake» rồi chào gói, lặp 4 lượt, trong khi lịch sử
có tin vận đơn (người) «…the delivery was unsuccessful» và sale (người) «But the order is in transit…» · #90 khách «i received that already, same company»
⇒ bot «This Soothing Cooling Gel is a different product… should I ask staff to cancel it?» (sai sản phẩm + tự đề nghị huỷ) · UAE ht 43893 #100 «Your order is
on its way» (đoán) · Saudi ht 43791 #47 «…hindi po same-day… which set…» khi AI LEADER vừa báo «set for delivery tomorrow» · #54 «canceled na pala».
Gốc: (a) bot KHÔNG có dữ liệu đơn — `src/tools.js:15-80` không có tool tra đơn, `handler-v3.js:812-840` chỉ nạp hồ sơ + lịch sử; duy nhất `ho_so.donDaCo`
đoán chữ. (b) bộ dò hụt: `context.js:343-350` `DON_TRANG_THAI` null với 10/12 câu page thật (POS «scheduled for delivery today», AI LEADER «set for delivery
tomorrow», vận đơn «delivery was unsuccessful», sale «in transit» / «haven't delivered the order», «inform the courier… Courier's phone», «Tracking number»,
mẫu chốt sale «👉Your order is 109 SAR…»); `:362-376` `KHACH_NOI_VE_DON` null với 6/6 câu khách («why did you deliver» · «u deliver I am waiting» · «You
delivered today at 10» · «i canceled it» · «i received that already» · «I received the goods»). Page-side chỉ được dò trong `cleanHistory` (`:408`) — tức ở
bước 7 (`handler-v3.js:812`), SAU mọi cửa 0 đồng. (c) có `donDaCo` cũng chỉ là lời dặn (`context.js:568-573`; CORE §5 `prompts.js:141`) — Saudi #23 #35 #37
có `donDaCo` mà vẫn hứa; `business.captureOrder` (`handler-v3.js:845-855`) nhận đơn không xét `donDaCo`. (d) cửa ra (`outbound-guard.js:188-286`) không luật
nào về «no active order / sent by mistake / on its way / canceled» — 4/4 câu thật QUA. Sai sản phẩm (#90) là model bịa — hết đường tới model nhờ ② 2.

**Lỗi 2 — chốt hụt (6 hội thoại đủ SĐT + địa chỉ ⇒ 1 đơn nháp: UAE ht 43893 #63).** UAE ht 43774 #9→#10 (địa chỉ + SĐT + tên CUỐI dòng ⇒ bot hỏi «Okay na
po ba sa'yo ang COD?» hai lượt) · ht 43773 #39→#41 (đã có SĐT + địa chỉ ⇒ xin tên, rồi xin lại địa chỉ) · ht 43928 #97→#98 (đủ SĐT + địa chỉ ⇒ model dán lại
checklist cũ ⇒ `DUPLICATE` `outbound-guard.js:275-277` ⇒ giao sale `handler-v3.js:994-997`) · Saudi ht 43774 #12 (model tóm tắt đọc lại SĐT TRƯỚC khi gọi tool
⇒ `PII_ECHO`) · Saudi ht 43796 #31 (đủ thông tin ⇒ hỏi xác nhận COD). Gốc đầu vào hồ sơ: `COD_OK` (`context.js:155`) — «Cash on delivery po» · «COD po» ·
«yes» đáp câu hỏi COD đều `cod=false` (hàm không biết bot vừa hỏi gì); `firstName` (`:171-181`) bỏ tên nằm SAU SĐT cùng dòng; `TIER_TEXT` (`:154`) không biết
«Buy 1 take 1» · «B1G1» · «Buy 1get 1free»; khối hồ sơ in «COD: chưa xác nhận» (`:553`) + «Bước còn thiếu: …» (`:580-588`) ⇒ CORE §5 (`prompts.js:138`, bắt
COD trước `create_draft_order`) buộc model hỏi thêm; tên FB bị cấm làm tên nhận (`context.js:85-92` chú thích · `:530-532` dòng prompt) ⇒ thêm một lượt xin tên.
Người quyết 15/10: COD ngầm + tên Facebook.

**Lỗi 3 — trích tên sai (UAE 5/52 hội thoại · Saudi 7 + 2 ở lượt chạy tiếp; MỌI tên do regex rút — 14/14 — đều sai).** «finished» («Later, when this is
finished») · «working for fails» · «Yass island» (dòng địa chỉ) · «e now» (từ «haven't t**im**e now») · «Abudhabi city» · «here in Dammam» · «waiting» ·
«e arrived my order» · «e is» · «SAUDI ARABIA» · «yesterday» (từ «h**im** yesterday») · «waiting for delivery I send already the». Nguồn: 100% tin KHÁCH
(`hydrateProfile` bỏ tin page `context.js:455-462`) — KHÔNG phải tin POS. Gốc: `NAME_LABEL` (`context.js:152` = bản chép `lead-score.js:102`): `i'?m` không
ranh giới từ; «i am / i'm / this is» nhận mọi cụm theo sau; `NAME_LINE` (`context.js:153,176-179`) nhận dòng 2–4 chữ không số trong tin có SĐT (dòng địa chỉ,
tên nước). Hệ quả: «Tên: waiting» ⇒ `missingSteps` không xin tên, tên sai vào `create_draft_order`; `hasName` +2 điểm lead (`lead-score.js:105-114,150`, nợ
N-RP2-REGEX-TIN-NHUONG «This is real gold»).

**Lỗi 4 — Saudi: khách đã mua bị bán lại + bot tự hứa (4 hội thoại · 12 lượt).** Bán lại: Saudi ht 43768 #3 · ht 43771 #4 #5 · ht 43791 #28 #47 · ht 43806
#43 #44 (khách hỏi giờ giao / đã gửi vị trí ⇒ «Which package… send your full name…») — cùng gốc lỗi 1. Tự hứa: #4 «6 PM delivery noted» · #5 «Noted po
ma'am, 10 AM tomorrow» · #23 #35 «Our team already has your WhatsApp — they'll message you… the rider will contact you before arriving» · #28 «I'll request
the courier to prioritize 10 AM delivery» · #34 «Hintayin nyo lang po ang courier bukas, 10 AM» · #37 «Saturday delivery noted» · #54 «canceled na pala»; UAE
ht 43893 #65 «Our staff will contact you via WhatsApp to confirm your delivery on Wednesday». Gốc: `DELIVERY_PROMISE_RE` (`outbound-guard.js:127-130`) chỉ bắt
CẶP «động từ giao + bukas/tomorrow/today…» trong 30 ký tự — không thứ trong tuần, giờ «10 AM», «noted», courier/rider; không luật nào cho «I'll inform/request
the courier» · «team already has your WhatsApp» · «they'll message you» — 9/9 câu thật QUA. CORE §7 (`prompts.js:148-149`) chỉ là lời dặn. Đúng (thành luật):
Saudi #16 #27 #36 #40 #41 #42 #58 — model gọi `handoff_human` kèm tóm tắt.

**Lỗi 5 — dấu hiệu y tế.** UAE ht 43877 #47 «I have bleeding» ⇒ bot «…supports irritated skin recovery… which set…», #48 tiếp chào gói; Saudi ht 43890 (lượt chạy
tiếp, khách viết Tagalog có «pagdurugo») ⇒ bot «i-apply ang gel 2-3x daily… Buy 1 Get 1 FREE». Gốc: `grep -i "doctor|bleed|wound|chảy máu"` trên `prompts.js`
`context.js` `outbound-guard.js` `rap-prompt.js` = 0 dòng; kịch bản 275/276 liệt kê «Pagdurugo» là triệu chứng gel lo (DỮ LIỆU — ⑥). «FDA approved» (6 lượt) —
người quyết cho nói ⇒ KHÔNG vá.

**Lệch phép đo (không phải lỗi mã — người đọc số phải biết):** công cụ giả lập trả quyền AI trước MỖI lượt (`ops/bin/gia-lap-mot-minh.mjs:229`) + Saudi chạy
`--khong-nhuong-sale` ⇒ mọi lượt lỗi sau bán của mẫu ở pilot thật bị cửa nhận diện sale 24 h (`chat/human.js:17`) hoặc HANDOFF chặn — phần lớn do chính bot vừa
bị cửa ra chặn lượt trước (MAY, không phải luật). Lỗ thật còn: tin POS · AI LEADER · Public API là MÁY (`conv-owner.js:85`) ⇒ khách chốt qua ai_sale/Botcake, >24 h
không người thật gõ, trả lời tin POS «scheduled for delivery» ⇒ TỚI bot. Lịch sử giả lập là Pancake thật (không có câu bot giả lập) ⇒ «hỏi lặp»/DUPLICATE có
phần phóng đại.

## ② Hợp đồng vào / ra

**Luật 2 của phiếu:** chữ gửi khách của MỌI lượt không kích hoạt luật mới giữ nguyên từng byte; luật cửa ra CŨ (`outbound-guard.js:188-284`) giữ nguyên regex,
thứ tự và hành vi khi chặn (im + bàn giao như base). Mọi luật MỚI khi chặn ⇒ **câu cố định ② 1 + bàn giao** (thẻ `config.pkTags.handoff` + ghi chú, đường
`banGiaoSale` `handler-v3.js:585`), không do model viết.

1. **Câu cố định** — khai ở `src/our-messages.js` (hằng mới, export) — **[S4] KHÔNG đưa vào tập `fixed` `:53`**: `isOurFixedMessage` so TIỀN TỐ hai chiều
   (`:71` `f.startsWith(n.slice(0, 40))`, không trần độ dài `n`) ⇒ thêm hai câu này thì tin sale gõ «Noted» · «Noted po» · «Sorry» · «Sorry to hear that» bị coi là
   tin của bot (đo trên hàm `norm` thật: 4/4 ⇒ true) ⇒ `looksHuman` false ⇒ `nhanDienSale` (`chat/human.js:7-29`) không nhường ở MỌI hội thoại AI đang giữ.
   v3 đã nhận chữ của chính mình qua `ai_noi_gi` + `lan_gui` (`human.js:12-15`) — câu cố định đi `guiChu` nên có mặt ở cả hai:
   - `CAU_NHAN_BAN_GIAO = { en: 'Noted po 🙏 Our team will check this and reply to you shortly.', ar: 'تم الاستلام 🙏 سيتحقق فريقنا من طلبك ويرد عليك قريباً.' }`
   - `CAU_Y_TE = { en: 'Sorry to hear that po 🙏 Please stop using the product and see a doctor, especially if there is bleeding or irritation. Our team will contact you shortly.', ar: 'نأسف لذلك 🙏 يرجى التوقف عن استخدام المنتج ومراجعة الطبيب، خاصة عند وجود نزيف أو تهيج. سيتواصل معك فريقنا قريباً.' }`
   - Chọn bản `ar` khi `doanNgonNgu(câu khách) === 'ar'` (`src/chat/ngon-ngu.js:74`), còn lại `en`. Gửi qua `guiChu` (`handler-v3.js:483`), KHÔNG qua model;
     ≤ 1 câu cố định mỗi lượt xử lý; lượt đó luôn bàn giao ⇒ `ganTuState` đặt HANDOFF/SALE (`trang-thai.js:131-134`) ⇒ lượt sau bot im (`trang-thai.js:30-33`)
     ⇒ ≤ 1 lần mỗi lượt bàn giao (không lặp vô hạn: hội thoại chỉ về AI khi sale `resumeConversation` tay — `queue/reconcile.js:44-67`; prod thêm thẻ
     `AI CHAT` ∈ `V3_NAP_THE_CHAN` ⇒ bộ nạp bỏ hẳn hội thoại; page tắt ⇒ `handler-v3.js:398` trả trước mọi bước). Đặt `state.handoff/handoffReason` TRƯỚC
     `guiChu` để lỗi ở `banGiaoSale` sau đó vẫn lưu HANDOFF qua `luuLai` của nhánh `catch` (`:1043`). Sổ AI: `so_ai` `reply` lane `cau_co_dinh`
     (`duLieu.cau_co_dinh` = lý do) **không mang `dung`** + dòng `handoff`; `luuLai({daGuiText:true, textDaGui})`.
     **[S5] Ảnh** model đã xếp cho câu bị chặn KHÔNG gửi bằng cách BỎ hàng (`state.pendingImages = []`, `state.pendingCaption = ''`, ghi `anh_hong_loai`
     «bo_cau_co_dinh» vào dòng `image`) — KHÔNG dùng `xaAnh(false)`: hàm đó chỉ bỏ ảnh khi CAPTION bị chặn, ảnh không caption / caption sạch vẫn đi
     (`handler-v3.js:515-552`).
2. **Nhận ra khách sau bán** — `context.js`:
   a. `DON_TRANG_THAI` thêm khuôn page (giữ thứ tự ưu tiên huỷ > chưa nhận > đang giao > đã tạo): scheduled / set for delivery · in transit · delivery (was)
      unsuccessful/failed · haven't/hasn't delivered (the order) · inform the courier / shipping company / delivery person · courier's phone · tracking number ·
      «your order is <số> <tiền tệ>» (mẫu chốt của sale). ÂM bắt buộc: «Your order is free delivery dear» · «Do you wanna order now? 🚚FREE SHIPPING⚡ 👉CASH ON
      DELIVERY💸» · «It take 2 - 5 days to delivery dear» · mẫu khuyến mãi «FREE DELIVERY TODAY ONLY… Buy 1 Get 1 FREE…» · «Will you choose… offer?». KHÔNG suy
      `donDaCo` từ `otherBot.orderNoted` (khớp cả mẫu trước bán, `:257`).
      **[S2]** Lịch sử page gồm cả tin CỦA CHÍNH BOT (v3 · ai_sale · Botcake) và mẫu GIẢI THÍCH trước bán ⇒ ba điều kiện: (i) cụm khớp đứng sau từ điều kiện/tương
      lai trong cùng câu (once · after · when · if · as soon as · will be · kapag · pag) ⇒ KHÔNG tính; (ii) «tracking number» chỉ khi kèm SỐ (`[:#\s]*\d`);
      (iii) «your order is <số> <tiền tệ>» chỉ khi CÙNG tin có vế giao/nhận đã chốt (you will receive · within/in the next … days · gift). ÂM bắt buộc thêm:
      «We will send you the tracking number once your order is shipped» · «Once you order, we will inform the courier to call you before delivery» · «Your order
      will be scheduled for delivery within 2-5 days after confirmation» · «Your order is 109 SAR po — shall I confirm?» (câu bot tóm tắt TRƯỚC khi tạo đơn).
      Lý do: `donDaCo` KHÔNG hết hạn (⑥) và từ BH9 nó khoá bán (cổng 4a + `BAN_LAI_SAU_BAN`) — một câu page bắt nhầm = khách đó mất bot vĩnh viễn.
   b. `KHACH_NOI_VE_DON` thêm: why did you deliver · (you|u) deliver(ed)… · i'm waiting … deliver/courier · received (it|that|the goods|the item|the parcel|my
      order) ⇒ «khách ĐÃ nhận hàng» · i (already) cancel(l)ed (it|my order|the order) ⇒ «khách báo HUỶ». Giữ MỌI ca âm C39 (`test/context.test.mjs:527`).
      **[S1] Siết luôn ba nhánh CŨ `:363-365`** — HEAD bắt nhầm 17/19 câu hỏi TRƯỚC BÁN soát (a) thử (`donTuTinKhach` thật): «How long is the delivery? Is it
      free?» · «Can the order arrive tomorrow?» · «the delivery is free po?» · «I will order 2 sets, the delivery is COD right?» · «How many days the order
      arrive?» · «Is it 2-5 days delivery?» (nhánh 3 `[0-9]{1,2} days … deliver`) · «If the order is not original can I return it?» · «I dont want this product in
      big size, small one please» (nhánh 1). Hôm nay hệ quả chỉ là một dòng prompt; sau BH9 cùng câu đó ⇒ `laCauSauBan` la ⇒ khách đang muốn mua nhận câu cố
      định + bị giao sale, và `donDaCo` khoá bán vĩnh viễn. Luật: câu HỎI chính sách trước bán («?» hoặc how long · how many (days) · how much · free · fee ·
      COD · cash on delivery · if I order · I will order · can … · will the …) mà KHÔNG có dấu đơn đã có (was · came · called · arrived · delivered · received ·
      didn't · haven't · hasn't · ordered · paid · cancel(l)ed · already) ⇒ null; nhánh «don't want» kèm lựa chọn thay thế (size · color · kulay · instead · only ·
      just · «…, <khác> please») ⇒ null. Mọi câu DƯƠNG ở trên + C39 giữ dương. (Kho thật 169 tin khách — UAE 109 + page 340 60 — HEAD bắt 0: dạng câu này chưa
      xuất hiện ở mẫu nhỏ, pilot 4 page sẽ gặp.)
   c. export `bocDonTuLichSu(msgs, pageId, prof)` — đúng vòng dò page của `cleanHistory:408` (cleanHistory gọi lại hàm này — MỘT bản luật); handler gọi **MỌI
      lượt** (không nằm trong nhánh `!prof.hydratedAt`) ngay sau `hydrateProfile`/`extractFromText` (`handler-v3.js:425-426`) để bước ② 3 thấy `donDaCo` TRƯỚC
      mọi cửa 0 đồng.
   d. export `laCauSauBan(text, prof) → {la, lyDo}`: `donTuTinKhach(text)` khác null, HOẶC (`prof.donDaCo` hoặc `prof.ordered`) VÀ câu nói về giao hàng / courier /
      rider / tracking / giờ / thứ / vị trí / địa chỉ / số liên hệ / huỷ / đổi / đã nhận (EN · Tagalog · Ả Rập). Câu hỏi sản phẩm thuần của khách đang có đơn ⇒
      `la:false` (model trả lời, luật ② 5c canh). Không `donDaCo`/`ordered` và câu không tự nói về đơn đã có ⇒ `la:false` (người đang muốn mua).
3. **Cổng sau bán (0 token)** — `handler-v3.js`, bước mới «4a» ngay sau nhánh `kb.noData` (`:609-621`), TRƯỚC lớp từ khoá/Fast Lane: `laCauSauBan(...).la` VÀ
   KHÔNG `dauHieuYTe(text)` ⇒ gửi `CAU_NHAN_BAN_GIAO` + `state.handoff=true`, lý do TẤT ĐỊNH `SAU BÁN · khách: «<≤120 ký tự câu khách, qua catChu>» · đơn:
   <trạng thái> (<nguồn>)` ⇒ `banGiaoSale` ⇒ `ghi(HANDOFF)` ⇒ `luuLai` ⇒ `return {ketQua: XONG, lyDo: 'sau_ban'}`. Model KHÔNG được gọi.
4. **Cổng tạo đơn** — `business.captureOrder` (`handler-v3.js:845`): `prof.donDaCo?.nguon === 'page'` ⇒ ném «Khách đang có đơn (<trạng thái>) — không tạo
   đơn mới; gọi handoff_human» (tool lỗi về model; 0 dòng `hang_cho_tao_don`; thi hành CORE §5, không đổi ý đồ). **[S1]** CHỈ nguồn page — CORE §5
   (`prompts.js:141`) nói «confirmed by the backend, or placed via Facebook Commerce»; nguồn `khach` là suy từ lời khách, bắt nhầm thì khoá tạo đơn vĩnh viễn
   (⑥ không hết hạn) — nháp nguồn khách vẫn vào hàng chờ, sale + cửa ③ chống trùng canh.
5. **Bốn luật cửa ra mới** — `outbound-guard.js`, đặt SAU mọi luật cũ, ngay trước `return pass` (`:286`); `action:'rewrite'`; KHÔNG vào `FIXABLE`; export
   `LUAT_BH9 = new Set(['Y_TE','BIA_TRANG_THAI_DON','TU_HUA','BAN_LAI_SAU_BAN'])`. **[S7] Chỉ chạy khi `ctx.luatBH9 === true`** — handler đặt cờ ở cửa ra chữ
   model (`:885`) và caption (`:522`) CHỈ khi lượt đã gọi model (`dem.goiModel > 0`); lớp từ khoá (`:636`) · Fast Lane (`:708`) · caption Fast Lane · v1
   `handler.js` KHÔNG đặt ⇒ phán quyết y hệt base. Lý do: hai nhánh 0 đồng chặn thì đi đường CŨ (`banGiaoViCuaRa` — im + bàn giao, `:651` `:721`), trái luật
   «luật mới ⇒ câu cố định»; chữ của chúng là văn kịch bản do marketer viết, không phải model bịa. Thứ tự:
   a. `Y_TE` (chỉ khi `ctx.dauHieuYTe`): tin KHÔNG có lời khuyên (doctor · clinic · hospital · consult · magpatingin · doktor · stop using · itigil · طبيب ·
      مستشفى · توقف) HOẶC có giá/gói (số tiền có đơn vị theo `extractMoney` · «which set/package/bundle») HOẶC hứa chữa («stop(s) bleeding» · «heal» · «cure») ⇒ chặn.
   b. `BIA_TRANG_THAI_DON` (mọi lượt, trừ `ctx.orderCreated`): khẳng định có/không có đơn, đã giao, đang giao, đã huỷ, đã xác nhận — «no (active) order» ·
      «(notice|message) … sent by mistake» · «(your )?order (is|has been) (on (its|the) way|out for delivery|shipped|delivered|cancel(l)ed|confirmed)» · «on its way»
      · «canceled na» · «nakansela na» · Ả Rập «تم إلغاء» · «في الطريق» · «تم شحن». **[S8]** Miễn «confirmed / placed / received» khi `ctx.isOrderSummary`
      (lượt vừa `create_draft_order`: `orderCreated` = `pos_created` LUÔN false ở v3 vì POS tự tạo tắt — câu thật production «Your order is confirmed po. Cash on
      delivery, 2-5 days.» `test/guard-fastlane.test.mjs:313` sẽ bị đổi thành câu cố định đúng lượt chốt). Cụm đứng sau từ điều kiện (once · after · when · if ·
      as soon as) KHÔNG phải khẳng định.
   c. `TU_HUA`: thứ trong tuần (EN · Tagalog · Ả Rập) hoặc giờ `\b\d{1,2}(:\d{2})?\s*(am|pm)\b` trong 30 ký tự quanh deliver/delivery/courier/rider/arrive/
      darating/noted; «(i'll|i will|let me|we'll|we will) (inform|request|ask|tell|notify|coordinate|contact) (the )?(courier|rider|driver|shipping|delivery|
      logistics)»; «(team|staff|we) (already )?(has|have) your (whatsapp|number|location|address)» và «(our )?(team|staff|agent|they) will (message|contact|call|
      text) you» CHỈ khi `!ctx.daBanGiao && !ctx.isOrderSummary` (**[S8]** cả hai — «We have your number and address, our staff will call to confirm» là đúng ở
      lượt tóm tắt; CORE §5 `prompts.js:140` còn BẮT model nói «our staff will contact you to confirm» sau tool OK). Miễn khi cụm khớp có nguyên văn trong `kb.text` (cùng khuôn `SCARCITY` `:254`). Regex
      `DELIVERY_PROMISE_RE` cũ KHÔNG sửa.
   d. `BAN_LAI_SAU_BAN` (chỉ khi `ctx.donDaCo`): nêu giá/gói hoặc xin tên / SĐT / địa chỉ / xác nhận COD.
6. **Handler xử lý luật mới** — ctx cửa ra (`:885-896` và caption `:522`) thêm `luatBH9` (② 5) · `donDaCo: !!(prof.donDaCo)` · `daBanGiao: !!state.handoff` ·
   `dauHieuYTe`. `quaCuaRa` trả chữ rỗng với `v.rule ∈ LUAT_BH9` (kể cả qua bản sửa tại chỗ `v2` `:361-372`) ⇒ `guarded` = câu cố định (`CAU_Y_TE` khi rule
   `Y_TE`, còn lại `CAU_NHAN_BAN_GIAO`) · `state.handoff=true` · lý do `cửa ra chặn: <rule>` · `SPENT_NO_SEND` vẫn ghi `text_bi_chan` như cũ (mang `dung`).
   **[S6]** Dòng `reply` của câu cố định: lane `cau_co_dinh`, `duLieu.cau_co_dinh = 'cua_ra:<rule>'`, **KHÔNG mang `dung`** — base không bao giờ có cả
   `spent_no_send` lẫn `reply` cho một lượt model; để `dung` ở cả hai là token/tiền của lượt bị cộng đôi trong sổ. Ảnh: bỏ hàng như ② 1 [S5], không gọi
   `xaAnh(!!guarded)` (`:957` — `guarded` lúc này khác rỗng nên ảnh sẽ ĐI). Luật CŨ chặn ⇒ đường cũ y nguyên (`:994-997`, im + bàn giao).
7. **Y tế** — `context.js` export `dauHieuYTe(text) → ''|'<loại>'`: chảy máu (bleed\w* · blood · dugo · dumudugo · nagdudugo · pagdurugo · نزيف · دم) ·
   kích ứng SAU khi dùng (\brash\b · allerg\w* · irritat\w* · pantal · namumula · حساسية · «lalong (sumakit|nangati|humapdi)» / «worse after (using|applying)») ·
   sốt (fever · lagnat · حمى) · có thai (pregnant · buntis · حامل). Phủ định cùng mệnh đề («no fever», «walang dugo», «no bleeding») ⇒ ''. ÂM bắt buộc: itching ·
   makati · pangangati · hapdi · burning · bukol · almuranas · halo-halo · discomfort · «RASHED» (tên đường). Kích hoạt ⇒ khối hồ sơ thêm MỘT dòng: «⚕️ Khách
   báo <loại> — câu ĐẦU: khuyên ngừng dùng và đi khám bác sĩ; nhắc cảnh báo của KB nếu có; KHÔNG hứa chữa; KHÔNG nêu giá/gói ở tin này.» Lượt kích hoạt LUÔN
   bàn giao: câu model qua cửa ⇒ gửi câu model + bàn giao; bị `Y_TE` chặn ⇒ `CAU_Y_TE` + bàn giao.
   **[S9]** (i) Nhóm KÍCH ỨNG chỉ tính khi cùng tin có dấu SAU khi dùng (after using/applying · since I used · gamitin/ginamit/nilagay · بعد الاستخدام) — gel
   bán CHÍNH cho da kích ứng/trĩ, «Is it good for irritation?» · «effective po ba sa rashes?» · «Does it cause allergy?» là câu hỏi TRƯỚC BÁN (ÂM bắt buộc);
   chảy máu / sốt / có thai giữ vô điều kiện. (ii) Chữ Ả Rập PHẢI rào bằng `(?<!\p{L})…(?!\p{L})` cờ `u` — JS `\b` không biết chữ Ả Rập: `/\bدم\b/u` không
   khớp gì (bắt hụt im lặng), `/دم/` khớp «كيف استخدم» (cách dùng — có sẵn ở `lead-score.js` HOWUSE_AR) · «خدمة التوصيل» · «عدم» (đo node). ÂM bắt buộc: ba câu
   đó; DƯƠNG: «فيه دم». (iii) `dauHieuYTe(text)` ⇒ lớp từ khoá + Fast Lane NHƯỜNG model (cùng chỗ `shipNhuongModel` `handler-v3.js:630` `:693`, lyDo
   `nhuong_model:y_te`) — không thì «bleeding po, magkano?» được câu mẫu giá trả, 0 lời khuyên, 0 bàn giao (luật mới không chạy ở nhánh 0 đồng — ② 5 [S7]).
8. **Một luật tên** — `lead-score.js` export `tachTen(text) → string` ('' = không nhận); `hasName = !!tachTen(text)`; `context.js#firstName` gọi `tachTen`, xoá
   bản regex hai (`context.js:152-153`). Nhãn RÕ («my name is» · «my name's» · «here's my name» · «name:» · «pangalan (ko)» · «ako (po) si» · «اسمي» · «الاسم:»)
   ⇒ nhận; nhãn MƠ HỒ («i am» · «i'm» · «im» · «this is») chỉ khi có `\b` hai đầu VÀ 1–3 chữ theo sau đều viết hoa chữ đầu, không thuộc danh sách từ thường
   (waiting · here · there · working · finished · done · ready · busy · fine · ok · sorry · from · in · at · yesterday · today · tomorrow · interested · real…);
   dòng/đoạn trong tin có SĐT: 2–4 chữ, không số, KHÔNG chứa địa danh/từ địa chỉ (`AREA_*` · `ADDR_DETAIL` có sẵn + island · community · city · district +
   uae · emirates · saudi · arabia · ksa · philippines), tách CẢ đuôi «<SĐT> Tên Họ» cùng dòng. Không chắc ⇒ ''. Nguồn chỉ tin khách — giữ nguyên.
9. **COD** — `context.js`:
   a. `COD_OK`: khách tự nói «cash on delivery (po)» / «COD (po)» / «pay on delivery» ⇒ `cod=true` (giữ phủ định `:196`).
   b. `extractFromText(text, prof, { lastAi } = {})` — tham số thứ ba TUỲ CHỌN (`queue/reconcile.js:27` không đổi): `lastAi` có câu hỏi COD (cod · cash on
      delivery · bayad pagdating · pay upon delivery + «?») VÀ khách đáp đồng ý ngắn (yes · ok · okay · opo · oo · sige · sure · تمام · نعم, không phủ định) ⇒
      `cod=true`. Handler truyền `state.lastAiText` ở `:426` và `:874`.
   c. **COD ngầm** (người quyết 15/10): export `codNgam({ prof, text, msgs, pageId, lastAi })` = `!prof.cod` VÀ `prof.phone` VÀ `prof.address` (sau lượt này) VÀ
      lượt này mang SĐT hoặc địa chỉ (`hasPhone`/`hasAddress`) VÀ không phủ định COD VÀ điều kiện COD ĐÃ được bot/page nêu trước đó (`lastAi` hoặc một tin PAGE
      trong `msgs` khớp `cod|cash on delivery|pay (up)?on delivery|bayad (na lang )?pagdating|الدفع عند الاستلام`; tin của KHÁCH không tính; **[S10]** tin
      page/bot nói COD kèm PHỦ ĐỊNH — not available · no COD · prepaid · bank transfer only · cùng khuôn `codDenied` `:196` — KHÔNG tính) ⇒ handler đặt
      `prof.cod=true` + `prof.codNgam=true`; khối hồ sơ in «COD: chấp nhận ngầm (khách gửi SĐT + địa chỉ sau khi đã nghe điều kiện COD) — KHÔNG hỏi lại COD, tạo
      đơn (cod_confirmed=true)».
   d. `TIER_TEXT` nhận thêm B1G1 · buy 1 take 1 · 1+1 · buy one get one · «buy 1get 1free» (dính chữ).
   e. Khối hồ sơ: có SĐT + địa chỉ ⇒ dòng «Bước còn thiếu» đổi thành «Bước còn thiếu: ĐÃ CÓ SĐT, địa chỉ — CẤM hỏi lại · CÒN THIẾU ĐÚNG: <…>» (không còn gì ⇒
      «đủ thông tin — chốt đơn được»). **[S11] GIỮ tiền tố «Bước còn thiếu: »** — ca C11 `test/context.test.mjs:124-131` (hồ sơ có SĐT + địa chỉ, KHÔNG nằm trong
      danh sách ca được sửa ở ③) đòi `/Bước còn thiếu:.*(gói|COD)/`. Không có SĐT + địa chỉ ⇒ giữ nguyên dòng cũ (ca K9 `test/bh7-ngu-canh-botcake.test.mjs:95` giữ).
10. **Tên Facebook làm tên người nhận** (đổi ý đồ — người quyết 15/10): sửa chú thích `context.js:85-92` (tenFb dùng để xưng hô VÀ làm tên người nhận khi khách
    không cho tên; `prof.name` VẪN chỉ là tên khách tự cho — không đổ tenFb vào `name`); dòng `:530-532` thành «Khách tên Facebook là "<tenFb>" — GỌI TÊN khách
    (tên riêng). Khách CHƯA cho tên thật ⇒ DÙNG tên Facebook này làm tên người nhận khi tạo đơn, KHÔNG hỏi tên.»; `missingSteps` (`:511-520`) bỏ «tên» khi có
    `tenFb`. Cờ đơn nháp: handler truyền `tenKhach: prof.name`, `tenFb: prof.tenFb`, `codNgam: !!prof.codNgam` trong `hoSo` (`captureOrder` `:847-850` và
    đường dự phòng `:942-953`); `orders/hang-cho.js#chuanHoaHoSo` (`:178-193`) thêm `ten_tu_facebook: true` khi `tenKhach` rỗng VÀ `tenFb` có VÀ (ten rỗng ⇒
    điền ten = tenFb · hoặc mọi chữ của `ten` nằm trong chữ của `tenFb`, so không phân biệt hoa thường) và `cod_ngam: true` khi `codNgam`; vắng ⇒ không có khoá
    (dòng cũ giữ hình). Hai chuỗi «⚠️ Tên lấy từ Facebook — chưa xác nhận» / «⚠️ COD ngầm — khách chưa nói đồng ý COD» hiện khi có cờ ở:
    **[S3] Hộp thư** `v3/src/ui/hop-thu/trang/hop-thu-ui.js` — thẻ đơn `theDon` (`:154-194`, thêm vào mảng cảnh báo `canh` cạnh nút «Duyệt → Chờ in») và form
    `moDon` (`:61-107`, ngay trên ô «Tôi đã kiểm tra thông tin đã lưu») — đây là NHÀ của sale, nơi sale sửa/duyệt đơn Messenger (`01-QUYET-DINH.md` §10 bổ
    sung CR-28-09c; API `/api/hop-thu/don/:id` trả nguyên `du_lieu_don`, không cần sửa router); và màn vận hành `v3/src/ui/van-hanh/trang/van-hanh.js`
    (danh sách `:307`, hộp «Đơn #id» `:401-410`). Chỉ vẽ ở màn vận hành thì quyết định 15/10 («cờ để sale sửa khi duyệt») không tới người duyệt.
    `v3/src/ui/van-hanh/don-cho.js#luuDonCho` (`:41-100`, dùng chung cho `/api/hop-thu/don/:id/luu`): sale đổi `ten` ⇒ xoá `ten_tu_facebook`. KHÔNG sửa `duyet()`
    (`hang-cho.js:832` gộp `boSung` — không nơi gọi nào truyền `boSung`, `duyetDonCho` chỉ gửi `version`; đụng `duyet` là đụng vùng GL9 — [S13]). Cờ KHÔNG
    tự xuống POS (`duyet` truyền trường tường minh `ten/sdt/…` `:908-910`); sale duyệt không sửa thì tên Facebook đi làm tên người nhận — đúng quyết định 15/10.
11. **Không đổi:** CORE (`prompts.js`) · `tools.js` (schema `create_draft_order` vẫn đòi `name`) · `FIXABLE` · regex và thứ tự luật cửa ra cũ · `doanNgonNgu`/
    `ngonNguLech` · giá · khối Chính sách · kịch bản · `donDaCo` không hết hạn (⑥).

## ③ File được đụng

```
src/context.js
src/lead-score.js
src/outbound-guard.js
src/our-messages.js
src/chat/handler-v3.js
src/orders/hang-cho.js
v3/src/ui/van-hanh/trang/van-hanh.js
v3/src/ui/van-hanh/don-cho.js
v3/src/ui/hop-thu/trang/hop-thu-ui.js
test/context.test.mjs
test/lan-chot-nhuong-model.test.js
test/gl8-luot-emoji.test.mjs
test/bh9-*.test.mjs
ops/bin/nghiem-thu/bh9.sh
docs/thi-cong/nhat-ky/phieu-bh9.md
```
← mỗi dòng đúng một đường dẫn (phép ④ `_chan1.sh` đọc khối này bằng awk). `test/context.test.mjs`: CHỈ C30 · C31 (`:400-417`) đổi theo ý đồ mới ở ② 10
(giữ: `p.name` rỗng; đổi: `missingSteps` không còn «tên» khi có tenFb, khối nói «DÙNG tên Facebook này làm tên người nhận»); ca khác KHÔNG sửa (C11 giữ nhờ
② 9e [S11]; C39 giữ). **[S12]** Hai bộ ca cũ ĐỎ chắc chắn vì đổi ý đồ 15/10 (đo trên HEAD: `donTuTinKhach` khác null với cả hai câu ⇒ cổng 4a bắt trước model):
`test/lan-chot-nhuong-model.test.js:152-159` «⑤ hỏi về ĐƠN ĐÃ CÓ ⇒ nhường model» (khách «The delivery was scheduled for today.», đòi `goiModel === 1`) — CHỈ
đổi kỳ vọng thành: 0 lượt model · `gui` = [`CAU_NHAN_BAN_GIAO.en`] · bàn giao · vẫn KHÔNG «MẪU CỨNG» (giữ tên ca + chú thích dẫn quyết định 15/10);
`test/gl8-luot-emoji.test.mjs:158-175` W5 (câu khách «Your order has been confirmed… the parcel arrives… the rider will call you tomorrow…», đòi 1 dòng
hàng chờ) — NẾU đỏ: CHỈ chuyển câu dấu hiệu đơn ngoài sang một tin khách TRƯỚC (đã `xong` trong `tin_cho_xu_ly`, nguồn (d) `hang-cho.js:446-458` đọc mọi tin của psid),
tin lượt này là câu chốt thường; giữ nguyên mục đích (emoji ở chỗ cắt 60 của nguồn (d) + dòng hàng chờ còn). `hop-thu-ui.js`: chỉ vẽ thêm, không lời gọi
mới (thước `v3/test/b/hop-thu.test.mjs` H4). Cần tệp khác ⇒ ghi «Lệch phiếu» trong nhật ký + lý do, báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/bh9.sh`, rc=0 khi đạt)

Khuôn cổng nhà (`gl8.sh`): mỗi phép in MỘT con số hoặc MỘT bảng đếm; hộp cát Postgres riêng mỗi tệp ca (`db/sandbox.js`, hậu tố `_p<pid>`); chạy qua
`test/_an-toan.mjs`; 0 mạng, 0 model (cửa gửi + `chayCloser` TIÊM); chỉ `grep -E`; đảo-vá trên BẢN SAO TẠM, mỗi đột biến một tiến trình node mới.

1. **Tên** (`tachTen` + `extractFromText().name` + `hasName`, CÙNG một bảng):

   | # | câu khách (ẩn danh) | gốc | `name` kỳ vọng |
   |---|---|---|---|
   | 1 | this is working for fails | UAE #30 | '' |
   | 2 | Ana⏎Marina island⏎Green community⏎Villa 12⏎0501234567⏎Abu Dhabi, UAE | UAE #34 | '' hoặc «Ana»; KHÔNG «Marina island» |
   | 3 | So,if you haven't time now, you will bring me tomorrow or after | UAE #35 | '' |
   | 4 | Later, when this is finished | UAE #91 | '' |
   | 5 | 0501234567 King street gym same building, Abudhabi city | UAE #97 | '' |
   | 6 | I'm here in Dammam | Saudi #1 | '' |
   | 7 | Ok 6 u deliver I am waiting | Saudi #4 | '' |
   | 8 | How many days and what time arrived my order? | Saudi #11 | '' |
   | 9 | Im waiting for delivery I send already the location | Saudi #16 | '' |
   | 10 | My sister available time is 10am and 9pm sir | Saudi #28 | '' |
   | 11 | Here's my name Maria Santos. . . Contact No. 0551234567 Address: AL NAKHEEL DISTRICT VILLA 9 RIYADH, SAUDI ARABIA, SA | Saudi #31 | Maria Santos |
   | 12 | I send my location to him yesterday, once he ask | Saudi #43 | '' |
   | 13 | Office No.: 12, Entrance 4 Terminal 1 Cargo Village, Dubai, UAE 0501234567 Maria Santos | UAE #9 | Maria Santos |
   | 14 | This is real gold | N-RP2 | '' |
   | đối chứng | C1 · C3 · C10 giữ · «I'm Maria» → Maria · «Name: Maria Santos» → Maria Santos · «اسمي محمد» → محمد | | |

2. **Bộ dò đơn** — `donTuTinPage` DƯƠNG (đều ≠ null): «Hello! Your order is scheduled for delivery today…» · «Your order "<SP>" is set for delivery tomorrow,
   Thursday…» · «…saw that the delivery was unsuccessful…» · «But the order is in transit, could you please receive it for me?» · «They still haven't delivered
   the order to you?» · «I will inform the courier to contact that number. Courier's phone: 05…» · «👉Your order is 109 SAR. You will receive this gift in the
   next 2-5 days!» · «Your order: <SP> - Tracking number: 123…»; ÂM (null) đủ năm câu ở ② 2a + bốn câu [S2] + C35/C36/C41 giữ. `donTuTinKhach` DƯƠNG: sáu câu
   khách ở ① lỗi 1 + «Yes he call me now but i tell him to deliver 4pm today» + C39; ÂM: bảy câu C39 · «How many days and what time arrived my order?» (CHƯA
   đặt) · «Buy 2 get 2 / I order before» (mua lại) · «how much free delevery» · «can you deliver tomorrow?» · «Deliver riyadh?» · «how to order» · «Same number»
   · **[S1]** tám câu trước bán ở ② 2b + «If you deliver today I will order 2 sets» · «i dont want the delivery to my office, home address only» — mỗi câu ÂM
   này cũng chạy qua `laCauSauBan(câu, hồ sơ rỗng)` ⇒ `la:false`. `laCauSauBan`: hồ sơ có
   `donDaCo` + «Deliver today / If no ok tomorrow deliver at 10am ok» ⇒ la; hồ sơ có `donDaCo` + «Is it the gel for varicose» ⇒ KHÔNG la; hồ sơ rỗng + «can you
   deliver tomorrow?» ⇒ KHÔNG la; hồ sơ `ordered` + «Poyde sa next Wednesday edeliver po» ⇒ la. `bocDonTuLichSu` cho cùng `donDaCo` với `cleanHistory` trên cùng
   lịch sử (một bản luật).
3. **COD** — «Cash on delivery po» ⇒ true · «COD po» ⇒ true · «yes» + lastAi «…Okay na po ba sa'yo ang COD?» ⇒ true · «yes» + lastAi «Which set po?» ⇒ false ·
   «Same number» + lastAi hỏi COD ⇒ false · «no COD please» ⇒ false · C4 giữ. `codNgam`: tin page trước có «bayad pagdating ng order» + lượt này «<địa chỉ>
   0501234567» (hồ sơ đủ) ⇒ true; CHỈ khách tự hỏi «is it COD?» (không tin page nào nêu) ⇒ false; có nêu COD nhưng lượt này chỉ có SĐT, chưa địa chỉ ⇒ false; «no
   COD, card only» ⇒ false · **[S10]** tin page duy nhất nêu COD là «COD is not available in your area, prepaid only» ⇒ false. Gói: «Buy 1 take 1?» · «B1G1 free» · «Buy 1get 1free» ⇒ tier ≠ ''.
4. **Cửa ra** (`guardOutbound`, KB có bảng giá 109/159, mọi hàng dưới đây chạy với `luatBH9: true` cộng ctx ghi ở cột 2; giữ nguyên MỌI ca của
   `test/guard-*.test.mjs`):

   | câu bot (ẩn danh) | ctx | kỳ vọng |
   |---|---|---|
   | no active order was placed under your name yet · That delivery notice was sent by mistake — sorry for the confusion. | — | CHẶN `BIA_TRANG_THAI_DON` |
   | Your order is on its way — expect delivery in 2-4 working days po. · No problem — canceled na pala. | — | CHẶN `BIA_TRANG_THAI_DON` |
   | Our team already has your WhatsApp — they'll message you there… the rider will contact you before arriving. | — | CHẶN `TU_HUA` |
   | Saturday delivery noted. · Got it po, 6 PM delivery noted. · Noted po ma'am, 10 AM tomorrow. · Hintayin nyo lang po ang courier bukas, 10 AM. | — | CHẶN (`TU_HUA`, hoặc `DELIVERY_PROMISE` cũ nếu regex cũ đã bắt — không đổi) |
   | I'll request the courier to prioritize 10 AM delivery and call your sister… | — | CHẶN `TU_HUA` |
   | Our staff will contact you via WhatsApp to confirm your delivery on Wednesday. | — | CHẶN `TU_HUA` |
   | Our staff will contact you shortly po. Please keep your phone line open. | `daBanGiao` / không | QUA / CHẶN |
   | We've received your details, our staff will contact you to confirm. | `isOrderSummary` | QUA |
   | Which set po — Buy 1 Get 1 FREE (109 SAR) or Buy 2 Get 2 FREE (159 SAR)? · May I have your complete address? | `donDaCo` / không | CHẶN `BAN_LAI_SAU_BAN` / QUA |
   | …helps soothe discomfort… Which set po? | `dauHieuYTe` | CHẶN `Y_TE` |
   | I'm sorry to hear that — please stop using it and see a doctor first. | `dauHieuYTe` | QUA |
   | …please see a doctor, and this gel helps stop bleeding. | `dauHieuYTe` | CHẶN `Y_TE` |
   | Delivery takes 2-5 working days po. · Free delivery po, pay upon delivery. · Buy 1 Get 1 FREE — 109 SAR, free delivery. | — | QUA |
   | câu có cụm «courier will call you before arriving» mà `kb.text` có nguyên văn cụm đó | — | QUA |
   | **[S8]** Your order is confirmed po ✅ — 109 SAR, cash on delivery. | `isOrderSummary` / không | QUA / CHẶN `BIA_TRANG_THAI_DON` |
   | **[S8]** We have your number and address po, our staff will call you to confirm. | `isOrderSummary` / không | QUA / CHẶN `TU_HUA` |
   | **[S8]** Once your order is confirmed, delivery takes 2-5 working days po. | — | QUA |
   | **[S7]** mọi câu của bảng này với ctx KHÔNG có `luatBH9` | như hàng gốc | phán quyết GIỐNG HỆT base |

   Thêm: mọi câu mẫu `fastLane*` của kịch bản page 275/276 (chép văn bản kịch bản vào ca — không có dữ liệu khách) QUA bốn luật mới; bốn câu cố định ② 1 QUA
   `guardOutbound(c, { daBanGiao: true })`; câu bị luật CŨ chặn ⇒ phán quyết (rule + action) GIỐNG HỆT base (so với `git show a6f670d:src/outbound-guard.js`
   nạp từ tệp tạm) trên toàn bộ câu của bảng + ca guard cũ.
5. **Y tế** — `dauHieuYTe` DƯƠNG: «I have bleeding» · «may dugo po» · «…pangangati pagdurugo…» · «nangati lalo after ko gamitin» · «I got a rash after
   applying it» · «I'm pregnant, can I use it?» · «فيه دم»; ÂM: «itching» · «makati» · «hapdi» · «burning» · «bukol» · «almuranas» · «halo-halo» · «I am 30.
   nothing else cough and no fever» · «… SHEIKH RASHED ST …» · **[S9]** «Is it good for irritation?» · «effective po ba sa rashes?» · «Does it cause allergy?» ·
   «كيف استخدم» · «خدمة التوصيل» · «عدم».
6. **Khối hồ sơ** — tenFb ⇒ dòng mới ② 10 (C30/C31 sửa); có SĐT + địa chỉ ⇒ «ĐÃ CÓ… CẤM hỏi lại · CÒN THIẾU ĐÚNG»; `codNgam` ⇒ dòng COD ngầm; `dauHieuYTe`
   ⇒ dòng ⚕️; hồ sơ KHÔNG tenFb, không SĐT/địa chỉ, không kích hoạt ⇒ chuỗi khối GIỐNG base từng ký tự (so với `buildProfileBlock` của
   `git show a6f670d:src/context.js`); C31 token ≤ 200.
7. **Handler qua `chayMotVong`** (khuôn hộp cát `test/rp2-worker-a-phay.test.mjs:35-55`: `chayCloser` giả đếm lượt gọi, cửa gửi tiêm, `config.pkTags.handoff`
   đặt «AI CHAT»; **KHÔNG tiêm `kiemTinRa`** — khuôn RP2 tiêm `() => ({ ok: true })` `:47`, giữ thì bốn luật mới không bao giờ chạy và d/e/g/j xanh giả; tin
   POS trong lịch sử mang `from.admin_name: 'POS'` (máy — `conv-owner.js:85`) để `nhanDienSale` không nhường trước khi tới handler):
   a. lịch sử có tin POS «…scheduled for delivery today…», khách «You delivered today at 10 right sir» ⇒ `chayCloser` 0 lượt · đúng 1 `guiTin` với chữ `===`
      `CAU_NHAN_BAN_GIAO.en` · 1 `gatThe` «AI CHAT» · 1 `ghiNote` lý do khớp `^🙋 AI CHUYỂN NGƯỜI[\s\S]*SAU BÁN · khách: «You delivered today at 10` ·
      `hoi_thoai` HANDOFF/SALE · `so_ai` có `reply` lane `cau_co_dinh` + `handoff`.
   b. như a, khách viết Ả Rập ⇒ chữ `===` `CAU_NHAN_BAN_GIAO.ar`.
   c. ÂM: hồ sơ rỗng, khách «can you deliver tomorrow?» ⇒ `chayCloser` 1 lượt · chữ gửi `===` câu model giả (byte).
   d. model giả trả «That delivery notice was sent by mistake…» và xếp 2 ảnh — một KHÔNG caption, một caption sạch — ⇒ đúng 1 `guiTin` =
      `CAU_NHAN_BAN_GIAO.en` · 0 `guiAnh` · bàn giao · `so_ai` `spent_no_send` có `text_bi_chan`; **[S6]** tổng `token_vao` mọi dòng `so_ai` của tin đó = usage
      giả ĐÚNG MỘT lần (dòng `reply` lane `cau_co_dinh` token NULL).
   e. model giả trả câu đọc lại SĐT (luật CŨ `PII_ECHO`) ⇒ 0 `guiTin` + `ghiNote` lý do «cửa ra chặn: PII_ECHO» — giống base.
   f. hồ sơ có `donDaCo` nguồn `page` (lượt không phải câu sau bán), model giả gọi `create_draft_order` đủ trường ⇒ kết quả tool lỗi · 0 dòng
      `hang_cho_tao_don`; **[S1]** cùng ca với `donDaCo` nguồn `khach` ⇒ 1 dòng `hang_cho_tao_don`.
   g. khách «I have bleeding», model giả trả câu chào gói ⇒ 1 `guiTin` = `CAU_Y_TE.en` + bàn giao; model giả trả «…please stop using it and see a doctor…» ⇒
      1 `guiTin` = câu model (byte) + bàn giao. **[S9]** khách «bleeding po, magkano?» với `lanNhanh` giả TRẢ câu mẫu giá ⇒ `chayCloser` 1 lượt, 0 chữ «MẪU CỨNG».
   k. **[S4]** `isOurFixedMessage('Noted')` · `('Noted po')` · `('Sorry')` · `('Sorry to hear that')` đều false (sale gõ vẫn là người); hội thoại AI giữ, lịch sử
      có tin sale `from.admin_name` người + «Noted po» ⇒ `nhanDienSale` nhường (HANDOFF/SALE) như base.
   h. C30 + COD ngầm: hồ sơ `name` '' + `tenFb` «Maria Santos», lịch sử page có «bayad pagdating ng order», khách «<địa chỉ> 0501234567» ⇒ `ho_so.cod=true`;
      model giả gọi `create_draft_order` name «Maria» ⇒ `hang_cho_tao_don.du_lieu_don` có `ten_tu_facebook: true` · `cod_ngam: true`; name «Ana Cruz» (khách tự
      gõ, `prof.name` có) ⇒ KHÔNG có `ten_tu_facebook`.
   i. ≤ 1 câu cố định: lượt kế ngay sau ca a (khách nhắn tiếp) ⇒ 0 `guiTin` (hội thoại HANDOFF).
   j. Luật 2: lượt thường (không kích hoạt gì) ⇒ chữ gửi `===` câu model giả; lượt câu mẫu Fast Lane/lớp từ khoá ⇒ y như base.
8. **Hàng chờ + màn** — `chuanHoaHoSo` giữ `ten_tu_facebook`/`cod_ngam` chỉ khi true (vắng ⇒ không khoá); `luuDonCho` đổi `ten` ⇒ cờ mất, không đổi ⇒ cờ
   còn; HTML có chuỗi «Tên lấy từ Facebook — chưa xác nhận» / «COD ngầm» khi cờ, không có khi vắng — ở **[S3] Hộp thư `theDon` + `moDon`** (dựng DOM giả như
   `v3/test/b/hop-thu.test.mjs` hoặc đọc chuỗi mẫu trong `hop-thu-ui.js`) VÀ màn vận hành (danh sách + hộp «Đơn #id»).
9. **M6 — phát lại trên lịch sử giả lập** (CHỈ ĐỌC: `PGOPTIONS='-c default_transaction_read_only=on'`, `aicloser_gialap_pilot` + `aicloser_gialap_2` trên
   máy dev; KHÔNG in chữ khách/tên/SĐT — chỉ id + luật + số đếm):
   a. **Cửa ra cũ ↔ mới** trên chữ bot đã ghi: UAE `lan_gui.noi_dung->>'text'` (64 dòng `guiTin`, đủ chữ) + Saudi page 276 `so_ai.du_lieu->>'text'` loại
      `reply` lane AI và `->>'text_bi_chan'` loại `spent_no_send` (cắt 200/600); ctx: `kb` = `rapKb` của page trên chính CSDL đó, `lastAiText` = câu bot trước
      cùng psid. Đạt: mọi câu cũ bị chặn ⇒ phán quyết mới GIỐNG HỆT (đếm `PRICE_MISMATCH` · `DUPLICATE` · `PII_ECHO` · `DELIVERY_PROMISE` mới = cũ); câu cũ QUA
      ⇒ mới QUA hoặc thuộc `LUAT_BH9`. In bảng «luật mới × số câu» + danh sách id bị luật mới chặn; ĐÒI có trong danh sách các câu của UAE #82–#85 #100 #65 và
      Saudi #4 #5 #23 #28 #35 #37 #54 (ánh xạ «#n» ở dòng Nguồn [S13]: UAE `lan_gui.tin_id` = id của #n, Saudi `so_ai.nguon_dong` = n — soát (a) đã đo: cả 19
      lượt đều là dòng `reply` đã gửi; ghi ánh xạ vào nhật ký); câu bị luật mới chặn NGOÀI các lượt lỗi đã biết ≤ 3 (mỗi câu ghi lý do vào nhật ký, không chép
      chữ khách).
   b. **Cổng sau bán — ca âm trên dữ liệu thật**: `laCauSauBan(tin_cho_xu_ly.noi_dung, hồ sơ rỗng)` trên 109 tin khách UAE ⇒ mọi tin bị đánh dấu thuộc ht 43779
      (đã biết sau bán); ≥ 2/3 trong {#82, #90, #102}; tin ngoài ht 43779 bị đánh dấu ⇒ ĐỎ (người đang muốn mua bị coi là sau bán). **[S1]** Thêm 60 tin
      khách page 340 (`aicloser_gialap_2`): tin bị đánh dấu chỉ được thuộc hội thoại có `ho_so.donDaCo` nguồn page (44005 · 44018), ngoài ra ⇒ ĐỎ.
   c. **Y tế trên dữ liệu thật**: `dauHieuYTe` trên 109 tin UAE ⇒ đúng ht 43877 #47; «no fever» (ht 43882) và tin địa chỉ ht 43893 KHÔNG.
   d. **Tên trên dữ liệu thật**: `tachTen` trên 109 tin UAE ⇒ 0 tên thuộc tập 12 chuỗi sai ở ① lỗi 3; in số tin có tên (nhật ký liệt kê tên đã che dạng
      «M… M.» để người kiểm).
   e. **Số câu cố định thêm** = (9a câu bị luật mới) + (9b tin bị đánh dấu) — in con số; đạt khi ≤ số lượt lỗi đã biết + 3.
   f. **[S2] Khuôn page mới không bắt thêm trên chữ của CHÍNH BOT + kịch bản**: `donTuTinPage` mới vs `git show a6f670d:src/context.js` trên mọi câu của
      `lan_gui.noi_dung->>'text'` + `so_ai` `text`/`text_bi_chan` (hai CSDL, 407 dòng) + `kich_ban.noi_dung_may`/`noi_dung_nguoi` (75 dòng × 2 cột mỗi CSDL, tách câu) ⇒
      số câu khớp mới = số câu khớp base (bot v3/ai_sale nằm trong lịch sử page; câu nào thêm là `donDaCo` tự đầu độc). Soát (a) đo bằng khuôn xấp xỉ: 0 câu thêm.
10. **Đảo-vá** (bản sao tạm, mỗi đột biến một tiến trình): trả `NAME_LABEL`/`NAME_LINE` cũ ⇒ ④1 #1 #3 #4 #6–#10 #12 #14 đỏ · bỏ lọc địa danh ⇒ #2 #5 #11 đỏ ·
    bỏ tách đuôi sau SĐT ⇒ #13 đỏ · `hasName` giữ regex riêng ⇒ cột `hasName` đỏ · trả `DON_TRANG_THAI`/`KHACH_NOI_VE_DON` cũ ⇒ ④2 dương đỏ · suy từ
    `orderNoted` ⇒ «Your order is free delivery dear» đỏ · `cleanHistory` không gọi `bocDonTuLichSu` (hai bản) ⇒ ca «một bản luật» đỏ · bỏ cổng 4a ⇒ ④7a đỏ ·
    đặt cổng SAU Fast Lane/lớp từ khoá ⇒ ④7a (ca có câu mẫu khớp) đỏ · bỏ chặn `captureOrder` ⇒ ④7f đỏ · bỏ từng luật mới ⇒ hàng ④4 của luật đó đỏ · đặt luật
    mới TRƯỚC luật cũ ⇒ ④4 «giống base» + ④9a đỏ · luật mới đi đường cũ (im) ⇒ ④7d đỏ · bỏ `daBanGiao` ⇒ hàng «staff will contact» đỏ · bỏ miễn KB ⇒ hàng KB đỏ ·
    trả `COD_OK` cũ / bỏ `lastAi` / bỏ `codNgam` ⇒ ④3 đỏ · `codNgam` tính cả tin khách ⇒ ca «is it COD?» đỏ · bỏ phủ định y tế ⇒ «no fever» đỏ · bỏ `\b` của
    `rash` ⇒ «RASHED» đỏ · bỏ cờ `ten_tu_facebook` ⇒ ④7h đỏ. **Soát (a) thêm:** giữ nhánh 1–3 CŨ của `KHACH_NOI_VE_DON` ⇒ ca âm trước bán [S1] ④2 đỏ ·
    bỏ điều kiện (i)/(ii)/(iii) [S2] ⇒ bốn câu ÂM page mới + ④9f đỏ · `captureOrder` chặn cả nguồn khách ⇒ ④7f vế nguồn khách đỏ · đưa câu cố định vào
    `fixed` ⇒ ④7k đỏ · dùng `xaAnh(false)` thay bỏ hàng ⇒ ④7d (ảnh không caption) đỏ · để `dung` ở dòng `reply` câu cố định ⇒ ④7d tổng token đỏ · bỏ cờ
    `luatBH9` (luật mới chạy mọi nơi) ⇒ hàng [S7] ④4 đỏ · bỏ miễn `isOrderSummary` ⇒ hai hàng [S8] đỏ · bỏ điều kiện «sau khi dùng» ⇒ ba câu ÂM kích ứng ④5
    đỏ · rào Ả Rập bằng chuỗi trơn ⇒ «كيف استخدم» đỏ / bằng `\b` ⇒ «فيه دم» đỏ · bỏ nhường model khi y tế ⇒ ④7g «magkano» đỏ · bỏ lọc COD phủ định ở tin page
    ⇒ ④3 «not available» đỏ · bỏ tiền tố «Bước còn thiếu: » ⇒ C11 đỏ · bỏ cảnh báo ở Hộp thư ⇒ ④8 đỏ.
11. Cổng/bộ ca cũ (rc tách dòng): `npm test -- --test-force-exit` không thêm ca đỏ so base (mốc 2827 · đỏ chập chờn đã biết `l0-m2-gop-cua-hep` G6) · `gl8.sh` ·
    `rp2.sh` · `rp1.sh` · `bh7.sh` · `bh8.sh` (so base) · `test/context.test.mjs` (trừ C30/C31 đã đổi; C11 · C39 XANH) · `test/guard-*.test.mjs` ·
    `test/cua-ra-sua-tai-cho.test.js` · `test/ngon-ngu-*.test.*` · `test/l2-m2-handler.test.js` · `test/lan-chot-nhuong-model.test.js` (ca ⑤ đã đổi [S12], ca khác
    giữ) · `test/gl8-luot-emoji.test.mjs` · `test/conv-owner.test.mjs` · `test/danh-tinh-nguoi-gui.test.mjs` · `v3/test/b/hop-thu.test.mjs` · `_chan1.sh bh9` xanh.

**Đo bằng model — SAU gộp, TỔNG chạy** (thợ KHÔNG gọi model): `ops/bin/gia-lap-mot-minh.mjs` CÙNG cờ lần nền (`FASTLANE="1" FASTLANE_TEMPLATES="0"
FASTLANE_INTRO="0" HUMAN_TAKEOVER="0" V3_RAP_PROMPT_BAT="1"`, `--nhip 25000`, Saudi `--khong-nhuong-sale`), khoá `khoa_nha` team 1, ≤ 1 lượt/ngày (N-PILOT-KIMI-TRAN).
Tệp `--kho/--ra` nền đã mất: UAE dựng lại từ 52 `conv_id` + `cust_id` + `msg_id` còn trong `aicloser_gialap_pilot.tin_cho_xu_ly`; Saudi chỉ còn psid. Ngưỡng:
lượt sau bán (UAE ht 43779 #82–#85 #90 #102 #105 · ht 43893 #65 #100 · Saudi #3 #4 #5 #23 #28 #34 #35 #37 #43 #44 #47 #54) — 0 tin tới khách có khẳng định
trạng thái / chào gói / xin lại thông tin / hứa; sale được báo ≥ 90% · chốt (UAE #9 #10 #39 #41 #97 #98 · Saudi #12 #31) — 0 lượt xin lại SĐT/địa chỉ đã có,
≥ 3/4 tạo đơn nháp ở UAE #9 #97 · Saudi #12 #31, UAE #63 vẫn tạo · tên — 0 `ho_so.name` thuộc 12 chuỗi sai · y tế UAE #47 — khuyên ngừng/đi khám + bàn giao ·
không tụt: `PRICE_MISMATCH`/`DUPLICATE` không tăng, token/lượt TB ≤ nền +10%. M1/M3/M4 trượt = lỗi MÃ ⇒ thợ sửa; phần lời model trượt ⇒ ghi số, trình người quyết.

## ⑤ Test chạm nhánh nào

`test/bh9-*.test.mjs` — `tachTen`/`hasName` · `donTuTinPage`/`donTuTinKhach`/`bocDonTuLichSu`/`laCauSauBan` · `COD_OK`/`lastAi`/`codNgam`/`TIER_TEXT` ·
bốn luật cửa ra mới + ctx (`donDaCo` · `daBanGiao` · `dauHieuYTe` · `isOrderSummary` · miễn KB) + bảo toàn luật cũ so base · `dauHieuYTe` · khối hồ sơ (dòng
mới + bản chụp không kích hoạt so base) · handler: cổng 4a (en/ar), luật mới ⇒ câu cố định + bàn giao + không ảnh, luật cũ ⇒ đường cũ, chặn `captureOrder`,
y tế hai nhánh, C30 + COD ngầm ⇒ cờ hàng chờ, ≤ 1 câu cố định, luật 2 · `chuanHoaHoSo` + `luuDonCho` (cờ) + HTML Hộp thư (`theDon`/`moDon`) + màn vận hành
· M6 phát lại. `test/context.test.mjs` — C30 · C31 theo ý đồ mới. `test/lan-chot-nhuong-model.test.js` ca ⑤ «ĐƠN ĐÃ CÓ» · `test/gl8-luot-emoji.test.mjs` W5 (nếu
đỏ) — theo ③ [S12].

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

DỮ LIỆU (không mã, tổng/marketer làm qua giao diện): khối chung team 1 `/khoi-chung` — bỏ «30-day money-back», giao 2–5 ngày, đòi hoàn ⇒ giao sale (người quyết
15/10) · kịch bản 275/276 — «Pagdurugo» trong danh sách triệu chứng gel lo (thêm câu «chảy máu ⇒ nên đi khám» hoặc bỏ), «( Total 2 iteam )» · ghi rõ «gel cho
vùng hậu môn/trĩ» trong mô tả sản phẩm (UAE #90). NỢ MỚI: **N-BH9-DON-HET-HAN** (`donDaCo` không hết hạn ⇒ khách mua lại sau khi nhận hàng bị coi là sau bán
mãi — cổng giao sale, không mất khách nhưng thêm việc sale) · **N-BH9-NGUON-DON-CHUAN** (bot không có trạng thái đơn thật: `don_hang` prod là ảnh chụp 28/08
không job làm tươi — `src/hrm/don-pos.js:4`; nguồn chuẩn: làm tươi `don_hang` theo `conversation_id` hoặc job BigQuery `vw_sale_order_team` ghi vào hồ sơ;
POS sống `hang-cho.js:345` quá nặng cho mỗi lượt) · **N-BH9-GOI-DOI** (gói khách đổi sau không đè `prof.tier` — Saudi #31) · **N-BH9-KHO-GIA-LAP** (tệp
`--kho/--ra` để ngoài `/tmp`; lượt chạy page sau xoá tin của page trước — `gia-lap-mot-minh.mjs` khối «dọn lượt trước»). Để sau theo người quyết: BH2 (hồ sơ
«đã hỏi/sẵn sàng») · BH3 (5 luật guard «nói như người») — cùng tệp, TUẦN TỰ sau BH9. Ngôn ngữ (bot trả Hindi/Nepal — Saudi #25 #68; chêm «po» với khách tiếng
Anh) · phần «muốn mua» của N-RP2-REGEX-TIN-NHUONG · v3 không có bậc «xin model viết lại» (đổi = `doi-y-do`) · hậu mãi/RTO (HOÃN 16/09 — BH9 chỉ nhận ra + giao sale).

## ⑦ ĐÃ TRA CHƯA

```
$ grep -n "^const NAME_LABEL\|^const NAME_LINE" src/context.js src/lead-score.js
src/lead-score.js:102:const NAME_LABEL = /(?:my name is|my name's|i am|i'?m|this is|ako si
src/lead-score.js:103:const NAME_LINE = /^[\p{Lu}\p{L}][\p{L}.'-]+(?:\s+[\p{L}][\p{L}.'-]+
src/context.js:152:const NAME_LABEL = /(?:my name is|my name's|i am|i'?m|this is|ako si|ak
src/context.js:153:const NAME_LINE = /^[\p{L}][\p{L}.'-]+(?:\s+[\p{L}][\p{L}.'-]+){1,3}$/u
$ grep -n "^const DON_TRANG_THAI\|^const KHACH_NOI_VE_DON\|donTuTinPage(raw)\|donTuTinKhach(s)" src/context.js
209:  if (!prof.donDaCo) { const d = donTuTinKhach(s); if (d) prof.donDaCo = d; }
343:const DON_TRANG_THAI = [
362:const KHACH_NOI_VE_DON = [
408:      if (prof) { const d = donTuTinPage(raw); if (d) prof.donDaCo = d; }
$ grep -n "DELIVERY_PROMISE_RE\|^  return pass;\|^const FIXABLE" src/outbound-guard.js
129:const DELIVERY_PROMISE_RE = new RegExp(
248:  if (DELIVERY_PROMISE_RE.test(t) && !/free\s+(?:delivery|shipping)/i.test(t)) {
286:  return pass;
301:const FIXABLE = new Set(['TOO_LONG', 'CHECKLIST']);
$ grep -n "captureOrder: async\|const cua = quaCuaRa(guarded\|if (cls.intent === \"complaint\")\|extractFromText(text, prof)\|hydrateProfile(history\|if (!guarded && cuaRaChan && !state.handoff)\|const nAnh = await xaAnh" src/chat/handler-v3.js
425:  if (!prof.hydratedAt && history.length) hydrateProfile(history, tin.page_id, prof);
426:  extractFromText(text, prof);
732:      const nAnh = await xaAnh();
759:    if (cls.intent === "complaint") {
845:      captureOrder: async order => {
874:    extractFromText(text, prof);
885:      const cua = quaCuaRa(guarded, {
957:    const nAnh = await xaAnh(!!guarded);
994:    if (!guarded && cuaRaChan && !state.handoff) {
$ grep -n -i -E "doctor|bác sĩ|bleed|wound|chảy máu" src/prompts.js src/context.js src/outbound-guard.js src/chat/rap-prompt.js | wc -l
       0
$ grep -n "export function chuanHoaHoSo\|    ten: chu(h.ten" src/orders/hang-cho.js ; grep -n "Thiếu tên\|ten: \"Tên khách\"" v3/src/ui/van-hanh/trang/van-hanh.js
178:export function chuanHoaHoSo(hoSo = {}) {
182:    ten: chu(h.ten ?? h.name),
307:        `<div class="manh">#${esc(item.id)}</div><div class="meta">${esc(item.du_lieu_don.ten || "Thiếu tên")} · …
404:    ten: "Tên khách",
$ grep -n "^const fixed\|^export const HOLDING_MESSAGES" src/our-messages.js
23:export const HOLDING_MESSAGES = [
53:const fixed = new Set([...HOLDING_MESSAGES, ...LEGACY_POSTSALE_HOLDING, ...CLOSER_FALLBACKS].map(norm).filter(Boolean));
$ grep -n "^NAO=" ops/bin/nghiem-thu/_chan1.sh
62:NAO='src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js src/context.js src/lead-score.js'
$ grep -rn "KHÔNG phải tên người nhận\|vẫn phải hỏi tên thật" test | cut -c1-60   ⇒ test/context.test.mjs (C30 :400 · C31 :412)
$ ls docs/thi-cong/phieu | grep -i bh9   ⇒ (trống — BH9 chưa dùng)
$ node scratchpad/bh9/tra/tra-luat.mjs   (hàm thuần trên HEAD, 0 model, 0 mạng)
  TÊN: 12/12 câu sai ở ④1 tái lập («working for fails» · «Marina island» · «e now» · «finished» · «Abudhabi city» · «here in Dammam» · «waiting» ·
       «e arrived my order» · «waiting for delivery I send already the » · «e is» · «SAUDI ARABIA» · «yesterday»); «…UAE 0501234567 Maria Santos» ⇒ ''
  COD/GÓI: «Cash on delivery po» · «COD po» · «yes» · «ok po» cod=false; «Buy 1 take 1?» · «B1G1 free» · «Buy 1get 1free» tier=''
  donTuTinPage: 10/12 câu page thật null (chỉ «has been created» · «out for delivery» khớp); «Your order is free delivery dear» null (đúng)
  donTuTinKhach: 6/6 câu khách thật null
  guardOutbound: 14/14 câu bịa trạng thái / tự hứa / y tế thật ⇒ QUA
  doanNgonNgu: câu Hindi/Nepal La-tinh của bot ⇒ «en»
$ psql (CHỈ ĐỌC) aicloser_gialap_pilot / aicloser_gialap_2
  ho_so.name khác rỗng: UAE 6 (5 sai + 1 đúng từ create_draft_order) · Saudi 276: 9/9 sai · hang_cho_tao_don 2 dòng (cả hai ht 43893) / 0
  don_hang 0 / 0 · tin khách UAE còn 109 (conv_id + cust_id + msg_id) · tin khách Saudi 276 đã bị xoá (còn so_ai 151 + ho_so 54)
  UAE tin có từ khoá sau bán: chỉ ht 43779 (3 tin) + ht 43805/43893 «how to order» (âm) · từ khoá y tế: ht 43877 «bleeding» · ht 43882 «no fever» · ht 43893 «RASHED»
# Soát (a) 19/10 — tệp `tra-luat.mjs` đã mất; tái lập bằng hàm thuần trên HEAD (src không đổi từ a6f670d — `git diff --stat a6f670d..HEAD -- src test v3 ops` rỗng)
  TÊN 12/12 + «…UAE 0501234567 Maria Santos» ⇒ '' · COD/GÓI 7/7 · donTuTinPage 8 câu mới đều null, «has been created»/«out for delivery» khớp · donTuTinKhach 6/6 null
  · guardOutbound 11/11 câu bịa/hứa ⇒ QUA — khớp ⑦ trên.
  donTuTinKhach (HEAD) trên 19 câu hỏi trước bán soát (a) tự viết: 17 BẮT (nhánh 1/2/3) ⇒ [S1]; trên 169 tin khách thật (UAE 109 + page 340 60): 0 bắt
  isOurFixedMessage + 2 câu cố định ② 1: «Noted» · «Noted po» · «Sorry» · «Sorry to hear that» ⇒ true ⇒ [S4]
  node: 'كيف استخدم'.includes('دم') · 'خدمة التوصيل'.includes('دم') ⇒ true; /\bدم\b/u.test('فيه دم') ⇒ false ⇒ [S9]
  ho_so.donDaCo hai CSDL: 16 hội thoại (page 13 — đều mẫu POS «has been created»/«out for delivery» thật; khách 3 — đều câu sau bán thật) · bot đã gửi «Your order is confirmed po»
  có trong ca production `test/guard-fastlane.test.mjs:313` ⇒ [S8]
```
Quan hệ: **mới** · nối C35–C41 (bộ dò đơn 24/09) · BH7 (ghi chú kênh khác) · BH8 (CORE hai bản — KHÔNG đụng) · đổi ý đồ C30 theo người quyết 15/10 (sửa
chú thích + ca C30/C31) · đóng phần tên của N-RP2-REGEX-TIN-NHUONG · phụ thuộc cấu hình prod `PK_TAG_HANDOFF=AI CHAT` (N-PILOT-AI-BACK-SALE — tổng làm) ·
TUẦN TỰ trước BH2/BH3 (cùng tệp `context.js` / `outbound-guard.js`).
**[S13] Song song GL9** (worktree riêng, cùng base): GL9 sửa `src/orders/hang-cho.js` `duyet()` `:869-870` `:970-971` · `ghiSuKienTaoDon` `:1080` · `loai()`
`:1128` (lưới `jsonLanh`); BH9 CHỈ sửa `chuanHoaHoSo` `:178-193` (+ không đụng `duyet`) ⇒ khác hàm, git gộp sạch; người gộp: BH9 rebase SAU GL9, chạy lại
④8 + `l3-m4-*`. `v3/src/ui/van-hanh/don-cho.js:91` (`luuDonCho`, BH9 đụng) cũng `JSON.stringify` trần mang chữ sale gõ — KHÔNG có trong danh sách GL9, BH9
không đổi lưới ⇒ ghi nợ cho tổng. GL10: không đụng `handler-v3.js` ⇒ không giao. **Ý đồ:** COD ngầm + tên Facebook làm tên người nhận lệch chữ
`docs/v3/01-QUYET-DINH.md` §1 («khách … đã đưa đủ tên, số, địa chỉ và NÓI đồng ý trả tiền khi nhận») — người quyết đã chốt 15/10 (sổ §10); tổng ghi một CR
`doi-y-do` vào 01 §1 trước khi gộp (không chặn thợ).
