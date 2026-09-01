// Bật ba cửa mà năm bộ ca cũ đo HỢP ĐỒNG của — trước khi bất kỳ module nào đọc env.
//
// Vì sao cần: `.env` của máy dev cố ý TẮT cả ba (HUMAN_TAKEOVER vì M05 nhận nhầm người
// thật 30,2%; hai cửa FASTLANE vì trùng khoá Botcake). Chuỗi import của src kéo theo
// `dotenv/config`, nên `.env` vào cả khi chạy `node --test` không có `--env-file`.
// Kết quả: 8 ca đỏ suốt, mà không ca nào đỏ vì mã — chúng đo cửa MỞ trong môi trường
// cửa ĐÓNG. Đo 01/09: bật ba biến này thì 5 tệp lên 16/43/7/38/5, 0 đỏ.
//
// Đặt ở đây chứ không sửa `.env`: cấu hình vận hành là quyết định của chủ dự án, còn
// điều kiện của một phép đo là việc của chính phép đo. Tệp test phải import module này
// TRƯỚC mọi import khác — src đọc env ngay lúc nạp module.
//
// GÁN THẲNG, không `??=`: `node --env-file=.env` nạp biến vào process.env trước khi
// dòng mã đầu tiên chạy, nên `??=` thấy "0" đã có sẵn và không đổi được gì. Muốn đo
// năm bộ này dưới đúng cấu hình vận hành (ba cửa đóng) thì đặt DO_THEO_ENV=1 — nhưng
// khi đó phần lớn ca sẽ đỏ, vì chúng viết ra để đo hợp đồng của cửa khi cửa MỞ.
if (process.env.DO_THEO_ENV !== "1") {
  process.env.HUMAN_TAKEOVER = "1";
  process.env.FASTLANE_TEMPLATES = "1";
  process.env.FASTLANE_INTRO = "1";
}
