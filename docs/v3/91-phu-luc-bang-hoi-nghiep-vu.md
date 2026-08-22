# BẢNG HỎI NGHIỆP VỤ — XÁC NHẬN TRƯỚC KHI LÀM LẠI HỆ THỐNG

> Viết cho người làm kinh doanh đọc, không phải cho lập trình viên.
> Bản kỹ thuật chi tiết nằm ở file `THIET-KE-LAI-01-BANG-HOI.md` (không cần đọc).

---

## CÁCH DÙNG

- Đánh dấu `[x]` vào ô chọn. Không có ô nào đúng thì ghi vào dòng **Khác**.
- Câu có 🔴 là **câu cần trả lời trước** — chưa có thì không thiết kế tiếp được.
- Câu nào chưa chắc cứ để trống, tôi sẽ hỏi lại đúng câu đó.
- Mỗi câu có dòng `Bây giờ:` — nói hệ thống hiện tại đang làm gì, để so sánh. **Không phải gợi ý chọn.**

### Mấy chữ dùng trong tài liệu này

| Chữ | Nghĩa |
|---|---|
| **POS** | Phần mềm quản lý đơn hàng (Pancake POS) — nơi đơn hàng nằm |
| **Trang bán hàng** | LadiPage — trang khách điền form mua hàng |
| **Hộp thư** | Tin nhắn Facebook Messenger của page |
| **Bot** | Phần mềm tự động nhắn tin thay người |
| **Kho vận** | Bộ phận đóng gói và giao hàng |

---
---

# PHẦN 1 — XÁC NHẬN LẠI: TÔI HIỂU ĐÚNG CHƯA?

Trước khi hỏi, tôi vẽ lại hai luồng anh gửi. **Sai chỗ nào xin sửa thẳng vào đây.**

## 1.1 · Khách mua qua trang bán hàng (LadiPage)

```
Khách điền form trên trang bán hàng
            │
       Bấm "BUY NOW"
            │
      ┌─────┴─────┐
      │           │
  Đơn được    Mở cửa sổ WhatsApp,
  lưu lại     điền sẵn thông tin khách
                  │
          Khách có bấm Gửi không?
            ┌─────┴─────┐
           CÓ          KHÔNG
            │            │
      Sale nhận tin   Đơn nằm im trong hệ thống,
      WhatsApp        KHÔNG AI LIÊN HỆ  ← chỗ đang mất khách
```

**Đây chính là lỗ hổng mà bot xác nhận đơn sinh ra để bịt.**

**Câu 1.1** — Tôi hiểu đúng chưa?
- [ ] Đúng
- [ ] Sai, thực tế là: ______________________________________________

**Câu 1.2** — Bao nhiêu phần trăm khách bấm "BUY NOW" rồi **không** bấm Gửi WhatsApp?
- Khoảng: ______ %
- [ ] Không đo được / chưa biết

---

## 1.2 · Đơn mới được xử lý thế nào (sơ đồ anh gửi)

```
                        ĐƠN MỚI
                           │
                  Làm sạch thông tin
                  (số điện thoại, địa chỉ)
                           │
                Kiểm tra trùng & rủi ro
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      ĐƠN SẠCH        TRÙNG RÕ RÀNG    RỦI RO / KHÔNG RÕ
          │                │                │
    Bot nhắn xác nhận  Bot hỏi khách    Đẩy thẳng cho Sale
          │            "gộp hay giữ?"        │
    ┌─────┼─────┐          │                 │
    │     │     │      ┌───┴───┐             │
 Khách  Không  Không   Rõ    Không rõ        │
 xác    hiểu / phản     │       │            │
 nhận   ngoại  hồi   Giữ hoặc   └────────────┤
 rõ     lệ      │     hủy đơn                │
    │     │  Nhắc lại   trùng                │
    │     │  theo lịch                       │
    │     │     │                            │
    │     │  Vẫn im                          │
    │     └─────┴────────────────────────────┤
    │                                        │
    │                              ĐẨY VỀ SALE
    │                                   │
    │                        Sale chọn kết quả + lý do
    │                            ┌──────┴──────┐
    │                        Xác nhận      Không thành công
    │                            │              │
    └────────────────────────────┴──────┐  Đóng đơn,
                                        │  ghi chi phí
                                   ĐẨY KHO VẬN
```

**Câu 1.3** — Sơ đồ này tôi vẽ lại đúng chưa?
- [ ] Đúng
- [ ] Thiếu bước: ______________________________________________
- [ ] Sai chỗ: ______________________________________________

**Câu 1.4** — Ngoài trang bán hàng (LadiPage) và hộp thư Facebook, đơn còn từ đâu về nữa?
- [ ] Chỉ hai nguồn này
- [ ] Có thêm: [ ] Facebook Shop [ ] TikTok [ ] Sale gọi điện tự nhập [ ] Khác: ________

---
---

# PHẦN 2 — BOT XÁC NHẬN ĐƠN QUA WHATSAPP

## 2.1 · Chuyện dùng WhatsApp — có một việc phải quyết trước

Anh nói: **đăng nhập WhatsApp Business trên máy chủ (VPS) rồi cài bot vào đó.**

Cách này chạy được ngay, không phải xin phép ai. Nhưng có một rủi ro thật, tôi nói thẳng một lần:

> **WhatsApp có thể khóa số điện thoại đó.**
> Cách đăng nhập này là dùng phần mềm giả lập WhatsApp Web — Meta không cho phép chính thức. Nhắn vài chục tin nội bộ mỗi ngày thì thường không sao. Nhưng **nhắn hàng trăm khách lạ mỗi ngày là kiểu dùng dễ bị khóa nhất.**
> Khóa số nghĩa là **mất luôn kênh xác nhận đơn**, xảy ra giữa chừng, không báo trước, và số đó không lấy lại được.

Đường chính thức là đăng ký **WhatsApp Business chính chủ với Meta**. Đổi lại phải:
- Đăng ký doanh nghiệp với Meta và chờ duyệt
- Câu nhắn đầu tiên phải dùng **mẫu được Meta duyệt sẵn** — không được để bot tự viết. Khách trả lời rồi thì bot mới nói chuyện tự do được trong 24 tiếng
- Trả phí theo từng cuộc trò chuyện
- Số điện thoại đăng ký rồi thì **không dùng WhatsApp thường được nữa**

**🔴 Câu 2.1** — Chọn đường nào?
- [ ] A. **Đăng nhập trên máy chủ như anh nói** — chạy ngay, chấp nhận rủi ro mất số
- [ ] B. **Đăng ký chính thức với Meta** — chậm hơn, nhưng không lo bị khóa
- [ ] C. **Làm A trước để chạy ngay, song song làm thủ tục B để chuyển sau**
- [ ] D. Thuê dịch vụ trung gian làm hộ: ________________
> `Bây giờ:` Hệ thống có sẵn phần đăng nhập WhatsApp kiểu A, nhưng **chỉ để bắn báo cáo vào một nhóm nội bộ**, chưa từng nhắn cho khách.

**Câu 2.2** — Nếu chọn A hoặc C: dùng số điện thoại nào?
- [ ] A. Số phụ mua riêng cho việc này (mất cũng không sao)
- [ ] B. Số công ty đang dùng
- [ ] C. Chưa có, cần mua
> `Lời khuyên:` Đừng dùng số đang có khách hàng trong đó.

**Câu 2.3** — Mỗi thị trường một số WhatsApp riêng, hay dùng chung một số?
- [ ] A. Một số cho tất cả
- [ ] B. Mỗi nước một số riêng
- [ ] C. Mỗi shop trên POS một số

**🔴 Câu 2.4** — Mỗi ngày khoảng bao nhiêu đơn cần nhắn xác nhận?
- Số đơn/ngày: ______
- Giờ đơn về nhiều nhất: ______
> `Vì sao hỏi:` Quyết định bot nhắn nhanh chậm ra sao, và nếu chọn đường chính thức thì tốn bao nhiêu tiền.

---

## 2.2 · Lọc đơn trước khi nhắn — 3 lý do không gửi

Anh nêu 3 lý do một đơn **không được nhắn**:

| # | Lý do | Nghĩa là |
|---|---|---|
| 1 | Không liên lạc được WhatsApp | Số đó không có WhatsApp, hoặc nhắn không tới |
| 2 | Trùng đơn cùng một sản phẩm | Khách đã đặt sản phẩm này rồi |
| 3 | Số điện thoại có tỉ lệ hoàn cao | Khách này hay bom hàng — nhắn cũng lỗ |

**Câu 2.5** — Còn lý do nào nữa không?
- [ ] Chỉ 3 lý do này
- [ ] Thêm: [ ] Thiếu địa chỉ [ ] Thiếu số điện thoại [ ] Sản phẩm hết hàng [ ] Đơn quá cũ [ ] Ngoài vùng giao hàng
- [ ] Thêm: ______________________________________________

**🔴 Câu 2.6** — "Số điện thoại có tỉ lệ hoàn cao" — lấy con số này ở đâu?
- [ ] A. POS đã có sẵn, chỉ cần đọc ra. Tên mục là: ________________
- [ ] B. Phải tự tính từ lịch sử đơn cũ trong POS
- [ ] C. Có danh sách chặn riêng, do người nhập tay
- [ ] D. Chưa có gì, cần làm mới
> `Bây giờ:` Hệ thống **chưa có** phần này. Chưa từng theo dõi tỉ lệ hoàn theo số điện thoại.

**Câu 2.7** — Ngưỡng "tỉ lệ hoàn cao" là bao nhiêu?
- Hoàn quá ______ % thì không gửi
- Tính trên tối thiểu ______ đơn (ít đơn quá thì tỉ lệ không đáng tin)
- [ ] Chưa biết, cần xem dữ liệu rồi mới quyết

**Câu 2.8** — Khách bị đánh dấu "tỉ lệ hoàn cao" thì đơn đó xử sao?
- [ ] A. Bỏ hẳn, đóng đơn luôn
- [ ] B. Không nhắn bot, đẩy cho sale gọi điện
- [ ] C. Vẫn nhắn nhưng báo sale biết trước
- [ ] D. Chỉ cho đặt nếu trả trước

**🔴 Câu 2.9** — Thế nào là "trùng đơn"?
- [ ] A. Cùng số điện thoại + cùng sản phẩm
- [ ] B. Cùng số điện thoại + cùng sản phẩm + trong vòng ______ ngày
- [ ] C. Cùng số điện thoại, bất kể sản phẩm nào
- [ ] D. Cùng tên + cùng địa chỉ
- [ ] E. Khác: ______________________________________________

**Câu 2.10** — Gặp đơn trùng thì bot làm gì? *(sơ đồ anh ghi "Bot hỏi gộp hoặc giữ đơn")*
- [ ] A. Hỏi khách: "Anh/chị muốn gộp thành 1 đơn hay giữ cả 2?"
- [ ] B. Tự gộp, chỉ báo cho khách biết
- [ ] C. Tự hủy đơn sau, giữ đơn trước
- [ ] D. Không tự quyết gì, đẩy sale

---

## 2.3 · Bot nhắn gì và khi nào

**🔴 Câu 2.11** — Bot nhắn vào giờ nào?
- [ ] A. Theo giờ địa phương của khách (khách UAE thì theo giờ UAE)
- [ ] B. Một khung giờ cố định theo giờ Việt Nam
- [ ] C. Ngay khi đơn về, bất kể giờ nào
> `Lưu ý:` Trung Đông lệch Việt Nam 3–5 tiếng. Nhắn theo giờ Việt Nam sẽ rơi vào lúc khách đang ngủ.
- Nếu chọn A hoặc B, khung giờ mong muốn: từ ______ đến ______

**Câu 2.12** — Bot nhắn theo mẻ mỗi ngày, hay nhắn liên tục?
- [ ] A. Mỗi ngày một mẻ, lúc ______ giờ
- [ ] B. Vài mẻ trong ngày, cách nhau ______ tiếng
- [ ] C. Liên tục — đơn về là nhắn (trong khung giờ cho phép)

**Câu 2.13** — Tin nhắn đầu tiên gồm những gì? *(chọn nhiều)*
- [ ] Mã đơn · [ ] Tên sản phẩm · [ ] Số lượng · [ ] Tổng tiền · [ ] Phí ship
- [ ] Địa chỉ giao (để khách kiểm tra) · [ ] Nhắc "trả tiền khi nhận hàng"
- [ ] Ảnh sản phẩm · [ ] Dự kiến ngày giao
- [ ] Khác: ______________________________________________

**Câu 2.14** — Nhắn bằng tiếng gì?
- [ ] A. Theo nước của khách
- [ ] B. Tiếng Anh hết
- [ ] C. Theo ngôn ngữ khách đã dùng khi chat Messenger (nếu có)

---

## 2.4 · Khách trả lời rồi thì sao

**🔴 Câu 2.15** — Khách **xác nhận** thì hệ thống làm gì?
- [ ] A. Bot tự đổi trạng thái đơn trên POS sang: ________________
- [ ] B. Bot chỉ ghi chú vào đơn, người đổi trạng thái
- [ ] C. Bot đổi trạng thái + báo kho vận
> `Bây giờ:` Hệ thống **chưa bao giờ sửa đơn** trên POS — mới chỉ biết tạo đơn mới. Đây là quyền hoàn toàn mới.

**Câu 2.16** — Khách **hủy** thì làm gì?
- [ ] A. Bot tự đổi trạng thái sang: ________________
- [ ] B. Bot hỏi lý do rồi mới đóng
- [ ] C. Bot thử giữ khách lại 1 lần rồi mới đóng
- [ ] D. Đẩy sale gọi điện cứu đơn

**🔴 Câu 2.17** — Khách đòi **sửa** (địa chỉ, số lượng, giờ giao) thì sao?
- [ ] A. Đẩy sale ngay, bot không sửa gì
- [ ] B. Bot sửa được **địa chỉ và giờ giao**, số lượng thì đẩy sale
- [ ] C. Bot sửa được hết, có ghi lại đã sửa gì
- [ ] D. Bot ghi yêu cầu vào ghi chú, sale sửa
> `Vì sao hỏi:` Sửa số lượng là đổi tiền — nên thường phải có người chịu trách nhiệm.

**Câu 2.18** — Khách **không trả lời** thì sao?
- Nhắc lại sau ______ tiếng · Tối đa ______ lần
- Sau đó: [ ] Đẩy sale gọi điện [ ] Đóng đơn, ghi "không liên lạc được" [ ] Để nguyên chờ [ ] Khác: ________

**Câu 2.19** — Trong lúc trò chuyện, bot được trả lời tới đâu?
- [ ] A. Chỉ đúng việc xác nhận đơn, hỏi gì khác là đẩy sale
- [ ] B. Trả lời thêm về giao hàng, thời gian
- [ ] C. Trả lời thêm về sản phẩm
- [ ] D. Được bán thêm

---

## 2.5 · Khi nào đẩy về sale

**🔴 Câu 2.20** — Bắt buộc đẩy sale trong những trường hợp nào? *(chọn nhiều)*

Anh đã nêu: **sai địa chỉ · sai số điện thoại · không tìm thấy WhatsApp**. Còn gì nữa?

- [ ] A. Sai địa chỉ *(anh đã nêu)*
- [ ] B. Sai số điện thoại *(anh đã nêu)*
- [ ] C. Không tìm thấy WhatsApp của số đó *(anh đã nêu)*
- [ ] D. Khách khiếu nại hoặc tỏ ra khó chịu
- [ ] E. Khách đòi hủy
- [ ] F. Khách đòi đổi trả, hoàn tiền
- [ ] G. Đơn giá trị cao — trên ______
- [ ] H. Bot đọc không ra ý khách sau ______ lần hỏi lại
- [ ] I. Khách đòi gặp người thật
- [ ] J. Đơn nghi trùng nhưng không chắc
- [ ] K. Khách nói tiếng bot không xử được
- [ ] L. Khác: ______________________________________________

**Câu 2.21** — Đẩy sale thì sale nhận ở đâu?
- [ ] A. Danh sách riêng trên màn hình quản lý của hệ thống
- [ ] B. Ngay trên POS (gắn nhãn / ghi chú vào đơn)
- [ ] C. Nhóm chat nội bộ (WhatsApp / Telegram)
- [ ] D. Nhiều nơi cùng lúc: ________________
> `Vì sao hỏi:` Sale quen làm ở đâu thì thông tin phải hiện ở đó. Bắt sale mở thêm một màn hình mới thì thường không ai mở.

**Câu 2.22** — Sale phải xử lý trong bao lâu?
- [ ] A. Không đặt hạn
- [ ] B. Trong vòng ______ tiếng, quá hạn thì báo động
- [ ] C. Trong ngày

**🔴 Câu 2.23** — Sale xử xong phải chọn "kết quả + lý do" *(theo sơ đồ của anh)*. Danh sách kết quả gồm những gì?

**Thành công:**
- [ ] Đã xác nhận, đẩy kho vận
- [ ] Đã sửa thông tin rồi xác nhận
- [ ] Khác: ________________

**Không thành công — lý do:**
- [ ] Khách không nghe máy
- [ ] Khách đổi ý, không mua nữa
- [ ] Sai số điện thoại, không liên lạc được
- [ ] Địa chỉ không giao được
- [ ] Đơn trùng, đã hủy
- [ ] Khách có tiền sử bom hàng
- [ ] Hết hàng
- [ ] Khác: ________________

**Câu 2.24** — "Đóng đơn và ghi chi phí" *(bước cuối sơ đồ)* — chi phí ở đây là gì?
- [ ] A. Tiền quảng cáo đã tiêu cho đơn đó
- [ ] B. Chi phí vận chuyển nếu đã gửi rồi bị hoàn
- [ ] C. Cả hai
- [ ] D. Khác: ______________________________________________
> `Vì sao hỏi:` Cần biết con số này lấy ở đâu ra — POS có sẵn hay phải nhập tay.

---
---

# PHẦN 3 — BÁO CÁO CHO MARKETER

Anh cần: *"MKT check được sản phẩm A hôm nay tổng bao nhiêu đơn, xác nhận gửi đi được bao nhiêu đơn, những đơn không gửi được vì lý do gì."*

## 3.1 · Bảng báo cáo hình dung như thế này

```
NGÀY 22/08/2026 — Sản phẩm: "Ginger Belly Care"   Marketer: Ngọc

  Tổng đơn về                         120
  ├─ Đã gửi xác nhận                   95   (79%)
  │   ├─ Khách xác nhận                62   → đã đẩy kho vận
  │   ├─ Khách hủy                      8
  │   ├─ Chưa trả lời                  15
  │   └─ Đẩy sale xử lý                10
  │
  └─ KHÔNG gửi được                    25   (21%)
      ├─ Không liên lạc được WhatsApp  12
      ├─ Trùng đơn cùng sản phẩm        9
      └─ Số có tỉ lệ hoàn cao           4
```

**Câu 3.1** — Bảng này đủ chưa?
- [ ] Đủ
- [ ] Thiếu: ______________________________________________

**Câu 3.2** — Xem báo cáo cắt theo những chiều nào? *(chọn nhiều)*
- [ ] A. Theo ngày
- [ ] B. Theo sản phẩm
- [ ] C. Theo marketer phụ trách
- [ ] D. Theo nước / thị trường
- [ ] E. Theo nguồn đơn (trang bán hàng / Messenger)
- [ ] F. Theo page chạy quảng cáo
- [ ] G. Khác: ________________

**Câu 3.3** — Xem được khoảng thời gian nào?
- [ ] Hôm nay · [ ] 7 ngày · [ ] 30 ngày · [ ] Tự chọn khoảng ngày · [ ] So sánh 2 kỳ với nhau

**🔴 Câu 3.4** — "Marketer phụ trách sản phẩm" — lấy từ đâu?
- [ ] A. POS đã có sẵn. Tên mục là: ________________
- [ ] B. Từ bảng Google Sheet đang dùng
- [ ] C. Nhập trong hệ thống mới
- [ ] D. Chưa có, cần làm
> `Bây giờ:` Hệ thống lấy tên marketer từ **một cột trong Google Sheet, gán theo page** — không phải theo sản phẩm. Nếu POS đã có sẵn theo sản phẩm thì cần biết tên mục để lấy đúng.

**Câu 3.5** — Marketer có tự xem được không, hay phải hỏi người khác?
- [ ] A. Tự đăng nhập xem, chỉ thấy sản phẩm của mình
- [ ] B. Tự đăng nhập, thấy hết mọi sản phẩm
- [ ] C. Nhận báo cáo tự động gửi về mỗi ngày
- [ ] D. Cả A và C

**Câu 3.6** — Nếu gửi tự động thì gửi vào đâu, mấy giờ?
- Kênh: [ ] WhatsApp [ ] Telegram [ ] Email [ ] Nhóm chat chung
- Giờ: ______

**Câu 3.7** — Ngoài số đơn, marketer còn cần xem gì? *(chọn nhiều)*
- [ ] A. Tiền quảng cáo trên mỗi đơn xác nhận thành công
- [ ] B. Tỉ lệ hoàn hàng theo sản phẩm
- [ ] C. Sản phẩm sắp hết hàng
- [ ] D. Kịch bản nào đang chốt tốt hơn
- [ ] E. Khác: ________________

---
---

# PHẦN 4 — SẢN PHẨM VÀ TỒN KHO

**🔴 Câu 4.1** — Bot làm gì khi sản phẩm hết hàng?
- [ ] A. Ngừng bán ngay, báo khách hết hàng, chuyển sale
- [ ] B. Vẫn bán bình thường
- [ ] C. Vẫn bán nhưng báo trước "hàng về sau ______ ngày"
- [ ] D. Gợi ý khách chuyển sang gói khác còn hàng
- [ ] E. Tự tắt bot cho sản phẩm đó, báo marketer
> `Bây giờ:` B — bot được dạy là **"luôn coi như còn hàng"**. Muốn đổi thì phải sửa quy tắc này.

**Câu 4.2** — Cập nhật số tồn kho bao lâu một lần?
- [ ] A. Mỗi lần bot báo giá thì hỏi lại POS (chính xác nhất, chậm hơn chút)
- [ ] B. Mỗi ______ phút
- [ ] C. Mỗi ngày một lần
- [ ] D. Khi có người bấm nút cập nhật

**Câu 4.3** — Còn dưới bao nhiêu thì báo "sắp hết"?
- Ngưỡng: ______ cái
- Báo cho: [ ] Marketer phụ trách [ ] Sale [ ] Quản lý [ ] Nhóm chung [ ] Không cần báo

**🔴 Câu 4.4** — Giá trên POS khác giá trong kịch bản thì tin cái nào?
- [ ] A. Tin POS — kịch bản phải sửa theo
- [ ] B. Tin kịch bản — POS chỉ để tham khảo
- [ ] C. Lệch nhau thì **không cho đăng kịch bản**, báo người sửa
- [ ] D. Lệch thì bot im, chuyển sale
> `Vì sao quan trọng:` Ngày 07/08 đã có khách bị báo giá gấp đôi, hủy đơn rồi chặn luôn page.

**Câu 4.5** — Cần lấy những thông tin gì từ POS về? *(chọn nhiều)*
- [ ] Tên sản phẩm · [ ] Mã sản phẩm · [ ] Các loại/gói (size, màu, combo)
- [ ] Số lượng còn lại · [ ] Giá · [ ] Ảnh · [ ] Kho đang chứa · [ ] Đang bán hay đã ngừng

**Câu 4.6** — Đã ai kiểm tra POS có cho lấy danh sách sản phẩm ra không?
- [ ] A. Có, đã dùng rồi
- [ ] B. Chắc là có nhưng chưa thử
- [ ] C. Chưa biết, cần hỏi Pancake
> `Bây giờ:` Hệ thống **chưa từng lấy danh sách sản phẩm** từ POS. Nó đang đoán sản phẩm bằng cách xem lại 25 đơn gần nhất của page.
> ⚠️ Hệ quả: **sản phẩm mới chưa có đơn nào thì hệ thống không tạo được đơn.**

---
---

# PHẦN 5 — KỊCH BẢN BÁN HÀNG

**🔴 Câu 5.1** — Một sản phẩm bán trên mấy page Facebook?
- [ ] A. Đúng một page — sản phẩm và page là một
- [ ] B. Nhiều page cùng một nước
- [ ] C. Nhiều page khác nước — **giá và tiếng khác nhau**
- [ ] D. Cả B và C
> `Bây giờ:` A — mỗi page bán đúng một sản phẩm.
> `Vì sao quan trọng:` Đây là câu quyết định cách sắp xếp dữ liệu. Chọn A thì chỉ đổi tên gọi trên màn hình. Chọn C thì phải làm lại cách lưu.

**🔴 Câu 5.2** — Kịch bản viết một lần dùng cho nhiều page, hay mỗi page một bản?
- [ ] A. Một kịch bản cho sản phẩm, mọi page dùng chung
- [ ] B. Kịch bản gốc theo sản phẩm, từng page sửa thêm phần riêng
- [ ] C. Kịch bản gốc theo sản phẩm, từng nước sửa thêm phần riêng
- [ ] D. Mỗi page một bản riêng như hiện nay

**Câu 5.3** — Nếu chọn B/C: page hoặc nước được sửa những gì? *(chọn nhiều)*
- [ ] Câu chào · [ ] Cách xưng hô · [ ] Bảng giá · [ ] Ảnh · [ ] Khuyến mãi riêng · [ ] Ngôn ngữ

**🔴 Câu 5.4** — "Trực quan trên màn hình" cụ thể là gì? *(chọn nhiều)*
- [ ] A. Chia ô rõ ràng để điền, thay vì một ô chữ dài
- [ ] B. Xem trước hội thoại mẫu ngay bên cạnh trong lúc đang sửa
- [ ] C. Kho ảnh xem được, kéo thả gắn vào từng phần
- [ ] D. Đặt hai bản kịch bản cạnh nhau để so
- [ ] E. Hiện luôn kết quả: bản này chốt được bao nhiêu đơn
- [ ] F. Vẽ ra được luồng hội thoại: chào → tư vấn → chốt → giao sale
- [ ] G. Khác: ______________________________________________
> `Bây giờ:` Có A một phần (bảng giá và ảnh có ô riêng). Còn lại chưa có.

**Câu 5.5** — Kịch bản chia thành những phần nào? *(chọn nhiều)*
- [ ] Câu mở đầu · [ ] Sản phẩm hứa gì với khách · [ ] Bảng giá · [ ] Ảnh
- [ ] Cách trả lời khi khách chê đắt / do dự · [ ] Điều cấm nói
- [ ] Khi nào chuyển cho người thật
- [ ] **Món quà / lý do khiến khách phải nhắn lại** ← hiện chưa có ô nào
- [ ] Khác: ______________________________________________

**Câu 5.6** — Ai được sửa kịch bản?
- [ ] A. Marketer phụ trách sản phẩm đó
- [ ] B. Marketer nào cũng sửa được
- [ ] C. Chỉ người có quyền duyệt

**Câu 5.7** — Sửa kịch bản xong có cần người thứ hai duyệt không?
- [ ] A. Có, bắt buộc
- [ ] B. Không, ai sửa tự chịu
- [ ] C. Chỉ cần duyệt khi sửa giá hoặc chính sách

---
---

# PHẦN 6 — BOT CHAT MESSENGER (CÁI ĐANG CHẠY)

**Câu 6.1** — Khách nhắn xong đợi bao lâu mới nhận trả lời là chấp nhận được?
- [ ] A. Khoảng 30 giây như bây giờ — gộp cả cụm tin rồi trả một lần
- [ ] B. Dưới 10 giây
- [ ] C. Gần như ngay lập tức, chấp nhận trả lời rời từng tin
> `Bây giờ:` A.

**🔴 Câu 6.2** — Trên các page đang chạy bot AI, còn có bot Botcake chạy song song. Xử thế nào?
- [ ] A. Giữ như nay — Botcake chào tin đầu, bot AI làm từ tin thứ hai
- [ ] B. Page nào bật bot AI thì **tắt hẳn Botcake** trên page đó
- [ ] C. Chia ra: page này Botcake lo trọn, page kia bot AI lo trọn
- [ ] D. Khác: ______________________________________________
> `Bây giờ:` A. Nhưng đo thực tế: **75% cuộc trò chuyện bị Botcake chen ngang** giữa lúc bot AI đang chốt. Có ca khách đã sắp cho địa chỉ thì Botcake dội nguyên bảng checklist vào, mất đơn.
> `Vì sao quan trọng:` Chọn B hoặc C thì bỏ được cả một mảng phức tạp nhất của hệ thống hiện tại.

**Câu 6.3** — Có quyền tắt Botcake trên các page đó không?
- [ ] A. Có, toàn quyền
- [ ] B. Có, nhưng phải qua marketer phụ trách
- [ ] C. Không, Botcake do đội khác quản
- [ ] D. Chưa rõ

**Câu 6.4** — Bot AI có được tự tạo đơn trong POS không?
- [ ] A. Không — bot chỉ ghi chú, người tạo đơn tay *(như hiện nay)*
- [ ] B. Có, nhưng phải duyệt — đơn vào danh sách chờ, sale bấm một nút là tạo
- [ ] C. Có, tự động hoàn toàn
- [ ] D. Tự động cho sản phẩm đã chạy ổn, duyệt cho sản phẩm mới
> `Bây giờ:` A. Đây là chỗ sale còn phải gõ tay lại toàn bộ thông tin từ ghi chú.

**Câu 6.5** — Mỗi khách được bot trả lời tối đa mấy lượt trong một ngày?
- [ ] A. Giữ 4 lượt như hiện nay
- [ ] B. Nâng lên ______ lượt
- [ ] C. Không giới hạn cứng — khách nào có vẻ mua thật thì cho nhiều lượt hơn
> `Bây giờ:` A. Nhưng quy tắc bán hàng lại yêu cầu bot phải mời chốt lại tới 3 lần khi khách từ chối — mà 4 lượt thì thường đã hết chỗ. **Hai quy tắc này đang mâu thuẫn nhau.**

---
---

# PHẦN 7 — AI LÀM GÌ, AI XEM ĐƯỢC GÌ

**🔴 Câu 7.1** — Hiện có ai ngồi trực hộp thư không?
- [ ] A. Có, 24/7
- [ ] B. Có, giờ hành chính Việt Nam
- [ ] C. Có theo ca nhưng không kín ngày
- [ ] D. Không có ai trực cố định, sale rảnh thì vào xem
> `Vì sao quan trọng nhất:` Bot được thiết kế để "im lặng và giao lại cho người" ở những chỗ nhạy cảm. Nếu không có ai đỡ ở đầu bên kia thì **"giao lại cho người" thực chất là bỏ rơi khách**.

**Câu 7.2** — Đội sale có bao nhiêu người, chia theo gì?
- Số người: ______
- Chia theo: [ ] Nước [ ] Sản phẩm [ ] Ca trực [ ] Không chia

**Câu 7.3** — Sale làm việc chủ yếu ở đâu?
- [ ] A. Trong POS / Pancake
- [ ] B. Trong màn hình quản lý của hệ thống
- [ ] C. Cả hai

**🔴 Câu 7.4** — Hệ thống cần mấy loại tài khoản?
- [ ] A. Một tài khoản chung như hiện nay
- [ ] B. Ba loại: Quản trị · Marketer · Sale
- [ ] C. Bốn loại: thêm Quản lý (chỉ xem báo cáo)
- [ ] D. Năm loại: thêm Người duyệt kịch bản
- [ ] E. Khác: ______________________________________________
> `Bây giờ:` A — **một mật khẩu duy nhất mở toàn bộ hệ thống**. Không phân biệt được ai đã làm gì.

**Câu 7.5** — Marketer chỉ thấy sản phẩm mình phụ trách, hay thấy hết?
- [ ] A. Chỉ thấy và sửa được sản phẩm của mình
- [ ] B. Thấy hết, sửa hết
- [ ] C. Thấy hết nhưng chỉ sửa được của mình

**Câu 7.6** — Có cần ghi lại "ai đổi gì, lúc nào" không?
- [ ] A. Có, ghi đầy đủ, tra ngược được
- [ ] B. Chỉ ghi việc quan trọng: đăng kịch bản, bật/tắt bot, đổi giá
- [ ] C. Không cần

---
---

# PHẦN 8 — LÀM GÌ TRƯỚC

**🔴 Câu 8.1** — Xếp thứ tự 1-2-3 cho ba việc cần làm trước nhất:
- [ ] ___ Bot xác nhận đơn qua WhatsApp
- [ ] ___ Báo cáo cho marketer theo sản phẩm
- [ ] ___ Lấy tồn kho từ POS về
- [ ] ___ Màn hình quản lý kịch bản theo sản phẩm
- [ ] ___ Chia tài khoản theo vai (marketer / sale / quản trị)
- [ ] ___ Dọn chỗ bot AI và Botcake chen nhau
- [ ] ___ Cho bot tự tạo đơn (có duyệt)
- [ ] ___ Khác: ______________________________________________

**Câu 8.2** — Bao giờ cần có bản dùng được?
- [ ] A. Gấp — dưới 1 tháng
- [ ] B. 2–3 tháng
- [ ] C. Không gấp, làm chắc

**Câu 8.3** — Trong lúc làm cái mới, hệ thống cũ có được dừng không?
- [ ] A. Không, phải chạy liên tục
- [ ] B. Dừng ngắn vào giờ ít khách được
- [ ] C. Tắt hẳn một thời gian cũng được

---
---

# VIỆC NÊN BẮT ĐẦU NGAY, KHÔNG CHỜ TRẢ LỜI XONG

Nếu chọn **đăng ký WhatsApp chính thức với Meta** (câu 2.1 phương án B hoặc C) thì thủ tục này mất nhiều thời gian nhất và **không phụ thuộc vào việc lập trình**. Nên bắt đầu song song ngay:

1. Đăng ký tài khoản doanh nghiệp WhatsApp với Meta
2. Xác minh doanh nghiệp
3. Đăng ký số điện thoại
4. Soạn mẫu tin xác nhận đơn gửi Meta duyệt

Để tới lúc code xong mới làm thì cả khối sẽ nằm chờ thủ tục.

---

## SAU KHI TRẢ LỜI

Với các câu 🔴, tôi dựng được:
1. **Bản đồ nghiệp vụ** — vẽ rõ từng luồng, ai làm gì ở đâu
2. **Thiết kế hệ thống mới** — chỗ lưu dữ liệu, cách các phần nối nhau
3. **Bảng phân quyền** — ai xem được gì, sửa được gì
4. **Kế hoạch làm** — việc nào trước, việc nào sau, không làm gián đoạn phần đang chạy
