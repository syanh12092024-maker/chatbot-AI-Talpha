// BỘ DÒ ĐIỂM KIỂM CHẶN 3, NỬA THỨ HAI — "BOTCAKE KÉO VỀ BAO NHIÊU KHÁCH TỪ BÌNH LUẬN".
// CHỈ ĐỌC. Không gửi tin, không sửa gì.
//
// API Botcake không có endpoint thống kê, nên đo GIÁN TIẾP từ dữ liệu Pancake. Bản trả về
// của Pancake có sẵn ba trường nói đúng điều cần biết (soi bằng tay 22/08/2026):
//   · hội thoại: `type` = INBOX | COMMENT · `post_id` = bài viết đẻ ra hội thoại này
//   · tin nhắn : `private_reply_conversation` — bình luận này đã được nhắn riêng chưa
//
// Hội thoại INBOX **có `post_id`** = khách vào hộp thư từ một bài viết, tức là đi qua
// đường bình luận → nhắn riêng. Đây chính là phần Botcake Private Replies kéo về.
// Hội thoại INBOX **không có `post_id`** = khách tự bấm nhắn tin, hoặc từ quảng cáo
// click-to-Messenger.
//
// LẦN ĐO ĐẦU (bỏ) dùng cách "ai nói trước": lẫn cả ghi chú hệ thống của Pancake
// ("X đã trả lời một quảng cáo") và tin rỗng `<div></div>`, nên cho con số phồng.
// Cách này đọc thẳng trường có sẵn, không đoán.
//
// GIỚI HẠN — phải nói ra:
//   · Pancake trả về hội thoại theo trang, đây là MẪU gần nhất, không phải toàn bộ.
//   · `post_id` cho biết hội thoại tới từ bài viết, KHÔNG cho biết ai nhắn riêng — Botcake,
//     sale, hay một công cụ khác. Nên đây là **trần trên** của phần Botcake kéo về.
//   · Muốn con số chắc hơn thì so hai mốc trước và sau khi tắt Botcake trên 3 page thử.
//
//   scp v3/docs/kiem-chan/do-nguon-hoi-thoai.mjs root@169.58.33.8:/tmp/
//   ssh root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-nguon-hoi-thoai.mjs [soPage]'

import fs from 'node:fs';

for (const d of fs.readFileSync('/opt/aicloser/.env', 'utf8').split('\n')) {
  if (!d.includes('=') || d.trim().startsWith('#')) continue;
  const i = d.indexOf('=');
  process.env[d.slice(0, i).trim()] ??= d.slice(i + 1).trim();
}

const SO_PAGE = Number(process.argv[2] || 8);
const { pkGetConversations, refreshPancakePages } = await import('/opt/aicloser/src/pancake.js');
const doc = (f, m = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return m; } };

await refreshPancakePages().catch(() => {});
const dsPage = (doc('/opt/aicloser/ai-enabled.json', []) || []).map(String).slice(0, SO_PAGE);
console.log(`Đo trên ${dsPage.length} page đang bật AI — mẫu hội thoại gần nhất của mỗi page.\n`);

const ra = { luc: new Date().toISOString(), soPage: dsPage.length, page: [] };

for (const pageId of dsPage) {
  let convs = [];
  try { convs = (await pkGetConversations(pageId)) || []; } catch { convs = []; }
  if (!Array.isArray(convs) || !convs.length) {
    ra.page.push({ pageId, mau: 0, ghiChu: 'không đọc được hội thoại nào' });
    console.log(`page ${pageId}: không đọc được hội thoại nào`);
    continue;
  }
  const theoLoai = {};
  let inboxCoPost = 0; let inboxKhongPost = 0;
  const moc = { cu: Infinity, moi: -Infinity };
  for (const c of convs) {
    const loai = c.type || '(trống)';
    theoLoai[loai] = (theoLoai[loai] || 0) + 1;
    if (loai === 'INBOX') { if (c.post_id) inboxCoPost++; else inboxKhongPost++; }
    const t = new Date(c.inserted_at || c.updated_at || 0).getTime();
    if (t) { moc.cu = Math.min(moc.cu, t); moc.moi = Math.max(moc.moi, t); }
  }
  const tongInbox = inboxCoPost + inboxKhongPost;
  const dong = {
    pageId, mau: convs.length, theoLoai,
    inboxCoPost, inboxKhongPost,
    tiLeTuBinhLuan: tongInbox ? Math.round((inboxCoPost / tongInbox) * 1000) / 10 : null,
    khoangNgay: Number.isFinite(moc.cu)
      ? { tu: new Date(moc.cu).toISOString().slice(0, 10), den: new Date(moc.moi).toISOString().slice(0, 10) }
      : null,
  };
  ra.page.push(dong);
  console.log(`page ${pageId}: mẫu ${convs.length} · ${JSON.stringify(theoLoai)} · inbox từ bài viết ${inboxCoPost}/${tongInbox} (${dong.tiLeTuBinhLuan}%) · ${dong.khoangNgay ? `${dong.khoangNgay.tu}→${dong.khoangNgay.den}` : ''}`);
}

const T = ra.page.reduce((a, p) => ({
  co: a.co + (p.inboxCoPost || 0), khong: a.khong + (p.inboxKhongPost || 0),
}), { co: 0, khong: 0 });
ra.tongKet = {
  inboxTuBaiViet: T.co, inboxKhongTuBaiViet: T.khong,
  tongInbox: T.co + T.khong,
  tiLeTuBinhLuan: (T.co + T.khong) ? Math.round((T.co / (T.co + T.khong)) * 1000) / 10 : null,
};
console.log('\nTổng:', JSON.stringify(ra.tongKet));
console.log('\n===KETQUA_JSON===');
console.log(JSON.stringify(ra, null, 2));
