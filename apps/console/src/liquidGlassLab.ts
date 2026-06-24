import "./styles.css";
import { renderLiquidGlassButton, renderLiquidGlassCard } from "./liquidGlass.js";

const lab = document.querySelector<HTMLElement>("#liquid-glass-lab");

if (lab) {
  lab.innerHTML = `
    <div class="liquid-material-stage">
      <div class="liquid-material-board">
        <header class="liquid-material-header">
          <p>Liquid Glass Material Lab</p>
          <span>AGE-FX material prototype</span>
        </header>
        <div class="liquid-material-grid">
          <div class="liquid-material-column">
            ${renderLiquidGlassButton({ label: "Primary", tone: "violet" })}
            ${renderLiquidGlassButton({ label: "Secondary", tone: "cyan" })}
            ${renderLiquidGlassButton({ label: "+", tone: "white", className: "liquid-glass-button--round" })}
            ${renderLiquidGlassButton({ label: "Create workspace", tone: "clear", className: "liquid-glass-button--search" })}
            ${renderLiquidGlassCard({
              title: "Workspace",
              body: "Clear glass card with refractive rim, soft body shadow, and warm ambient light.",
              className: "liquid-glass-card--compact"
            })}
          </div>
          <div class="liquid-material-column liquid-material-column--wide">
            ${renderLiquidGlassCard({
              eyebrow: "C-FUNNELS",
              title: "Search projects...",
              body: "This card exists only to tune the transparent jelly material before replacing the real console surfaces."
            })}
            <div class="liquid-material-row">
              ${renderLiquidGlassButton({ label: "Search projects...", tone: "clear", className: "liquid-glass-button--wide" })}
              ${renderLiquidGlassButton({ label: "+", tone: "violet", className: "liquid-glass-button--round" })}
            </div>
            ${renderLiquidGlassCard({
              eyebrow: "Invite member",
              title: "Upgrade plan",
              body: "Cyan, lavender, and pink reflections are local caustics, not a gray metal panel.",
              className: "liquid-glass-card--neon"
            })}
          </div>
        </div>
      </div>
    </div>
  `;
}
