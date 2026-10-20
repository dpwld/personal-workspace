export async function readLimited(message, maximum) {
  if (Number(message.headers.get('content-length')) > maximum) throw new Error('Body too large.');
  if (!message.body) return Buffer.alloc(0);
  const reader = message.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > maximum) throw new Error('Body too large.');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
}
