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

import * as dispatch from '../dispatch/index.js';
import * as team from '../team/index.js';
import * as pageBot from '../page-bot/index.js';
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
  // ═══ BỐ CỤC THEO MỤC F1 CỦA BẢN ĐẶC TẢ (14/09/2026, lượt 3) ════════════════════════
  // Lượt 2 đặt nhóm theo NĂM VIỆC chủ dự án kể («Bot nói gì với khách · Việc cần người
  // làm · Bật bot cho page · Dạy bot nói gì · Tốn bao nhiêu tiền»). Bản đặc tả của chủ dự
  // án sau đó đề xuất năm nhóm gọn hơn. Hai cách chia KHỚP NHAU — chỉ khác nhãn:
  //     Vận hành   ≈ việc cần người làm (+ xem bot nói gì, khi có màn Hội thoại)
  //     AI Bot     ≈ bật bot cho page + dạy bot nói gì
  //     Phân tích  ≈ tốn bao nhiêu tiền
  //     Quản trị   ≈ màn khác
  //     Tổng quan  = MỚI: «cái gì cần để ý ngay» đứng đầu (mục M1)
  // Lời của năm việc giữ lại trong câu mô tả `mo` — hiện khi trỏ chuột vào nhóm.
  // TÊN MÀN không đổi lượt này: chúng đã là lời người dùng, và HK10 neo chúng với <h1>.
  //
  // `bieuTuong` = tên một biểu tượng trong bộ Lucide nhúng ở `dieu-huong.js` (mục Q:
  // MỘT bộ biểu tượng cho cả sản phẩm, không trộn emoji).
  { ma: 'tong-quan', ten: 'Tổng quan', bieuTuong: 'layout-dashboard',
    mo: 'Cái gì cần để ý ngay, và hệ còn chạy không' },
  // ⚠️ «Hội thoại» — việc chủ dự án xếp SỐ MỘT — sẽ nằm ở nhóm này. CHƯA có màn: v3 chưa
  //    từng có màn đọc lại hội thoại. Dữ liệu đã đủ (tin khách + câu bot đáp + tiền từng
  //    lượt), chỉ chưa dựng. Đừng để nó trôi.
  { ma: 'van-hanh', ten: 'Vận hành', bieuTuong: 'inbox',
    mo: 'Việc cần người làm: việc chờ, khách hàng' },
  { ma: 'ai-bot', ten: 'AI Bot', bieuTuong: 'bot',
    mo: 'Bật bot cho page, dạy bot nói gì' },
  { ma: 'phan-tich', ten: 'Phân tích', bieuTuong: 'chart-no-axes-column',
    mo: 'Tốn bao nhiêu tiền, ra bao nhiêu đơn' },
  { ma: 'quan-tri', ten: 'Quản trị', bieuTuong: 'settings',
    mo: 'Người, kết nối, model, nhật ký — mở lúc cài đặt hoặc lúc sự cố' },
  // Nhóm dự trù của lượt trước (giai đoạn 3 — nhắn chủ động cho khách). Tôi KHÔNG xoá lộ
  // trình của người khác trong một lượt sắp lại menu. Rỗng nên `menuCua` tự ẩn.
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
const dat = (m, ten, nhom, moTa = '', itDung = false) => ({
  duong: m.DUONG_TRANG,
  vai: m.VAI_VAO_DUOC,
  ten, nhom, moTa,
  // `itDung` KHÔNG đổi quyền và KHÔNG bỏ màn khỏi menu — màn vẫn nằm trong mục của nó,
  // vẫn bấm tới được, bài ④b vẫn xanh. Nó chỉ nói với thanh bên: xếp xuống dưới một vạch
  // «Ít dùng», và đừng chìa lên thanh tab ngang. Mục «Cài đặt» có 13 màn; để cả 13 ngang
  // hàng nhau là bắt người dùng đọc 13 dòng mỗi lần tìm một thứ họ dùng hằng tuần.
  itDung,
});

export const MAN = Object.freeze([
  // ĐƯỜNG DẪN KHÔNG ĐỔI — đổi đường là làm chết mọi liên kết đã lưu. Chỉ đổi CHỖ NGỒI.

  // ① TỔNG QUAN — mở đầu ngày: cái gì cần để ý, hệ còn sống không.
  dat(trangChu, 'Việc của tôi', 'tong-quan', 'Lọc theo vai bạn, gấp lên trước'),
  dat(sucKhoe, 'Hệ còn sống không', 'tong-quan', 'Chín đèn'),

  // ② VẬN HÀNH — việc cần người. Mục DUY NHẤT vai `sale` thấy (01 §10).
  dat(dispatch, 'Việc đang chờ', 'van-hanh', 'Có đồng hồ đếm ngược từng việc'),
  dat(hoSoKhach, 'Khách hàng', 'van-hanh', 'Gộp ba kênh theo số điện thoại'),

  // ③ AI BOT — bật bot cho page, và dạy bot nói gì. «Bắt đầu» đứng đầu: lối cho người mới.
  dat(batDau, 'Bắt đầu', 'ai-bot', 'Bốn việc để một page chạy được, rồi bật'),
  dat(pageBot, 'Công tắc từng page', 'ai-bot', 'Bật tắt, người phụ trách'),
  dat(sanSang, 'Page còn thiếu gì', 'ai-bot', 'Bảy điều kiện, xem cả đội một lượt'),
  dat(kichBan, 'Kịch bản của page', 'ai-bot', 'Lời bot nói riêng trên từng page'),
  dat(boLuat, 'Quy tắc chung mọi page', 'ai-bot', 'Sửa là cả team đổi cách nói'),
  dat(lop0, 'Câu trả lời sẵn', 'ai-bot', 'Trả theo từ khoá, không tốn tiền'),
  dat(kyNang, 'Kỹ năng theo sản phẩm', 'ai-bot', 'Bật theo nhóm sản phẩm'),
  dat(promptPage, 'Đoạn chữ gửi cho AI', 'ai-bot', 'Xem đúng thứ model đang đọc', true),
  dat(thuVienAnh, 'Ảnh gửi khách', 'ai-bot', 'Ảnh gắn nhãn theo chủ đề', true),
  dat(aiDeXuat, 'Gợi ý từ AI', 'ai-bot', 'Phải duyệt mới áp được', true),
  dat(hieuQua, 'So hai bản kịch bản', 'ai-bot', 'Chưa đủ mẫu thì nói chưa kết luận', true),

  // ④ PHÂN TÍCH — để ĐỌC, không để ra lệnh.
  dat(chiPhi, 'Chi phí AI', 'phan-tich', 'Tiền model theo page'),
  dat(baoCao, 'Đơn và tỉ lệ chốt', 'phan-tich', 'Tách hai luồng, không gộp một tổng'),
  dat(nguonKhach, 'Khách vào từ đâu', 'phan-tich', 'Hai luồng đơn và chỗ khách rơi'),
  dat(ruiRo, 'Rủi ro hoàn hàng', 'phan-tich', 'Bốn tầng, đọc cột đã chấm sẵn', true),

  // ⑤ QUẢN TRỊ — vào đúng hai lần: hôm cài đặt, và hôm có sự cố.
  dat(team, 'Người và team', 'quan-tri', 'Thành viên, vai, gán page'),
  dat(ketNoi, 'Kết nối & token', 'quan-tri', 'Pancake, POS, WhatsApp, Botcake'),
  dat(model, 'Model AI & khoá', 'quan-tri', 'Nhà model, khoá, bảng giá'),
  dat(nhatKy, 'Ai đã sửa gì', 'quan-tri', 'Không sửa được, không xoá được'),
  dat(sanPham, 'Sản phẩm & kho', 'quan-tri', 'Đọc từ POS, không gõ tay', true),
  dat(lenChay, 'Đưa sản phẩm lên chạy', 'quan-tri', 'Sáu chặng, mỗi chặng một cửa kiểm', true),
]);

/**
 * Menu của MỘT người — lọc theo vai ở máy chủ, không ẩn bằng CSS.
 *
 * Mục nào không còn màn nào vai đó vào được thì BIẾN MẤT, không hiện rỗng: một mục trống
 * là một lời mời bấm vào rồi không có gì. Vai `sale` vì thế chỉ còn đúng một mục.
 */
export function menuCua(vai = []) {
  const cua = new Set((Array.isArray(vai) ? vai : [vai]).map(String));
  const duoc = MAN.filter((m) => (m.vai || []).some((v) => cua.has(String(v))));
  return NHOM
    .map((n) => ({ ...n, man: duoc.filter((m) => m.nhom === n.ma) }))
    .filter((n) => n.man.length);
}

/**
 * Mục đang mở, suy từ đường hiện tại. Menu dùng nó để bung đúng mục và tô dòng đang đứng —
 * không có nó thì người dùng thấy sáu mục đóng và không biết mình đang ở đâu.
 */
export function mucCuaDuong(duong) {
  const d = String(duong || '').replace(/\/$/, '') || '/';
  const man = MAN.find((m) => m.duong === d);
  return man ? man.nhom : null;
}

export { VAI };
