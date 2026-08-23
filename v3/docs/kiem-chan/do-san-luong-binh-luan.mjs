// ĐIỂM KIỂM 3 · sản lượng hội thoại bình luận 7 ngày trên mọi page đang bật AI. CHỈ ĐỌC.
// LƯU Ý: mẫu Pancake chỉ 60 hội thoại/page — con số 30 ngày KHÔNG dùng được, xem ket-qua.md §3.4
//   ssh root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-san-luong-binh-luan.mjs'

import fs from 'node:fs';
for (const d of fs.readFileSync('/opt/aicloser/.env','utf8').split('\n')) { if(!d.includes('=')||d.trim().startsWith('#'))continue; const i=d.indexOf('='); process.env[d.slice(0,i).trim()] ??= d.slice(i+1).trim(); }
const { pkGetConversations, refreshPancakePages } = await import('/opt/aicloser/src/pancake.js');
await refreshPancakePages().catch(()=>{});
const ds = JSON.parse(fs.readFileSync('/opt/aicloser/ai-enabled.json','utf8')).map(String);
const cat7 = Date.now() - 7*864e5, cat30 = Date.now() - 30*864e5;
let cmt7=0, ib7=0, cmt30=0, ib30=0, pageDo=0, pageLoi=0, chamTran=0;
for (const pageId of ds) {
  let convs=[]; try { convs = await pkGetConversations(pageId) || []; } catch { pageLoi++; continue; }
  if (!convs.length) { pageLoi++; continue; }
  pageDo++;
  // mẫu chỉ có 60 hội thoại gần nhất — nếu hội thoại cũ nhất vẫn nằm trong 7 ngày thì bị cắt trần
  const cuNhat = Math.min(...convs.map(c=>new Date(c.inserted_at||c.updated_at||0).getTime()).filter(Boolean));
  if (cuNhat > cat7) chamTran++;
  for (const c of convs) {
    const t = new Date(c.inserted_at||c.updated_at||0).getTime();
    if (!t) continue;
    const laCmt = c.type === 'COMMENT';
    if (t >= cat7)  { if (laCmt) cmt7++;  else ib7++; }
    if (t >= cat30) { if (laCmt) cmt30++; else ib30++; }
  }
}
console.log(JSON.stringify({
  pageDangBatAi: ds.length, pageDocDuoc: pageDo, pageKhongDocDuoc: pageLoi, pageChamTranMau60: chamTran,
  bay7: { comment: cmt7, khac: ib7, commentMoiNgay: Math.round(cmt7/7*10)/10, tiLeComment: Math.round(cmt7/(cmt7+ib7)*1000)/10 },
  bay30:{ comment: cmt30, khac: ib30, commentMoiNgay: Math.round(cmt30/30*10)/10, tiLeComment: Math.round(cmt30/(cmt30+ib30)*1000)/10 },
}, null, 1));
