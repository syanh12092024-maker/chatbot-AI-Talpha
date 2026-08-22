// ĐIỂM KIỂM 3 · đếm bao nhiêu hội thoại BÌNH LUẬN đã được nhắn riêng. CHỈ ĐỌC.
//   ssh root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-nhan-rieng.mjs 10'

import fs from 'node:fs';
for (const d of fs.readFileSync('/opt/aicloser/.env','utf8').split('\n')) { if(!d.includes('=')||d.trim().startsWith('#'))continue; const i=d.indexOf('='); process.env[d.slice(0,i).trim()] ??= d.slice(i+1).trim(); }
const { pkGetConversations, pkGetMessages, refreshPancakePages } = await import('/opt/aicloser/src/pancake.js');
await refreshPancakePages().catch(()=>{});
const ds = JSON.parse(fs.readFileSync('/opt/aicloser/ai-enabled.json','utf8')).map(String).slice(0, Number(process.argv[2]||10));
let tongCmt=0, coPR=0, khongPR=0, loi=0;
const viDu=[];
for (const pageId of ds) {
  let convs=[]; try { convs = await pkGetConversations(pageId) || []; } catch { continue; }
  const cmt = convs.filter(c=>c.type==='COMMENT');
  for (const c of cmt.slice(0,10)) {
    tongCmt++;
    const custId = c.customers?.[0]?.id || c.from?.id;
    let msgs=[]; try { msgs = await pkGetMessages(pageId, c.id, custId) || []; } catch { loi++; continue; }
    const co = msgs.some(m => m.private_reply_conversation);
    if (co) { coPR++; if (viDu.length<3) viDu.push({page:pageId, conv:c.id, snippet:String(c.snippet||'').slice(0,60)}); } else khongPR++;
  }
  console.log(`page ${pageId}: ${cmt.length} hội thoại COMMENT trong mẫu 60`);
}
console.log(JSON.stringify({ tongCommentDo: tongCmt, daNhanRieng: coPR, chuaNhanRieng: khongPR, loiDoc: loi,
  tiLeNhanRieng: tongCmt ? Math.round(coPR/(coPR+khongPR)*1000)/10 : null, viDu }, null, 1));
