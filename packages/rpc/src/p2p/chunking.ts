interface Utf8Encoder {
  encode(text: string): Uint8Array;
}
let encoder: Utf8Encoder | undefined;
function encode(text: string): Uint8Array {
  if (!encoder) {
    const host = globalThis as unknown as {
      TextEncoder: new () => Utf8Encoder;
    };
    encoder = new host.TextEncoder();
  }
  return encoder.encode(text);
}

/** Measures the legacy UTF-8 string payload size. */
export function estimateBytes(text: string): number {
  return encode(text).byteLength;
}

/** Splits strings using the existing legacy byte-bound algorithm. */
export function splitIntoChunks(payload: string, maxBytes: number): string[] {
  if (maxBytes <= 0) return [payload];
  if (estimateBytes(payload) <= maxBytes) return [payload];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < payload.length) {
    let end = Math.min(
      payload.length,
      cursor + Math.max(16, Math.floor(maxBytes / 2)),
    );
    let part = payload.slice(cursor, end);
    while (part.length > 1 && estimateBytes(part) > maxBytes) {
      end = Math.max(cursor + 1, end - 1);
      part = payload.slice(cursor, end);
    }
    chunks.push(part);
    cursor = end;
  }
  return chunks;
}

/** Collects one legacy stream until all declared fragments arrive. */
export class IncomingChunkBuffer {
  total: number;
  parts = new Map<number, string>();

  constructor(total: number) {
    this.total = total;
  }

  add(index: number, payload: string) {
    if (index < 0 || index >= this.total) return;
    this.parts.set(index, payload);
  }

  missingIndices() {
    const missing: number[] = [];
    for (let i = 0; i < this.total; i++) {
      if (!this.parts.has(i)) missing.push(i);
    }
    return missing;
  }

  isComplete() {
    return this.parts.size === this.total;
  }

  toPayload() {
    let acc = "";
    for (let i = 0; i < this.total; i++) {
      const part = this.parts.get(i);
      if (part === undefined) {
        throw new Error(`Missing chunk ${i}`);
      }
      acc += part;
    }
    return acc;
  }
}
