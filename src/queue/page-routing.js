/** Cùng allowlist cho worker, webhook và việc loại Page khỏi poll legacy. */
export function dsPageV3(env = process.env) {
  return String(env.V3_PAGE_XU_LY || '').split(/[,\s]+/).filter(Boolean);
}
export function pageThuocV3(pageId, env = process.env) {
  return dsPageV3(env).includes(String(pageId));
}
