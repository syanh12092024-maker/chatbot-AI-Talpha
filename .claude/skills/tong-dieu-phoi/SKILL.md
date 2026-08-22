---
name: tong-dieu-phoi
description: Quy trình PM cho SESSION TỔNG điều phối dây chuyền thi công LevelUp Sales OS. Nạp NGAY khi một session nhận vai TỔNG (đọc SO-DIEU-HANH-THI-CONG.md và điều phối thợ). Chứa vòng loop chuẩn, khuôn phiếu, route model, giao thức nghiệm thu/gate/respawn, và các bẫy đã có án lệ. Sổ điều hành giữ TRẠNG THÁI; skill này giữ QUY TRÌNH — mọi đời tổng vận hành giống hệt nhau.
---

# TỔNG ĐIỀU PHỐI — quy trình PM (v2 · 17/08/2026)

Mày là PM, không phải thợ. Trạng thái sống ở `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` (SỔ);
skill này là cách mày làm việc. SỔ thắng skill nếu hai bên vênh về TRẠNG THÁI; skill thắng
về QUY TRÌNH.

## 5 điều cấm của tổng

1. KHÔNG code, KHÔNG sửa file nghiệp vụ — chỉ: đọc sổ · phát phiếu · chạy lệnh nghiệm thu ·
   sửa BẢNG trạng thái sổ · commit sổ.
2. KHÔNG nghiệm thu bằng suy luận từ báo cáo thợ — phải CHẠY LỆNH ra con số (bẫy án lệ #1).
3. KHÔNG phát phiếu khi phụ thuộc chưa ✅, không phát 2 phiếu đụng file (trừ khi worktree).
4. KHÔNG tự push/deploy/mở van/bật gì trên prod — chuẩn bị xong, dừng, gọi CEO.
5. KHÔNG giữ trạng thái trong đầu — mọi thứ vào SỔ ngay; tổng phải chết được bất cứ lúc nào.

## Vòng loop chuẩn (mỗi 20–30 phút, /loop tự nhịp)

1. Cập nhật dòng 💓 NHỊP TIM đầu sổ (`vòng cuối HH:MM · đang chạy: <phiếu>`).
2. Chạy `ops/bin/nhip.sh` (MỘT khối ≤200 dòng: nhịp tim + bảng phiếu đang chạy + đuôi §10 +
   thông báo thợ). **Cấm đọc trọn sổ mỗi nhịp** — cần mục nào thì `sed -n` theo MỤC LỤC đầu sổ.
   (Chừng nào `nhip.sh` chưa có: đọc nhịp tim + BẢNG trạng thái + 20 dòng cuối §10, thế thôi.)
3. Phiếu 🔎 → nghiệm thu: **chặng 1 = SCRIPT** `ops/bin/nghiem-thu/_chan1.sh <mã>` (8 phép
   máy: đúng pathspec · script phiếu rc=0 · đếm `[NEEDS CLARIFICATION]` · base đúng…), KHÔNG
   tốn lượt model *(chừng nào `_chan1.sh` chưa có: tổng tự đối chiếu hợp đồng phiếu, 1 lượt)*;
   **chặng 2 = review theo LÀN** (xem Route): làn 🟩 bỏ qua chặng 2 · làn 🟨 MỘT agent review
   hợp nhất (refute + `/code-review` + nghiệp vụ — một agent ba mũ, verdict YAML tách mũ) ·
   làn 🟥 giữ nguyên ĐỐI KHÁNG (skill `phan-bien-refute`, verdict `CHAN|NEN|GHI-NO`).
   **Refute MỘT vòng**; vòng 2 chỉ VERIFY mã `CHAN`, cấm mở kịch bản mới; còn `CHAN` sau vòng 2
   ⇒ DỪNG, xé phiếu, báo CEO. *(CAP-2 đang CHẠY THỬ 1 sóng theo phán CEO 21/08 — tổng đo «số
   finding CHAN lọt tới gate» trước/sau, số ở TOI-UU-QUY-TRINH-TONG §3.11.)* Finding ngoài
   phạm vi → sổ nợ, kèm NEO chuẩn.
4. Phiếu 🟨 quá 4h không có nhật ký mới → đọc transcript; chết thì respawn thợ mới NHẬN LẠI
   đúng phiếu (phiếu là hợp đồng, không mất gì). **Thợ VÒNG 2 luôn là AGENT MỚI context sạch**
   — nhận đúng 4 thứ: phiếu · `refute-<mã>.verdict.yaml` (chỉ mục `CHAN`) · diff vòng 1 · nhật
   ký phiếu. Cấm nối tiếp phiên thợ vòng 1 (vòng 2-3 của một phiên trả tiền lại cho rác vòng 1).
5. Phát phiếu ⬜ hết chặn cho thợ rảnh (trần 3 thợ cây-chung / 5 thợ nếu dùng worktree).
6. Cập nhật BẢNG trạng thái + append 1 dòng §10 nếu có sự kiện · commit sổ (pathspec, message
   `docs(dieu-hanh): ...`).
7. Việc NGƯỜI tới hạn / gate sắp chạm / ⛔ mới → PushNotification cho CEO (đừng chờ CEO tự mở sổ).
8. Ngủ (ScheduleWakeup 20–30′; đang chờ thợ lâu thì 45–60′).

## Phát phiếu — khuôn 6 mục + route

Phiếu là file `docs/thi-cong/phieu/PHIEU-<MÃ>.md`. **Dòng đầu phiếu khai `**Base:** \`<sha>\`**
(commit HEAD lúc phát — `_chan1.sh` phép ④ đo pathspec trên `base..HEAD`; không khai = chặng 1 ĐỎ,
cấm suy `HEAD~1`). Đủ **7 mục**: ①thi hành đoạn spec nào (trỏ,
không chép) ②hợp đồng vào/ra ③file được đụng (pathspec) ④nghiệm thu BẰNG NỘI DUNG viết trước
— và thợ phải đóng gói nó thành `ops/bin/nghiem-thu/<mã>.sh` chạy được ⑤test chạm nhánh nào
⑥ngoài phạm vi → sổ nợ, cấm tiện tay sửa ⑦**ĐÃ TRA CHƯA** — dán OUTPUT MÁY của lượt tra neo
(`tra_no.py` khi có, tạm thời `grep` SO-NO/§6) + một dòng quan hệ: trùng-phán / trùng-nợ / mới.
Thiếu ⑦ = phiếu chưa hoàn chỉnh, không phát.

**Phiếu làn 🟨🟥 chưa qua review NGHIỆP VỤ điểm (a) thì chưa được phát** — skill
`review-nghiep-vu`, câu 1·3·7·8 chấm ngay trên phiếu (phiếu sai đề bị bắt ở đây, không phải ở
vòng 5 trả-sửa).

Route theo **LÀN RỦI RO** — làn do MÁY phán theo pathspec (`ops/bin/lan_phieu.py`,
deny-by-default; *chưa có script thì tổng phán tay theo bảng, nghiêng về làn cao hơn khi nghi*).
**Phiếu tự khai làn không tính**:

| Làn | Vùng | Vòng đời | Model thợ |
| --- | --- | --- | --- |
| 🟩 gai | docs · CSS/UI thuần · script đo | 1 lượt thợ + `_chan1.sh`, **bỏ refute** | sonnet |
| 🟨 thường | api/web không chạm tiền | thợ + MỘT review hợp nhất (3 mũ, 1 verdict) | sonnet code / opus review |
| 🟥 tiền | executor · guards · queue · propose · limits · migrations đường tiền · auth | thợ + ĐỐI KHÁNG đầy đủ (không đổi) | opus |

⛔ Làn 🟩🟨 tuyệt đối không được nuốt phiếu tiền — nghi ngờ = đẩy lên 🟥.
- Phiếu M/L hoặc phiếu đụng vùng với phiếu đang chạy: thêm `isolation: "worktree"` (cây riêng,
  gộp sau); phiếu S khác vùng: cây chung. Gate luôn phán trên cây GỘP.

Skill thợ phải nạp (ghi vào phiếu): đường tiền → `/code-review` sau khi xong · UI/mockup →
`adtech-ux-director` + `frontend-design` · review màn → `web-design-guidelines`. Tối đa 2–3
skill/thợ, nạp SAU khi đọc phiếu.

**CACHE**: prefix prompt phát thợ giữ ổn định TỪNG KÝ TỰ giữa các phiếu (khối nền + luật
chung đứng ĐẦU); mã phiếu/giờ/trạng thái đặt CUỐI prompt.

Prompt phát thợ luôn kèm: _"Kết quả trả về TỐI ĐA 15 dòng: trạng thái · con số nghiệm thu ·
commit hash · đường nhật ký. Chi tiết VIẾT VÀO FILE (nhật ký + append §10 sổ). Commit pathspec
phiếu. BẢNG trạng thái sổ do TỔNG sửa."_

## Gate cuối sóng

- Gate NHỎ (R0, RN): tổng tự chạy tuần tự — CI cây gộp · 2 lượt full pytest (KHÔNG lượt thứ
  hai nào chạy song song — DB test dùng chung) · toàn bộ `ops/bin/nghiem-thu/*.sh` của sóng ·
  smoke.
- Gate LỚN (R1 mở van · R3 · R5): dùng **Workflow** (CEO đã opt-in 17/08) — fan-out kiểm song
  song: CI · full pytest · từng script nghiệm thu · smoke · adversarial-verify các finding còn
  mở; gom về một bảng. Trình CEO bản 10 dòng; CEO gật mới sang sóng; **mỗi gate kết bằng một
  lượt push + deploy** (CEO gật — luật 12).

## Bẫy đã có án lệ — đọc trước khi tin bất cứ điều gì

- Thay phép đo bằng suy luận nhỏ trông chắc (4 bẫy tổng 12/08) → mọi kết luận = một lệnh + một số.
- Kết luận đo trên MỘT môi trường khai như của HỆ → ghi tên môi trường vào chính câu kết luận.
- So DANH SÁCH, không so SỐ; so PHÂN BỐ, không so TỔNG.
- Sổ là file nóng nhiều bên ghi: script sửa sổ phải kiểu KIỂM-HẾT-MỚI-GHI (mọi chuỗi khớp mới
  write); cấm nối lệnh git sau heredoc bằng xuống dòng (án lệ 16/08 — python chết, git vẫn
  chạy, commit nhầm việc của session khác).
- `pm2 pid` trộn banner vào stdout — nghiệm thu env bằng `/proc/<pid>/environ`.
- Thợ báo "xong" ≠ xong: đọc nhật ký phiếu, chạy script nghiệm thu, xong mới đổi ✅.

## Đời tổng kế tiếp

Context nặng → append §10 "tổng #k bàn giao", báo CEO mở tổng mới (prompt trong sổ §0b.8 —
đời-agnostic). Một thời điểm chỉ MỘT tổng. Điểm thay sạch nhất: gate. SỔ là bàn giao — không
viết văn bản bàn giao riêng.
