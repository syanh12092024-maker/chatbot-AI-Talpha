// NỐI DÂY PHẦN RÌA (vai B) — một lời gọi thay cho mười hai.
//
// Bốn module của vai B cố ý KHÔNG import lẫn nhau: nhật ký, chặn đăng nhập, chặn vai, phễu
// Sổ AI đều đi qua hàm tiêm. Nhờ vậy chúng code song song được mà không đụng nhau. Cái giá
// là ai dựng ứng dụng cũng phải nhớ nối mười hai chỗ, đúng thứ tự. File này trả cái giá đó
// một lần, ở một chỗ.
//
// HAI CÁI BẪY FILE NÀY SINH RA ĐỂ BỊT — cả hai đều đã dính thật khi chạy thử 22/08/2026:
//
//   ① THỨ TỰ. `lopBoiCanh()` phải đứng TRƯỚC router đăng nhập. Đặt sau thì `/api/toi` không
//      đọc được vé, màn chọn team bị đá ngược về đăng nhập — người thuộc nhiều team không
//      bao giờ vào được, mà không có một dòng lỗi nào.
//
//   ② HÌNH DẠNG CHẮN. Bảng điều phối nhận HÀM DỰNG cái chắn, không phải cái chắn đã dựng.
//      Truyền nhầm thì nổ `Cannot read properties of undefined (reading 'boiCanh')` giữa
//      lúc có khách bấm, kèm nguyên stack trace phun ra trình duyệt.
//
// Người A chỉ cần giao ba thứ và gọi một hàm — xem `v3/docs/hop-dong-b-voi-a.md` mục 8.

import {
  datCongDanhTinh, datPheuNhatKy as datPheuNhatKyAuth, taoRouterAuth,
  lopBoiCanh, batBuocDangNhap, batBuocVaiHTTP, chanTeamTrenUrl,
} from './auth/index.js';
import { datTaoTruyVan as datTruyVanNhatKy, datPheuNhatKy as datPheuRaNgoai, ghiNhatKy, docNhatKy } from './audit/index.js';
import { moTa as moTaHanhDong, NHOM as NHOM_HANH_DONG } from './audit/hanh-dong.js';
import {
  datTaoTruyVan as datTruyVanModel, datPheuSoAi, datPheuNhatKy as datPheuNhatKyModel,
  datPheuCanhBao, datKhoKhoa,
} from './model/index.js';
import {
  datTaoTruyVan as datTruyVanDieuPhoi, datPheuNhatKy as datPheuNhatKyDieuPhoi,
  datChanDangNhap, datChanVai, taoRouterDieuPhoi,
} from './ui/dispatch/index.js';
import {
  datTaoTruyVan as datTruyVanTeam, datCongDanhTinh as datDanhTinhTeam,
  datCongDanhTinhGhi as datDanhTinhTeamGhi, datPheuNhatKy as datPheuNhatKyTeam,
  datDocKetNoiPos, datChanDangNhap as datChanDangNhapTeam, datChanVai as datChanVaiTeam,
  taoRouterCauHinhTeam, datChuyenPage,
} from './ui/team/index.js';
import {
  datTaoTruyVan as datTruyVanPageBot, datPheuNhatKy as datPheuNhatKyPageBot,
  datChanDangNhap as datChanDangNhapPageBot, datChanVai as datChanVaiPageBot,
  taoRouterPageBot,
} from './ui/page-bot/index.js';
import { khoToken } from './ui/ket-noi/index.js';
import { trangThaiCau as trangThaiCauBot } from './noi-day/cau-bot-v1.js';
import {
  datDocKetNoiPos as datDocKetNoiPosKN, datPheuNhatKy as datPheuNhatKyKetNoi,
  datChanDangNhap as datChanDangNhapKetNoi, datChanVai as datChanVaiKetNoi,
  taoRouterKetNoi,
} from './ui/ket-noi/index.js';
import {
  datChanDangNhap as datChanDangNhapModel, datChanVai as datChanVaiModel, taoRouterModel,
} from './ui/model/index.js';
import {
  datTaoTruyVan as datTruyVanBoLuat, datPheuNhatKy as datPheuNhatKyBoLuat,
  datChanDangNhap as datChanDangNhapBoLuat, datChanVai as datChanVaiBoLuat, taoRouterBoLuat,
  datCuaBoLuat, manBoLuat,
} from './ui/bo-luat/index.js';
import { taoRouterDieuHuong } from './ui/chung/router-dieu-huong.js';
import { sanSangToanHe, danhSachPageKemSanPham, sanPhamCuaPage, chiPhiToanHe, donHangToanHe, pheuHoiThoai } from './noi-day/cau-bot-v1.js';
import {
  datTaoTruyVan as datTruyVanHieuQua, datDocHieuQua,
  datChanDangNhap as datChanDangNhapHieuQua, datChanVai as datChanVaiHieuQua, taoRouterHieuQua,
} from './ui/hieu-qua/index.js';
import {
  datTaoTruyVan as datTruyVanLop0, datPheuNhatKy as datPheuNhatKyLop0,
  datChanDangNhap as datChanDangNhapLop0, datChanVai as datChanVaiLop0, taoRouterLop0,
} from './ui/lop-0-dong/index.js';
import {
  datTaoTruyVan as datTruyVanNguon, datDocPheu,
  datChanDangNhap as datChanDangNhapNguon, datChanVai as datChanVaiNguon, taoRouterNguon,
} from './ui/nguon-khach/index.js';
import {
  datTaoTruyVan as datTruyVanKhach,
  datChanDangNhap as datChanDangNhapKhach, datChanVai as datChanVaiKhach, taoRouterKhach,
} from './ui/ho-so-khach/index.js';
import {
  datTaoTruyVan as datTruyVanRuiRo, datDocPhanBo as datDocPhanBoRuiRo,
  datChanDangNhap as datChanDangNhapRuiRo, datChanVai as datChanVaiRuiRo, taoRouterRuiRo,
} from './ui/rui-ro-hoan/index.js';
import {
  datTaoTruyVan as datTruyVanBaoCao, datDocDon, datDocChiPhi as datDocChiPhiChoBaoCao,
  datDocHaiLuong,
  datChanDangNhap as datChanDangNhapBaoCao, datChanVai as datChanVaiBaoCao, taoRouterBaoCao,
} from './ui/bao-cao/index.js';
import {
  datTaoTruyVan as datTruyVanChiPhi, datDocChiPhiBot, datDocSoAi,
  datChanDangNhap as datChanDangNhapChiPhi, datChanVai as datChanVaiChiPhi, taoRouterChiPhi,
} from './ui/chi-phi/index.js';
import {
  datTaoTruyVan as datTruyVanLenChay, datDocSanSang as datDocSanSangLenChay,
  datDocMotPage as datDocMotPageLenChay,
  datChanDangNhap as datChanDangNhapLenChay, datChanVai as datChanVaiLenChay, taoRouterLenChay,
} from './ui/len-chay/index.js';
import {
  datTaoTruyVan as datTruyVanAnh, datDocKhoSanPham as datDocKhoAnh,
  datChanDangNhap as datChanDangNhapAnh, datChanVai as datChanVaiAnh, taoRouterAnh,
} from './ui/thu-vien-anh/index.js';
import {
  datTaoTruyVan as datTruyVanSanPham, datDocKhoSanPham,
  datChanDangNhap as datChanDangNhapSanPham, datChanVai as datChanVaiSanPham, taoRouterSanPham,
} from './ui/san-pham/index.js';
import {
  datTaoTruyVan as datTruyVanTrangChu, datDocSanSang as datDocSanSangTrangChu,
  datChanDangNhap as datChanDangNhapTrangChu, datChanVai as datChanVaiTrangChu, taoRouterTrangChu,
} from './ui/trang-chu/index.js';
import {
  datTaoTruyVan as datTruyVanSanSang, datDocSanSang,
  datChanDangNhap as datChanDangNhapSanSang, datChanVai as datChanVaiSanSang, taoRouterSanSang,
} from './ui/san-sang/index.js';
import {
  datDocBoLuat as datDocBoLuatChoDeXuat, datCuaBoLuat as datCuaBoLuatChoDeXuat,
  datChanDangNhap as datChanDangNhapDeXuat, datChanVai as datChanVaiDeXuat, taoRouterDeXuat,
} from './ui/ai-de-xuat/index.js';
import {
  datTaoTruyVan as datTruyVanKyNang, datPheuNhatKy as datPheuNhatKyKyNang,
  datChanDangNhap as datChanDangNhapKyNang, datChanVai as datChanVaiKyNang, taoRouterKyNang,
} from './ui/ky-nang/index.js';
import {
  datTaoTruyVan as datTruyVanPrompt, datDocKhoi, datDocHieuLuc,
  datChanDangNhap as datChanDangNhapPrompt, datChanVai as datChanVaiPrompt, taoRouterPromptPage,
} from './ui/prompt-page/index.js';
import {
  datDocNhatKy, datDanhMuc,
  datChanDangNhap as datChanDangNhapNhatKy, datChanVai as datChanVaiNhatKy, taoRouterNhatKy,
} from './ui/nhat-ky/index.js';
import {
  datTaoTruyVan as datTruyVanSucKhoe, datDocKhoToken, datTrangThaiCauBot, datDocSanSang as datDocSanSangSucKhoe,
  datChanDangNhap as datChanDangNhapSucKhoe, datChanVai as datChanVaiSucKhoe, taoRouterSucKhoe,
} from './ui/suc-khoe/index.js';
import {
  datTaoTruyVan as datTruyVanKichBan, datPheuNhatKy as datPheuNhatKyKichBan,
  datDungBanMay, datDayLenBot, datBocPancake,
  datChanDangNhap as datChanDangNhapKichBan, datChanVai as datChanVaiKichBan, taoRouterKichBan,
} from './ui/kich-ban/index.js';

/**
 * Nối toàn bộ phần rìa vào một ứng dụng Express.
 *
 * @param {import('express').Express} app
 * @param {object} phuThuoc
 * @param {(boiCanh:object)=>object} phuThuoc.taoTruyVan        BẮT BUỘC · người A giao. Cổng có chèn điều kiện team.
 * @param {()=>object}               phuThuoc.taoTruyVanHeThong BẮT BUỘC · người A giao. Cổng KHÔNG gắn team,
 *                                                              chỉ cho bốn bảng dùng chung — xem `auth/kho-nguoi-dung.js`.
 * @param {{taoBan:Function,ap:Function,duyet:Function,xemAnhHuong?:Function}} [phuThuoc.cuaBoLuat]
 *                                                              cửa GHI có giao dịch cho bộ luật chung (người A
 *                                                              giao: `src/db/noi-dung.js`). `xemAnhHuong` là
 *                                                              phép đếm page-bị-ảnh-hưởng hỏi NGUỒN THẬT.
 * @param {()=>Promise<{pages:Array}>} [phuThuoc.docSanSang]    bộ đọc cửa kiểm sẵn sàng. Bỏ trống → dùng cầu
 *                                                              THẬT sang tiến trình bot. Máy chủ dữ liệu giả
 *                                                              PHẢI truyền bản giả, nếu không trang demo sẽ
 *                                                              hiện tình trạng page thật của khách.
 *                                                              Thiếu thì màn Bộ luật TỪ CHỐI ghi — ghi bằng
 *                                                              hai lời gọi rời là bỏ mất giao dịch và luật §9.
 * @param {(cfg:object)=>string}    [phuThuoc.dungBanMay]      dựng BẢN CHO MÁY từ bản người
 *                                                              (người A giao: `db/di-tru/nguon.js#dungBanChoMay`).
 *                                                              Thiếu thì màn soạn kịch bản TỪ CHỐI lưu.
 * @param {(pageId:string,cfg:object)=>Promise} [phuThuoc.dayKichBanLenBot] đưa một bản lên LIVE ở tiến trình bot.
 * @param {(b64:string)=>Promise<object>} [phuThuoc.bocPancake]  bóc file kịch bản Pancake thành bản nháp.
 * @param {{boLuat:Function,kyNang:Function,kichBan:Function,sanPham:Function}} [phuThuoc.docKhoi]
 *                                                              bốn bộ đọc khối prompt (người A giao:
 *                                                              `src/chat/rap-prompt.js`). Thiếu thì màn
 *                                                              «Prompt của page» nói rõ là lỗi cấu hình.
 * @param {{coKhoa:Function,docKhoa:Function,ghiKhoa:Function}} [phuThuoc.khoKhoa] kho khoá API theo (team × nhà)
 *                                                              (người A giao: `db/khoa.js`, bảng `khoa_nha`).
 *                                                              Thiếu thì lớp model chỉ đọc được khoá từ biến môi trường.
 * @param {(bc:object,t:object)=>Promise<object>} [phuThuoc.chuyenPage] chuyển một page sang team khác, kèm toàn bộ con
 *                                                              (người A giao: `src/db/chuyen-team.js#chuyenPageSangTeam`).
 *                                                              Thiếu thì lát «gán page ↔ team» hiện MỜ kèm lý do.
 * @param {(bc:object)=>Promise<Array>} [phuThuoc.docKetNoiPos]   đọc kết nối POS của một team, KHÔNG giải mã khoá
 *                                                              (người A giao: `src/pos/ket-noi.js#lietKeThiTruong`).
 *                                                              Thiếu thì màn cấu hình team nói «chưa nối bộ đọc»,
 *                                                              KHÔNG nói «không có kết nối nào».
 * @param {(ban:object)=>void}      [phuThuoc.ghiSoAi]          người A giao. Thiếu thì lớp model kêu mỗi 100 lượt.
 * @param {(canh:object)=>void}     [phuThuoc.canhBao]          nơi nhận cảnh báo chuyển dự phòng (Telegram, log…).
 * @param {express}                 [phuThuoc.express]          để tự gắn `express.json()` nếu app chưa có.
 * @returns {{daNoi:string[], thieu:string[]}}
 */
export function dungPhanB(app, { taoTruyVan, taoTruyVanHeThong, docKetNoiPos, chuyenPage, khoKhoa,
  docKhoi, dungBanMay, dayKichBanLenBot, bocPancake, cuaBoLuat, docSanSang, khoSanPham,
  docChiPhi, docSoAiV3, docDonHang, docHaiLuong, docPheu, docHieuQua, docHieuLucPrompt,
  docPhanBoHoan,
  ghiSoAi, canhBao, express } = {}) {
  if (!app || typeof app.use !== 'function') {
    throw new TypeError('dungPhanB: tham số đầu phải là một ứng dụng Express.');
  }
  // Ném ngay tại đây, không để trôi xuống lúc có khách bấm. Cổng dữ liệu thiếu thì mọi thứ
  // phía sau đều hỏng, mà hỏng lúc chạy thì thông điệp không nói được là thiếu cái gì.
  if (typeof taoTruyVan !== 'function') {
    throw new TypeError('dungPhanB: thiếu `taoTruyVan(boiCanh)` — cổng truy vấn của người A (hợp đồng mục 3).');
  }
  if (typeof taoTruyVanHeThong !== 'function') {
    throw new TypeError('dungPhanB: thiếu `taoTruyVanHeThong()` — cổng KHÔNG gắn team cho bốn bảng dùng chung (hợp đồng mục 4).');
  }

  const daNoi = [];
  const thieu = [];

  // ── ① Cổng dữ liệu cho ba module chạm cơ sở dữ liệu ──
  datTruyVanNhatKy(taoTruyVan);
  datTruyVanModel(taoTruyVan);
  datTruyVanDieuPhoi(taoTruyVan);
  datCongDanhTinh(taoTruyVanHeThong);
  // Màn cấu hình team dùng CẢ HAI cổng: cổng có team cho `page`/`hoi_thoai`/`cau_hinh_model`,
  // cổng danh tính cho bốn bảng dùng chung (`thanh_vien_team` không nằm trong tầng truy vấn
  // của A). Tầng ĐỌC và tầng GHI nhận riêng — hai file, hai phễu, cùng một cổng.
  datTruyVanTeam(taoTruyVan);
  datDanhTinhTeam(taoTruyVanHeThong);
  datDanhTinhTeamGhi(taoTruyVanHeThong);
  datTruyVanPageBot(taoTruyVan);
  datTruyVanBoLuat(taoTruyVan);
  datTruyVanKyNang(taoTruyVan);
  datTruyVanPrompt(taoTruyVan);
  datTruyVanKichBan(taoTruyVan);
  datTruyVanSanSang(taoTruyVan);
  // Cửa kiểm đọc thẳng từ tiến trình bot — `src/readiness.js` là cái CHẶN việc bật AI ở v1,
  // nên nó cũng phải là cái v3 hiện ra. Tính lại ở v3 là dựng cái thang thứ hai.
  //
  // NHẬN TỪ NGOÀI được, và đó là chủ ý: máy chủ xem thử (`v3/xem-thu.js`, dữ liệu giả) PHẢI
  // truyền bản giả vào. Nếu nó dùng cầu thật thì một trang demo sẽ hiện tình trạng page THẬT
  // của khách — cùng một máy, cổng 3100 vẫn gọi được.
  const docCuaKiem = typeof docSanSang === 'function' ? docSanSang : sanSangToanHe;
  datDocSanSang(docCuaKiem);
  datTruyVanTrangChu(taoTruyVan);
  datTruyVanSanPham(taoTruyVan);
  // Kho sản phẩm đọc NGUỒN THẬT (Sheet của tiến trình bot), không đọc bảng `san_pham` của v3
  // — bảng đó 0 dòng vì chưa ai chạy nạp từ POS. Nhận từ ngoài để bản xem thử tiêm bản giả.
  const kho = khoSanPham && typeof khoSanPham.danhSach === 'function'
    ? khoSanPham
    : { danhSach: danhSachPageKemSanPham, motPage: sanPhamCuaPage };
  datDocKhoSanPham(kho);
  // Thư viện ảnh dùng CHUNG bộ đọc — ảnh nằm trong chính dữ liệu sản phẩm, không có kho riêng.
  datTruyVanAnh(taoTruyVan);
  datDocKhoAnh(kho);
  // Màn sáu chặng dùng LẠI cả hai bộ đọc — cửa kiểm và cấu hình kịch bản. Không bộ nào riêng.
  const docTien = typeof docChiPhi === 'function' ? docChiPhi : chiPhiToanHe;
  datTruyVanHieuQua(taoTruyVan);
  if (typeof docHieuQua === 'function') datDocHieuQua(docHieuQua);
  datTruyVanLop0(taoTruyVan);
  datTruyVanNguon(taoTruyVan);
  datDocPheu(typeof docPheu === 'function' ? docPheu : pheuHoiThoai);
  datTruyVanKhach(taoTruyVan);
  datTruyVanRuiRo(taoTruyVan);
  // Phân bố rủi ro hoàn gom SẴN trong CSDL (phiếu B-Y8). Không nối thì màn lùi về đọc cột
  // tại chỗ — cùng bốn cột, nên hai đường không ra hai con số.
  if (typeof docPhanBoHoan === 'function') {
    datDocPhanBoRuiRo(docPhanBoHoan);
    daNoi.push('phân bố rủi ro hoàn (gom trong CSDL) → màn Rủi ro hoàn hàng');
  }
  datTruyVanBaoCao(taoTruyVan);
  datDocDon(typeof docDonHang === 'function' ? docDonHang : donHangToanHe);
  datDocChiPhiChoBaoCao(docTien);   // CÙNG bộ đọc với màn Chi phí — không hai con số
  if (typeof docHaiLuong === 'function') datDocHaiLuong(docHaiLuong);
  datTruyVanChiPhi(taoTruyVan);
  // Tiền đọc từ nơi ĐO THẬT. Sổ `so_ai` của v3 chỉ dùng để ĐỐI CHIẾU — nó 0 dòng, và hiện
  // số 0 ở màn chi phí là nói với chủ dự án rằng bot không tốn tiền.
  datDocChiPhiBot(docTien);
  if (typeof docSoAiV3 === 'function') datDocSoAi(docSoAiV3);
  datTruyVanLenChay(taoTruyVan);
  datDocSanSangLenChay(docCuaKiem);
  datDocMotPageLenChay(kho.motPage);
  datDocSanSangTrangChu(docCuaKiem);   // CÙNG bộ đọc — hai màn không được ra hai con số
  if (typeof docSanSang === 'function') daNoi.push('bộ đọc cửa kiểm GIẢ → màn Cửa kiểm sẵn sàng');
  datTruyVanSucKhoe(taoTruyVan);
  // CÙNG bộ đọc cửa kiểm với ba màn kia — hai đèn công tắc bot của màn Sức khỏe phải đọc
  // nguồn THẬT (`ai-enabled.json`), không đếm cột `page.bot_ai_bat` đã lệch 50 vs 0.
  datDocSanSangSucKhoe(docCuaKiem);
  daNoi.push('cổng dữ liệu → nhật ký · lớp model · bảng điều phối · kho người dùng · cấu hình team · page & bot');

  // ── ② Nhật ký: ba module ghi, một chỗ nhận ──
  // Ghi thẳng bằng `ghiNhatKy` của L0-M4 chứ không qua module trung gian: ba module kia
  // không được import `../audit/…`, nhưng ở đây thì được — đây chính là chỗ nối dây.
  for (const dat of [datPheuNhatKyAuth, datPheuNhatKyModel, datPheuNhatKyDieuPhoi, datPheuNhatKyTeam,
    datPheuNhatKyPageBot, datPheuNhatKyKetNoi, datPheuNhatKyBoLuat, datPheuNhatKyKyNang, datPheuNhatKyKichBan,
    // Mẫu 0 đồng là LỜI BOT NÓI VỚI KHÁCH — sửa phải để lại dấu vết (01 §9).
    datPheuNhatKyLop0]) {
    dat((boiCanh, ban) => {
      // Đăng nhập hỏng và chọn team không thuộc xảy ra TRƯỚC khi có bối cảnh — vai B cố ý
      // không dựng bối cảnh giả để lách (bối cảnh giả là thứ nguy hiểm nhất trong hệ này).
      // Không có bối cảnh thì không ghi vào bảng được; ghi ra log để không mất dấu hẳn.
      if (!boiCanh) {
        console.warn('[vai-b] việc xảy ra trước khi có bối cảnh team, chỉ ghi log:', ban?.hanh_dong || ban?.hanhDong, ban?.ghi_chu || '');
        return null;
      }
      return ghiNhatKy(boiCanh, ban);
    });
  }
  daNoi.push('nhật ký ← đăng nhập · lớp model · bảng điều phối · cấu hình team · page & bot · kết nối');

  // ── ③ Sổ AI và cảnh báo ──
  if (typeof ghiSoAi === 'function') { datPheuSoAi(ghiSoAi); daNoi.push('Sổ AI ← lớp model (mọi lượt ghi được mã model)'); }
  else thieu.push('ghiSoAi — lớp model chạy được nhưng KHÔNG ghi mã model vào Sổ AI, nên sau này không so được model nào rẻ hơn thật');

  if (typeof canhBao === 'function') { datPheuCanhBao(canhBao); daNoi.push('cảnh báo ← chuyển model dự phòng'); }
  else thieu.push('canhBao — nhà chính hết tiền thì tự chuyển dự phòng nhưng KHÔNG ai được báo. Đúng cảnh 06/08/2026');

  // Hai đèn của màn Sức khoẻ cần nguồn ngoài. Nối THẲNG từ hai module đã có, không bắt
  // người dựng ứng dụng truyền thêm — chúng vốn đã ở trong cùng gói này.
  datDocKhoToken(khoToken);
  datTrangThaiCauBot(trangThaiCauBot);
  daNoi.push('kho token + cầu bot → màn Sức khoẻ hệ thống');

  // Màn Nhật ký đọc qua chính bộ đọc của L0-M4 — không dựng đường đọc thứ hai.
  datDocNhatKy(docNhatKy);
  datDanhMuc({ moTa: moTaHanhDong, nhom: NHOM_HANH_DONG });
  daNoi.push('bộ đọc nhật ký + danh mục mã → màn Nhật ký thao tác');

  // Màn «AI đề xuất» dùng LẠI bộ đọc và CÙNG cửa ghi của màn Bộ luật — nó chỉ khác ở chỗ
  // ghi cứng `nguon='ai'`. Dựng bộ đọc thứ hai là mở đường cho hai màn đếm ra hai con số.
  datDocBoLuatChoDeXuat(manBoLuat);

  if (cuaBoLuat && typeof cuaBoLuat.ap === 'function') {
    datCuaBoLuat(cuaBoLuat);
    datCuaBoLuatChoDeXuat(cuaBoLuat);
    daNoi.push('cửa ghi có giao dịch → màn Bộ luật chung + màn AI đề xuất');
  }
  else thieu.push('cuaBoLuat — màn Bộ luật chung và màn AI đề xuất TỪ CHỐI ghi. Ghi bằng hai lời gọi rời là bỏ mất giao dịch, khoá chống bấm-cùng-lúc, và luật «đề xuất của AI phải có người duyệt»');

  if (typeof dungBanMay === 'function') { datDungBanMay(dungBanMay); daNoi.push('bộ dựng bản-cho-máy → màn soạn kịch bản'); }
  else thieu.push('dungBanMay — màn soạn kịch bản TỪ CHỐI lưu, vì tự dựng bản thứ hai là hứa một prompt khác cái bot nhận');

  if (typeof dayKichBanLenBot === 'function') { datDayLenBot(dayKichBanLenBot); daNoi.push('cửa đưa kịch bản lên LIVE → tiến trình bot'); }
  else thieu.push('dayKichBanLenBot — soạn được kịch bản nhưng KHÔNG đưa lên LIVE được; sửa cột mà không gọi sang bot thì bot vẫn nói y như cũ');

  if (typeof bocPancake === 'function') { datBocPancake(bocPancake); daNoi.push('bộ bóc file kịch bản Pancake'); }
  else thieu.push('bocPancake — không nhập được kịch bản từ file Pancake');

  if (docKhoi && typeof docKhoi.boLuat === 'function') { datDocKhoi(docKhoi); daNoi.push('bốn bộ đọc khối prompt → màn Prompt của page'); }
  else thieu.push('docKhoi — màn «Prompt của page» không dựng được bốn khối, và nó nói rõ đó là lỗi cấu hình chứ không phải "page này không có prompt"');

  // Hiệu lực THẬT của prompt: cờ `V3_RAP_PROMPT_BAT` + hằng `CORE`. Không nối thì màn nói
  // «chưa biết», KHÔNG được đoán là đang bật — xem `kho-prompt.js#datDocHieuLuc`.
  if (typeof docHieuLucPrompt === 'function') {
    datDocHieuLuc(docHieuLucPrompt);
    daNoi.push('bộ đọc hiệu lực prompt (cờ + CORE) → màn Prompt của page');
  } else {
    thieu.push('docHieuLucPrompt — màn «Prompt của page» không biết đường chat đang dùng bốn khối CSDL hay `kb.js` cũ, nên nó nói «chưa biết» thay vì khoe một prompt bot chưa chắc gửi');
  }

  if (khoKhoa && typeof khoKhoa.docKhoa === 'function') { datKhoKhoa(khoKhoa); daNoi.push('kho khoá theo nhà → lớp model · màn Model AI'); }
  else thieu.push('khoKhoa — lớp model CHỈ đọc được khoá từ biến môi trường; khoá riêng của team trong bảng `khoa_nha` không tới được, và màn Model AI không dán khoá được');

  if (typeof chuyenPage === 'function') { datChuyenPage(chuyenPage); daNoi.push('chuyển page ↔ team → màn cấu hình team (lát 4)'); }
  else thieu.push('chuyenPage — lát «gán page ↔ team» hiện MỜ. Không có nó thì gán page vẫn phải chạy psql tay, đúng thứ sóng 0 sinh ra để xoá');

  if (typeof docKetNoiPos === 'function') {
    datDocKetNoiPos(docKetNoiPos);
    datDocKetNoiPosKN(docKetNoiPos);
    daNoi.push('kết nối POS → màn cấu hình team · màn kết nối & token');
  }
  else thieu.push('docKetNoiPos — màn cấu hình team hiện «chưa nối bộ đọc kết nối POS». KHÔNG hiện «không có kết nối», vì hai câu đó dẫn người đọc đi hai hướng khác nhau');

  // ── ④ Chắn đăng nhập và chắn vai cho bảng điều phối ──
  // Truyền HÀM DỰNG, không phải cái chắn đã dựng. Bảng điều phối nhận được cả hai kiểu,
  // nhưng truyền hàm dựng mới đúng ý — nó tự chọn vai nào vào được.
  datChanDangNhap(batBuocDangNhap);
  datChanVai(batBuocVaiHTTP);
  // Màn cấu hình team có DANH SÁCH VAI RIÊNG (`quan-tri` + `quan-ly`), nên nó nhận HÀM DỰNG
  // rồi tự gọi với danh sách của mình — truyền cái chắn đã dựng của bảng điều phối vào đây
  // là cho `sale` vào màn cấu hình.
  datChanDangNhapTeam(batBuocDangNhap);
  datChanVaiTeam(batBuocVaiHTTP);
  // Ba màn quản trị, BA danh sách vai KHÁC NHAU — mỗi màn tự gọi hàm dựng với danh sách của
  // mình. `ket-noi` chỉ cho `quan-tri` vì kho token là hạ tầng dùng chung cho cả ba team.
  datChanDangNhapPageBot(batBuocDangNhap);
  datChanVaiPageBot(batBuocVaiHTTP);
  datChanDangNhapKetNoi(batBuocDangNhap);
  datChanVaiKetNoi(batBuocVaiHTTP);
  datChanDangNhapModel(batBuocDangNhap);
  datChanVaiModel(batBuocVaiHTTP);
  datChanDangNhapBoLuat(batBuocDangNhap);
  datChanVaiBoLuat(batBuocVaiHTTP);
  datChanDangNhapKyNang(batBuocDangNhap);
  datChanVaiKyNang(batBuocVaiHTTP);
  datChanDangNhapPrompt(batBuocDangNhap);
  datChanVaiPrompt(batBuocVaiHTTP);
  datChanDangNhapKichBan(batBuocDangNhap);
  datChanVaiKichBan(batBuocVaiHTTP);
  datChanDangNhapSucKhoe(batBuocDangNhap);
  datChanVaiSucKhoe(batBuocVaiHTTP);
  datChanDangNhapNhatKy(batBuocDangNhap);
  datChanVaiNhatKy(batBuocVaiHTTP);
  datChanDangNhapDeXuat(batBuocDangNhap);
  datChanVaiDeXuat(batBuocVaiHTTP);
  datChanDangNhapSanSang(batBuocDangNhap);
  datChanVaiSanSang(batBuocVaiHTTP);
  datChanDangNhapTrangChu(batBuocDangNhap);
  datChanVaiTrangChu(batBuocVaiHTTP);
  datChanDangNhapSanPham(batBuocDangNhap);
  datChanVaiSanPham(batBuocVaiHTTP);
  datChanDangNhapAnh(batBuocDangNhap);
  datChanVaiAnh(batBuocVaiHTTP);
  datChanDangNhapLenChay(batBuocDangNhap);
  datChanVaiLenChay(batBuocVaiHTTP);
  datChanDangNhapChiPhi(batBuocDangNhap);
  datChanVaiChiPhi(batBuocVaiHTTP);
  datChanDangNhapBaoCao(batBuocDangNhap);
  datChanVaiBaoCao(batBuocVaiHTTP);
  datChanDangNhapRuiRo(batBuocDangNhap);
  datChanVaiRuiRo(batBuocVaiHTTP);
  datChanDangNhapKhach(batBuocDangNhap);
  datChanVaiKhach(batBuocVaiHTTP);
  datChanDangNhapNguon(batBuocDangNhap);
  datChanVaiNguon(batBuocVaiHTTP);
  datChanDangNhapHieuQua(batBuocDangNhap);
  datChanVaiHieuQua(batBuocVaiHTTP);
  datChanDangNhapLop0(batBuocDangNhap);
  datChanVaiLop0(batBuocVaiHTTP);
  daNoi.push('chắn đăng nhập + chắn vai → bảng điều phối · cấu hình team · page & bot · kết nối');

  // ── ⑤ Mắc vào Express, ĐÚNG THỨ TỰ ──
  if (express && typeof express.json === 'function') app.use(express.json());
  app.use(lopBoiCanh());          // ① đọc cookie vé → req.boiCanh. PHẢI đứng trước router auth.
  app.use(taoRouterAuth());       //   /dang-nhap · /api/dang-nhap · /api/chon-team · /api/toi
  app.use(chanTeamTrenUrl());     //   ?team_id=<team khác> → 403 + ghi nhật ký
  app.use(taoRouterDieuHuong());  //   /chung/dieu-huong.js · /api/dieu-huong (menu chung)
  app.use(taoRouterDieuPhoi());   //   /dieu-phoi · /viec/:id · /api/dieu-phoi/*
  app.use(taoRouterCauHinhTeam()); //  /cau-hinh-team · /api/team/*
  app.use(taoRouterPageBot());    //   /page-bot · /api/page-bot/*
  app.use(taoRouterKetNoi());     //   /ket-noi · /api/ket-noi/*
  app.use(taoRouterModel());      //   /model-ai · /api/model/*
  app.use(taoRouterBoLuat());     //   /bo-luat · /api/bo-luat/*
  app.use(taoRouterKyNang());     //   /ky-nang · /api/ky-nang/*
  app.use(taoRouterPromptPage()); //   /prompt-page · /api/prompt-page/*
  app.use(taoRouterKichBan());    //   /kich-ban · /api/kich-ban/*
  app.use(taoRouterSucKhoe());    //   /suc-khoe · /api/suc-khoe
  app.use(taoRouterNhatKy());     //   /nhat-ky · /api/nhat-ky
  app.use(taoRouterDeXuat());     //   /ai-de-xuat · /api/ai-de-xuat/*
  app.use(taoRouterSanSang());    //   /san-sang · /api/san-sang
  app.use(taoRouterTrangChu());   //   /trang-chu · /api/trang-chu
  app.use(taoRouterSanPham());    //   /san-pham · /api/san-pham/*
  app.use(taoRouterAnh());        //   /thu-vien-anh · /api/thu-vien-anh
  app.use(taoRouterLenChay());    //   /len-chay · /api/len-chay/*
  app.use(taoRouterChiPhi());     //   /chi-phi · /api/chi-phi
  app.use(taoRouterBaoCao());     //   /bao-cao · /api/bao-cao
  app.use(taoRouterRuiRo());      //   /rui-ro-hoan · /api/rui-ro-hoan
  app.use(taoRouterKhach());      //   /ho-so-khach · /api/ho-so-khach
  app.use(taoRouterNguon());      //   /nguon-khach · /api/nguon-khach
  app.use(taoRouterHieuQua());    //   /hieu-qua · /api/hieu-qua
  app.use(taoRouterLop0());       //   /lop-0-dong · /api/lop-0-dong
  daNoi.push('router: bối cảnh → đăng nhập → chặn xuyên team → điều phối → cấu hình team → page & bot → kết nối → model AI → bộ luật chung → kỹ năng → prompt của page → kịch bản → sức khoẻ → nhật ký → AI đề xuất → cửa kiểm sẵn sàng → trang chủ → sản phẩm & kho → thư viện ảnh → đưa lên chạy → chi phí AI → báo cáo → rủi ro hoàn → hồ sơ khách → nguồn khách → hiệu quả kịch bản → lớp 0 đồng');

  for (const t of thieu) console.warn(`[vai-b] chưa nối: ${t}`);
  return { daNoi, thieu };
}

export default dungPhanB;
