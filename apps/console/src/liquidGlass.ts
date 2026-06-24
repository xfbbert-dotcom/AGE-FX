export type LiquidGlassButtonTone = "clear" | "cyan" | "violet" | "white";

export interface LiquidGlassCardOptions {
  eyebrow?: string;
  title: string;
  body: string;
  className?: string;
}

export interface LiquidGlassButtonOptions {
  label: string;
  tone?: LiquidGlassButtonTone;
  className?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderLiquidGlassCard(options: LiquidGlassCardOptions): string {
  const className = ["liquid-glass-card", options.className].filter(Boolean).join(" ");
  const eyebrow = options.eyebrow
    ? `<p class="liquid-glass-card__eyebrow">${escapeHtml(options.eyebrow)}</p>`
    : "";

  return `
    <section class="${escapeHtml(className)}">
      ${eyebrow}
      <h2 class="liquid-glass-card__title">${escapeHtml(options.title)}</h2>
      <p class="liquid-glass-card__body">${escapeHtml(options.body)}</p>
    </section>
  `;
}

export function renderLiquidGlassButton(options: LiquidGlassButtonOptions): string {
  const tone = options.tone ?? "clear";
  const className = ["liquid-glass-button", `liquid-glass-button--${tone}`, options.className]
    .filter(Boolean)
    .join(" ");

  return `<button class="${escapeHtml(className)}" type="button">${escapeHtml(options.label)}</button>`;
}
