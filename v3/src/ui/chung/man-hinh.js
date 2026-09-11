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
  { ma: 'viec', ten: 'Việc', mo: 'Hội thoại và đơn đang chờ người' },
  { ma: 'page', ten: 'Page', mo: 'Bật bot, xem còn thiếu gì, sửa lời bot' },
  { ma: 'so-lieu', ten: 'Số liệu', mo: 'Khách, đơn, tiền — một khoảng ngày cho tất cả' },
  { ma: 'cai-dat', ten: 'Cài đặt', mo: 'Kết nối, model, người — và màn ít dùng' },
  { ma: 'nhan-cho-khach', ten: 'Nhắn cho khách', mo: 'Ta chủ động nhắn — hàng loạt, đuổi theo, xin phép' },
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
  // ① VIỆC — mở mỗi sáng. Đây là mục DUY NHẤT vai `sale` thấy (01 §10), nên không màn
  //    nào khác trong mục này được mở cho `sale`.
  dat(dispatch, 'Bảng điều phối', 'viec', 'Việc chờ người, có đồng hồ đếm ngược'),
  dat(trangChu, 'Trang chủ', 'viec', 'Việc của vai bạn, gấp lên trước'),
  dat(hoSoKhach, 'Hồ sơ khách hàng', 'viec', 'Gộp ba kênh theo số điện thoại'),
  dat(sucKhoe, 'Sức khoẻ hệ thống', 'viec', 'Chín đèn — hệ còn sống không'),

  // ② PAGE — «page này bán được chưa, và bot nói gì trên đó».
  dat(pageBot, 'Page & Bot', 'page', 'Công tắc bot, người phụ trách'),
  dat(sanSang, 'Cửa kiểm sẵn sàng', 'page', 'Page còn thiếu gì mới bật được bot'),
  dat(kichBan, 'Kịch bản', 'page', 'Lời bot nói riêng trên từng page'),
  dat(sanPham, 'Sản phẩm & kho', 'page', 'Đọc từ POS, không gõ tay'),

  // ③ SỐ LIỆU — để ĐỌC, không để ra lệnh. Cùng một khoảng ngày cho cả mục.
  dat(baoCao, 'Báo cáo', 'so-lieu', 'Đơn và tỉ lệ chốt, tách hai luồng'),
  dat(chiPhi, 'Chi phí AI', 'so-lieu', 'Tiền model theo page'),
  dat(nguonKhach, 'Nguồn khách vào', 'so-lieu', 'Hai luồng đơn và chỗ khách rơi'),

  // ④ CÀI ĐẶT — vào đúng hai lần: hôm cài đặt, và hôm có sự cố.
  dat(team, 'Cấu hình team', 'cai-dat', 'Thành viên, vai, gán page'),
  dat(ketNoi, 'Kết nối & token', 'cai-dat', 'Pancake, POS, WhatsApp, Botcake'),
  dat(model, 'Model AI & khoá', 'cai-dat', 'Nhà model, khoá, bảng giá'),
  dat(nhatKy, 'Nhật ký thao tác', 'cai-dat', 'Ai làm gì — không sửa, không xoá'),

  // ⑤ CÙNG MỤC CÀI ĐẶT, phần «ít dùng». Chín màn này chưa có dữ liệu để hiện, hoặc đang
  //    tắt trên máy chủ, hoặc một năm dùng một lần — để chúng ngang hàng với bốn màn trên
  //    là bắt người dùng đọc mười ba dòng mỗi lần tìm một thứ. KHÔNG màn nào bị xoá:
  //    đường dẫn còn nguyên, và chúng vẫn nằm trong menu nên không ai vào rồi kẹt.
  dat(boLuat, 'Quy tắc chung của bot', 'cai-dat', 'Dùng chung mọi page — sửa là cả team đổi', true),
  dat(kyNang, 'Thư viện kỹ năng', 'cai-dat', 'Bật theo nhóm sản phẩm', true),
  dat(promptPage, 'Prompt thật của page', 'cai-dat', 'Xem lại đoạn chữ đang gửi cho model', true),
  dat(lop0, 'Trả lời sẵn theo từ khoá', 'cai-dat', 'Câu miễn phí — đang tắt trên máy chủ', true),
  dat(thuVienAnh, 'Thư viện ảnh', 'cai-dat', 'Ảnh gắn nhãn theo chủ đề', true),
  dat(aiDeXuat, 'Gợi ý từ AI', 'cai-dat', 'Phải duyệt mới áp được', true),
  dat(hieuQua, 'So hai bản kịch bản', 'cai-dat', 'Chưa đủ mẫu thì nói chưa kết luận', true),
  dat(lenChay, 'Đưa sản phẩm lên chạy', 'cai-dat', 'Sáu chặng, mỗi chặng một cửa kiểm', true),
  dat(ruiRo, 'Rủi ro hoàn hàng', 'cai-dat', 'Bốn tầng, đọc cột đã chấm sẵn', true),
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
