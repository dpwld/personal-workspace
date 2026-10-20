import sanitizeHtml from "sanitize-html";

// Keep the editor's text, tables, checkboxes and image layout, without executable HTML.
export function cleanMemo(html) {
  return sanitizeHtml(String(html ?? ""), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "input", "font"],
    allowedAttributes: {
      "*": ["style", "class", "data-todo", "data-resize", "data-path"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      input: ["type", "checked", "disabled"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
      font: ["color"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i, /^var\(--[\w-]+\)$/],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(bold|normal|[1-9]00)$/],
        "font-style": [/^(italic|normal)$/],
        "text-decoration": [/^(underline|line-through|none)$/],
        width: [/^\d+(\.\d+)?(px|%)$/],
        "max-width": [/^\d+(\.\d+)?(px|%)$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      input: (_name, attrs) => ({
        tagName: "input",
        attribs: { type: "checkbox", ...(Object.hasOwn(attrs, "checked") ? { checked: "" } : {}) },
      }),
    },
  });
}
