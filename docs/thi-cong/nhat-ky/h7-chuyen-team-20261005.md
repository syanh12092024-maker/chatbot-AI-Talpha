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

## Nối POS cho EU / AUUS (người quyết chọn «Nối POS cho EU/AUUS» 05/10)

Không phải sửa mã: mọi truy vấn `ket_noi_pos` đã lọc theo `team_id` — mỗi team một kết nối riêng tới cùng một shop dùng chung là cơ
chế sẵn có (team kỹ thuật vẫn giữ bản sao 7 kết nối GCC). Shop dùng chung: chép khoá từ kết nối GCC (`layKetNoi` giải mã →
`themKetNoi` mã hoá lại; KHÔNG in khoá) · đứng tên minhngoc (nguoi_dung 2) · nhật ký `them_ket_noi_pos` id 349769–349773.

| Team | Kết nối thêm (shop marketer team có đơn 60 ngày) | Kéo danh mục |
|---|---|---|
| Pialpha EU | Saudi · UAE · Kuwait · Qatar (kết nối 15–18) | 421 món (Saudi 174 · UAE 147 · Kuwait 69 · Qatar 31), 0 hỏng |
| Pialpha AUUS | Taiwan (kết nối 19) | 44 món, 0 hỏng |

Trước khi kéo đã đo RF-15 (gán `san_pham.page_id` khi shop có ĐÚNG 1 page trong team): page EU ở Kuwait 5 · UAE 4, Saudi/Qatar 0,
page AUUS chưa có shop ⇒ không dính. Đo lại sau kéo: món POS mang `page_id` (N-GSP2-F3) = **0**.

Phủ SKU (dòng món đơn 60 ngày): GCC 199 SKU · 15.711/15.724 · EU 89 SKU · 9.742/10.271 (thiếu: shop riêng EUR, Romania) · AUUS 13 SKU ·
**222/1.293** (thiếu: shop Mỹ — SKU 131, CJSL…, Birth stone…).

**Còn — việc người:**
- Khoá API POS của 5 shop riêng chưa có trong v3: EU — EUR `407949295` · Romania `1635942497` · Slovakia `407995349`; AUUS — Mỹ `100197417`
  · Úc `1328333296`. Có khoá thì quản trị team đó thêm ở Cài đặt › Kết nối (hoặc nhờ tổng chạy như trên) rồi «Kéo danh mục».
- Gộp SKU thành sản phẩm gốc TRONG từng team (màn Sản phẩm › Gộp món POS — máy gợi ý, người xác nhận; không gộp tự động, luật VE8a).
  Tài khoản minhngoc chỉ là quản trị GCC; gộp ở EU/AUUS cần quản trị của team đó (`chu@talpha.vn` đang là quản trị cả ba team).
- Giá: món POS mới của EU/AUUS chưa có giá. Sản phẩm thuộc riêng từng team ⇒ GCC và EU có thể đặt giá KHÁC nhau cho cùng SKU ở cùng
  shop (mỗi team một bảng; trong một team vẫn đúng luật «không giá riêng theo page»).
- LL17 (kéo đơn một lần mỗi shop) phải khử trùng theo shop khi nhiều team cùng nối một shop.

## Danh sách gộp theo team (SKU team đó BÁN 60 ngày và đã có món POS trong team)

### Pialpha GCC — 126 SKU (đã có món POS trong team; xếp theo đơn 60 ngày)

| SKU | tên món POS | shop | dòng món 60 ngày | đã có gốc |
|---|---|---|---|---|
| 008 | 008 - BOX | Saudi, Taiwan, UAE | 2144 |  |
| 205 | 205 - Oxyelle Warm Soothing Cream | Saudi, UAE | 1208 |  |
| 214 | 214 - Nine-Ingredient Herbal Tea | Saudi, UAE | 887 |  |
| 010 | 010 - Birth Stone Set | Bahrain, Kuwait, Oman, Qatar, Saudi, Taiwan, UAE | 841 |  |
| NECKLACE BOX | 008 - Necklace box | Kuwait | 610 |  |
| 105 | NESLEMY dentures - 105 | Bahrain, Kuwait, Oman, Saudi, UAE | 606 |  |
| 153 | 153 - ESSENTIAL OIL PERFUME SOAP | Saudi, UAE | 595 |  |
| 125 | 125 - Fitgum Acai Berry | Kuwait, Oman, Saudi | 542 |  |
| 202 | 202 - Hair Repair Therapy PH | Kuwait, Saudi, UAE | 533 |  |
| 227 | 227 - Varicose Vein Relief Cream | Saudi, UAE | 470 |  |
| 190 | 190 - Pink Bloom Wash | Saudi | 399 |  |
| 216 | 216 - White Tooth Repair Toothpaste | Bahrain, Kuwait, Qatar, Saudi, UAE | 378 |  |
| 133 | 133 - Feng Shui 2 – Lucky Charm | Bahrain, Kuwait, Oman, Saudi, UAE | 325 |  |
| 222 | 222 - Soothing Cooling Gel | Saudi, UAE | 294 |  |
| 264 | 264 - DENTAL ADVANCE PLUS DROPS | Saudi | 289 |  |
| 229 | 229 - Mentha Toothpaste Tablets | Saudi, UAE | 258 |  |
| 129 | 129 - Black - Feng shui lucky bracelet | Kuwait, Saudi | 247 |  |
| 075 | 075 - HEART KEY NECKLACE | Saudi, Taiwan, UAE | 229 |  |
| 231 | 231 -  Knot Jewelry Set | Kuwait, UAE | 227 |  |
| 088 | Body Lotion Hally - 088 | Saudi | 221 |  |
| 178 | 178 - OXYA lipstick | Qatar, Saudi, UAE | 192 |  |
| 171 | 171 - Clear Sight - EYE HEALTHY | Bahrain, Kuwait, Oman, Saudi, UAE | 186 | có |
| 146 | 146 - HAIRDRESSING WAND | Saudi | 183 |  |
| 131 | 131 - Golden Buddha | Kuwait, Oman, Qatar, UAE | 176 |  |
| 022 | Tripple Diamond Set - 022 | Saudi | 173 |  |
| 207 | 207 - Spiral Charm Earring 💛 | Kuwait, Qatar, Saudi, UAE | 168 |  |
| 154 | 154 - Luxe Prism Jewelry | Kuwait, UAE | 159 |  |
| 145 | 145 - Pure Blessing Jewelry | Kuwait, Saudi, UAE | 156 |  |
| 147 | 147 - lapad ring | Saudi, UAE | 154 |  |
| 188 | 188 - Breast Cream | Saudi | 152 |  |
| 182 | 182 - SNAP ON SMILE | Saudi | 151 |  |
| 266 | 266 - Skin Soothing Cream | Saudi | 140 |  |
| 162 | Kreain Soothing Massage Gel - 162 | Saudi, UAE | 131 |  |
| SP TEST | SP TEST | Bahrain, Kuwait, Oman, Qatar, Saudi | 130 |  |
| 232 | 232 - Tooth Refresh Toothpaste | Saudi | 122 |  |
| 174 | 174 - INFINITY RING | Taiwan, UAE | 109 |  |
| 127 | 127 - Antibacterial Digestive Gel | Saudi, UAE | 107 |  |
| 258 | 258 - Legs Soothing Cream | Saudi, UAE | 105 |  |
| 123 | 123 - Soothing massage gel | Saudi | 104 |  |
| 223 | 223 - Eau De Parfum | Saudi | 94 |  |
| 072 | 072 - Couple Ring | Kuwait | 88 |  |
| 272 | 272 - Progressive Eyeglasses | Saudi | 69 |  |
| 263 | 263 - MIUCO Fresh Feminine Wash | Saudi | 66 |  |
| 176 | Tummiva Gel - 176 | Saudi | 64 |  |
| TEST | SP TEST | UAE | 56 |  |
| 201 | 201 - Fengshui Horse Jade Crystal Bracelets | Kuwait, UAE | 53 |  |
| 113 | 113 - Turkish Set | Kuwait | 53 |  |
| 163 | Gold Collagen - 163 | Saudi | 52 |  |
| 226 | 226 - Ultima Warts Soap | Saudi | 47 |  |
| 187 | 187 - Fengshui Siliver | Kuwait, UAE | 47 |  |
| 070 | 070 - DOUBLE LAYER NECKLACE | UAE | 47 |  |
| 230 | 230 - UBIS Keratosis Specific Cream | UAE | 46 |  |
| 225 | 225 - Private Antibacterial Cream | Saudi | 44 |  |
| 228 | 228 - Thyroid Dissolving Cream | Saudi | 43 |  |
| 253 | 253 - FIRE DRAGON MASSAGE OIL | Saudi | 38 |  |
| 001 | 001 - Gold Necklace | UAE | 35 |  |
| 259 | 259 - GoutEase Advance Herbal Joint Spray | Saudi | 34 |  |
| 002 | 002 - Gold Ring | UAE | 34 |  |
| 003 | 003 - Gold Earing | UAE | 34 |  |
| 189 | 189 - ZHIYANG KRIM HERBAL | Qatar | 32 |  |
| 126 | 126 - HBESTY Japanese Herbal Cream | Saudi, UAE | 30 |  |
| 144 | 144 - FLAT CHAIN NECKLACE | UAE | 30 |  |
| 156 | 156 - Imperial Gold Lace Jewelry Set | UAE | 28 |  |
| 083 | 083 - Bra Flight Attendants M | Kuwait, UAE | 27 |  |
| 058 | 058 - VC Cream | Kuwait | 26 |  |
| 177 | YZKMSKIN Anti-Aging Cream - 177 | Saudi | 25 |  |
| 086 | 086 - Bra Flight Attendants 2XL | Kuwait, UAE | 24 |  |
| 179 | 179 - CREAM CKCU ANTI KERUT COLLAGEN & FLEK H | UAE | 24 |  |
| 118 | 118 - Herbal Hair Dye | Kuwait, UAE | 23 |  |
| BOX | BOX | Saudi | 23 |  |
| FENG SHUI 2 | Feng Shui 2 – Lucky Charm - | Qatar | 22 |  |
| 219 | 219 - VitaGlow | Saudi | 21 |  |
| 254 | 254 - Aminochondroitin Sulfate Ointment | Saudi | 20 |  |
| 200 | 200 -The Copper Cross Magnetic Bracelet | Bahrain, Kuwait | 18 |  |
| 261 | 261 - Color Changing Microscope Reading Glass | Saudi | 18 |  |
| 053 | 053 - Gold Heart Necklace | Kuwait, Saudi, UAE | 14 |  |
| 085 | 085 - Bra Flight Attendants XL | Kuwait, UAE | 11 |  |
| 212 | 212 - Hoop Earrings | Saudi | 9 |  |
| 148 | 148 - Feng Shui Ring | UAE | 9 |  |
| 161 | 161 -  Foot Pads | UAE | 7 |  |
| 193 | 193 - THREE COLOR EYESHADOW STICK | Kuwait, Saudi, UAE | 7 |  |
| 084 | 084 - Bra Flight Attendants L | Kuwait, UAE | 7 |  |
| 220 | 220 - Anti-Fungal Nail Repair Serum | Saudi | 7 |  |
| 218 | 218 - Herbal Dye Color Shampoo | Saudi | 7 |  |
| 004 | Diamond Set - 004 | Saudi | 6 |  |
| 198 | 198 - Rose Jewelry Set | UAE | 5 |  |
| 183 | 183 - Peeling Lotion | Saudi | 4 |  |
| 124 | 124 - Peacock Set | Saudi | 4 |  |
| 111 | 111 - Hair growth shampoo | UAE | 4 |  |
| 245 | 245 - BAELLERRY LEATHER WALLET | Saudi | 4 |  |
| 209 | 209 - Wart Removal Gel | Saudi | 4 |  |
| 194 | 194 - Kalung Emas 18K Premium | UAE | 4 |  |
| 024 | Jade Buddha Necklace - 024 | Saudi | 4 |  |
| 244 | 244 - 	Lucky Charm Earrings | UAE | 3 |  |
| 257 | 257 - Chlorella Exfoliating Gel | Saudi | 3 |  |
| 243 | 243 - God’s Word Scripture Bracelet | Saudi | 3 |  |
| 159 | Gold Heart Earrings - 159 | Saudi | 3 |  |
| 233 | 233	- Tea Tree Oil Herbal Soap | Saudi | 3 |  |
| CNK | CRUCIFIX NECKLACE | Saudi | 3 |  |
| 215 | 215 - Ginseng Renewal Peeling Oil | UAE | 3 |  |
| 130 | 130 - Red - Feng shui lucky bracelet | Kuwait | 2 |  |
| 211 | 211 - Lockable Savings Binder | Saudi | 2 |  |
| EME | SET EMERALD — [object Object] | Saudi | 2 |  |
| 221 | 221 - THERMOPLASTIC DENTURE ADHESIVE | Saudi | 2 |  |
| 238 | 238 - Lucky Guardian Feng Shui Ring | Saudi | 2 |  |
| 005 | 005 - Diamond Halo set | Kuwait, Saudi | 2 | có |
| 208 | 208 - Zirconium Plus Earrings | UAE | 2 |  |
| 242 | 242 - Five Blessings Fortune Bracelet — [obje | UAE | 2 |  |
| 100 | 100 - Hour Glass XL | Saudi | 2 |  |
| 196 | 196 - Magic Blusher | Saudi | 2 |  |
| 120 | 120 - Golden Bloom Necklace | Saudi, UAE | 2 |  |
| 271 | 271 - Teeth Cleaning Tablets | Saudi | 1 |  |
| 204 | 204 - Charming set | Saudi | 1 |  |
| 235 | 235 -	Wart Remover Cream | Saudi | 1 |  |
| 270 | 270 - Face Lifting Patch | Saudi | 1 |  |
| 250 | 250 - Color-Changing Pixiu Pendan | UAE | 1 |  |
| CLEAR SIGHT | Clear Sight - EYE HEALTHY - 171 | Qatar | 1 |  |
| 172 | Cavaline Watch - 172 | Saudi | 1 |  |
| 121 | 121 - Dragon Blood Cream | Oman | 1 |  |
| 152 | 152 - Apple Cinder Gummies | Saudi | 1 |  |
| 236 | 236 - Whitening Skin Soap | UAE | 1 |  |
| 098 | 098 - Hour Glass M | Taiwan | 1 |  |
| 151 | Hair Care Essence - 151 | Saudi | 1 |  |
| 199 | 199 - Floral Vine Bracelet | Kuwait | 1 |  |
| 116 | 116 - Tgideas Shampoo | Qatar | 1 |  |
| HERBAL | Herbal Hair Dye - 118 | Qatar | 1 |  |

### Pialpha EU — 60 SKU (đã có món POS trong team; xếp theo đơn 60 ngày)

| SKU | tên món POS | shop | dòng món 60 ngày | đã có gốc |
|---|---|---|---|---|
| 008 | Necklace box - 008 | Saudi, UAE | 1440 |  |
| 261 | 261 - Color Changing Microscope Reading Glass | Saudi, UAE | 645 |  |
| 211 | 211 - Lockable Savings Binder | Qatar, Saudi, UAE | 591 |  |
| 246 | 246 - Golden Turtle Wealth Charm | Saudi, UAE | 559 |  |
| 233 | 233 - Tea Tree Oil Herbal Soap | Saudi, UAE | 497 |  |
| 234 | 234 - Gold Charm Bracelet | Kuwait, Saudi, UAE | 479 |  |
| 217 | 217 - ALICEVA Perfume Toothpaste | Saudi, UAE | 364 |  |
| 220 | 220 - Anti-Fungal Nail Repair Serum | Saudi, UAE | 363 |  |
| 245 | 245 - BAELLERRY LEATHER WALLET | Saudi, UAE | 326 |  |
| SP TEST | SP TEST | Kuwait, Qatar, Saudi | 315 |  |
| 256 | 256 - Pump-Free Vacuum Compression Bags | Saudi, UAE | 302 |  |
| 247 | 247 - Tibetan Blessed Copper Bracelet | Saudi, UAE | 290 |  |
| 236 | 236 - Whitening Skin Soap | Saudi, UAE | 261 |  |
| 260 | 260 - MAXCURVE Sculpting Bust Oil | Saudi | 241 |  |
| 240 | 240 -	Skin Tags Patches | Saudi | 239 |  |
| 231 | 231 -  Knot Jewelry Set | Kuwait, UAE | 216 |  |
| 235 | 235 - Wart Remover Cream | Qatar, Saudi | 210 |  |
| 242 | 242 - Five Blessings Fortune Bracelet — [obje | UAE | 207 |  |
| 221 | 221 - THERMOPLASTIC DENTURE ADHESIVE | Saudi, UAE | 204 |  |
| 153 | 153 - ESSENTIAL OIL PERFUME SOAP | Saudi | 175 |  |
| 255 | 255 - Face Lifting Brush | UAE | 164 |  |
| 238 | 238 - Lucky Guardian Feng Shui Ring | Kuwait, Saudi | 156 |  |
| 237 | 237 - Nitrile Pro Gloves | Saudi, UAE | 119 |  |
| 241 | 241 - GlowRx Dark Spot Cream | Saudi, UAE | 109 |  |
| 267 | 267 - Organic Batana Oil | Saudi | 107 |  |
| 244 | 244 - 	Lucky Charm Earrings | UAE | 105 |  |
| 243 | 243 - God’s Word Scripture Bracelet | Saudi | 102 |  |
| 250 | 250 - Color-Changing Pixiu Pendan | Saudi, UAE | 100 |  |
| NECKLACE BOX | 008 - Necklace box | Kuwait | 92 |  |
| 269 | 269 - VeinRepair Patch Roll | UAE | 86 |  |
| 251 | 251 - Fortune Money Catcher Ring | Saudi | 85 |  |
| 271 | 271 - Teeth Cleaning Tablets | Saudi | 82 |  |
| 257 | 257 - Chlorella Exfoliating Gel | Saudi | 65 |  |
| 252 | 252 - Nail Repair Serum B | Saudi, UAE | 59 |  |
| 270 | 270 - Face Lifting Patch | Saudi, UAE | 58 |  |
| 239 | 239 - Ring Of Faith | UAE | 57 |  |
| 262 | 262 - Lucky Jade Dragon Bracelet | Saudi | 54 |  |
| 213 | 213 - Emerald Green Broad Beans | Saudi | 42 |  |
| 273 | 273 - Warts, Corns & Callus Remover Cream | UAE | 37 |  |
| TEST | SP TEST | UAE | 27 |  |
| 274 | 274 - CapsaCare | UAE | 26 |  |
| BOX | BOX | Saudi | 18 |  |
| 187 | 187 - Fengshui Siliver | Kuwait, UAE | 16 |  |
| 124 | 124 - Peacock Set | Saudi | 14 |  |
| 201 | 201 - Fengshui Horse Jade Crystal Bracelets | Kuwait, Saudi, UAE | 10 |  |
| 010 | 010 - Birth Stone Set | Saudi | 7 |  |
| 268 | 268 - Feng Shui Wealth Bracelet | Saudi | 4 |  |
| 130 | 130 - Red - Feng shui lucky bracelet | Kuwait | 3 |  |
| 085 | 085 - Bra Flight Attendants XL | Kuwait, UAE | 2 |  |
| EME | SET EMERALD — [object Object] | Saudi | 2 |  |
| EYE | eye oil - 009 | Qatar | 1 |  |
| 084 | 084 - Bra Flight Attendants L | UAE | 1 |  |
| 182 | 182 - SNAP ON SMILE | Saudi | 1 |  |
| 083 | 083 - Bra Flight Attendants M | Kuwait | 1 |  |
| GOLDEN BLOOM | Golden Bloom Necklace - 120 | Qatar | 1 |  |
| MASCARA | Mascara Sanzitang - 122 | Qatar | 1 |  |
| 016 | 016 - Green Diamond Set | Kuwait | 1 |  |
| FLOWER | FLOWER NECKLACE | UAE | 1 |  |
| 276 | 276 - VINTAGE RHINESTONE EARRINGS | UAE | 1 |  |
| 206 | 206 - Gold Color Overload Ring | Saudi | 1 |  |

### Pialpha AUUS — 13 SKU (đã có món POS trong team; xếp theo đơn 60 ngày)

| SKU | tên món POS | shop | dòng món 60 ngày | đã có gốc |
|---|---|---|---|---|
| 008 | 008 - BOX | Taiwan | 119 |  |
| GOLDEN | Golden Rosary | Taiwan | 39 |  |
| SP | SP TEST | Taiwan | 33 |  |
| 265 | 265 - Golden Fortune Energy Necklace | Taiwan | 11 |  |
| 131 | 131 - Golden Buddha | Taiwan | 6 |  |
| 234 | Gold Charm Bracelet | Taiwan | 4 |  |
| 211 | 211 - Lockable Savings Binder | Taiwan | 2 |  |
| 024 | 024 - Jade Buddha Necklace | Taiwan | 2 |  |
| 242 | 242 - Five Blessings Fortune Bracelet | Taiwan | 2 |  |
| 275 | 275 - GOLD PLATED HOLY ROSARY | Taiwan | 1 |  |
| LUCKY | Lucky Nanbu Coins | Taiwan | 1 |  |
| DRAGON BLOOD CREAM | Dragon Blood Cream | Taiwan | 1 |  |
| GINSENG SERUM | Ginseng Serum | Taiwan | 1 |  |
