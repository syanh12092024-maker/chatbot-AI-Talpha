# H7 · Chuyển page vào team theo đơn POS — 05/10/2026

> **TRẠNG THÁI: ✅ ĐÃ GHI PROD** — người quyết yêu cầu «dựa vào đơn trên POS, phân loại sản phẩm, page vào team tương ứng» và gật
> từng bước ở phiên Claude 05/10: (1) chuyển 44 page «Chưa phân» → GCC; (2) page lẫn: «check marketer đó thuộc team nào thì phân
> team đó»; (3) xác nhận chạy cả 66 page (67 lượt). Đứng tên `minhngoc.37ftu@gmail.com` (nguoi_dung 2, quản trị GCC).

## Luật áp

01 §1 (CR-28-09c): đơn thuộc team của MARKETER. Người quyết 05/10: **page về team HIỆN TẠI (HRM `dim_employee.team_code`) của
marketer chạy page** — marketer ĐANG LÀM có nhiều đơn nhất trong 60 ngày (hoà ⇒ đơn mới nhất). Page không có đơn mang mã marketer
trong 60 ngày ⇒ giữ nguyên.

## Số đo (BigQuery chỉ đọc, `vw_sale_order_team` 60 ngày tới 05/10, ghép `dim_person_map` → `dim_employee`)

Đơn theo team marketer (team vào ngày đơn): GCC 13.055 (213 page) · EU 9.166 (chỉ 287 có page — EU bán chủ yếu trang bán hàng; 18
page) · AUUS 1.191 (36 page) · không marketer 334 · chưa ghép 1. Page có đơn mà CHƯA có trong v3: **48** (1.302 đơn — phần lớn AUUS/EU).

## Kết quả

| | trước | sau |
|---|---|---|
| Pialpha GCC (`tieu-alpha`) | 514 | **537** |
| Pialpha EU (`pialpha-eu`) | 0 | **21** |
| Pialpha AUUS (`auus`) | 0 | **1** |
| Chưa phân (kỹ thuật) | 68 | **23** (không đơn mang mã marketer 60 ngày) |
| mồ côi (`demMoCoi`) | hoi_thoai 610 · kich_ban 2 | hoi_thoai **549** · kich_ban 2 — lượt chuyển kéo theo con nên vá bớt mồ côi CŨ |

Chạy qua cửa hẹp `src/db/chuyen-team.js#chuyenPageSangTeam` (một giao dịch mỗi page, kéo mọi bảng con có `page_id`+`team_id`, ghi
nhật ký): chạy khô 67/67 → ghi thật **67/67 đạt, 0 lỗi** · nhật ký prod id 349702–349768 · page AUUS đi hai bước (chưa phân → GCC →
AUUS) vì team kỹ thuật không được làm bối cảnh và người đứng tên chỉ quản trị GCC · script tạm đã xoá khỏi `/opt/aicloser`.

## 67 lượt

| page_id | tên | chuyển | marketer quyết | đơn của người đó / đơn marketer đang làm | |
|---|---|---|---|---|---|
| `1012923145248186` | Vatican Blessings UAE | chua-phan → tieu-alpha | VVI0026 | 3/3 | mot_team |
| `1088842280989040` | ChunHo Golden Jewerly | chua-phan → tieu-alpha | VVI0026 | 17/18 | mot_team |
| `1100204583186761` | Minty Fresh Smile Kuwait | chua-phan → tieu-alpha | VVI0026 | 23/23 | mot_team |
| `1125576063976794` | Minty Fresh Smile UAE | chua-phan → tieu-alpha | VVI0026 | 19/19 | mot_team |
| `1127011513834885` | Kreain Nature - Legs Smothing Cream Oman | chua-phan → tieu-alpha | VVI0026 | 3/3 | mot_team |
| `1135776032949728` | Jade Lucky Store Qatar | chua-phan → tieu-alpha | VVI0026 | 3/3 | mot_team |
| `1142109975650521` | Ageless Beauty Ginseng UAE | chua-phan → tieu-alpha | VVI0034 | 3/3 | mot_team |
| `1150156978171138` | Dye & Shine Store in Kuwait | chua-phan → tieu-alpha | VVI0026 | 22/22 | mot_team |
| `1171039299421146` | Minty Fresh Smile Qatar | chua-phan → tieu-alpha | VVI0026 | 18/18 | mot_team |
| `1216829568175068` | VitaGlow Beauty Storev Saudi | chua-phan → tieu-alpha | VVI0026 | 22/22 | mot_team |
| `1219879121198080` | DOC Alipion-Tooth ARMOR KSA | chua-phan → tieu-alpha | VVI0026 | 290/297 | mot_team |
| `1220547807799752` | Minty Fresh Smile KSA | chua-phan → tieu-alpha | VVI0026 | 317/317 | mot_team |
| `1268619393002216` | Madam Mystic Fengshui Expert TW | chua-phan → tieu-alpha | VL0472 | 2/2 | mot_team |
| `1276661898862410` | Bliss Gallery in KSA | chua-phan → tieu-alpha | VVI0020 | 107/107 | mot_team |
| `1297060596822426` | HairGlow Beauty | chua-phan → tieu-alpha | VVI0020 | 187/189 | mot_team |
| `1314674711725892` | Hitana Store in Saudi | chua-phan → tieu-alpha | VVI0020 | 22/22 | mot_team |
| `1328239333686578` | Chichic Jewelry UAE | chua-phan → tieu-alpha | VVI0026 | 3/3 | mot_team |
| `1330960180095187` | MIUCO Empress Feminine in Saudi | chua-phan → tieu-alpha | VVI0020 | 76/76 | mot_team |
| `133143793224882` | Slimora Body | chua-phan → tieu-alpha | VVI0020 | 13/13 | mot_team |
| `1348273815027134` | SmileCare in Saudi | chua-phan → tieu-alpha | VVI0020 | 44/45 | mot_team |
| `1382018311650991` | Hibiscus Herbal Tea PH in Saudi | chua-phan → tieu-alpha | VVI0020 | 13/13 | mot_team |
| `1385053314684509` | LumiEye Beauty | chua-phan → tieu-alpha | VVI0007 | 6/6 | mot_team |
| `164408476750805` | GoutEase Advance Herbal Spray Saudi | chua-phan → tieu-alpha | VVI0026 | 40/40 | mot_team |
| `165426606648308` | Mang Mulat Kuwait | chua-phan → tieu-alpha | VVI0033 | 32/32 | mot_team |
| `166473769875845` | Veloura Lip Beauty Saudi | chua-phan → tieu-alpha | VVI0026 | 174/174 | mot_team |
| `166686923188165` | SmileFit Denture UAE | chua-phan → tieu-alpha | VVI0026 | 2/2 | mot_team |
| `167957999727343` | ClearVision Eye Care UAE | chua-phan → tieu-alpha | VVI0026 | 3/3 | mot_team |
| `169229882933822` | SmileFit Denture Saudi | chua-phan → tieu-alpha | VVI0026 | 39/39 | mot_team |
| `169925159529498` | Al Noor Lucky Bracelet Qatar | chua-phan → tieu-alpha | VVI0026 | 1/1 | mot_team |
| `170253282829293` | Al Noor Lucky Bracelet UAE | chua-phan → tieu-alpha | VVI0026 | 16/16 | mot_team |
| `170293896160195` | Al Noor Lucky Bracelet Saudi | chua-phan → tieu-alpha | VVI0026 | 34/35 | mot_team |
| `171255139396302` | Al Noor Lucky Bracelet Bahrain | chua-phan → tieu-alpha | VVI0026 | 17/17 | mot_team |
| `171798149340877` | Elora Cosmetics Store UAE | chua-phan → tieu-alpha | VVI0026 | 3/3 | mot_team |
| `172154035971878` | Al Noor Lucky Bracelet Kuwait | chua-phan → tieu-alpha | VVI0026 | 28/28 | mot_team |
| `172601905926926` | ClearVision Eye Care Kuwait | chua-phan → tieu-alpha | VVI0026 | 54/54 | mot_team |
| `172731125912597` | Elora Cosmetics Store Kuwait | chua-phan → tieu-alpha | VVI0026 | 3/3 | mot_team |
| `173567899164026` | Al Noor Lucky Bracelet Oman | chua-phan → tieu-alpha | VVI0026 | 2/2 | mot_team |
| `173836132468801` | Kreain Nature - Skin Soothing Cream UAE | chua-phan → tieu-alpha | VVI0026 | 1/1 | mot_team |
| `173959789123966` | Doña Celestina Saudi | chua-phan → tieu-alpha | VVI0026 | 4/4 | mot_team |
| `173965709123079` | Kreain Nature - Skin Soothing Cream Saud | chua-phan → tieu-alpha | VVI0026 | 142/147 | mot_team |
| `174246695761324` | Kreain Nature - Legs Smothing Cream Saud | chua-phan → tieu-alpha | VVI0026 | 105/105 | mot_team |
| `174721845713735` | Doña Celestina UAE | chua-phan → tieu-alpha | VVI0026 | 1/1 | mot_team |
| `175878592264863` | SmileFit Denture Kuwait | chua-phan → tieu-alpha | VVI0026 | 28/28 | mot_team |
| `175939152258838` | ClearVision Eye Care Saudi | chua-phan → tieu-alpha | VVI0026 | 65/65 | mot_team |
| `177038125482064` | Kreain Nature - Legs Smothing Cream UAE | chua-phan → tieu-alpha | VVI0026 | 2/2 | mot_team |
| `1268619393002216` | Madam Mystic Fengshui Expert TW | tieu-alpha → auus | VL0472 | 2/2 | mot_team |
| `1028673590339789` | Lunar Blessings Store | tieu-alpha → pialpha-eu | VVI0006 | 9/9 | mot_team |
| `1100995009773412` | Stone Jewelry Saudi - Taiwan | tieu-alpha → pialpha-eu | VVI0006 | 64/120 | nhieu_team |
| `1102430932953610` | She Jewelry Kuwait | tieu-alpha → pialpha-eu | VVI0006 | 1/1 | mot_team |
| `1118430214685567` | Jode Jewelry Kuwait | tieu-alpha → pialpha-eu | VVI0006 | 12/12 | mot_team |
| `1118640467996660` | She Jewelry UAE | tieu-alpha → pialpha-eu | VVI0006 | 2/2 | mot_team |
| `1119641037902519` | Ruby Jewelry Kuwait | tieu-alpha → pialpha-eu | VVI0006 | 4/4 | mot_team |
| `1136781022856230` | Ball Jewelry Kuwait | tieu-alpha → pialpha-eu | VVI0006 | 1/1 | mot_team |
| `1138175842723050` | Japan Herb Lab UAE | tieu-alpha → pialpha-eu | VL0492 | 1/1 | mot_team |
| `1158273677377854` | Mario Jewelry Jewelry Kuwait | tieu-alpha → pialpha-eu | VVI0006 | 117/117 | mot_team |
| `1191101314082464` | Unilook Lifting Bra No 1 Japan - Kuwait | tieu-alpha → pialpha-eu | VVI0006 | 45/45 | mot_team |
| `1192773393927555` | Malabar Gold UAE | tieu-alpha → pialpha-eu | VVI0006 | 26/26 | mot_team |
| `1217230244799219` | Unilook Lifting Bra No 1 Japan - Taiwan | tieu-alpha → pialpha-eu | VVI0006 | 1/1 | mot_team |
| `1219090324622588` | Lakan Bathala Feng Ignacio - FengShui Ex | tieu-alpha → pialpha-eu | VVI0006 | 23/23 | mot_team |
| `1240378795819215` | Rosévia Fashion UAE | tieu-alpha → pialpha-eu | VVI0006 | 26/26 | mot_team |
| `1246701271865447` | LumiEye Beauty UAE | tieu-alpha → pialpha-eu | VVI0006 | 8/9 | nhieu_team |
| `1259951880528358` | Feng Shui - Money Bracelet KSA | tieu-alpha → pialpha-eu | VVI0006 | 4/4 | mot_team |
| `1262955916890829` | Key Saudi Gold Taiwan | tieu-alpha → pialpha-eu | VVI0006 | 4/7 | nhieu_team |
| `1266194246577970` | Lakan Bathala Feng Ignacio - FengShui Ex | tieu-alpha → pialpha-eu | VVI0006 | 39/39 | mot_team |
| `1266387133216864` | Mario Jewelry Jewelry UAE | tieu-alpha → pialpha-eu | VVI0006 | 325/325 | mot_team |
| `1296011923585603` | Malabar Gold KSA | tieu-alpha → pialpha-eu | VVI0006 | 6/6 | mot_team |
| `1296457973540130` | Everyday Beauty and Body Wellness | tieu-alpha → pialpha-eu | VVI0006 | 5/7 | nhieu_team |

## Nợ

- **N-MO-COI-HOI-THOAI** prod còn 549 `hoi_thoai` + 2 `kich_ban` có `team_id` khác team của page (có TRƯỚC lượt này: 610 + 2). Gốc chưa
  điều tra — có thể từ di trú/gán team cũ. `demMoCoi` đếm được; cần phiếu vá (chuyển con theo page) có người duyệt.
- **N-PAGE-CHUA-CO-TRONG-V3** 48 page có đơn 60 ngày (1.302 đơn) chưa có trong bảng `page` v3 — phần lớn AUUS/EU; cần quét page Pancake
  cho token của hai team đó.
- 21 page EU + 1 page AUUS mang theo bản sao sản phẩm (vd Mario Jewelry Kuwait 2 bản sao) — vào danh sách «Chuyển page sang sản phẩm» của
  team mới, nhưng EU/AUUS CHƯA có món POS nào trong v3 ⇒ chưa gắn được tới khi nối POS cho hai team (việc kế tiếp người quyết đã gật).
