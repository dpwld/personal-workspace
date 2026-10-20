export function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value);
}

export function validGoals(doc) {
  const text = (v) => typeof v === "string" && v.length <= 2000;
  return !!doc && text(doc.motto) && text(doc.center)
    && Array.isArray(doc.roots) && doc.roots.length === 4
    && doc.roots.every((r) => r && text(r.tag) && text(r.title) && text(r.desc))
    && Array.isArray(doc.mandala) && doc.mandala.length === 8
    && doc.mandala.every((m) => m && text(m.key) && text(m.name)
      && Array.isArray(m.items) && m.items.length <= 8 && m.items.every(text));
}
