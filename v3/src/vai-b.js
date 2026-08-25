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
import { datTaoTruyVan as datTruyVanNhatKy, datPheuNhatKy as datPheuRaNgoai, ghiNhatKy } from './audit/index.js';
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
} from './ui/bo-luat/index.js';
import {
  datTaoTruyVan as datTruyVanKyNang, datPheuNhatKy as datPheuNhatKyKyNang,
  datChanDangNhap as datChanDangNhapKyNang, datChanVai as datChanVaiKyNang, taoRouterKyNang,
} from './ui/ky-nang/index.js';
import {
  datTaoTruyVan as datTruyVanPrompt, datDocKhoi,
  datChanDangNhap as datChanDangNhapPrompt, datChanVai as datChanVaiPrompt, taoRouterPromptPage,
} from './ui/prompt-page/index.js';

/**
 * Nối toàn bộ phần rìa vào một ứng dụng Express.
 *
 * @param {import('express').Express} app
 * @param {object} phuThuoc
 * @param {(boiCanh:object)=>object} phuThuoc.taoTruyVan        BẮT BUỘC · người A giao. Cổng có chèn điều kiện team.
 * @param {()=>object}               phuThuoc.taoTruyVanHeThong BẮT BUỘC · người A giao. Cổng KHÔNG gắn team,
 *                                                              chỉ cho bốn bảng dùng chung — xem `auth/kho-nguoi-dung.js`.
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
export function dungPhanB(app, { taoTruyVan, taoTruyVanHeThong, docKetNoiPos, chuyenPage, khoKhoa, docKhoi, ghiSoAi, canhBao, express } = {}) {
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
  daNoi.push('cổng dữ liệu → nhật ký · lớp model · bảng điều phối · kho người dùng · cấu hình team · page & bot');

  // ── ② Nhật ký: ba module ghi, một chỗ nhận ──
  // Ghi thẳng bằng `ghiNhatKy` của L0-M4 chứ không qua module trung gian: ba module kia
  // không được import `../audit/…`, nhưng ở đây thì được — đây chính là chỗ nối dây.
  for (const dat of [datPheuNhatKyAuth, datPheuNhatKyModel, datPheuNhatKyDieuPhoi, datPheuNhatKyTeam,
    datPheuNhatKyPageBot, datPheuNhatKyKetNoi, datPheuNhatKyBoLuat, datPheuNhatKyKyNang]) {
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

  if (docKhoi && typeof docKhoi.boLuat === 'function') { datDocKhoi(docKhoi); daNoi.push('bốn bộ đọc khối prompt → màn Prompt của page'); }
  else thieu.push('docKhoi — màn «Prompt của page» không dựng được bốn khối, và nó nói rõ đó là lỗi cấu hình chứ không phải "page này không có prompt"');

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
  daNoi.push('chắn đăng nhập + chắn vai → bảng điều phối · cấu hình team · page & bot · kết nối');

  // ── ⑤ Mắc vào Express, ĐÚNG THỨ TỰ ──
  if (express && typeof express.json === 'function') app.use(express.json());
  app.use(lopBoiCanh());          // ① đọc cookie vé → req.boiCanh. PHẢI đứng trước router auth.
  app.use(taoRouterAuth());       //   /dang-nhap · /api/dang-nhap · /api/chon-team · /api/toi
  app.use(chanTeamTrenUrl());     //   ?team_id=<team khác> → 403 + ghi nhật ký
  app.use(taoRouterDieuPhoi());   //   /dieu-phoi · /viec/:id · /api/dieu-phoi/*
  app.use(taoRouterCauHinhTeam()); //  /cau-hinh-team · /api/team/*
  app.use(taoRouterPageBot());    //   /page-bot · /api/page-bot/*
  app.use(taoRouterKetNoi());     //   /ket-noi · /api/ket-noi/*
  app.use(taoRouterModel());      //   /model-ai · /api/model/*
  app.use(taoRouterBoLuat());     //   /bo-luat · /api/bo-luat/*
  app.use(taoRouterKyNang());     //   /ky-nang · /api/ky-nang/*
  app.use(taoRouterPromptPage()); //   /prompt-page · /api/prompt-page/*
  daNoi.push('router: bối cảnh → đăng nhập → chặn xuyên team → điều phối → cấu hình team → page & bot → kết nối → model AI → bộ luật chung → kỹ năng → prompt của page');

  for (const t of thieu) console.warn(`[vai-b] chưa nối: ${t}`);
  return { daNoi, thieu };
}

export default dungPhanB;
