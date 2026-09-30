// PHIẾU VE3 · DANH SÁCH PAGE THEO BẢN VẼ 2b — viên «Lọc nhanh» có số đếm, nút Quét ở đầu trang, chọn nhiều + thao
// tác hàng loạt. Luật của thao tác hàng loạt (đường chạm KHÁCH THẬT khi bật bot):
//   · đi LẦN LƯỢT qua ĐÚNG cửa ghi từng page đã có — không cửa ghi hàng loạt mới ở máy chủ;
//   · bật bot: trần 10 page một lượt + hộp xác nhận liệt kê tên; gặp lỗi đầu tiên thì DỪNG, nói page nào đã đổi;
//   · chỉ chạm dòng CÒN HIỆN (đổi lọc/trang thì bỏ chọn dòng khuất).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../../src/ui/page-bot/trang/page-bot.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('<script>\nconst { esc,') + 8, html.lastIndexOf('</script>\n<script src="/chung/dieu-huong.js">'));
const than = (ten) => (js.match(new RegExp(`(?:async )?function ${ten}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`)) || [''])[0];

test('D1 · viên «Lọc nhanh» có số đếm (tablist) thay ô chọn; nút Quét ở hàng ô tìm (VE2b)', () => {
  assert.match(html, /<div class="hang-vien duoi-4" role="tablist" aria-label="Lọc nhanh" id="thanhLoc">/);
  assert.doesNotMatch(html, /id="oLoc"/, 'ô chọn bộ lọc cũ còn sót');
  assert.match(than('veThanhLoc'), /role="tab" data-loc="\$\{esc\(ma\)\}" aria-selected="\$\{ma === LOC\}"/);
  // VE2b: số `null` (không đo được — bảng kịch bản đọc hỏng) hiện «—», không «0».
  assert.match(than('veThanhLoc'), /<span class="phu">\$\{n == null \? '—' : so\(n\)\}<\/span>/, 'viên phải mang số đếm');
  // VE2b · 30/09 (người quyết khoanh đỏ cả khối đầu trang: «vào danh sách page luôn»): đầu trang ẩn, nút Quét xuống hàng ô
  // tìm — vẫn cạnh bộ lọc, vẫn là đường duy nhất đưa page mới vào hệ.
  assert.match(html, /<div class="table-toolbar">[\s\S]*?id="nutQuet"[\s\S]*?<\/div>/, 'nút Quét phải nằm ở hàng ô tìm');
});

test('D2 · bật bot hàng loạt: trần 10 + hộp xác nhận liệt kê tên + đi qua ĐÚNG cửa `/bot` từng page', () => {
  assert.match(js, /const GIOI_HAN_BAT = 10;/);
  const bat = than('batLoat');
  assert.match(bat, /if \(!ds\.length \|\| ds\.length > GIOI_HAN_BAT\) return;/, 'vượt trần phải từ chối ngay ở hàm, không chỉ tắt nút');
  // Đo CẤU TRÚC «chưa đồng ý thì return» — không đo chữ `confirmDialog` (đảo-vá M2: `if (false && …confirmDialog…)` giữ
  // nguyên chữ mà bỏ mất hộp xác nhận).
  assert.match(bat, /\n  if \(!\(await confirmDialog\(\{ title: `Bật bot cho \$\{ds\.length\} page\?`,[\s\S]*?\}\)\)\) return;\n  await chayLoat/,
    'bật bot phải CHỜ hộp xác nhận và return khi không đồng ý, trước khi gọi cửa ghi');
  assert.match(bat, /ds\.map\(\(p\) => p\.ten \|\| p\.pageId\)\.join/, 'hộp xác nhận phải liệt kê TÊN page');
  assert.match(bat, /\/api\/page-bot\/\$\{encodeURIComponent\(p\.id\)\}\/bot`, \{ method: 'POST', body: JSON\.stringify\(\{ bat: true \}\) \}/);
  assert.match(than('veThanhChon'), /CHON\.size > GIOI_HAN_BAT \? `Tối đa \$\{GIOI_HAN_BAT\} page một lượt/, 'nút phải nói vì sao khoá khi quá trần');
  assert.match(than('veThanhChon'), /!p\.botAiBat && !khoaBotCua\(p\)/, 'chỉ bật page đang tắt và mở được cửa');
});

test('D3 · lần lượt, DỪNG ở lỗi đầu tiên và nói đã xong page nào — không «đã xong» khi một nửa hỏng', () => {
  const chay = than('chayLoat');
  assert.match(chay, /for \(const p of ds\) \{\s*try \{ await lam\(p\);/, 'phải chạy TUẦN TỰ (await trong vòng lặp)');
  assert.match(chay, /catch \(e\) \{[\s\S]*?baoLoi\(`Dừng \$\{viec\}/, 'lỗi phải báo DỪNG');
  assert.match(chay, /đã xong \$\{xong\.length\}\/\$\{ds\.length\}/);
  assert.match(chay, /return;\s*\}\s*\}\s*toast/, 'sau lỗi phải return — không chạy tiếp page sau');
});

test('D4 · gắn sản phẩm hàng loạt đi qua ĐÚNG cửa `/san-pham-goc` từng page, có xác nhận; chỉ chạm dòng còn hiện', () => {
  const gan = than('ganLoat');
  assert.match(gan, /confirmDialog/);
  assert.match(gan, /\/api\/page-bot\/\$\{encodeURIComponent\(p\.id\)\}\/san-pham-goc`, \{ method: 'POST', body: JSON\.stringify\(\{ maGoc \}\) \}/);
  assert.match(js, /CHON = new Set\(\[\.\.\.CHON\]\.filter\(\(id\) => d\.page\.some\(\(p\) => p\.id === id\)\)\);/);
  // Không mọc cửa ghi hàng loạt ở máy chủ.
  const rt = fs.readFileSync(new URL('../../src/ui/page-bot/router.js', import.meta.url), 'utf8');
  assert.doesNotMatch(rt, /hang-loat|bat-nhieu|\/bot-loat/, 'không được mở cửa ghi hàng loạt ở máy chủ');
});
