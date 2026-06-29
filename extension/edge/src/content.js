(function (root) {
  const CAPTURE_INTERVAL_MS = 5000;
  const CAPTURE_MESSAGE_TYPE = "AGE_FX_CAPTURE";
  const INDICATOR_ID = "age-fx-capture-indicator";
  const MAX_EXTRACTED_TEXT_CHARS = 30000;
  const MAX_SNAPSHOT_BYTES = 1024 * 1024;
  const sentHashes = new Set();
  const pendingUploadSnapshots = [];

  function detectSource(pageUrl) {
    let host;

    try {
      host = new URL(pageUrl).hostname.toLowerCase();
    } catch {
      return null;
    }

    if (host === "chatgpt.com" || host.endsWith(".chatgpt.com")) {
      return "chatgpt";
    }

    if (host === "gemini.google.com" || host.endsWith(".gemini.google.com")) {
      return "gemini";
    }

    return null;
  }

  function normalizeMessageText(text) {
    return String(text ?? "").replace(/\s+/g, " ").trim();
  }

  function formatLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function bytesToHex(bytes) {
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(value) {
    const encoded = new TextEncoder().encode(value);
    const subtle = root.crypto?.subtle;

    if (!subtle?.digest) {
      return sha256HexSync(encoded);
    }

    const digest = await subtle.digest("SHA-256", encoded);

    return bytesToHex(new Uint8Array(digest));
  }

  function rightRotate(value, bits) {
    return (value >>> bits) | (value << (32 - bits));
  }

  function sha256HexSync(bytes) {
    const constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const hash = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
      0x1f83d9ab, 0x5be0cd19
    ];
    const message = [...bytes, 0x80];
    const bitLength = bytes.length * 8;

    while ((message.length % 64) !== 56) {
      message.push(0);
    }

    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    message.push(
      (high >>> 24) & 0xff,
      (high >>> 16) & 0xff,
      (high >>> 8) & 0xff,
      high & 0xff,
      (low >>> 24) & 0xff,
      (low >>> 16) & 0xff,
      (low >>> 8) & 0xff,
      low & 0xff
    );

    for (let chunkStart = 0; chunkStart < message.length; chunkStart += 64) {
      const words = new Array(64);

      for (let i = 0; i < 16; i += 1) {
        const offset = chunkStart + i * 4;
        words[i] =
          ((message[offset] << 24) |
            (message[offset + 1] << 16) |
            (message[offset + 2] << 8) |
            message[offset + 3]) >>>
          0;
      }

      for (let i = 16; i < 64; i += 1) {
        const s0 =
          rightRotate(words[i - 15], 7) ^
          rightRotate(words[i - 15], 18) ^
          (words[i - 15] >>> 3);
        const s1 =
          rightRotate(words[i - 2], 17) ^
          rightRotate(words[i - 2], 19) ^
          (words[i - 2] >>> 10);
        words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = hash;

      for (let i = 0; i < 64; i += 1) {
        const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + s1 + ch + constants[i] + words[i]) >>> 0;
        const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (s0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }

    return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
  }

  function contentHashPreimage(input) {
    if (typeof input === "string") {
      return input;
    }

    return JSON.stringify({
      source: input.source,
      pageUrl: String(input.pageUrl ?? "").trim(),
      messageRole: input.messageRole,
      messageText: normalizeMessageText(input.messageText)
    });
  }

  function normalizeNullableText(text) {
    const normalized = normalizeMessageText(text);

    return normalized.length > 0 ? normalized : null;
  }

  function attachmentHashPreimage(input) {
    return JSON.stringify({
      source: input.source,
      messageContentHash: String(input.messageContentHash ?? "").trim().toLowerCase(),
      attachmentType: input.attachmentType,
      label: normalizeMessageText(input.label),
      url: normalizeNullableText(input.url),
      mimeType: normalizeNullableText(input.mimeType),
      visibleText: normalizeNullableText(input.visibleText),
      extractedText: normalizeNullableText(input.extractedText),
      analysisText: normalizeNullableText(input.analysisText),
      snapshotDataUrl: normalizeNullableText(input.snapshotDataUrl)
    });
  }

  function createContentHash(input) {
    return sha256Hex(contentHashPreimage(input));
  }

  function createAttachmentHash(input) {
    return sha256Hex(attachmentHashPreimage(input));
  }

  function visibleText(element) {
    const style = root.getComputedStyle ? root.getComputedStyle(element) : null;

    if (style && (style.display === "none" || style.visibility === "hidden")) {
      return "";
    }

    return normalizeMessageText(element.textContent);
  }

  function getConversationTitle() {
    const title = normalizeMessageText(root.document?.title ?? "");

    return title.length > 0 ? title : null;
  }

  function absoluteUrl(value) {
    const normalized = normalizeNullableText(value);

    if (!normalized) {
      return null;
    }

    try {
      return new URL(normalized, root.location?.href).href;
    } catch {
      return normalized;
    }
  }

  function inferMimeTypeFromUrl(url) {
    const normalized = normalizeNullableText(url)?.toLowerCase();

    if (!normalized) {
      return null;
    }

    if (/\.(png|apng)(?:[?#]|$)/.test(normalized)) return "image/png";
    if (/\.(jpe?g)(?:[?#]|$)/.test(normalized)) return "image/jpeg";
    if (/\.(gif)(?:[?#]|$)/.test(normalized)) return "image/gif";
    if (/\.(webp)(?:[?#]|$)/.test(normalized)) return "image/webp";
    if (/\.(pdf)(?:[?#]|$)/.test(normalized)) return "application/pdf";
    if (/\.(docx)(?:[?#]|$)/.test(normalized)) {
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    if (/\.(xlsx)(?:[?#]|$)/.test(normalized)) {
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (/\.(txt)(?:[?#]|$)/.test(normalized)) return "text/plain";
    if (/\.(md|markdown)(?:[?#]|$)/.test(normalized)) return "text/markdown";

    return null;
  }

  function isTextLikeFile(file) {
    const type = normalizeNullableText(file?.type)?.toLowerCase() ?? "";
    const name = normalizeNullableText(file?.name)?.toLowerCase() ?? "";

    return (
      type.startsWith("text/") ||
      [
        "application/json",
        "application/xml",
        "application/yaml",
        "application/x-yaml"
      ].includes(type) ||
      /\.(txt|md|markdown|csv|json|xml|yaml|yml|log)$/i.test(name)
    );
  }

  function isPdfFile(file) {
    const type = normalizeNullableText(file?.type)?.toLowerCase() ?? "";
    const name = normalizeNullableText(file?.name)?.toLowerCase() ?? "";

    return type === "application/pdf" || /\.pdf$/i.test(name);
  }

  function decodePdfEscapes(value) {
    return value
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
  }

  async function readPdfTextPreview(file) {
    if (!isPdfFile(file) || typeof file?.arrayBuffer !== "function") {
      return null;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const binaryText = new TextDecoder("latin1").decode(bytes);
      const literalStrings = [...binaryText.matchAll(/\(((?:\\.|[^\\)]){2,})\)/g)]
        .map((match) => decodePdfEscapes(match[1]))
        .filter((value) => /[A-Za-z0-9\u0080-\uffff]{3,}/.test(value));
      const streamText = literalStrings.join("\n").replace(/\s+\n/g, "\n").trim();

      return streamText.length > 0 ? streamText.slice(0, MAX_EXTRACTED_TEXT_CHARS) : null;
    } catch {
      return null;
    }
  }

  async function readFileTextPreview(file) {
    if (isPdfFile(file)) {
      return readPdfTextPreview(file);
    }

    if (isTextLikeFile(file) && typeof file?.text === "function") {
      try {
        const text = await file.text();

        return String(text).slice(0, MAX_EXTRACTED_TEXT_CHARS);
      } catch {
        return null;
      }
    }

    return null;
  }

  async function imageDimensions(file, mimeType) {
    if (!mimeType?.startsWith("image/") || typeof root.createImageBitmap !== "function") {
      return null;
    }

    try {
      const bitmap = await root.createImageBitmap(file);
      const dimensions = {
        width: Number(bitmap.width),
        height: Number(bitmap.height)
      };

      if (typeof bitmap.close === "function") {
        bitmap.close();
      }

      return dimensions.width > 0 && dimensions.height > 0 ? dimensions : null;
    } catch {
      return null;
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return root.btoa(binary);
  }

  async function imageSnapshotDataUrl(file, mimeType) {
    if (
      !mimeType?.startsWith("image/") ||
      Number(file?.size ?? 0) > MAX_SNAPSHOT_BYTES ||
      typeof file?.arrayBuffer !== "function"
    ) {
      return null;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
    } catch {
      return null;
    }
  }

  function uploadAnalysisText(file, mimeType, extractedText, dimensions = null) {
    const size = Number(file?.size ?? 0);

    if (mimeType?.startsWith("image/")) {
      const dimensionText = dimensions
        ? ` Image dimensions: ${dimensions.width}x${dimensions.height}.`
        : "";

      return `Local image upload captured for message binding. File size: ${size} bytes.${dimensionText}`;
    }

    if (isPdfFile(file)) {
      return extractedText
        ? `PDF text preview extracted locally. File size: ${size} bytes.`
        : `PDF upload captured for message binding, but no readable text layer was found locally. File size: ${size} bytes.`;
    }

    return extractedText === null
      ? `Local upload captured for message binding. File size: ${size} bytes.`
      : null;
  }

  async function rememberSelectedFiles(files) {
    const source = detectSource(
      root.document?.location?.href ?? root.document?.URL ?? root.location?.href
    );

    if (!source || !files) {
      return [];
    }

    const snapshots = [];

    for (const file of [...files]) {
      const name = normalizeNullableText(file?.name) ?? "local upload";
      const mimeType = normalizeNullableText(file?.type) ?? inferMimeTypeFromUrl(name);
      const extractedText = await readFileTextPreview(file);
      const dimensions = await imageDimensions(file, mimeType);
      const snapshotDataUrl = await imageSnapshotDataUrl(file, mimeType);
      const attachmentType = mimeType?.startsWith("image/") ? "image" : "file";

      snapshots.push({
        source,
        attachmentType,
        label: name,
        url: null,
        mimeType,
        visibleText: `local upload: ${name}`,
        extractedText,
        snapshotDataUrl,
        analysisText: uploadAnalysisText(file, mimeType, extractedText, dimensions)
      });
    }

    pendingUploadSnapshots.push(...snapshots);

    return snapshots;
  }

  function isFileLikeLink(link) {
    const href = link.getAttribute("href") ?? "";
    const label = visibleText(link);
    const download = link.getAttribute("download");
    const combined = `${href} ${label} ${download ?? ""}`.toLowerCase();

    return Boolean(
      download ||
        /\.(pdf|docx?|xlsx?|pptx?|txt|md|markdown|csv|zip|png|jpe?g|gif|webp)(?:[?#\s]|$)/i.test(
          combined
        ) ||
        /\/(?:file|files|attachment|download|backend-api)\b/i.test(combined)
    );
  }

  function uniqueAttachments(attachments) {
    const seen = new Set();
    const unique = [];

    for (const attachment of attachments) {
      const key = [
        attachment.attachmentType,
        attachment.url ?? "",
        attachment.label,
        attachment.visibleText ?? ""
      ].join("|");

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(attachment);
    }

    return unique;
  }

  function takePendingUploadSnapshotsForMessage(baseMessage, options = {}) {
    if (
      baseMessage.messageRole !== "user" ||
      pendingUploadSnapshots.length === 0 ||
      options.sentHashes?.has?.(baseMessage.contentHash)
    ) {
      return [];
    }

    return pendingUploadSnapshots.splice(0).map((snapshot) => ({
      ...snapshot,
      messageContentHash: baseMessage.contentHash
    }));
  }

  async function extractMessageAttachments(element, baseMessage, options = {}) {
    const attachments = [];

    for (const image of element.querySelectorAll("img")) {
      const src = absoluteUrl(image.currentSrc || image.src || image.getAttribute("src"));
      const alt = normalizeNullableText(image.getAttribute("alt"));
      const title = normalizeNullableText(image.getAttribute("title"));
      const label = alt || title || "visible image";
      const visibleText = alt || title || label;

      if (!src && !visibleText) {
        continue;
      }

      attachments.push({
        source: baseMessage.source,
        messageContentHash: baseMessage.contentHash,
        attachmentType: "image",
        label,
        url: src,
        mimeType: inferMimeTypeFromUrl(src) ?? "image/unknown",
        visibleText,
        extractedText: null,
        analysisText: null
      });
    }

    for (const link of element.querySelectorAll("a[href]")) {
      if (!isFileLikeLink(link)) {
        continue;
      }

      const href = absoluteUrl(link.getAttribute("href"));
      const label =
        normalizeNullableText(visibleText(link)) ||
        normalizeNullableText(link.getAttribute("download")) ||
        normalizeNullableText(href) ||
        "visible file";
      const mimeType = normalizeNullableText(link.getAttribute("type")) ?? inferMimeTypeFromUrl(href);

      attachments.push({
        source: baseMessage.source,
        messageContentHash: baseMessage.contentHash,
        attachmentType: mimeType?.startsWith("image/") ? "image" : "file",
        label,
        url: href,
        mimeType,
        visibleText: label,
        extractedText: null,
        analysisText: null
      });
    }

    const unique = uniqueAttachments(attachments);
    const pendingUploads = takePendingUploadSnapshotsForMessage(baseMessage, options);

    return Promise.all(
      [...unique, ...pendingUploads].map(async (attachment) => ({
        ...attachment,
        attachmentHash: await createAttachmentHash(attachment)
      }))
    );
  }

  function uniqueElements(elements) {
    return [...new Set(elements.filter(Boolean))];
  }

  function collectElements(selectors) {
    return uniqueElements(
      selectors.flatMap((selector) => [...root.document.querySelectorAll(selector)])
    );
  }

  function roleFromHint(hint, fallbackRole = "unknown") {
    const normalizedHint = normalizeMessageText(hint).toLowerCase();

    if (
      normalizedHint.includes("user") ||
      normalizedHint.includes("human") ||
      normalizedHint.includes("you") ||
      normalizedHint.includes("用户") ||
      normalizedHint.includes("你")
    ) {
      return "user";
    }

    if (
      normalizedHint.includes("assistant") ||
      normalizedHint.includes("chatgpt") ||
      normalizedHint.includes("model") ||
      normalizedHint.includes("gemini") ||
      normalizedHint.includes("response") ||
      normalizedHint.includes("回复")
    ) {
      return "assistant";
    }

    return fallbackRole;
  }

  function inferMessageRole(element, fallbackRole = "unknown") {
    const tagName = element.tagName?.toLowerCase() ?? "";

    if (tagName === "user-query") {
      return "user";
    }

    if (tagName === "model-response") {
      return "assistant";
    }

    const hint = [
      element.getAttribute("data-message-author-role"),
      element.getAttribute("data-message-role"),
      element.getAttribute("data-role"),
      element.getAttribute("aria-label"),
      element.getAttribute("data-testid"),
      element.getAttribute("data-test-id"),
      element.className
    ]
      .filter(Boolean)
      .join(" ");

    return roleFromHint(hint, fallbackRole);
  }

  function getChatGptMessageElements() {
    return collectElements([
      "article[data-message-author-role]",
      '[data-message-author-role]',
      '[data-message-id]',
      '[data-testid^="conversation-turn"]',
      '[data-testid*="conversation-turn"]',
      '[role="article"]'
    ]).map((element, index) => ({
      element,
      role: inferMessageRole(element, index % 2 === 0 ? "user" : "assistant")
    }));
  }

  function getGeminiMessageElements() {
    return collectElements([
      '[data-test-id="conversation-turn"]',
      '[data-test-id^="conversation-turn"]',
      '[data-testid^="conversation-turn"]',
      "user-query",
      "model-response",
      '[data-test-id*="user-query"]',
      '[data-test-id*="model-response"]'
    ]).map((element) => ({
      element,
      role: inferMessageRole(element)
    }));
  }

  async function extractVisibleMessages(pageUrl = root.location?.href, options = {}) {
    const source = detectSource(pageUrl);

    if (!source || !root.document) {
      return [];
    }

    const now = new Date();
    const elements =
      source === "chatgpt" ? getChatGptMessageElements() : getGeminiMessageElements();
    const messages = [];

    for (const { element, role } of elements) {
      const messageText = visibleText(element);

      if (!messageText) {
        continue;
      }

      const baseMessage = {
        source,
        capturedAt: now.toISOString(),
        conversationDate: formatLocalDate(now),
        conversationTitle: getConversationTitle(),
        pageUrl,
        messageRole: role,
        messageText
      };
      const contentHash = await createContentHash(baseMessage);
      const messageWithHash = {
        ...baseMessage,
        contentHash
      };
      const attachments = await extractMessageAttachments(element, messageWithHash, options);

      messages.push({
        ...messageWithHash,
        ...(attachments.length > 0 ? { attachments } : {})
      });
    }

    return messages;
  }

  function filterUnsentMessages(messages, hashes = sentHashes) {
    const unsent = [];

    for (const message of messages) {
      if (hashes.has(message.contentHash)) {
        continue;
      }

      hashes.add(message.contentHash);
      unsent.push(message);
    }

    return unsent;
  }

  function sendCaptureMessage(messages, runtime) {
    const activeRuntime =
      runtime ?? (typeof chrome !== "undefined" ? chrome.runtime : root.chrome?.runtime);

    if (!activeRuntime?.sendMessage) {
      return Promise.resolve({ ok: false, error: "Extension runtime unavailable" });
    }

    return new Promise((resolve) => {
      activeRuntime.sendMessage({ type: CAPTURE_MESSAGE_TYPE, messages }, (response) => {
        const runtimeError = activeRuntime.lastError;

        if (runtimeError) {
          resolve({ ok: false, error: runtimeError.message ?? String(runtimeError) });
          return;
        }

        resolve(response ?? { ok: false, error: "No capture response" });
      });
    });
  }

  function ensureIndicator() {
    if (!root.document?.body) {
      return null;
    }

    let indicator = root.document.getElementById(INDICATOR_ID);

    if (!indicator) {
      indicator = root.document.createElement("div");
      indicator.id = INDICATOR_ID;
      indicator.setAttribute("aria-live", "polite");
      root.document.body.append(indicator);
    }

    return indicator;
  }

  function setIndicatorState(state, detail = {}) {
    const indicator = ensureIndicator();

    if (!indicator) {
      return;
    }

    const countText =
      typeof detail.count === "number" ? ` · ${detail.count} msg` : "";
    indicator.textContent =
      state === "captured"
        ? `AGE-FX captured${countText}`
        : state === "offline"
          ? `AGE-FX offline${countText}`
          : `AGE-FX armed${countText}`;
    indicator.dataset.state = state;
    indicator.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "right:16px",
      "bottom:16px",
      "padding:8px 10px",
      "border-radius:8px",
      "font:12px/1.2 system-ui,sans-serif",
      "color:#ffffff",
      "background:#2f80ed",
      "box-shadow:0 8px 24px rgba(0,0,0,.18)",
      "pointer-events:none"
    ].join(";");

    if (state === "offline") {
      indicator.style.background = "#667085";
    } else if (state === "captured") {
      indicator.style.background = "#0f9f8f";
    }
  }

  async function captureOnce() {
    const pageUrl = root.location?.href;
    const source = detectSource(pageUrl);

    if (!source) {
      return;
    }

    setIndicatorState("armed");
    const visibleMessages = await extractVisibleMessages(pageUrl);
    const messages = filterUnsentMessages(visibleMessages, new Set(sentHashes));

    if (messages.length === 0) {
      setIndicatorState("armed", { count: visibleMessages.length });
      return;
    }

    setIndicatorState("armed", { count: messages.length });
    const response = await sendCaptureMessage(messages);

    if (response.ok) {
      for (const message of messages) {
        sentHashes.add(message.contentHash);
      }
    }

    setIndicatorState(response.ok ? "captured" : "offline", { count: messages.length });
  }

  function startCaptureLoop() {
    if (!detectSource(root.location?.href) || !root.document) {
      return;
    }

    setIndicatorState("armed");
    root.document.addEventListener(
      "change",
      (event) => {
        const target = event.target;

        if (target?.matches?.('input[type="file"]') && target.files?.length) {
          void rememberSelectedFiles(target.files);
        }
      },
      true
    );
    root.setInterval(captureOnce, CAPTURE_INTERVAL_MS);
    void captureOnce();
  }

  const api = {
    createContentHash,
    createAttachmentHash,
    detectSource,
    extractVisibleMessages,
    filterUnsentMessages,
    formatLocalDate,
    pendingUploadSnapshots,
    rememberSelectedFiles,
    normalizeMessageText,
    sendCaptureMessage,
    sentHashes,
    sha256Hex,
    startCaptureLoop
  };

  root.AgeFxCapture = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof browser !== "undefined" || typeof chrome !== "undefined") {
    if (root.document?.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", startCaptureLoop, { once: true });
    } else {
      startCaptureLoop();
    }
  }
})(globalThis);
