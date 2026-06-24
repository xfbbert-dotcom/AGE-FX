import { describe, expect, it } from "vitest";
import { renderLiquidGlassButton, renderLiquidGlassCard } from "../src/liquidGlass.js";

describe("liquid glass material components", () => {
  it("renders a liquid glass card with escaped content", () => {
    const html = renderLiquidGlassCard({
      eyebrow: "C-Funnels",
      title: "<Liquid>",
      body: `"Glass" & caustics`
    });

    expect(html).toContain("liquid-glass-card");
    expect(html).toContain("C-Funnels");
    expect(html).toContain("&lt;Liquid&gt;");
    expect(html).toContain("&quot;Glass&quot; &amp; caustics");
    expect(html).not.toContain("<Liquid>");
  });

  it("renders a liquid glass button tone class", () => {
    const html = renderLiquidGlassButton({
      label: "Burst",
      tone: "violet",
      className: "extra-material-hook"
    });

    expect(html).toContain("liquid-glass-button");
    expect(html).toContain("liquid-glass-button--violet");
    expect(html).toContain("extra-material-hook");
    expect(html).toContain(">Burst</button>");
  });
});
