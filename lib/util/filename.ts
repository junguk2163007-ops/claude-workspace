/** 파일명에 쓸 수 없는 문자와 공백을 정리한다. 한글은 유지. */
export function sanitizeFilePart(s: string | null | undefined): string {
  const cleaned = (s || '')
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/[^\p{L}\p{N}_.\-()]/gu, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '');
  return cleaned.slice(0, 80) || '지원처';
}

export function docFileName(kind: '이력서' | '자기소개서' | '지원서류', name: string, site: string, ext: 'pdf' | 'zip'): string {
  return `${kind}_${sanitizeFilePart(name)}_${sanitizeFilePart(site)}.${ext}`;
}

/** RFC 5987/6266: ASCII fallback + filename* (UTF-8) */
export function contentDisposition(filename: string, disposition: 'inline' | 'attachment' = 'attachment'): string {
  const ascii =
    filename
      .normalize('NFKD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\%;]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '') || 'download';
  const ext = filename.match(/\.[a-z0-9]+$/i)?.[0] ?? '';
  const fallback = ascii.endsWith(ext) && ascii !== ext ? ascii : `document${ext}`;
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
