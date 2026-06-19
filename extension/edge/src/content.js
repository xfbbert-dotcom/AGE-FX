(function (root) {
  const CAPTURE_ENDPOINT = "http://127.0.0.1:3987/api/capture";
  const CAPTURE_INTERVAL_MS = 5000;
  const INDICATOR_ID = "age-fx-capture-indicator";
  const sentHashes = new Set();

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

  function createContentHash(input) {
    return sha256Hex(contentHashPreimage(input));
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

  function getChatGptMessageElements() {
    return [...root.document.querySelectorAll('article[data-message-author-role]')].map(
      (element) => ({
        element,
        role:
          element.getAttribute("data-message-author-role") === "assistant"
            ? "assistant"
            : "user"
      })
    );
  }

  function getGeminiMessageElements() {
    return [...root.document.querySelectorAll('[data-test-id="conversation-turn"]')].map(
      (element) => {
        const roleHint = normalizeMessageText(
          element.getAttribute("data-message-role") ||
            element.getAttribute("data-role") ||
            element.getAttribute("aria-label") ||
            ""
        ).toLowerCase();
        const role =
          roleHint.includes("user") || roleHint.includes("human")
            ? "user"
            : roleHint.includes("assistant") ||
                roleHint.includes("model") ||
                roleHint.includes("gemini")
              ? "assistant"
              : "unknown";

        return { element, role };
      }
    );
  }

  async function extractVisibleMessages(pageUrl = root.location?.href) {
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

      messages.push({
        ...baseMessage,
        contentHash: await createContentHash(baseMessage)
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

  function setIndicatorState(state) {
    const indicator = ensureIndicator();

    if (!indicator) {
      return;
    }

    indicator.textContent =
      state === "captured" ? "AGE-FX captured" : state === "offline" ? "AGE-FX offline" : "AGE-FX armed";
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
    const messages = filterUnsentMessages(await extractVisibleMessages(pageUrl));

    if (messages.length === 0) {
      return;
    }

    try {
      const response = await root.fetch(CAPTURE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        for (const message of messages) {
          sentHashes.delete(message.contentHash);
        }
      }

      setIndicatorState(response.ok ? "captured" : "offline");
    } catch {
      for (const message of messages) {
        sentHashes.delete(message.contentHash);
      }

      setIndicatorState("offline");
    }
  }

  function startCaptureLoop() {
    if (!detectSource(root.location?.href) || !root.document) {
      return;
    }

    setIndicatorState("armed");
    root.setInterval(captureOnce, CAPTURE_INTERVAL_MS);
    void captureOnce();
  }

  const api = {
    createContentHash,
    detectSource,
    extractVisibleMessages,
    filterUnsentMessages,
    formatLocalDate,
    normalizeMessageText,
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
