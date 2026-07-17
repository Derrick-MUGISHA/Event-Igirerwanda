/* Renders admin-authored rich text. Content created by the editor is HTML;
   older plain-text content is shown with its line breaks preserved. A light
   sanitiser strips scripts and inline handlers before rendering. */

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

/* strip tags to a plain-text preview, for teasers that can't hold markup */
export function toPlainText(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitize(html: string) {
  return html
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function RichText({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;
  if (!looksLikeHtml(html)) {
    return <div className={`whitespace-pre-line ${className}`}>{html}</div>;
  }
  return (
    <div
      className={`[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
}
