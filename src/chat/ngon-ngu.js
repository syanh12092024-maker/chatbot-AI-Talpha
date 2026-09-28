// KHÁCH HỎI NGÔN NGỮ NÀO, BOT TRẢ LỜI NGÔN NGỮ ĐÓ (28/09/2026).
//
// ═══ VÌ SAO CÓ TỆP NÀY ═════════════════════════════════════════════════════════════════
// Giả lập Minty KSA trên 12 lượt khách thật (28/09): ba khách gõ «How much?» bằng tiếng Anh,
// cả ba nhận câu trả lời sẵn bằng tiếng Tagalog — «ESPESYAL NA PROMO… Ilang set po ang gusto
// ninyong orderin?». Câu mẫu của page chỉ có MỘT ngôn ngữ, và hai lớp 0 đồng (lớp từ khoá +
// fast lane) gửi nó cho mọi khách bất kể họ nói gì.
//
// Người quyết: «khách hỏi ngôn ngữ nào thì trả lời ngôn ngữ đó».
//
// ═══ CÁCH LÀM: NHƯỜNG CHO MODEL, KHÔNG DỊCH CÂU MẪU ═════════════════════════════════════
// Khi ngôn ngữ câu mẫu KHÁC ngôn ngữ khách, lớp 0 đồng NHƯỜNG lượt ấy cho model — cùng cửa
// nhường mà `V3_LAN_CHOT_MODEL` đã dùng. Model tự trả lời bằng ngôn ngữ của khách. Không dịch
// câu mẫu tại chỗ: một câu mẫu là lời đã được người duyệt, dịch máy là gửi cho khách một câu
// chưa ai đọc.
//
// ═══ BẢO THỦ, CỐ Ý ═════════════════════════════════════════════════════════════════════
// Chỉ nhường khi đoán được CẢ HAI và chúng KHÁC nhau. Đoán không ra (chỉ có emoji, chỉ có số,
// câu quá ngắn) thì giữ hành vi cũ — thà gửi câu mẫu như hôm nay còn hơn đẩy một lượt lên
// model chỉ vì bộ đoán không chắc.

/**
 * Ngôn ngữ đang gặp ở các page Trung Đông: tiếng Ả Rập, tiếng Tagalog, tiếng Anh.
 * Thêm hai giá trị:
 *   · `vi`  — tiếng Việt. Không khách nào nói, nhưng câu mẫu thì CÓ THỂ (người soạn gõ nhầm,
 *            hay câu giả trong bộ ca). Nhận ra để không bao giờ gửi tiếng Việt cho khách.
 *   · `mix` — pha tiếng Anh với tiếng Tagalog («Yes po, 100% original», «How much po?»). Rất
 *            phổ biến ở khách Philippines, và HỢP với cả câu mẫu tiếng Anh lẫn tiếng Tagalog.
 */
export const NGON_NGU = Object.freeze({ AR: 'ar', TL: 'tl', EN: 'en', VI: 'vi', MIX: 'mix' });

// Dấu tiếng Việt: chữ có dấu mà tiếng Tagalog/Anh không dùng. Một chữ là đủ.
const VI_DAU = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;

// HƯ TỪ tiếng Anh — để nhận ra câu PHA. Cố ý CHỈ có hư từ (is, the, how, with…), KHÔNG có
// danh từ bán hàng («buy», «free», «shipping», «delivery», «order», «price»…): câu mẫu tiếng
// Tagalog của chính Minty chứa «Buy 1 Get 1», «Libreng Shipping», «Cash on Delivery» — thuật
// ngữ quảng cáo dùng chung, không nói gì về ngôn ngữ của câu. Bản đầu đếm cả chúng và xếp câu
// mẫu Tagalog vào loại «pha» ⇒ khách hỏi «How much?» vẫn nhận câu Tagalog. Bắt được bằng ca ①
// của `ngon-ngu-nhuong-model.test.js`.
const EN_DAU = new Set([
  'the', 'is', 'are', 'was', 'this', 'that', 'it', 'its', 'a', 'an', 'how', 'much', 'many',
  'what', 'where', 'when', 'which', 'can', 'could', 'do', 'does', 'you', 'your', 'i', 'my', 'me',
  'we', 'our', 'of', 'for', 'with', 'and', 'or', 'to', 'in', 'yes', 'no', 'please', 'have',
  'has', 'want', 'thank', 'thanks', 'will', 'would', 'there', 'here',
]);

// Dấu hiệu tiếng Tagalog: từ CHỈ có trong tiếng Tagalog, không trùng một từ tiếng Anh thông
// dụng. Cố ý KHÔNG có «na», «sa», «ba», «ang» đứng một mình trong bộ «chắc» — chúng quá
// ngắn, dễ trùng tên riêng hay chữ viết tắt.
const TL_CHAC = new Set([
  // đại từ, trợ từ lễ phép
  'po', 'opo', 'ako', 'ikaw', 'kayo', 'kami', 'tayo', 'ninyo', 'ninyong', 'niyo', 'naman',
  'talaga', 'sige', 'kuya', 'yung', 'yun', 'ito', 'iyan', 'dito', 'diyan', 'doon',
  // từ để hỏi
  'ano', 'paano', 'pano', 'saan', 'kailan', 'kelan', 'bakit', 'sino', 'gaano', 'ilan', 'ilang',
  'magkano', 'kano',
  // mua bán, giao hàng — đúng thứ khách hỏi page bán hàng
  'bili', 'bibili', 'mbili', 'bumili', 'presyo', 'bayad', 'libre', 'padala', 'mahal', 'mura',
  'meron', 'mayroon', 'wala', 'gusto', 'pwede', 'puwede', 'pede', 'lamang', 'totoo', 'tunay',
  'peke', 'kulay', 'sukat', 'araw', 'bago', 'dumating', 'darating', 'ngayon', 'bukas',
  'katagal', 'tagal', 'huwag', 'wag', 'paki', 'salamat',
]);
// Cố ý KHÔNG có «hindi» (cũng là tên tiếng Hindi) và «ate» (động từ tiếng Anh «ăn»).
const TL_PHU = new Set([
  'ang', 'mga', 'ng', 'sa', 'na', 'ba', 'lang', 'para', 'din', 'rin', 'kasi', 'ko', 'mo',
  'ka', 'pa', 'mag', 'yan', 'sila', 'niya',
]);

/**
 * Đoán ngôn ngữ của một đoạn chữ.
 * @returns {'ar'|'tl'|'en'|null} `null` = không đủ căn cứ để đoán.
 */
export function doanNgonNgu(chu) {
  const s = String(chu || '');
  if (!s.trim()) return null;
  // Chữ Ả Rập: một ký tự trong dải Unicode Ả Rập là đủ — không ngôn ngữ nào khác ở đây dùng nó.
  if (/[؀-ۿݐ-ݿ]/.test(s)) return NGON_NGU.AR;
  if (VI_DAU.test(s.toLowerCase())) return NGON_NGU.VI;   // «MẪU CỨNG» viết hoa cũng phải nhận ra

  const tu = (s.toLowerCase().match(/[a-zà-ỹ']+/g) || []).map((t) => t.replace(/'/g, ''));
  if (!tu.length) return null;

  const chac = tu.filter((t) => TL_CHAC.has(t)).length;
  const phu = tu.filter((t) => TL_PHU.has(t)).length;
  const anh = tu.filter((t) => EN_DAU.has(t)).length;
  // Một từ chắc là đủ («How much po?» là Taglish — đáp bằng câu mẫu Tagalog là hợp).
  // Không có từ chắc thì cần ít nhất HAI từ phụ, để «in na» hay «sa» lạc vào câu tiếng Anh
  // không đổi cả câu thành tiếng Tagalog.
  // «po»/«opo» ĐỨNG MỘT MÌNH chỉ là lễ phép, không phải bằng chứng câu viết bằng tiếng
  // Tagalog: «Yes po, original.» là tiếng Anh; «Send Name+Number+Address. COD po.» cũng vậy.
  // Người Philippines chêm «po» vào cả câu tiếng Anh. Chỉ có «po» mà không có dấu Tagalog nào
  // khác ⇒ coi là PHA (hợp với cả hai), không phải Tagalog thuần.
  const chacKhongPo = tu.filter((t) => TL_CHAC.has(t) && t !== 'po' && t !== 'opo').length;
  if (chac >= 1 && chacKhongPo === 0 && phu < 2) return NGON_NGU.MIX;
  const coTagalog = chac >= 1 || phu >= 2;
  // PHA: có dấu tiếng Tagalog VÀ tiếng Anh chiếm phần đáng kể (≥ 2 từ, và nhiều hơn số từ
  // Tagalog). «Yes po, 100% original with warranty card» là tiếng Anh có chữ «po» lễ phép;
  // «Ilang set po ang gusto ninyong orderin» thì không.
  if (coTagalog && anh >= 2 && anh > chac) return NGON_NGU.MIX;
  if (coTagalog) return NGON_NGU.TL;
  // Còn lại là chữ Latin: tiếng Anh — nhưng chỉ khi có ít nhất một từ đủ dài để là một từ
  // thật, không phải «ok», «k», «hi».
  if (tu.some((t) => t.length >= 3)) return NGON_NGU.EN;
  return null;
}

/**
 * Câu mẫu có trả lời LỆCH ngôn ngữ với khách không.
 * Chỉ `true` khi đoán được cả hai và chúng khác nhau — xem «BẢO THỦ» đầu tệp.
 */
export function ngonNguLech(chuKhach, chuMau) {
  const a = doanNgonNgu(chuKhach);
  const b = doanNgonNgu(chuMau);
  if (!a || !b || a === b) return false;
  // TIẾNG VIỆT KHÔNG ĐỦ CĂN CỨ ĐỂ NHƯỜNG. Câu mẫu tiếng Việt không bao giờ là câu gửi thật
  // cho khách ở các page Trung Đông — nó là câu giả trong bộ ca («MẪU CỨNG ship») hoặc một
  // bản nháp. Coi nó là «lệch» thì hàng loạt ca đang canh việc KHÁC (0 token, bộ đếm, lá
  // chắn) đổi hành vi theo, trong khi khách thật chưa từng gặp cảnh ấy. Nhận ra được (`vi`)
  // nhưng không nhường — cùng luật «bảo thủ» đầu tệp.
  if (a === NGON_NGU.VI || b === NGON_NGU.VI) return false;
  // Câu PHA hợp với cả tiếng Anh lẫn tiếng Tagalog — ở cả hai phía.
  const hop = (x, y) => x === NGON_NGU.MIX && (y === NGON_NGU.EN || y === NGON_NGU.TL);
  return !(hop(a, b) || hop(b, a));
}
