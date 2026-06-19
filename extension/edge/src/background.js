(function (root) {
  const CAPTURE_ENDPOINT = "http://127.0.0.1:3987/api/capture";
  const CAPTURE_MESSAGE_TYPE = "AGE_FX_CAPTURE";

  function normalizeError(error) {
    return error instanceof Error ? error.message : String(error ?? "Unknown error");
  }

  async function readFailureBody(response) {
    if (!response.text) {
      return "";
    }

    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  async function postCapture(messages, fetchImpl = fetch) {
    try {
      const response = await fetchImpl(CAPTURE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        const body = await readFailureBody(response);
        const detail = [response.status, response.statusText, body]
          .filter((part) => part !== undefined && part !== null && String(part).length > 0)
          .join(" ");

        return { ok: false, error: `Capture failed: ${detail}` };
      }

      const payload = await response.json();

      return {
        ok: true,
        inserted: Number(payload.inserted ?? 0),
        duplicates: Number(payload.duplicates ?? 0)
      };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  }

  function handleRuntimeMessage(message, _sender, sendResponse) {
    if (message?.type !== CAPTURE_MESSAGE_TYPE) {
      return false;
    }

    postCapture(message.messages).then(sendResponse, (error) => {
      sendResponse({ ok: false, error: normalizeError(error) });
    });

    return true;
  }

  const api = {
    CAPTURE_MESSAGE_TYPE,
    handleRuntimeMessage,
    postCapture
  };

  root.AgeFxBackground = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root.chrome?.runtime?.onMessage) {
    root.chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  }
})(globalThis);
