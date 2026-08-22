// BỘ DÒ ĐIỂM KIỂM CHẶN 3 — BOTCAKE KÉO VỀ BAO NHIÊU KHÁCH TỪ BÌNH LUẬN. CHỈ ĐỌC.
//
// API Botcake KHÔNG CHO GHI (đã thử thật, ghi ở src/botcake.js dòng 4–12) và cũng KHÔNG
// có endpoint thống kê. Thứ đọc được là danh sách flow của từng page. Botcake tự đặt tên
// flow trả lời bình luận là "Private Replies #N", nên đếm được **bao nhiêu page đang bật**.
//
// Nửa thứ hai của câu hỏi — "mỗi ngày tạo ra bao nhiêu hội thoại" — API không trả lời được.
// Xem mục "Cách đo nửa còn lại" ở v3/docs/kiem-chan/ket-qua.md.
//
//   scp v3/docs/kiem-chan/do-botcake.mjs root@169.58.33.8:/tmp/
//   ssh root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-botcake.mjs'

// Nạp .env bằng tay: bản đang chạy nạp qua config.js, script rời thì không có ai nạp hộ.
import fs from 'node:fs';
for (const d of fs.readFileSync('/opt/aicloser/.env', 'utf8').split('\n')) {
  if (!d.includes('=') || d.trim().startsWith('#')) continue;
  const i = d.indexOf('=');
  process.env[d.slice(0, i).trim()] ??= d.slice(i + 1).trim();
}

const { reloadBotcakeKeys, listBotcakePages, getFlows, botcakeKeyCount } = await import('/opt/aicloser/src/botcake.js');

reloadBotcakeKeys();
const ds = listBotcakePages();
console.log(`Có khoá Botcake cho ${botcakeKeyCount()} page.`);

const ra = { luc: new Date().toISOString(), soPageCoKhoa: botcakeKeyCount(), page: [] };
let coPR = 0; let tongPR = 0; let doc0 = 0;

for (const p of ds) {
  const pid = String(p.pageId || p.id || p);
  let flows = null;
  try { flows = await getFlows(pid); } catch (e) { flows = { loi: e.message }; }
  const dsFlow = flows?.data?.flows || flows?.flows || [];
  if (!Array.isArray(dsFlow) || !dsFlow.length) {
    doc0++;
    ra.page.push({ pageId: pid, docDuoc: false, ghiChu: flows?.loi || 'không có flow nào đọc được' });
    continue;
  }
  const song = dsFlow.filter((f) => !f.is_removed);
  const pr = song.filter((f) => /private\s*repl/i.test(String(f.name || '')));
  if (pr.length) { coPR++; tongPR += pr.length; }
  ra.page.push({
    pageId: pid, docDuoc: true,
    soFlow: song.length,
    soPrivateReplies: pr.length,
    tenPrivateReplies: pr.map((f) => f.name).slice(0, 5),
  });
  console.log(`  ${pid}: ${song.length} flow · ${pr.length} Private Replies`);
}

ra.tongKet = {
  pageDocDuoc: ra.page.filter((x) => x.docDuoc).length,
  pageKhongDocDuoc: doc0,
  pageBatPrivateReplies: coPR,
  tongFlowPrivateReplies: tongPR,
  tiLeBat: ra.page.length ? Math.round((coPR / ra.page.filter((x) => x.docDuoc).length || 0) * 100) : 0,
};
console.log('\nTổng kết:', JSON.stringify(ra.tongKet));
console.log('\n===KETQUA_JSON===');
console.log(JSON.stringify(ra, null, 2));
