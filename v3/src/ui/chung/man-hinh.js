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
 *   mỗi sáng → `hom-nay` · `viec-can-xu`
 *   khi cần  → `bot-noi-gi` · `page-san-pham`
 *   cuối kỳ  → `so-lieu`
 *   một lần  → `cai-dat`
 *
 * KHÔNG màn nào bị xoá: 24 màn vẫn còn đủ 24 đường, chỉ đổi chỗ đứng trên menu.
 */
export const NHOM = Object.freeze([
  { ma: 'hom-nay', ten: 'Hôm nay', mo: 'Việc của bạn, gấp lên trước' },
  { ma: 'viec-can-xu', ten: 'Việc cần xử', mo: 'Hội thoại và đơn chờ người' },
  { ma: 'bot-noi-gi', ten: 'Bot nói gì', mo: 'Bộ luật · kỹ năng · kịch bản · ảnh · prompt' },
  { ma: 'nhan-cho-khach', ten: 'Nhắn cho khách', mo: 'Ta chủ động nhắn — hàng loạt, đuổi theo, xin phép' },
  { ma: 'page-san-pham', ten: 'Page & sản phẩm', mo: 'Bật bot, cửa kiểm, kho hàng' },
  { ma: 'so-lieu', ten: 'Số liệu', mo: 'Đơn · tiền · khách · hoàn hàng' },
  { ma: 'cai-dat', ten: 'Cài đặt', mo: 'Team · kết nối · model · nhật ký' },
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
const dat = (m, ten, nhom, moTa = '') => ({
  duong: m.DUONG_TRANG,
  vai: m.VAI_VAO_DUOC,
  ten, nhom, moTa,
});

export const MAN = Object.freeze([
  dat(trangChu, 'Trang chủ', 'hom-nay', 'Việc của vai bạn, gấp lên trước'),

  // Đường DUY NHẤT của vai `sale` — 01 §10: «sale không làm việc trên hệ thống này».
  dat(dispatch, 'Bảng điều phối', 'viec-can-xu', 'Việc cần người xử, có đồng hồ đếm ngược'),

  // Bảy MẶT của một việc. Thứ tự là thứ tự người ta đi: sửa luật chung trước, rồi thu hẹp
  // dần tới từng page, và «Prompt của page» đứng CUỐI vì nó là chỗ KIỂM LẠI sau khi sửa.
  dat(boLuat, 'Bộ luật chung', 'bot-noi-gi', 'Dùng chung mọi page — sửa là cả team đổi'),
  dat(kyNang, 'Thư viện kỹ năng', 'bot-noi-gi', 'Ba phạm vi, đếm page thật sự nhận'),
  dat(kichBan, 'Kịch bản', 'bot-noi-gi', 'Soạn, duyệt, đưa lên LIVE, nhập từ Pancake'),
  dat(aiDeXuat, 'AI đề xuất', 'bot-noi-gi', 'Bản do AI đề xuất — phải duyệt mới áp được'),
  dat(lop0, 'Lớp trả lời 0 đồng', 'bot-noi-gi', 'Mẫu miễn phí — mỗi câu bắt được là 127 đ'),
  dat(thuVienAnh, 'Thư viện ảnh', 'bot-noi-gi', 'Ảnh gắn nhãn theo chủ đề'),
  dat(promptPage, 'Prompt của page', 'bot-noi-gi', 'Xem lại prompt thật sau khi sửa'),

  // Bốn màn cùng trả lời một câu: «page này bán được chưa». Cửa kiểm là BẢNG ĐIỂM, ba màn
  // kia là chỗ sửa cho điểm xanh — nên cửa kiểm đứng đầu.
  dat(sanSang, 'Cửa kiểm sẵn sàng', 'page-san-pham', 'Bảy điều kiện, bấm ô đỏ nhảy tới chỗ sửa'),
  dat(pageBot, 'Page & Bot', 'page-san-pham', 'Công tắc bot, marketer, page trọng điểm'),
  dat(sanPham, 'Sản phẩm & kho', 'page-san-pham', 'Đọc từ nguồn của bot, không từ bảng v3'),
  dat(lenChay, 'Đưa sản phẩm lên chạy', 'page-san-pham', 'Sáu chặng, mỗi chặng một cửa kiểm'),

  // Không màn nào ở đây dùng để RA LỆNH — chúng để ĐỌC. Nhịp khác hẳn bốn mục trên.
  dat(baoCao, 'Báo cáo', 'so-lieu', 'Hai luồng đơn, ba thước — không cộng'),
  dat(chiPhi, 'Chi phí AI', 'so-lieu', 'đ/tin · đ/đơn · page đốt tiền không ra đơn'),
  dat(ruiRo, 'Rủi ro hoàn hàng', 'so-lieu', 'Phân bố tỉ lệ hoàn × số đơn'),
  dat(hoSoKhach, 'Hồ sơ khách hàng', 'so-lieu', 'Gộp theo số điện thoại'),
  dat(nguonKhach, 'Nguồn khách vào', 'so-lieu', 'Hai luồng song song, gặp nhau ở POS'),
  dat(hieuQua, 'Hiệu quả kịch bản', 'so-lieu', 'A/B — chưa đủ mẫu thì nói chưa kết luận'),

  // Vào đúng hai lần: hôm cài đặt, và hôm có sự cố.
  dat(team, 'Cấu hình team', 'cai-dat', 'Thành viên, vai, POS, gán page'),
  dat(ketNoi, 'Kết nối & token', 'cai-dat', 'Kho token Pancake — hạ tầng dùng chung'),
  dat(model, 'Model AI & khoá', 'cai-dat', 'Ba vai model, bảng giá, khoá theo nhà'),
  dat(sucKhoe, 'Sức khoẻ hệ thống', 'cai-dat', 'Chín đèn, tự nạp lại mỗi phút'),
  dat(nhatKy, 'Nhật ký thao tác', 'cai-dat', 'Ai làm gì, lúc nào — tách làn người/máy'),
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
