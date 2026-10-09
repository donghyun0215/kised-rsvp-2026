// People type "linkedin.com/in/x" or "www.site.com" without a scheme; as an
// href that resolves relative to our own domain. Always hand out absolute URLs.
export function absUrl(raw?: string | null): string {
  const v = String(raw ?? "").trim().replace(/\s+/g, "");
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, "")}`;
}
