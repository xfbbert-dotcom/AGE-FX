import "./styles.css";

type EquipmentState = "recommended" | "approved" | "printed" | "archived";

export interface EquipmentRecommendation {
  equipmentName: string;
  equipmentType: string;
  whyThisEquipment: string;
  sourceBattleInsight: string;
  minimumViableVersion: string;
  expectedBenefit: string;
  printPrompt: string;
  state: EquipmentState;
}

export interface DailyBattleAnalysis {
  analysisDate: string;
  thoughtTitle: string;
  coreThemes: string[];
  repeatedQuestions: string[];
  newlyFormedJudgments: string[];
  unclosedThinkingLoops: string[];
  reusableMaterial: string[];
  threadsToContinueTomorrow: string[];
  recommendedEquipment: EquipmentRecommendation[] | EquipmentRecommendation;
}

interface AnalyzeResponse {
  analysis?: DailyBattleAnalysis;
}

interface StatusResponse {
  dataRoot: string;
  capturedMessages: number;
}

const serviceUrl = "http://127.0.0.1:3987";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderList(title: string, items: string[]): string {
  const entries =
    items.length > 0
      ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p class="muted">No captured entries for this lane.</p>`;

  return `
    <section class="panel">
      <h2>${escapeHtml(title)}</h2>
      ${entries}
    </section>
  `;
}

function firstEquipment(
  recommendedEquipment: DailyBattleAnalysis["recommendedEquipment"]
): EquipmentRecommendation | null {
  if (Array.isArray(recommendedEquipment)) {
    return recommendedEquipment[0] ?? null;
  }

  return recommendedEquipment;
}

function renderEquipment(equipment: EquipmentRecommendation | null): string {
  if (!equipment) {
    return `
      <aside class="equipment-panel">
        <p class="eyebrow">Recommended Equipment</p>
        <h2>No equipment generated</h2>
        <p class="muted">Run analysis after capture to create a recommendation record.</p>
      </aside>
    `;
  }

  return `
    <aside class="equipment-panel" aria-label="Recommended equipment">
      <div class="panel-heading">
        <p class="eyebrow">Recommended Equipment</p>
        <span class="state-pill">${escapeHtml(equipment.state)}</span>
      </div>
      <h2>${escapeHtml(equipment.equipmentName)}</h2>
      <p class="equipment-why">${escapeHtml(equipment.whyThisEquipment)}</p>
      <dl>
        <dt>Minimum Version</dt>
        <dd>${escapeHtml(equipment.minimumViableVersion)}</dd>
        <dt>Expected Benefit</dt>
        <dd>${escapeHtml(equipment.expectedBenefit)}</dd>
        <dt>Print Prompt</dt>
        <dd>${escapeHtml(equipment.printPrompt)}</dd>
      </dl>
    </aside>
  `;
}

function renderStatus(status: StatusResponse | null): string {
  if (!status) {
    return "";
  }

  const capturedMessagesLabel =
    status.capturedMessages === 1 ? "1 captured message" : `${status.capturedMessages} captured messages`;

  return `
    <div class="status-strip" aria-label="Service status">
      <span class="status-metric">
        <strong>Data</strong>
        ${escapeHtml(status.dataRoot)}
      </span>
      <span class="status-metric">
        <strong>Capture</strong>
        ${escapeHtml(capturedMessagesLabel)}
      </span>
    </div>
  `;
}

export function renderAnalysis(
  analysis: DailyBattleAnalysis,
  status: StatusResponse | null = null
): void {
  const app = document.querySelector<HTMLElement>("#app");

  if (!app) {
    return;
  }

  const equipment = firstEquipment(analysis.recommendedEquipment);

  app.innerHTML = `
    <header class="topbar">
      <div class="brand-block">
        <p class="eyebrow">AGE-FX Thought Console</p>
        <h1>${escapeHtml(analysis.thoughtTitle)}</h1>
        <p class="run-note">
          ${escapeHtml(analysis.analysisDate)} local analysis. Loading this console runs analysis and creates today's recommendation record.
        </p>
        ${renderStatus(status)}
      </div>
      <button class="burst-toggle" id="burst-toggle" type="button" aria-pressed="false">
        FX Burst
      </button>
    </header>
    <div class="console-grid">
      <div class="analysis-grid" aria-label="Battle analysis">
        ${renderList("Core Themes", analysis.coreThemes)}
        ${renderList("Repeated Questions", analysis.repeatedQuestions)}
        ${renderList("New Judgments", analysis.newlyFormedJudgments)}
        ${renderList("Unclosed Loops", analysis.unclosedThinkingLoops)}
        ${renderList("Reusable Material", analysis.reusableMaterial)}
        ${renderList("Tomorrow Threads", analysis.threadsToContinueTomorrow)}
      </div>
      ${renderEquipment(equipment)}
    </div>
  `;

  const burstToggle = document.querySelector<HTMLButtonElement>("#burst-toggle");
  burstToggle?.addEventListener("click", () => {
    const burstActive = document.body.classList.toggle("burst");
    burstToggle.setAttribute("aria-pressed", String(burstActive));
  });
}

export function todayIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function renderError(message: string): void {
  const app = document.querySelector<HTMLElement>("#app");

  if (!app) {
    return;
  }

  app.innerHTML = `
    <section class="error-panel" role="alert">
      <p class="eyebrow">Console Offline</p>
      <h1>Unable to run today's analysis</h1>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

async function boot(): Promise<void> {
  const date = todayIsoDate();
  const [statusResponse, analyzeResponse] = await Promise.all([
    fetch(`${serviceUrl}/api/status?date=${encodeURIComponent(date)}`),
    fetch(`${serviceUrl}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date })
    })
  ]);

  if (!statusResponse.ok) {
    throw new Error(`AGE-FX status returned ${statusResponse.status}`);
  }

  if (!analyzeResponse.ok) {
    throw new Error(`AGE-FX service returned ${analyzeResponse.status}`);
  }

  const status = (await statusResponse.json()) as StatusResponse;
  const payload = (await analyzeResponse.json()) as AnalyzeResponse;

  if (!payload.analysis) {
    throw new Error("AGE-FX service response did not include analysis.");
  }

  renderAnalysis(payload.analysis, status);
}

if (typeof window !== "undefined" && document.querySelector("#app")) {
  boot().catch((error: unknown) => {
    renderError(error instanceof Error ? error.message : String(error));
  });
}
