---
name: tho-thi-cong
description: Quy trình THỢ THI CÔNG cho dây chuyền LevelUp Sales OS. Nạp NGAY khi một session/agent nhận MỘT PHIẾU từ sổ điều hành (SO-DIEU-HANH-THI-CONG.md). Chứa quy trình 8 bước nhận-làm-nộp phiếu và BẪY ÁN LỆ của thợ — chưng cất từ lỗi thật đã trả giá trên chính dây chuyền này. Tổng chưng cất thêm bài học mới vào đây tại mỗi gate.
---

# THỢ THI CÔNG — quy trình + bẫy án lệ (v1 · 17/08/2026)

Mày nhận ĐÚNG MỘT PHIẾU. Phiếu là hợp đồng; sổ là trạng thái chung; skill này là cách làm.

## Quy trình 8 bước

1. Đọc `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §0 (luật) + phiếu của mày ở `docs/thi-cong/phieu/`.
2. Nạp skill KHAI TRONG PHIẾU (tối đa 2–3). Đường tiền thì biết trước: sẽ có agent refute soi mày.
3. **Đo lại nguyên liệu đề bài TRƯỚC khi code** — đề bài phiếu cũng có thể khai sai (án lệ #4 dưới).
4. Viết test CHẠM NHÁNH THẬT trước; khai trong nhật ký nhánh nào test không chạm và vì sao.
5. Code đúng phạm vi. Thấy gì ngoài phạm vi → APPEND vào §9 SỔ NỢ, CẤM tiện tay sửa.
6. Tự đo: chạy câu nghiệm thu-bằng-nội-dung của phiếu, rồi ĐÓNG GÓI nó thành
   `ops/bin/nghiem-thu/<mã-phiếu>.sh` (tổng và gate sẽ chạy lại mãi về sau).
7. Commit PATHSPEC của phiếu (`type(scope): <mã> — mô tả`). Cấm `git add -A`. Module nào đổi
   hành vi thì cập nhật đoạn design-pack tương ứng CÙNG commit.
8. Nộp: nhật ký chi tiết vào `nhat-ky/phieu-<mã>.md` · APPEND **đúng 3 dòng** vào §10 sổ
   (khuôn: `- <ngày> · <MÃ> → <trạng thái> — <một câu> · commit <hash> · nhật ký <path>`) ·
   trả lời tổng ≤15 dòng. BẢNG trạng thái sổ là của TỔNG — không đụng.

## BẪY ÁN LỆ — mỗi cái đã trả giá thật trên dây chuyền này

1. **Cái thước cũng phải qua cổng.** Test tự dựng điều kiện là đo một thế giới không có thật.
   Án lệ: helper test neo đồng hồ tường thay vì đồng hồ DB — bộ ca chỉ đỏ đúng 1 giờ mỗi
   ngày quanh 0h UTC. Test nào đụng ngày/giờ: chạy ở ≥2 múi giờ (`PGTZ=UTC` và UTC±lệch lớn).
2. **Số nào vào `signal` phải trả lời được: "nó đổi thì có gì MỚI để nói không?"** — tuổi/
   timestamp thì KHÔNG (trôi theo đồng hồ). Án lệ: đưa 2 trường tuổi vào signal ⇒ vân tay
   lượng tử đổi mọi lượt ⇒ dedup chết + phanh expire_lien_tiep reset im lặng. Trường "bối
   cảnh" đi vào `guard_trail`, không vào `signal`.
3. **Mỗi câu chú thích khai về hành vi của CODE KHÁC phải kèm một `grep` hoặc một ca test
   ngay trong lượt.** Án lệ: docstring khai "tầng đo thắng tầng khai" trong khi nguồn là
   hằng số cải trang (mọi dòng cùng một giá trị config); comment khai "câu song sinh ở X"
   mà chỉ sửa 1/2 bản. Lời khai sai là bằng chứng giả — người sau tin nó thay vì đi đo.
4. **Đề bài phiếu cũng có thể khai sai nguyên liệu.** Án lệ: phiếu ghi "`orders_pending_7d`
   có sẵn" — đo lại thì cột là `CAST(NULL …)`, NULL 100%. Code theo đúng chữ của đề bài sai
   thì luật ra đời CÂM. Bước 3 tồn tại vì vậy.
5. **Cổng lỏng mà log nói dối là HAI lỗi.** Án lệ: trần C2 lấy mẫu số gồm cả adset PAUSED
   (lỏng ~15×) trong khi log in chữ "đang chạy". Sửa cổng thì sửa cả câu nó khai.
6. **Sửa file NÓNG (sổ, file nhiều bên ghi) phải KIỂM-HẾT-MỚI-GHI** — script so đủ mọi chuỗi
   rồi mới write; và CẤM nối lệnh git sau heredoc bằng xuống dòng (án lệ: python chết giữa
   chừng, git vẫn chạy, commit nhầm việc của session khác).
7. **Reader mới phải có lưới migration.** Án lệ: reader K2 không bọc ⇒ deploy code trước
   migration = job chết mỗi 3h trên MỌI dự án. Cột/bảng mới ⇒ savepoint/`to_regclass`, thiếu
   thì hành xử "mù có nói ra", không chết.
8. **So DANH SÁCH, không so SỐ; so PHÂN BỐ, không so TỔNG; ghi TÊN MÔI TRƯỜNG vào chính câu
   kết luận** (dev/prod/sandbox — kết luận đo trên một môi trường khai như của hệ là án lệ
   lặp 5 lần một ngày).
9. **Tuổi PHÉP ĐO ≠ tuổi SỰ VIỆC.** Án lệ: cờ K2 sống thêm 30h sau khi adset đã khá lên vì
   reader kiểm tuổi LÔ dữ liệu chứ không kiểm ngày-sự-kiện-cuối.
10. **`pm2 pid` trộn banner vào stdout** — nghiệm thu env prod bằng `/proc/<pid>/environ`.

## Luật ứng xử (cherry-pick Karpathy guidelines, 17/08)

11. **Cấm giả định thầm lặng.** Gặp chỗ mơ hồ trong phiếu: hoặc hỏi tổng, hoặc GHI RÕ giả
    định vào nhật ký ngay tại chỗ quyết — người sau phải thấy được mày đã đoán gì.
12. **Cấm over-engineering.** Không thêm abstraction/config/tham số "cho tương lai" ngoài
    phạm vi phiếu; sửa xong dọn code chết mình đẻ ra trong lượt.
13. **Thấy mâu thuẫn/tradeoff thì NÓI RA**, đừng lặng lẽ chọn một bên — một dòng nhật ký:
    "chọn A thay B vì X, giá phải trả là Y".
14. **Trước khi khai xong/xanh: chạy lại lệnh, dán bằng chứng** — khuôn đầy đủ ở skill
    `verification-before-completion`; nhận feedback review thì theo `receiving-code-review`
    (kiểm chứng claim trước khi sửa theo, cấm gật lễ phép).

## Bẫy án lệ bổ sung — chưng cất tại gate R1 (17/08, tổng ghi)

15. **`__pycache__` giữ code đột biến** sau khi khôi phục nguồn cùng-giây (mtime+size không
    đổi) ⇒ test đỏ trên nguồn ĐÚNG. Harness đảo-vá phải xoá `__pycache__` sau mỗi lượt ghi
    file; «đỏ rồi tự xanh không sửa gì» = hỏng THƯỚC.
16. **Đo trong worktree phải xác nhận cây**: venv `.pth` + `sys.path[0]` của script đều có
    thể nạp `app` từ CÂY CHÍNH — `print(module.__file__)` trước khi tin con số; script tự
    `export PYTHONPATH=$PWD` + in cây đang đo.
17. **Phanh tiền phải MỘT CỬA**: gác rải theo nhánh thì cửa mở ra ngày mai lại lọt — dồn mọi
    đường ra verdict/tiền về một `return` duy nhất rồi đặt MỘT gác sau tất cả.
18. **«Cùng LUẬT» chưa đủ — còn phải cùng THỜI ĐIỂM**: hai phép tính cùng công thức chạy ở
    hai thời điểm (fx hôm ký vs hôm đọc) vẫn lệch; so hai giá trị dẫn xuất phải đóng dấu
    tham số dẫn xuất vào chỗ lưu.
19. **Cổng canh HÀNH VI, không canh TỒN TẠI**: cổng «mỗi bậc có nhánh» xanh với nhánh nới-câm;
    hợp đồng phải khai tham số hành vi + cổng thứ hai viết bằng TIỀN (đảo chiều là đỏ kể cả
    khi ai sửa hợp đồng cho khớp đột biến). Đọc đảo-vá bằng câu «đột biến nào KHÔNG đỏ».
20. **Trạng thái CẤP DỰ ÁN không dán per-thẻ**: câu giống hệt trên 100% thẻ sẽ chảy vào
    prompt agent và thành lý do hạ lệnh hàng loạt — trạng thái dự án in MỘT lần ở reader có
    thật, thẻ chỉ mang lý do CỦA THẺ.
21. **Thước chỉ đúng một phần ngày là thước không tồn tại**: phép đo phụ thuộc đồng hồ phải
    ÉP đồng hồ cả hai đầu (máy + DB) trong chính ca đo.
22. **Danh sách gõ tay là lỗ hẹn giờ**: allow-list theo cột TEXT tự do ⇒ giá trị mới lách
    van; đảo thành deny-by-default hoặc tự sinh danh mục từ nguồn sự thật (registry/_HA_MUC).
    «Đổi cột không phải là vá.»
23. **Lưới quét có BIÊN thì kết luận chỉ đúng TRONG biên** — ghi biên vào chính câu kết luận;
    cổng gỡ-tội phải cùng THƯỚC với cổng kết-tội (thước nào kết tội, thước đó gỡ).
24. **Sửa file khi suite của người khác đang đọc = 1F giả cho họ** (2 án lệ trong một ngày):
    trước khi sửa cây chung, hỏi «có lượt đo nào đang sống không»; số của gate chỉ đọc khi
    0 thợ sống.
25. **Số migration/mã delta xin TỔNG cấp khi có worktree song song** (2 án lệ khe-0083 +
    trùng-0085 trong một sóng): hai phiếu tự đánh số là một khe hoặc một đôi trùng; khe làm
    `migrate.discover()` chết ⇒ MỌI lệnh migration + deploy đỏ. Pathspec đúng tên file cũng
    KHÔNG đủ khi hai phiếu cây chung cùng sửa một file — hỏi tổng trước khi chạm file phiếu khác.
26. **Bản vá cũng là code mới** (2 hồi quy liên tiếp cùng hàm, một sóng): đảo-vá của vòng
    trước đo bản TRƯỚC vá; mỗi vòng trả-sửa phải có đảo-vá đo bản SAU — kể cả (nhất là) chỗ
    `/code-review` vừa sửa.
27. **Thước đỏ giống hệt code đỏ — sửa luật phải sửa cả THƯỚC** (5 án lệ một sóng): trước khi
    kết luận «code sai», hỏi «thước của ca này còn khớp hợp đồng mới không»; và ca biên phải
    đọc MÃ CHẶN, không chỉ `allowed` (guard khác cắn trước làm ca xanh giả).
28. **Script nghiệm thu phải TỰ dựng sandbox từ khuôn trần** (`salesos_t3`) và tự dọn — script
    chỉ xanh trên sandbox tay của thợ là script không tái chạy được; máy dev macOS KHÔNG có
    `timeout` (dùng shim/gtimeout, kẻo «không chạy» đọc thành «hỏng»).
29. **Đảo-vá đo «mã có đổi» không đo «thẻ có ĐI»** — mỗi phanh/cổng cần ít nhất một ca
    CHO-QUA thật (allowed=True chiều lành) và một ca hành-vi (thẻ thật đi trọn đường), không
    chỉ known-answer hằng trong test (test lấy đáp án từ code bị đo = đột biến sống).
30. **Cổng AST canh HÌNH DẠNG code, không canh ĐƯỜNG ĐI dữ liệu** — helper truyền giá trị làm
    tham số và hàm chết gọi `kep()` là hai cách rẻ nhất làm cổng xanh; bằng chứng cutover phải
    là PHÉP ĐO HÀNH VI (đổi config → hệ đổi thật).
31. **Cửa VÀO của một object là tập MỞ, cửa RA đúng một cái** (3 vòng bị phá cùng kết cục):
    phanh/bất biến đặt ở CỬA RA (nơi giá trị thoát ra thành hiệu lực), lớp chặn cửa-vào chỉ là
    lưới sớm; và «vá một lớp thì lỗ chạy ra BỜ lớp đó» — đếm cửa không có điểm dừng.
32. **Cổng cùng chủ với thứ nó chứng nhận là lưới HỒI QUY, không phải bằng chứng** — lời khai
    của cổng phải nói đúng tầm nó đo («bắt tái phạm đã biết»), đừng in «tầng kín/ĐỦ».
33. **Luật đúng áp SAI GRAIN vẫn là lỗi tiền** (một họ 3 finding): trần tuổi nguồn lấy theo
    NHỊP NGUỒN thật (không phải nhịp của câu hỏi khác) · hoãn/phán per-THẺ chứ không per-LÔ
    (một phần tử mù hoãn cả lô = fail-OPEN trá hình) · phanh không chạy bằng số bịa (hằng
    mặc-định-trong-file không phải target đã ký — cần cờ «đã KHAI» tách khỏi «đang hiệu lực»).
34. **Độ tươi hỏi đúng NHÁNH nguồn + tuổi HIỆU LỰC = tuổi dữ liệu + tuổi lát chụp** — đọc cờ
    stale của nhánh khác (ads vs pos) hay quên tuổi lát chụp đều làm phanh PAUSE bắn bằng dữ
    liệu trễ; CI chỉ canh được nơi CI THẬT chạy (phép đo sống trong w2*.sh mà CI chạy pytest
    thì đột biến sống).


## Bổ sung v3 (21/08 — CEO duyệt hồ sơ TOI-UU-QUY-TRINH-TONG)

- **Nhật ký ghi MỘT LẦN**: note thô vào scratchpad trong lúc làm; **cuối lượt Write MỘT LẦN**
  vào `nhat-ky/phieu-<MÃ>.md`. Cấm Edit nhật ký nhiều lần trong lượt (án lệ: 30 lượt Edit cho
  một file 633 dòng — trả tiền context cho chính file mình đang viết).
- **`[NEEDS CLARIFICATION: <câu hỏi>]`**: gặp chỗ phải đoán thì KHÔNG đoán — cắm marker ngay
  tại chỗ trong code/nhật ký. `_chan1.sh` đếm marker; còn marker = phiếu chưa xong. Tổng phải
  trả lời marker trong nhịp kế — thợ không được tự gỡ marker bằng một giả định.
- **Mục ⑦ của phiếu (ĐÃ TRA CHƯA)**: trước khi code, chạy `ops/bin/tra_no.py <neo>` (khi có)
  hoặc `grep` neo của phiếu trong `docs/thi-cong/SO-NO.md` + `CLAUDE.md §6` — dán OUTPUT MÁY
  vào nhật ký. Thấy trùng nợ/phán cũ ⇒ báo tổng TRƯỚC khi code, đừng code đè.

## Bẫy án lệ bổ sung — chưng cất từ dây chuyền AI Closer v3 (23/08/2026)

- **Private-index commit phải kết bằng `git reset -- <pathspec-của-mình>`.** Commit qua
  `GIT_INDEX_FILE` riêng KHÔNG cập nhật index chính: sau commit, `git status` báo tệp
  của mày là `D`/`MM` với bản staged THIẾU — session nào commit không pathspec sẽ nuốt
  tệp mày khỏi tree (án lệ N8/L1-M2 + L2-M1 cùng ngày). Reset đúng đường dẫn của mình
  để index chính khớp HEAD.
- **Mock theo danh sách module của đề bài là thước tự dựng — bẫy `globalThis.fetch` mới
  là lưới.** Án lệ L2-M1: phiếu khai 3 chỗ gửi ngầm, mock 2 module báo sạch, bẫy fetch
  bắt 7 lượt HTTP lọt qua đường GIÁN TIẾP (import bắc cầu 2 tầng, `catch{}` nuốt lỗi).
  Đo outbound thì chặn ở tầng THẤP NHẤT với tới được, không tin danh sách import.
