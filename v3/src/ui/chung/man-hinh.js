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
  // ═══ BẢN GD6 · 25/09/2026 — mục đặt theo NHỊP MỞ MÁY, không theo tầng dữ liệu ═════════
  // Lượt 14/09 đặt tên mục theo bản đặc tả (Tổng quan · Vận hành · AI Bot · Phân tích ·
  // Quản trị). Đo lại 22/09 thì người dùng vẫn than y như cũ, vì bệnh không nằm ở tên mục:
  // cùng một việc («cho một page chạy được») vẫn rải ở ba mục khác nhau, và sáu màn chưa có
  // dữ liệu vẫn đứng ngang hàng với màn mở hằng ngày.
  //
  // Nay mục trả lời đúng câu người dùng mang tới, theo nhịp họ mở máy:
  //   mỗi sáng        → `hom-nay`
  //   khi thêm/sửa page → `page-bot`
  //   khi sửa cách bot nói → `day-bot`
  //   cuối kỳ         → `so-lieu`
  //   hôm cài đặt, hôm có sự cố → `cai-dat`
  //
  // ⚠️ KHÔNG màn nào bị xoá và KHÔNG đường nào đổi. Bảy màn chưa dùng được (chưa có dữ liệu,
  //    hoặc chưa có cửa ghi) mang cờ `thuNghiem` — ra khỏi menu, đường dẫn vẫn mở được.
  { ma: 'hom-nay', ten: 'Hôm nay', bieuTuong: 'inbox',
    mo: 'Việc cần người làm hôm nay: khách đang chờ, đơn chờ duyệt' },
  { ma: 'page-bot', ten: 'Page & bot', bieuTuong: 'bot',
    mo: 'Thêm hoặc sửa một page, và bật bot cho nó' },
  { ma: 'day-bot', ten: 'Dạy bot', bieuTuong: 'pencil',
    mo: 'Sửa cách bot nói: kịch bản, quy tắc, câu trả lời sẵn' },
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
const dat = (m, ten, nhom, moTa = '', itDung = false, thuNghiem = false, canId = false) => ({
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
  // `itDung` KHÔNG đổi quyền và KHÔNG bỏ màn khỏi menu — màn vẫn nằm trong mục của nó,
  // vẫn bấm tới được, bài ④b vẫn xanh. Nó chỉ nói với thanh bên: xếp xuống dưới một vạch
  // «Ít dùng», và đừng chìa lên thanh tab ngang. Mục «Cài đặt» có 13 màn; để cả 13 ngang
  // hàng nhau là bắt người dùng đọc 13 dòng mỗi lần tìm một thứ họ dùng hằng tuần.
  itDung,
});

export const MAN = Object.freeze([
  // ĐƯỜNG DẪN KHÔNG ĐỔI — đổi đường là làm chết mọi liên kết đã lưu. Chỉ đổi CHỖ NGỒI.

  // ① HÔM NAY — mở mỗi sáng. Mục DUY NHẤT vai `sale` thấy (01 §10).
  dat(trangChu, 'Việc của tôi', 'hom-nay', 'Lọc theo vai bạn, gấp lên trước'),
  dat(dispatch, 'Việc đang chờ', 'hom-nay', 'Khách bot đã giao lại, có đồng hồ đếm ngược'),
  dat(vanHanh, 'Hội thoại và đơn', 'hom-nay', 'Bot nói gì với khách, và đơn chờ duyệt'),

  // ② PAGE & BOT — thêm hoặc sửa một page rồi bật. «Bắt đầu» đứng đầu: lối cho người mới.
  // GD2 · 25/09 — «Bắt đầu» và «Page còn thiếu gì» RA KHỎI MENU: cả hai nay chuyển hướng về
  // danh sách page. Không xoá đường dẫn, chỉ thôi quảng cáo chúng như hai màn riêng, vì ba
  // dòng menu cho một câu hỏi là đúng thứ khiến người ta ghé 7 màn để cài một page.
  dat(pageBot, 'Tất cả page', 'page-bot', 'Một dòng một page: bot nào, bật hay tắt, còn thiếu gì'),
  // Trang của MỘT page: mở từ danh sách, không đứng riêng trên menu — nhưng vẫn khai ở đây
  // để thanh trên cùng tra được «tôi đang ở mục nào» (án lệ GD6 ⑥b). Cờ `canId` nói đúng
  // lý do ẩn: màn DÙNG ĐƯỢC, chỉ là không mở được nếu thiếu tham số.
  dat(motPage, 'Trang một page', 'page-bot', 'Một page: tình trạng, công tắc, việc làm tiếp', false, false, true),
  dat(sanPham, 'Sản phẩm & kho', 'page-bot', 'Bot đang chào bán gì, còn hàng không', true),
  dat(lenChay, 'Đưa sản phẩm lên chạy', 'page-bot', 'Sáu chặng, mỗi chặng một cửa kiểm', true, true),

  // ③ DẠY BOT — sửa cách bot nói.
  dat(kichBan, 'Kịch bản của page', 'day-bot', 'Lời bot nói riêng trên từng page'),
  dat(boLuat, 'Quy tắc chung mọi page', 'day-bot', 'Sửa là cả team đổi cách nói'),
  dat(lop0, 'Câu trả lời sẵn', 'day-bot', 'Trả theo từ khoá, không tốn tiền'),
  dat(kyNang, 'Kỹ năng theo sản phẩm', 'day-bot', 'Bật theo nhóm sản phẩm'),
  dat(promptPage, 'Đoạn chữ gửi cho AI', 'day-bot', 'Xem đúng thứ AI đang đọc', true),
  dat(thuVienAnh, 'Ảnh gửi khách', 'day-bot', 'Ảnh gắn nhãn theo chủ đề', true, true),
  dat(aiDeXuat, 'Gợi ý từ AI', 'day-bot', 'Phải duyệt mới áp được', true, true),
  dat(hieuQua, 'So hai bản kịch bản', 'day-bot', 'Chưa đủ mẫu thì nói chưa kết luận', true, true),

  // ④ SỐ LIỆU — để ĐỌC, không để ra lệnh.
  dat(baoCao, 'Đơn và tỉ lệ chốt', 'so-lieu', 'Tách hai luồng, không gộp một tổng'),
  dat(chiPhi, 'Chi phí AI', 'so-lieu', 'Tiền model theo page'),
  dat(nguonKhach, 'Khách vào từ đâu', 'so-lieu', 'Hai luồng đơn và chỗ khách rơi', true, true),
  dat(ruiRo, 'Rủi ro hoàn hàng', 'so-lieu', 'Bốn tầng, đọc cột đã chấm sẵn', true, true),
  dat(hoSoKhach, 'Khách hàng', 'so-lieu', 'Gộp ba kênh theo số điện thoại', true, true),

  // ⑤ CÀI ĐẶT — vào đúng hai lần: hôm cài đặt, và hôm có sự cố.
  // GD3 · 25/09: màn ĐẦU TIÊN của mục Cài đặt — người mới mở nó để biết còn thiếu việc gì,
  // thay vì tự dò 12 bước trên 7 màn.
  dat(caiDatTeam, 'Cài đặt team', 'cai-dat', 'Năm việc làm một lần, và việc nào còn thiếu'),
  dat(team, 'Người và team', 'cai-dat', 'Thành viên, vai, gán page'),
  dat(ketNoi, 'Kết nối', 'cai-dat', 'Tài khoản Pancake và kho hàng'),
  dat(model, 'Model AI & khoá', 'cai-dat', 'Nhà model, khoá, bảng giá'),
  dat(sucKhoe, 'Hệ còn sống không', 'cai-dat', 'Chín đèn'),
  dat(nhatKy, 'Ai đã sửa gì', 'cai-dat', 'Không sửa được, không xoá được'),
]);

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
  const duoc = MAN.filter((m) => (m.vai || []).some((v) => cua.has(String(v))))
    .map((m) => ({ ...m, an: !!m.thuNghiem || !!m.canId }));
  return NHOM
    .map((n) => ({ ...n, man: duoc.filter((m) => m.nhom === n.ma) }))
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
