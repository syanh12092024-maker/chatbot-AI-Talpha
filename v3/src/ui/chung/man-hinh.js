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

/** Nhóm hiển thị. Thứ tự ở đây là thứ tự trên menu. */
export const NHOM = Object.freeze([
  { ma: 'hang-ngay', ten: 'Hằng ngày' },
  { ma: 'noi-dung', ten: 'Nội dung bot' },
  { ma: 'san-pham', ten: 'Sản phẩm' },
  { ma: 'so-lieu', ten: 'Số liệu' },
  { ma: 'he-thong', ten: 'Hệ thống' },
]);

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
  dat(trangChu, 'Trang chủ', 'hang-ngay', 'Việc của vai bạn, gấp lên trước'),
  dat(dispatch, 'Bảng điều phối', 'hang-ngay', 'Việc cần người xử, có đồng hồ đếm ngược'),
  dat(sanSang, 'Cửa kiểm sẵn sàng', 'hang-ngay', 'Bảy điều kiện, bấm ô đỏ nhảy tới chỗ sửa'),
  dat(pageBot, 'Page & Bot', 'hang-ngay', 'Công tắc bot, marketer, page trọng điểm'),

  dat(boLuat, 'Bộ luật chung', 'noi-dung', 'Dùng chung mọi page — sửa là cả team đổi'),
  dat(kyNang, 'Thư viện kỹ năng', 'noi-dung', 'Ba phạm vi, đếm page thật sự nhận'),
  dat(promptPage, 'Prompt của page', 'noi-dung', 'Bốn khối, token từng khối, soi mâu thuẫn'),
  dat(kichBan, 'Kịch bản', 'noi-dung', 'Soạn, duyệt, đưa lên LIVE, nhập từ Pancake'),
  dat(aiDeXuat, 'AI đề xuất', 'noi-dung', 'Bản do AI đề xuất — phải duyệt mới áp được'),
  dat(lop0, 'Lớp trả lời 0 đồng', 'noi-dung', 'Mẫu miễn phí — mỗi câu bắt được là 127 đ'),
  dat(thuVienAnh, 'Thư viện ảnh', 'noi-dung', 'Ảnh gắn nhãn theo chủ đề'),

  dat(sanPham, 'Sản phẩm & kho', 'san-pham', 'Đọc từ Sheet của bot, không từ bảng v3'),
  dat(lenChay, 'Đưa sản phẩm lên chạy', 'san-pham', 'Sáu chặng, mỗi chặng một cửa kiểm'),

  dat(baoCao, 'Báo cáo', 'so-lieu', 'Hai luồng đơn, ba thước — không cộng'),
  dat(chiPhi, 'Chi phí AI', 'so-lieu', 'đ/tin · đ/đơn · page đốt tiền không ra đơn'),
  dat(ruiRo, 'Rủi ro hoàn hàng', 'so-lieu', 'Phân bố tỉ lệ hoàn × số đơn'),
  dat(hoSoKhach, 'Hồ sơ khách hàng', 'so-lieu', 'Gộp theo số điện thoại'),
  dat(nguonKhach, 'Nguồn khách vào', 'so-lieu', 'Hai luồng song song, gặp nhau ở POS'),
  dat(hieuQua, 'Hiệu quả kịch bản', 'so-lieu', 'A/B — chưa đủ mẫu thì nói chưa kết luận'),

  dat(team, 'Cấu hình team', 'he-thong', 'Thành viên, vai, POS, gán page'),
  dat(ketNoi, 'Kết nối & token', 'he-thong', 'Kho token Pancake — hạ tầng dùng chung'),
  dat(model, 'Model AI & khoá', 'he-thong', 'Ba vai model, bảng giá, khoá theo nhà'),
  dat(sucKhoe, 'Sức khoẻ hệ thống', 'he-thong', 'Chín đèn, tự nạp lại mỗi phút'),
  dat(nhatKy, 'Nhật ký thao tác', 'he-thong', 'Ai làm gì, lúc nào — tách làn người/máy'),
]);

/** Menu của MỘT người — lọc theo vai ở máy chủ, không ẩn bằng CSS. */
export function menuCua(vai = []) {
  const cua = new Set((Array.isArray(vai) ? vai : [vai]).map(String));
  const duoc = MAN.filter((m) => (m.vai || []).some((v) => cua.has(String(v))));
  return NHOM
    .map((n) => ({ ...n, man: duoc.filter((m) => m.nhom === n.ma) }))
    .filter((n) => n.man.length);
}

export { VAI };
