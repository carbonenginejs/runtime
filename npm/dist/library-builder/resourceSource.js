const TEXT_DECODER = new TextDecoder();

/** Creates the byte-read capability shared by fetch and injected sources. */
function createAudioResourceReader(options = {}) {
  const source = options.source ?? options.read ?? null;
  if (source !== null) {
    const read = typeof source === "function" ? source : source.read ?? source.Read ?? source.Fetch;
    if (typeof read !== "function") {
      throw new TypeError("Audio resource source must be a function or expose read, Read, or Fetch");
    }
    return async (path, context = {}) => normalizeAudioResourceBytes(await read.call(typeof source === "function" ? null : source, path, context), path);
  }
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const fetchReceiver = options.fetchThis ?? globalThis;
  if (typeof fetchImplementation !== "function") {
    throw new TypeError("Audio resource construction requires a source or fetch implementation");
  }
  return async (path, context = {}) => {
    const url = resolveResourceUrl(path, options);
    const response = await fetchImplementation.call(fetchReceiver, url, {
      ...(options.fetchOptions ?? {}),
      ...(context.signal ? {
        signal: context.signal
      } : {})
    });
    if (!response || response.ok === false) {
      throw new Error(`Audio resource fetch failed for ${path}: ${response?.status ?? "unknown"}`);
    }
    return normalizeAudioResourceBytes(response, path);
  };
}

/** Decodes one caller-supplied index payload without assuming Node Buffer. */
function decodeAudioResourceText(bytes) {
  return TEXT_DECODER.decode(bytes);
}

/** Decodes one caller-supplied JSON payload without assuming Node Buffer. */
function decodeAudioResourceJson(bytes, path) {
  try {
    return JSON.parse(decodeAudioResourceText(bytes));
  } catch (error) {
    throw new TypeError(`Audio resource is not valid JSON: ${path}`, {
      cause: error
    });
  }
}
function resolveResourceUrl(path, options) {
  if (typeof options.resolveUrl === "function") {
    return options.resolveUrl(path);
  }
  if (options.baseUrl === undefined || options.baseUrl === null) {
    return path;
  }
  const base = String(options.baseUrl).replace(/\/+$/u, "");
  const relative = String(path).replace(/^[a-z]+:\/*/iu, "").replace(/^\/+/, "");
  return `${base}/${relative}`;
}
async function normalizeAudioResourceBytes(value, path) {
  let input = value;
  if (input && typeof input.arrayBuffer === "function") {
    input = await input.arrayBuffer();
  } else if (input && typeof input === "object" && "bytes" in input) {
    input = input.bytes;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError(`Audio resource source returned no bytes for ${path}`);
}

export { createAudioResourceReader, decodeAudioResourceJson, decodeAudioResourceText, normalizeAudioResourceBytes };
//# sourceMappingURL=resourceSource.js.map
