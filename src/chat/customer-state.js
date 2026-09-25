// Chỉ lưu dữ kiện khách; không có trường giá, quyền sở hữu, COD hay trạng thái đơn.
export function updateCustomer(input, profile, sourceText) {
  const limits = { name: 120, phone: 40, address: 1000, city: 120, tier: 200 };
  const norm = s => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  const source = norm(sourceText);
  const patch = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!(key in limits) && key !== 'qty') throw new Error('Không được sửa trường nghiệp vụ ngoài hồ sơ khách');
    if (key === 'qty') {
      if (!Number.isSafeInteger(value) || value < 1 || value > 1000 || !new RegExp(`(?:^|\\D)${value}(?:\\D|$)`).test(source))
        throw new Error('Số lượng chưa có căn cứ trong lời khách');
    } else {
      if (typeof value !== 'string' || !value.trim() || value.length > limits[key]) throw new Error('Trường hồ sơ không hợp lệ');
      const match = key === 'phone' ? value.replace(/\D/g, '') : norm(value);
      const evidence = key === 'phone' ? source.replace(/\D/g, '') : source;
      if (!match || (key === 'phone' && !/^\d{7,15}$/.test(match)) || !evidence.includes(match))
        throw new Error('Chỉ lưu thông tin khách thực sự cung cấp trong lượt này');
    }
    patch[key] = typeof value === 'string' ? value.trim() : value;
  }
  if (!Object.keys(patch).length) throw new Error('Không có trường hồ sơ cần cập nhật');
  Object.assign(profile, patch);
  return { ok: true, fields: Object.keys(patch) };
}
