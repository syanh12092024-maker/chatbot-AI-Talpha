// SỔ ĐĂNG KÝ MÀN HÌNH — nguồn DUY NHẤT cho menu điều hướng.
//
// ═══ VÌ SAO CÓ FILE NÀY ═════════════════════════════════════════════════════════════
// 24 màn đã dựng xong mà KHÔNG có menu nào liệt kê chúng. Mỗi màn tự gắn 2–3 link tuỳ tiện
// ở góc phải, nên người dùng chỉ tới được màn nào tôi ngẫu nhiên nghĩ ra lúc viết màn đó.
// Chủ dự án mở `/trang-chu` và hỏi «vào đâu để vào trang chính» — đúng câu hỏi mà một phần
// mềm 24 màn không có menu sẽ luôn tạo ra.
//
// ═══ ĐƯỜNG VÀ VAI LẤY TỪ CHÍNH MÀN, KHÔNG CHÉP LẠI ═════════════════════════════════
// Chép `DUONG_TRANG` và `VAI_VAO_DUOC` vào đây là gõ hai lần — đúng loại lỗi đã làm cả hệ
// mất vai (`quan_tri` vs `quan-tri`). Menu chép sai một đường thì nút dẫn tới 404; chép sai
// một vai thì hoặc giấu mất màn người ta được xem, hoặc chìa ra màn họ sẽ bị 403.
//
// Nên file này NHẬP từ `index.js` của từng màn. Đổi vai ở màn → menu tự đúng theo.

import { VAI } from '../../auth/boi-canh.js';

import * as vanHanh from '../van-hanh/index.js';
import * as dispatch from '../dispatch/index.js';
import * as banHoiThoai from '../ban-hoi-thoai/index.js';
import * as team from '../team/index.js';
import * as pageBot from '../page-bot/index.js';
import * as motPage from '../mot-page/index.js';
import * as caiDatTeam from '../cai-dat-team/index.js';
import * as ketNoi from '../ket-noi/index.js';
import * as model from '../model/index.js';
import * as boLuat from '../bo-luat/index.js';
import * as kyNang from '../ky-nang/index.js';
import * as promptPage from '../prompt-page/index.js';
import * as kichBan from '../kich-ban/index.js';
import * as aiDeXuat from '../ai-de-xuat/index.js';
import * as lop0 from '../lop-0-dong/index.js';
import * as thuVienAnh from '../thu-vien-anh/index.js';
import * as sanPham from '../san-pham/index.js';
import * as lenChay from '../len-chay/index.js';
import * as sanSang from '../san-sang/index.js';
import * as batDau from '../bat-dau/index.js';
import * as trangChu from '../trang-chu/index.js';
import * as baoCao from '../bao-cao/index.js';
import * as chiPhi from '../chi-phi/index.js';
import * as ruiRo from '../rui-ro-hoan/index.js';
import * as hoSoKhach from '../ho-so-khach/index.js';
import * as nguonKhach from '../nguon-khach/index.js';
import * as hieuQua from '../hieu-qua/index.js';
import * as sucKhoe from '../suc-khoe/index.js';
import * as nhatKy from '../nhat-ky/index.js';

/**
 * SÁU MỤC, XẾP THEO NHỊP LÀM VIỆC — không theo cấu trúc dữ liệu.
 *
 * ═══ VÌ SAO ĐỔI (01/09) ════════════════════════════════════════════════════════════
 * Bản trước có 5 nhóm nhưng vẫn là một danh sách 24 dòng: `menuCua()` đo được vai
 * `quan-tri` thấy 24 màn, `quan-ly` 22, `marketer` 14. Ba chỗ hỏng:
 *   ① BẢY màn phục vụ MỘT việc — sửa cách bot nói (bộ luật · kỹ năng · kịch bản · lớp 0
 *     đồng · ảnh · prompt · đề xuất AI). `01-QUYET-DINH.md` §6 nói prompt có BỐN khối;
 *     giao diện tách thành bảy đường và bắt người dùng tự nhớ thứ tự.
 *   ② Nhật ký thao tác (mở khi có sự cố) đứng ngang hàng Bảng điều phối (mở mỗi sáng) —
 *     menu không nói cái nào dùng hằng ngày, cái nào một lần rồi thôi.
 *   ③ Màn chưa có dữ liệu (Hiệu quả kịch bản, Lớp 0 đồng) chiếm một dòng ngang hàng với
 *     màn đang chạy; người dùng vào rồi ra tay không.
 *
 * Nên mục xếp theo CÂU HỎI người dùng mang tới, theo nhịp họ mở máy:
 *   mỗi sáng → `viec`
 *   khi cần  → `page`
 *   cuối kỳ  → `so-lieu`
 *   một lần  → `cai-dat` (kèm chín màn ít dùng)
 *
 * ═══ GOM TIẾP CÒN BỐN (11/09) ══════════════════════════════════════════════════════
 * Người tiếp quản mở giao diện lên và nói «nhiều tính năng quá, từ ngữ khó hiểu, quá dài
 * dòng». Sáu mục vẫn buộc đọc sáu câu mô tả rồi bung mục mới biết bên trong có gì. Nay
 * bốn mục, mỗi mục một câu ngắn; chín màn ít dùng (chưa có dữ liệu, hoặc đang tắt trên
 * máy chủ, hoặc một năm dùng một lần) dồn xuống cuối mục «Cài đặt» thay vì đứng ngang
 * hàng với màn mở hằng ngày. Vẫn KHÔNG màn nào bị xoá.
 *
 * KHÔNG màn nào bị xoá: 24 màn vẫn còn đủ 24 đường, chỉ đổi chỗ đứng trên menu.
 */
export const NHOM = Object.freeze([
  // ═══ LL1 · 29/09/2026 — NĂM ĐÍCH (CR-28-09c, `docs/v3/03-MAN-HINH.md`) ═══════════════════
  // Bản GD6 (25/09) xếp theo nhịp mở máy — Hôm nay · Page & bot · Dạy bot · Số liệu · Cài đặt —
  // nhưng cùng một việc vẫn rải nhiều mục: sản phẩm ở «Page & bot», kịch bản tầng sản phẩm ở
  // «Dạy bot», khách hàng ở «Số liệu». Người quyết duyệt bản vẽ năm đích 28–29/09: Sản phẩm
  // thành đích riêng vì nó là lõi câu trả lời (01 §6 mới), Page gom mọi thứ bot nói trên một
  // page, Hộp thư là nhà duy nhất của sale.
  //
  // ⚠️ LL1 CHỈ ĐỔI CHỖ NGỒI. KHÔNG màn nào bị xoá, KHÔNG đường nào đổi (ca N3 của
  //    `ll1-nam-dich.test.mjs` so danh sách với bản chụp). Màn cũ gộp vào nhà mới ở LL2–LL6,
  //    gỡ ở LL8.
  { ma: 'hop-thu', ten: 'Hộp thư', bieuTuong: 'inbox',
    mo: 'Khách đang chờ người, đơn chờ duyệt — trả lời vẫn ở Pancake' },
  { ma: 'san-pham', ten: 'Sản phẩm', bieuTuong: 'package',
    mo: 'Bán gì, ở thị trường nào, giá bao nhiêu — bot trả lời theo đây' },
  { ma: 'page', ten: 'Page', bieuTuong: 'bot',
    mo: 'Từng page: bot nói gì, bật hay tắt, và luật chung cho mọi page' },
  { ma: 'so-lieu', ten: 'Số liệu', bieuTuong: 'chart-no-axes-column',
    mo: 'Ra bao nhiêu đơn, tốn bao nhiêu tiền' },
  { ma: 'cai-dat', ten: 'Cài đặt', bieuTuong: 'settings',
    mo: 'Người, kết nối, model, nhật ký — mở lúc cài đặt hoặc lúc có sự cố' },
  // Mục dự trù của giai đoạn 3 (ta CHỦ ĐỘNG nhắn khách). Rỗng nên `menuCua` tự ẩn.
  { ma: 'nhan-cho-khach', ten: 'Nhắn cho khách', bieuTuong: 'inbox',
    mo: 'Ta chủ động nhắn — hàng loạt, đuổi theo, xin phép' },
]);

/**
 * MỤC ĐÃ KHAI NHƯNG CHƯA CÓ MÀN NÀO — dự trù cho giai đoạn sau.
 *
 * `nhan-cho-khach` là chỗ của sáu màn `02-KE-HOACH-CODE.md` xếp vào giai đoạn 3 (nhắn hàng
 * loạt · đuổi theo · xin phép nhận tin · chiến dịch đã gửi · trả lời bình luận) cộng «xác
 * nhận đơn qua WhatsApp» của `03-MAN-HINH.md` nhóm 2. Chúng KHÔNG thuộc mục nào khác:
 * «Bot nói gì» là bot TRẢ LỜI khách, còn đây là ta CHỦ ĐỘNG đi tìm khách — có tiền, và
 * `01-QUYET-DINH.md` §5 nói giá phải trả khi làm sai là mất page.
 *
 * Khai trước để đến lượt dựng thì chỉ thêm một dòng `dat(...)`, không phải xếp lại cả menu.
 * `menuCua` tự ẩn mục rỗng, nên hôm nay người dùng vẫn thấy đúng sáu mục có màn.
 */
// `bot-noi` vào đây 14/09/2026: người tiếp quản xếp «xem bot nói gì với khách» là việc SỐ
// MỘT của họ, mà v3 chưa từng có màn ấy. Khai trước để nó không trôi khỏi tầm mắt.
export const MUC_DU_TRU = Object.freeze(['nhan-cho-khach']);

/**
 * `m` là module `index.js` của màn — đường và vai lấy từ đó.
 * `ten` và `nhom` là thứ DUY NHẤT khai ở đây, vì màn không tự biết mình tên gì trên menu.
 */
const dat = (m, ten, nhom, moTa = '', itDung = false, thuNghiem = false, canId = false, moTuManKhac = null) => ({
  duong: m.DUONG_TRANG,
  vai: m.VAI_VAO_DUOC,
  ten, nhom, moTa,
  /* `thuNghiem` = màn ĐÃ DỰNG nhưng chưa dùng được: chưa có dữ liệu thật, hoặc chưa có cửa
     ghi nên mở ra chỉ đọc được một câu «chưa có gì». Nó RA KHỎI MENU, nhưng đường dẫn vẫn
     sống và vai vẫn nguyên — ai có liên kết cũ vẫn vào được, và màn nào trỏ sang nó vẫn trỏ
     được. Đo 22/09: sáu màn loại này đứng ngang hàng với màn mở hằng ngày, nên người dùng
     mở ra rồi đi ra tay không — đó là cách nhanh nhất dạy người ta đừng tin menu.
     KHÁC `itDung`: `itDung` là màn DÙNG ĐƯỢC nhưng thưa, vẫn ở trong menu, chỉ xếp sau vạch. */
  thuNghiem,
  /* `canId` = màn CẦN THAM SỐ để mở (trang của MỘT page: `/page/:id`). Nó không có dòng trên
     thanh bên — một dòng menu dẫn tới `/page` trần thì không nói được page nào — nhưng vẫn
     phải nằm trong gói menu để thanh trên cùng tra ra mục của nó (án lệ GD6 ⑥b).
     KHÁC `thuNghiem`: màn này DÙNG ĐƯỢC và đang được dùng; nó chỉ không đứng riêng được. */
  canId,
  /* `moTuManKhac` = `{ thay, loiVao }`: màn DÙNG ĐƯỢC, nhưng với người mở được màn `thay` thì
     việc của nó đã nằm ở đó, và lối vào đúng là từ các tệp `loiVao` (mang sẵn page, việc).
     Ca ④g của `dieu-huong.test.mjs` đọc từng tệp ấy để chắc lối vào còn thật.
     KHÔNG ẩn khi nó là màn CUỐI giữ mục của nó trên menu: án lệ 28/09 (trước LL1) — marketer
     không thấy «Tất cả page», nên với họ «Sản phẩm & kho» từng là cửa duy nhất vào mục
     «Page & bot»; ẩn đồng loạt là cả mục biến khỏi menu của họ (ca ②b bắt được).
     Đặt 28/09 khi rút menu 18 → 16 (người quyết: «rút menu và chữ cho gọn»). KHÁC `canId`:
     mở trần vẫn chạy, chỉ là mở trần thì người dùng phải tự chọn lại thứ màn kia đã biết. */
  moTuManKhac,
  // `itDung` KHÔNG đổi quyền và KHÔNG bỏ màn khỏi menu — màn vẫn nằm trong mục của nó,
  // vẫn bấm tới được, bài ④b vẫn xanh. Nó chỉ nói với thanh bên: xếp xuống dưới một vạch
  // «Ít dùng», và đừng chìa lên thanh tab ngang. Mục «Cài đặt» có 13 màn; để cả 13 ngang
  // hàng nhau là bắt người dùng đọc 13 dòng mỗi lần tìm một thứ họ dùng hằng tuần.
  itDung,
});

/**
 * CỤM — nhiều màn phục vụ MỘT việc hiện thành TAB trong trang, không thành nhiều dòng menu
 * (phiếu LL3 · 29/09 · CR-28-09c, bản vẽ «Luật chung» và «Số liệu» có thanh tab con).
 *
 * Luật: màn ĐẦU TIÊN hiện được của cụm (theo thứ tự `MAN`, theo vai) đứng trên thanh bên, mang TÊN
 * CỤM; các màn còn lại của cụm rời thanh bên nhưng khung (`dieu-huong.js`) vẽ chúng thành thanh tab
 * ngay dưới đầu trang. Màn `thuNghiem`/`canId` giữ luật cũ của chúng (không lên thanh bên, không lên
 * tab). KHÔNG đường nào đổi, KHÔNG màn nào bị xoá — gộp ở tầng điều hướng; gộp nội dung là việc
 * của từng phiếu sau (LL5 Số liệu · LL6 Cài đặt · LL8 gỡ màn thừa).
 */
export const CUM = Object.freeze({
  'danh-sach-page': { ten: 'Tất cả page' },
  'luat-chung': { ten: 'Luật chung' },
  // LL5 · 29/09: Số liệu = MỘT dòng thanh bên, bốn tab (bản vẽ bảng 3a–3c: Tổng quan · Chi phí AI · Khách).
  'so-lieu': { ten: 'Số liệu' },
  // LL6 · 29/09: Cài đặt = MỘT dòng, sáu tab theo thứ tự bản vẽ (bảng 4).
  'cai-dat': { ten: 'Cài đặt' },
});
const trongCum = (cum, nhan, m) => ({ ...m, cum, nhanCum: nhan });

export const MAN = Object.freeze([
  // ĐƯỜNG DẪN KHÔNG ĐỔI — đổi đường là làm chết mọi liên kết đã lưu. Chỉ đổi CHỖ NGỒI.
  // Đích của từng màn = cột «Nhà mới» của `docs/v3/03-MAN-HINH.md` (LL1, 29/09).

  // ① HỘP THƯ — nhà của sale (01 §10). Vai `sale` chỉ thấy đích này, và đặt chân ở màn đầu
  // tiên nó vào được (`vai-b.js#duongSauKhiVao`) — thứ tự dưới đây là thứ tự đặt chân.
  dat(trangChu, 'Việc của tôi', 'hop-thu', 'Lọc theo vai bạn, gấp lên trước'),
  // LL2 · 29/09: bàn hội thoại thành HỘP THƯ (tab Đơn chờ · Tìm khách, duyệt đơn cạnh chat) — đổi TÊN,
  // đường giữ nguyên `/ban-hoi-thoai` (liên kết cũ, chỗ đặt chân của sale).
  dat(banHoiThoai, 'Hộp thư', 'hop-thu', 'Hội thoại cần người, đơn chờ duyệt, tìm khách'),
  dat(dispatch, 'Việc đang chờ', 'hop-thu', 'Khách bot đã giao lại, có đồng hồ đếm ngược'),
  // Tìm khách theo số điện thoại là việc của Hộp thư (03-MAN-HINH), không phải của Số liệu.
  dat(hoSoKhach, 'Khách hàng', 'hop-thu', 'Gộp ba kênh theo số điện thoại', true, true),

  // ② SẢN PHẨM — lõi của câu trả lời (01 §6 mới): chung → theo thị trường → page.
  // LL1 · 29/09: «Sản phẩm & kho» BỎ cờ `moTuManKhac` và `itDung`. Cờ ấy (28/09) giấu nó với ai
  // mở được trang một page, vì mỗi page đã có tab sản phẩm. Nay Sản phẩm là một ĐÍCH — giữ cờ
  // thì bấm vào đích lõi mà chỉ thấy «Kỹ năng theo sản phẩm» (ca N5/N6).
  dat(sanPham, 'Sản phẩm & kho', 'san-pham', 'Bot đang chào bán gì, còn hàng không'),
  // Khái niệm kỹ năng bỏ ở LL11 — nội dung «hỏi size» sang kiến thức sản phẩm. Tới đó ngồi đây.
  dat(kyNang, 'Kỹ năng theo sản phẩm', 'san-pham', 'Bật theo nhóm sản phẩm'),

  // ③ PAGE — mọi thứ bot nói trên một page, và luật chung cho mọi page.
  // GD2 · 25/09 — «Bắt đầu» và «Page còn thiếu gì» ngoài menu: cả hai chuyển hướng về danh sách.
  trongCum('danh-sach-page', 'Tất cả page', dat(pageBot, 'Tất cả page', 'page', 'Một dòng một page: bot nào, bật hay tắt, còn thiếu gì')),
  // Trang của MỘT page: mở từ danh sách, không đứng riêng trên menu — nhưng vẫn khai ở đây
  // để thanh trên cùng tra được «tôi đang ở mục nào» (án lệ GD6 ⑥b). Cờ `canId` nói đúng
  // lý do ẩn: màn DÙNG ĐƯỢC, chỉ là không mở được nếu thiếu tham số.
  dat(motPage, 'Trang một page', 'page', 'Một page: tình trạng, công tắc, việc làm tiếp', false, false, true),
  trongCum('danh-sach-page', 'Kịch bản', dat(kichBan, 'Kịch bản của page', 'page', 'Lời bot nói riêng trên từng page')),
  // LL3: «Luật chung» = một cụm — luật · trả lời sẵn · đề xuất chờ duyệt (bản vẽ bảng 2d).
  trongCum('luat-chung', 'Luật', dat(boLuat, 'Quy tắc chung mọi page', 'page', 'Sửa là cả team đổi cách nói')),
  trongCum('luat-chung', 'Trả lời sẵn', dat(lop0, 'Câu trả lời sẵn', 'page', 'Trả theo từ khoá, không tốn tiền')),
  dat(lenChay, 'Đưa sản phẩm lên chạy', 'page', 'Sáu chặng, mỗi chặng một cửa kiểm', true, true),
  // 28/09: RA KHỎI THANH BÊN. Là công cụ chẩn đoán của MỘT page; trang một page trỏ sang nó
  // mang sẵn `?page=`, còn mở từ menu thì phải tự chọn lại page.
  dat(promptPage, 'Đoạn chữ gửi cho AI', 'page', 'Xem đúng thứ AI đang đọc', true, false, false,
    { thay: motPage.DUONG_TRANG, loiVao: ['mot-page/kho-mot-page.js'] }),
  dat(thuVienAnh, 'Ảnh gửi khách', 'page', 'Ảnh gắn nhãn theo chủ đề', true, true),
  trongCum('luat-chung', 'Đề xuất chờ duyệt', dat(aiDeXuat, 'Gợi ý từ AI', 'page', 'Phải duyệt mới áp được', true, true)),
  dat(hieuQua, 'So hai bản kịch bản', 'page', 'Chưa đủ mẫu thì nói chưa kết luận', true, true),

  // ④ SỐ LIỆU — để ĐỌC, không để ra lệnh.
  // LL5 · 29/09: «Khách vào từ đâu» và «Rủi ro hoàn hàng» thôi `thuNghiem` — prod có dữ liệu cho cả hai
  // (`don_hang` 123.629 đơn · `khach.tang_hoan` 89.484 khách), cờ ẩn đặt hồi máy dev còn trống. Lưu ý đúng
  // của hai màn: số là lát nạp 28/08, chưa có job kéo đơn định kỳ (nợ N-KEODON · phiếu LL17).
  trongCum('so-lieu', 'Tổng quan', dat(baoCao, 'Đơn và tỉ lệ chốt', 'so-lieu', 'Tách hai luồng, không gộp một tổng')),
  trongCum('so-lieu', 'Chi phí AI', dat(chiPhi, 'Chi phí AI', 'so-lieu', 'Tiền model theo page')),
  trongCum('so-lieu', 'Nguồn khách', dat(nguonKhach, 'Khách vào từ đâu', 'so-lieu', 'Hai luồng đơn và chỗ khách rơi', true)),
  trongCum('so-lieu', 'Rủi ro hoàn', dat(ruiRo, 'Rủi ro hoàn hàng', 'so-lieu', 'Bốn tầng, đọc cột đã chấm sẵn', true)),

  // ⑤ CÀI ĐẶT — vào đúng hai lần: hôm cài đặt, và hôm có sự cố.
  // GD3 · 25/09: màn ĐẦU TIÊN của mục Cài đặt — người mới mở nó để biết còn thiếu việc gì,
  // thay vì tự dò 12 bước trên 7 màn.
  // LL6 · 29/09: thứ tự theo bản vẽ — Bắt đầu · Kết nối · Model · Hệ còn sống · Người và team · Nhật ký.
  trongCum('cai-dat', 'Bắt đầu', dat(caiDatTeam, 'Cài đặt team', 'cai-dat', 'Năm việc làm một lần, và việc nào còn thiếu')),
  trongCum('cai-dat', 'Kết nối', dat(ketNoi, 'Kết nối', 'cai-dat', 'Tài khoản Pancake và kho hàng')),
  trongCum('cai-dat', 'Model', dat(model, 'Model AI & khoá', 'cai-dat', 'Nhà model, khoá, bảng giá')),
  trongCum('cai-dat', 'Hệ còn sống', dat(sucKhoe, 'Hệ còn sống không', 'cai-dat', 'Chín đèn')),
  // LL10 · 29/09: «Hội thoại và đơn» thành «Vận hành» — nhà của năm việc vận hành (diễn tập · tin bị lọc ·
  // chi phí từng tin · nguồn nhận tin · đối chiếu tin lỗi). Duyệt đơn của sale đã sang Hộp thư (LL2).
  trongCum('cai-dat', 'Vận hành', dat(vanHanh, 'Vận hành', 'cai-dat', 'Diễn tập, tin bị lọc, chi phí từng tin, nguồn nhận tin')),
  trongCum('cai-dat', 'Người và team', dat(team, 'Người và team', 'cai-dat', 'Thành viên, vai, gán page')),
  trongCum('cai-dat', 'Nhật ký', dat(nhatKy, 'Ai đã sửa gì', 'cai-dat', 'Không sửa được, không xoá được')),
]);

/** Màn đầu cụm CHUẨN — màn đầu tiên của mỗi cụm theo thứ tự sổ. */
const DAU_CUM_CHUAN = new Map();
for (const m of MAN) if (m.cum && !DAU_CUM_CHUAN.has(m.cum)) DAU_CUM_CHUAN.set(m.cum, m.duong);

/** Màn đã dựng nhưng chưa dùng được — ra khỏi menu, đường dẫn vẫn sống. */
export const MAN_THU_NGHIEM = Object.freeze(MAN.filter((m) => m.thuNghiem).map((m) => m.duong));

/**
 * Menu của MỘT người — lọc theo vai ở máy chủ, không ẩn bằng CSS.
 *
 * Mục nào không còn màn nào vai đó vào được thì BIẾN MẤT, không hiện rỗng: một mục trống
 * là một lời mời bấm vào rồi không có gì. Vai `sale` vì thế chỉ còn đúng một mục.
 */
/**
 * Menu của MỘT người — lọc theo VAI ở máy chủ, không ẩn bằng CSS.
 *
 * ⚠️ Màn `thuNghiem` KHÔNG bị loại khỏi kết quả: nó đi kèm cờ `an: true`. Thanh bên không vẽ
 *    nó ra, nhưng thanh trên cùng vẫn tra được «tôi đang ở đâu» khi người dùng mở nó bằng
 *    đường dẫn. Lọc thẳng ở đây thì màn ẩn mất luôn đường dẫn vị trí — người mở nó ra không
 *    biết mình đang đứng ở mục nào.
 */
export function menuCua(vai = []) {
  const cua = new Set((Array.isArray(vai) ? vai : [vai]).map(String));
  const truocCum = MAN.filter((m) => (m.vai || []).some((v) => cua.has(String(v))))
    .map((m) => ({ ...m, an: !!m.thuNghiem || !!m.canId || !!m.moTuManKhac }));
  // CỤM (LL3): màn hiện được ĐẦU TIÊN của cụm lên thanh bên mang tên cụm; màn hiện được còn lại
  // của cụm rời thanh bên (`an`) và mang `trongCum` — khung vẽ chúng thành tab trong trang.
  const dauCum = new Map();
  for (const m of truocCum) if (m.cum && !m.an && !dauCum.has(m.cum)) dauCum.set(m.cum, m.duong);
  const duoc = truocCum.map((m) => {
    if (!m.cum || m.an) return m;
    if (m.duong !== dauCum.get(m.cum)) return { ...m, an: true, trongCum: true };
    // Tên cụm CHỈ cho màn đầu cụm CHUẨN (màn đầu tiên của cụm trong sổ). Vai không vào được màn ấy
    // (marketer không mở «Tất cả page») thì dòng menu mang đúng tên màn của nó — gắn tên cụm lên một
    // màn khác là nói dối người bấm.
    return m.duong === DAU_CUM_CHUAN.get(m.cum) ? { ...m, tenMenu: (CUM[m.cum] || {}).ten || m.ten } : m;
  });
  return NHOM
    .map((n) => ({ ...n, man: duoc.filter((m) => m.nhom === n.ma) }))
    // Mục chỉ còn màn mở-từ-màn-khác ⇒ hiện chúng lại: đó là cửa duy nhất của vai này vào mục.
    .map((n) => (n.man.some((m) => !m.an) ? n
      : { ...n, man: n.man.map((m) => (m.moTuManKhac ? { ...m, an: false } : m)) }))
    // Mục KHÔNG còn màn nào hiện được thì biến mất khỏi thanh bên — một mục bấm vào rồi
    // không thấy gì là một lời mời hụt. Màn ẩn của nó vẫn nằm trong gói để tra vị trí.
    .filter((n) => n.man.some((m) => !m.an));
}

/**
 * Mục đang mở, suy từ đường hiện tại. Menu dùng nó để bung đúng mục và tô dòng đang đứng —
 * không có nó thì người dùng thấy sáu mục đóng và không biết mình đang ở đâu.
 */
export function mucCuaDuong(duong) {
  const d = String(duong || '').replace(/\/$/, '') || '/';
  const man = MAN.find((m) => m.duong === d);
  if (man) return man.nhom;
  // ĐƯỜNG CÓ THAM SỐ (`/page/123`, GD2): khớp theo TIỀN TỐ, chọn màn có đường dài nhất khớp
  // — `/page` không được cướp `/page-bot`. Thiếu nhánh này thì mọi trang chi tiết mở ra là
  // thanh trên cùng không biết mình thuộc mục nào, đúng thứ ca ⑥b canh.
  const khop = MAN.filter((m) => m.duong !== '/' && d.startsWith(`${m.duong}/`))
    .sort((a, b) => b.duong.length - a.duong.length)[0];
  return khop ? khop.nhom : null;
}

export { VAI };
