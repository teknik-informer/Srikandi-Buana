export function listPage(total: number, requestedPage: number, size = 25) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.max(1, Math.min(Math.trunc(requestedPage) || 1, pages));
  const offset = (page - 1) * size;
  return { page, pages, offset, end: Math.min(offset + size, total), start: total ? offset + 1 : 0 };
}
