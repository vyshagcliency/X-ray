import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "br",
  "span",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
