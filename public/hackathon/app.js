import {
  assessScenario,
  createUnknownProfile,
  descendants,
  EVIDENCE_IDS,
  EVIDENCE_LABELS,
  formatInterval,
  HARM_BAND_IDS,
  intervalForBand,
  MODE_LABELS,
  OUTCOME_LABELS,
  RESPONSE_BAND_IDS,
  serializeAssessment,
  STAGE_LABELS,
  TIME_BANDS,
} from "./engine.js";
import { EXAMPLES } from "./scenarios.js";

const MODE_IDS = ["outage", "silent_error", "compromise"];


let state = makeState(EXAMPLES.housing);

const refs = {
  picker: document.querySelector("#scenario-picker"),
  name: document.querySelector("#scenario-name"),
  authority: document.querySelector("#scenario-authority"),
  graph: document.querySelector("#graph"),
  nodeList: document.querySelector("#node-list"),
  decisionBlock: document.querySelector("#decision-block"),
  decisionLabel: document.querySelector("#decision-label"),
  containedCount: document.querySelector("#contained-count"),
  serviceCount: document.querySelector("#service-count"),
  criticalPath: document.querySelector("#critical-path"),
  printScenarioName: document.querySelector("#print-scenario-name"),
  printScenarioMeta: document.querySelector("#print-scenario-meta"),
  pathResults: document.querySelector("#path-results"),
  actions: document.querySelector("#actions"),
  assessmentAnnouncement: document.querySelector("#assessment-announcement"),
  pathPicker: document.querySelector("#path-picker"),
  pathGroups: document.querySelector("#path-groups"),
  pathStatus: document.querySelector("#path-status"),
  pathStatusLabel: document.querySelector("#path-status-label"),
  pathMath: document.querySelector("#path-math"),
  dialog: document.querySelector("#node-dialog"),
  nodeForm: document.querySelector("#node-form"),
  nodeType: document.querySelector("#node-type"),
  nodeLabel: document.querySelector("#node-label"),
  nodeDetail: document.querySelector("#node-detail"),
  nodeParent: document.querySelector("#node-parent"),
  parentField: document.querySelector("#parent-field"),
  nodeDialogTitle: document.querySelector("#node-dialog-title"),
  nodeLabelCopy: document.querySelector("#node-label-copy"),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeState(example) {
  const scenario = clone(example);
  const firstService = scenario.nodes.find((node) => node.type === "service");
  return {
    exampleKey: example.key,
    scenario,
    mode: "silent_error",
    selectedServiceId: firstService?.id ?? null,
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function serviceNodes() {
  return state.scenario.nodes.filter((node) => node.type === "service");
}

function ensureProfiles(serviceId) {
  state.scenario.paths ??= {};
  state.scenario.paths[serviceId] ??= {};
  MODE_IDS.forEach((mode) => {
    state.scenario.paths[serviceId][mode] ??= createUnknownProfile();
  });
}

function ensureSelection() {
  const services = serviceNodes();
  if (!services.some((service) => service.id === state.selectedServiceId)) {
    state.selectedServiceId = services[0]?.id ?? null;
  }
  if (state.selectedServiceId) ensureProfiles(state.selectedServiceId);
}

function currentProfile() {
  ensureSelection();
  return state.selectedServiceId
    ? state.scenario.paths[state.selectedServiceId][state.mode]
    : null;
}

function populateOptions() {
  document.querySelectorAll("[data-time-stage]").forEach((select) => {
    const bandIds = select.dataset.timeStage === "harm" ? HARM_BAND_IDS : RESPONSE_BAND_IDS;
    select.innerHTML = bandIds
      .map((id) => `<option value="${id}">${escapeHtml(TIME_BANDS[id].label)}</option>`)
      .join("");
  });
  document.querySelectorAll("[data-evidence-stage]").forEach((select) => {
    select.innerHTML = EVIDENCE_IDS
      .map((id) => `<option value="${id}">${escapeHtml(EVIDENCE_LABELS[id])}</option>`)
      .join("");
  });
}

function initialise() {
  refs.picker.innerHTML = Object.values(EXAMPLES)
    .map((example) => `<option value="${example.key}">${escapeHtml(example.exampleLabel)}</option>`)
    .join("");
  populateOptions();

  refs.picker.addEventListener("change", () => loadExample(refs.picker.value));
  refs.pathPicker.addEventListener("change", () => {
    state.selectedServiceId = refs.pathPicker.value;
    render();
  });
  document.querySelector("#reset-scenario").addEventListener("click", () => loadExample(state.exampleKey));

  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      state.scenario[input.dataset.field] = input.value;
      const system = state.scenario.nodes.find((node) => node.id === state.scenario.systemId);
      if (input.dataset.field === "name" && system) system.label = input.value || "Unnamed AI use";
      render();
    });
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      render();
    });
  });

  document.querySelectorAll("[data-time-stage]").forEach((select) => {
    select.addEventListener("change", () => {
      const profile = currentProfile();
      if (!profile) return;
      profile[select.dataset.timeStage].band = select.value;
      render();
    });
  });

  document.querySelectorAll("[data-evidence-stage]").forEach((select) => {
    select.addEventListener("change", () => {
      const profile = currentProfile();
      if (!profile) return;
      profile[select.dataset.evidenceStage].evidence = select.value;
      render();
    });
  });

  document.querySelectorAll("[data-add-node]").forEach((button) => {
    button.addEventListener("click", () => openNodeDialog(button.dataset.addNode));
  });

  refs.nodeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addNode();
  });
  document.querySelector("#cancel-node").addEventListener("click", () => refs.dialog.close());
  document.querySelector("#close-node").addEventListener("click", () => refs.dialog.close());
  document.querySelector("#print-brief").addEventListener("click", () => window.print());
  document.querySelector("#download-json").addEventListener("click", downloadJson);

  render();
}

function loadExample(key) {
  const example = EXAMPLES[key] ?? EXAMPLES.housing;
  state = makeState(example);
  render();
}

function currentAssessment() {
  return assessScenario({
    systemId: state.scenario.systemId,
    nodes: state.scenario.nodes,
    edges: state.scenario.edges,
    mode: state.mode,
    profiles: state.scenario.paths,
  });
}

function render() {
  ensureSelection();
  const assessment = currentAssessment();
  refs.picker.value = state.exampleKey;
  refs.name.value = state.scenario.name;
  refs.authority.value = state.scenario.authority;
  refs.printScenarioName.textContent = state.scenario.name;
  refs.printScenarioMeta.textContent = `${state.scenario.authority || "Local authority"} · ${MODE_LABELS[state.mode]} · conservative interval test`;

  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderPathPicker();
  renderWorksheet(assessment);
  renderGraph(assessment);
  renderNodeList();
  renderReadout(assessment);
}

function renderPathPicker() {
  const services = serviceNodes();
  const signature = services.map((service) => `${service.id}:${service.label}`).join("|");
  if (refs.pathPicker.dataset.signature !== signature) {
    refs.pathPicker.innerHTML = services
      .map((service) => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.label)}</option>`)
      .join("");
    refs.pathPicker.dataset.signature = signature;
  }
  refs.pathPicker.value = state.selectedServiceId ?? "";
  refs.pathPicker.disabled = services.length === 0;
}

function groupsForService(serviceId) {
  const groupIds = new Set(descendants(serviceId, state.scenario.nodes, state.scenario.edges));
  return state.scenario.nodes.filter((node) => node.type === "group" && groupIds.has(node.id));
}

function renderWorksheet(assessment) {
  const profile = currentProfile();
  const selectedPath = assessment.paths.find((path) => path.serviceId === state.selectedServiceId);
  const groups = state.selectedServiceId ? groupsForService(state.selectedServiceId) : [];

  refs.pathGroups.textContent = groups.length
    ? `Consequence means the earliest impact across: ${groups.map((group) => group.label).join(", ")}.`
    : "No affected group is mapped to this service yet.";

  document.querySelectorAll("[data-time-stage]").forEach((select) => {
    select.value = profile?.[select.dataset.timeStage]?.band ?? "unknown";
    select.disabled = !profile;
  });
  document.querySelectorAll("[data-evidence-stage]").forEach((select) => {
    select.value = profile?.[select.dataset.evidenceStage]?.evidence ?? "unknown";
    select.disabled = !profile;
  });

  const outcome = selectedPath?.outcome ?? "unknown";
  refs.pathStatus.dataset.outcome = outcome;
  refs.pathStatusLabel.textContent = selectedPath?.outcomeLabel ?? OUTCOME_LABELS.unknown;
  const intervalCopy = selectedPath?.response && selectedPath?.harm
    ? ` Response ${formatInterval(selectedPath.response)} · consequence ${formatInterval(selectedPath.harm)}.`
    : "";
  refs.pathMath.textContent = selectedPath
    ? `${selectedPath.reason}${intervalCopy}`
    : "Add a service path to begin.";
}

function outcomeForGroup(groupId, assessment) {
  const severity = { escapes: 5, unknown: 4, no_margin: 3, paper: 2, contained: 1 };
  return assessment.paths
    .filter((path) => path.groupIds.includes(groupId))
    .sort((a, b) => severity[b.outcome] - severity[a.outcome])[0]?.outcome ?? "unknown";
}

function edgeOutcome(edge, assessment) {
  const servicePath = assessment.paths.find(
    (path) => path.serviceId === edge.to || (path.serviceId === edge.from && path.groupIds.includes(edge.to)),
  );
  return servicePath?.outcome ?? null;
}

function renderGraph(assessment) {
  const columns = ["dependency", "system", "service", "group"];
  const xByType = { dependency: 72, system: 320, service: 585, group: 835 };
  const widths = { dependency: 170, system: 190, service: 190, group: 175 };
  const positions = new Map();

  columns.forEach((type) => {
    const typedNodes = state.scenario.nodes.filter((node) => node.type === type);
    const gap = 358 / (typedNodes.length + 1);
    typedNodes.forEach((node, index) => {
      positions.set(node.id, { x: xByType[type], y: 40 + gap * (index + 1), width: widths[type] });
    });
  });

  const edges = state.scenario.edges
    .map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return "";
      const x1 = from.x + from.width;
      const y1 = from.y;
      const x2 = to.x;
      const y2 = to.y;
      const curve = Math.max(44, (x2 - x1) * 0.47);
      const path = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
      const outcome = edgeOutcome(edge, assessment);
      const incomingCompromise =
        state.mode === "compromise" &&
        state.scenario.nodes.find((node) => node.id === edge.from)?.type === "dependency";
      const statusClass = outcome ? `status-${outcome}` : incomingCompromise ? "status-escapes" : "quiet";
      return `<path class="graph-edge ${statusClass}" d="${path}" />`;
    })
    .join("");

  const nodes = state.scenario.nodes
    .map((node) => {
      const pos = positions.get(node.id);
      if (!pos) return "";
      const path = assessment.paths.find((candidate) => candidate.serviceId === node.id);
      const outcome = path?.outcome ?? (node.type === "group" ? outcomeForGroup(node.id, assessment) : null);
      const selected = node.id === state.selectedServiceId;
      const displayLabel = node.label.length > 26 ? `${node.label.slice(0, 24)}…` : node.label;
      const outcomeCopy = {
        contained: "MARGIN EVIDENCED",
        paper: "WORKS ON PAPER",
        no_margin: "NO ASSURED MARGIN",
        escapes: "RESPONSE TOO LATE",
        unknown: "NOT DEMONSTRATED",
      }[outcome];
      const rawDetail = outcomeCopy || node.detail || "Mapped dependency";
      const displayDetail = rawDetail.length > 31 ? `${rawDetail.slice(0, 29)}…` : rawDetail;
      const typeLabel = {
        dependency: "SOURCE",
        system: "AI USE",
        service: selected ? "SELECTED PATH" : "SERVICE PATH",
        group: "AFFECTED GROUP",
      }[node.type];
      const classes = ["graph-node", node.type];
      if (outcome) classes.push(`status-${outcome}`);
      if (selected) classes.push("selected");
      if (node.type === "system") classes.push("active");

      return `
        <g class="${classes.join(" ")}" transform="translate(${pos.x} ${pos.y - 34})">
          ${node.type === "system" ? `<circle class="system-pulse" cx="${pos.width / 2}" cy="34" r="52"></circle>` : ""}
          <rect width="${pos.width}" height="68" rx="4"></rect>
          <text class="node-type" x="12" y="16">${typeLabel}</text>
          <text class="node-title" x="12" y="37">${escapeHtml(displayLabel)}</text>
          <text class="node-detail" x="12" y="55">${escapeHtml(displayDetail)}</text>
        </g>`;
    })
    .join("");

  const edgeSummary = state.scenario.edges
    .map((edge) => {
      const from = state.scenario.nodes.find((node) => node.id === edge.from)?.label;
      const to = state.scenario.nodes.find((node) => node.id === edge.to)?.label;
      return from && to ? `${from} feeds ${to}` : null;
    })
    .filter(Boolean)
    .join("; ");
  const resultSummary = assessment.paths
    .map((path) => `${path.serviceLabel}: ${path.outcomeLabel}`)
    .join("; ");

  refs.graph.innerHTML = `
    <svg viewBox="0 0 1080 438" role="img" aria-labelledby="graph-title graph-description">
      <title id="graph-title">Dependency map for ${escapeHtml(state.scenario.name)}</title>
      <desc id="graph-description">${escapeHtml(edgeSummary)}. Results: ${escapeHtml(resultSummary)}. Overall: ${escapeHtml(assessment.decisionLabel)}.</desc>
      <defs>
        <pattern id="graph-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" stroke-width="0.6" />
        </pattern>
      </defs>
      <rect class="graph-grid" width="1080" height="438" fill="url(#graph-grid)"></rect>
      <g class="column-labels" aria-hidden="true">
        <text x="72" y="24">UPSTREAM</text>
        <text x="320" y="24">SYSTEM</text>
        <text x="585" y="24">SERVICE PATH</text>
        <text x="835" y="24">EARLIEST PUBLIC IMPACT</text>
      </g>
      <g class="graph-edges">${edges}</g>
      <g class="graph-nodes">${nodes}</g>
    </svg>`;
}

function renderNodeList() {
  const editable = state.scenario.nodes.filter((node) => ["service", "group"].includes(node.type));
  refs.nodeList.innerHTML = editable
    .map(
      (node) => {
        const affectedGroups = node.type === "service"
          ? descendants(node.id, state.scenario.nodes, state.scenario.edges)
            .filter((id) => state.scenario.nodes.find((candidate) => candidate.id === id)?.type === "group")
          : [];
        const cascadeCopy = affectedGroups.length
          ? ` and ${affectedGroups.length} affected ${affectedGroups.length === 1 ? "group" : "groups"}`
          : "";
        return `
        <div class="node-row">
          <span class="node-kind ${node.type}">${node.type === "group" ? "Affected group" : "Service path"}</span>
          <div><strong>${escapeHtml(node.label)}</strong><small>${escapeHtml(node.detail || "No note")}</small></div>
          <button type="button" data-remove-node="${escapeHtml(node.id)}" aria-label="Remove ${escapeHtml(node.label)}${cascadeCopy}" title="Remove ${escapeHtml(node.label)}${cascadeCopy}">Remove</button>
        </div>`;
      },
    )
    .join("");

  refs.nodeList.querySelectorAll("[data-remove-node]").forEach((button) => {
    button.addEventListener("click", () => removeNode(button.dataset.removeNode));
  });

  const serviceCount = serviceNodes().length;
  const groupCount = state.scenario.nodes.filter((node) => node.type === "group").length;
  const addService = document.querySelector('[data-add-node="service"]');
  const addGroup = document.querySelector('[data-add-node="group"]');
  addService.disabled = serviceCount >= 4;
  addService.title = serviceCount >= 4 ? "Remove a service before adding another" : "Add a downstream service";
  addGroup.disabled = serviceCount === 0 || groupCount >= 4;
  addGroup.title = serviceCount === 0
    ? "Add a service before adding an affected group"
    : groupCount >= 4
      ? "Remove an affected group before adding another"
      : "Add an affected resident group";
}

function evidenceBasis(path) {
  return [
    ["Consequence", path.profile.harm],
    ["Detection", path.profile.detect],
    ["Authority", path.profile.authorize],
    ["Fallback", path.profile.switch],
  ]
    .map(([stage, entry]) => `${stage}: ${EVIDENCE_LABELS[entry.evidence].toLowerCase()}`)
    .join(" · ");
}

function printStageBasis(path) {
  const stages = [
    ["Harm", "harm"],
    ["Detect", "detect"],
    ["Authority", "authorize"],
    ["Fallback", "switch"],
  ];
  return stages
    .map(([label, stage]) => {
      const entry = path.profile[stage];
      return `<span><b>${label}</b> ${escapeHtml(TIME_BANDS[entry.band].short)} · ${escapeHtml(EVIDENCE_LABELS[entry.evidence])}</span>`;
    })
    .join("");
}

function responseDisplay(path) {
  if (path.response) return formatInterval(path.response);
  if (path.decisiveStage) {
    return `${STAGE_LABELS[path.decisiveStage]}: ${TIME_BANDS[path.profile[path.decisiveStage].band].short}`;
  }
  if (!path.groupIds.length) return "incomplete map";
  return "unknown";
}

function renderReadout(assessment) {
  refs.decisionBlock.dataset.decision = assessment.decision;
  refs.decisionLabel.textContent = assessment.decisionLabel;
  refs.containedCount.textContent = assessment.containedCount;
  refs.serviceCount.textContent = assessment.serviceCount;
  refs.criticalPath.textContent = assessment.serviceCount === 0
    ? "No service path mapped"
    : assessment.criticalPathRankable
      ? assessment.criticalPath?.serviceLabel ?? "No complete path"
      : "Not fully rankable — at least one timing is missing";

  refs.pathResults.style.setProperty("--path-count", Math.max(1, assessment.paths.length));
  refs.pathResults.innerHTML = assessment.paths.length
    ? assessment.paths
      .map((path, index) => {
        const groupNames = path.groupIds
          .map((id) => state.scenario.nodes.find((node) => node.id === id)?.label)
          .filter(Boolean)
          .join(", ");
        return `
          <article class="path-card" data-outcome="${path.outcome}">
            <div class="path-card-head"><span>PATH ${String(index + 1).padStart(2, "0")}</span><em>${escapeHtml(path.outcomeLabel)}</em></div>
            <h4>${escapeHtml(path.serviceLabel)}</h4>
            <p class="path-groups">${escapeHtml(groupNames || "No affected group mapped")}</p>
            <dl>
              <div><dt>Response</dt><dd>${escapeHtml(responseDisplay(path))}</dd></div>
              <div><dt>Consequence</dt><dd>${escapeHtml(formatInterval(path.harm))}</dd></div>
            </dl>
            <small>Basis: ${escapeHtml(evidenceBasis(path))}</small>
            <div class="print-path-basis">${printStageBasis(path)}</div>
            <p class="print-path-reason">${escapeHtml(path.reason)}</p>
          </article>`;
      })
      .join("")
    : '<p class="empty-paths">Add a service and affected group to create a containment path.</p>';

  refs.actions.innerHTML = assessment.actions
    .map(
      (action) => `
        <li>
          <span>${escapeHtml(action.phase)}</span>
          <div><strong>${escapeHtml(action.title)}</strong><p class="action-detail-screen">${escapeHtml(action.detail)}</p><p class="action-detail-print">${escapeHtml(action.printDetail ?? action.detail)}</p></div>
        </li>`,
    )
    .join("");

  const selectedPath = assessment.paths.find((path) => path.serviceId === state.selectedServiceId);
  const announcement = [
    assessment.decisionLabel,
    `${assessment.containedCount} of ${assessment.serviceCount} paths pass the gate`,
    selectedPath
      ? `Selected path ${selectedPath.serviceLabel}: ${selectedPath.outcomeLabel}. ${selectedPath.reason}`
      : "No service path selected",
  ].join(". ");
  if (refs.assessmentAnnouncement.textContent !== announcement) {
    refs.assessmentAnnouncement.textContent = announcement;
  }
}

function openNodeDialog(type) {
  const sameTypeCount = state.scenario.nodes.filter((node) => node.type === type).length;
  const serviceCount = serviceNodes().length;
  if (sameTypeCount >= 4 || (type === "group" && serviceCount === 0)) return;
  const isGroup = type === "group";
  refs.nodeType.value = type;
  refs.nodeDialogTitle.textContent = isGroup ? "Add an affected group" : "Add a service path";
  refs.nodeLabelCopy.textContent = isGroup ? "Affected group" : "Service or team name";
  refs.nodeLabel.placeholder = isGroup ? "e.g. Residents needing interpreters" : "e.g. Safeguarding referrals";
  refs.nodeDetail.placeholder = isGroup ? "Why is the impact distinct?" : "What inherits the output?";
  refs.parentField.hidden = !isGroup;
  refs.nodeParent.innerHTML = serviceNodes()
    .map((node) => `<option value="${escapeHtml(node.id)}">${escapeHtml(node.label)}</option>`)
    .join("");
  refs.nodeLabel.value = "";
  refs.nodeDetail.value = "";
  refs.dialog.showModal();
  refs.nodeLabel.focus();
}

function addNode() {
  const type = refs.nodeType.value;
  const label = refs.nodeLabel.value.trim();
  if (!label) return;
  const id = `custom-${type}-${Date.now()}`;
  state.scenario.nodes.push({
    id,
    type,
    label,
    detail: refs.nodeDetail.value.trim() || (type === "group" ? "Mapped affected group" : "Mapped service"),
  });
  state.scenario.edges.push({
    from: type === "group" ? refs.nodeParent.value : state.scenario.systemId,
    to: id,
  });
  if (type === "service") {
    ensureProfiles(id);
    state.selectedServiceId = id;
  }
  refs.dialog.close();
  render();
  if (type === "service") {
    refs.pathPicker.focus();
  } else {
    const addedButton = [...refs.nodeList.querySelectorAll("[data-remove-node]")]
      .find((button) => button.dataset.removeNode === id);
    addedButton?.focus();
  }
}

function removeNode(id) {
  const node = state.scenario.nodes.find((candidate) => candidate.id === id);
  const affectedGroups = node?.type === "service"
    ? descendants(id, state.scenario.nodes, state.scenario.edges)
      .filter((nodeId) => state.scenario.nodes.find((candidate) => candidate.id === nodeId)?.type === "group")
    : [];
  if (
    affectedGroups.length &&
    !window.confirm(`Remove ${node.label} and ${affectedGroups.length} mapped affected ${affectedGroups.length === 1 ? "group" : "groups"}?`)
  ) return;
  const editableIds = state.scenario.nodes
    .filter((node) => ["service", "group"].includes(node.type))
    .map((node) => node.id);
  const removedIndex = editableIds.indexOf(id);
  const removable = new Set([id, ...descendants(id, state.scenario.nodes, state.scenario.edges)]);
  state.scenario.nodes = state.scenario.nodes.filter((node) => !removable.has(node.id));
  state.scenario.edges = state.scenario.edges.filter(
    (edge) => !removable.has(edge.from) && !removable.has(edge.to),
  );
  removable.forEach((nodeId) => delete state.scenario.paths?.[nodeId]);
  ensureSelection();
  const focusId = editableIds.slice(removedIndex + 1).find((nodeId) => !removable.has(nodeId))
    ?? editableIds.slice(0, removedIndex).reverse().find((nodeId) => !removable.has(nodeId));
  render();
  const nextButton = [...refs.nodeList.querySelectorAll("[data-remove-node]")]
    .find((button) => button.dataset.removeNode === focusId);
  (nextButton ?? document.querySelector('[data-add-node="service"]'))?.focus();
}

function downloadJson() {
  const assessment = currentAssessment();
  const output = serializeAssessment({
    scenario: state.scenario,
    profiles: state.scenario.paths,
    mode: state.mode,
    assessment,
  });
  const blob = new Blob([`${JSON.stringify(output, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = state.scenario.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  link.href = url;
  link.download = `${slug || "civic-cascade"}-tabletop.json`;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Scale ladder -----------------------------------------------------------
// Renders the same decision rule at two scales. The point of the section is that
// the engine is not re-parameterised between them: identical code, identical
// verdict semantics, different numbers. Every figure is computed here rather
// than written into the markup, so the panel cannot drift from the model.

const SCALE_RUNGS = [
  {
    exampleKey: "housing",
    serviceId: "temp-housing",
    scaleLabel: "Council scale",
    unit: "One borough",
    plain: "A housing triage model quietly mis-ranks a family's application.",
  },
  {
    exampleKey: "frontier",
    serviceId: "agent-products",
    scaleLabel: "Frontier scale",
    unit: "Every downstream product",
    plain: "A deployed model quietly behaves differently than its evaluations suggest.",
  },
];

function renderScaleLadder() {
  const host = document.getElementById("scale-grid");
  if (!host) return;

  const cards = SCALE_RUNGS.map((rung) => {
    const example = EXAMPLES[rung.exampleKey];
    if (!example) return "";
    const assessment = assessScenario({
      systemId: example.systemId,
      nodes: example.nodes,
      edges: example.edges,
      mode: "silent_error",
      profiles: example.paths,
    });
    const path =
      assessment.paths.find((candidate) => candidate.serviceId === rung.serviceId) ||
      assessment.paths[0];
    if (!path) return "";

    const consequence = formatInterval(intervalForBand(path.profile.harm.band));
    const response = path.response ? formatInterval(path.response) : "not computable";
    const verdict = OUTCOME_LABELS[path.outcome] || path.outcome;
    const lost = path.timing !== "robust";

    return `
      <article class="scale-card${lost ? " scale-card-lost" : ""}">
        <p class="scale-card-label">${escapeHtml(rung.scaleLabel)}</p>
        <h3>${escapeHtml(example.name)}</h3>
        <p class="scale-card-plain">${escapeHtml(rung.plain)}</p>
        <dl class="scale-card-figures">
          <div><dt>Reaches people in</dt><dd>${escapeHtml(consequence)}</dd></div>
          <div><dt>Fastest response</dt><dd>${escapeHtml(response)}</dd></div>
          <div><dt>Affects</dt><dd>${escapeHtml(rung.unit)}</dd></div>
        </dl>
        <p class="scale-card-verdict">${escapeHtml(verdict)}</p>
      </article>`;
  }).join("");

  host.innerHTML = `${cards}
    <article class="scale-card scale-card-rule">
      <p class="scale-card-label">The rule, unchanged</p>
      <h3>Same inequality, either column</h3>
      <pre class="scale-rule">upper(detect + authorise + fallback)\n        &lt;\nlower(time to consequence)</pre>
      <p class="scale-card-plain">
        If that is false, the system is out of your control for the gap between the two —
        whether the gap is four hours or four months.
      </p>
    </article>`;
}

// --- The automated call -----------------------------------------------------
// Played at the beat where the consequence lands. Two sources, in order:
//
//   1. assets/audio/automated-call.mp3  — an ElevenLabs render, if one has been
//      generated (see tools/generate-voice.sh). A static file.
//   2. the browser's own speechSynthesis  — a local OS API, no network call.
//
// Both keep the tool's promise intact: nothing leaves the browser and the page
// still works offline. The fallback is not a degraded mode; the flat municipal
// delivery of a system voice is the content either way.

const CALL_SCRIPT =
  "Hello. This is an automated message from the housing service. "
  + "Your application has been reviewed. "
  + "Your current priority band is: standard. "
  + "You do not need to take any action. "
  + "If you believe this is incorrect, you may request a review within twenty-eight days. "
  + "Goodbye.";

const CALL_AUDIO_SRC = "assets/audio/automated-call.mp3";
let callAudio = null;
let callSpeaking = false;

function stopCall() {
  if (callAudio) { callAudio.pause(); callAudio.currentTime = 0; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  callSpeaking = false;
}

function playCall(button) {
  if (callSpeaking) { stopCall(); if (button) button.textContent = "Play the call"; return; }

  const finish = () => {
    callSpeaking = false;
    if (button) button.textContent = "Play the call";
  };

  callSpeaking = true;
  if (button) button.textContent = "Stop";

  if (!callAudio) {
    callAudio = new Audio(CALL_AUDIO_SRC);
    callAudio.addEventListener("ended", finish);
  }

  callAudio.play().catch(() => {
    // No render available — use the local speech synthesiser instead.
    // Fail loudly rather than silently: a button that does nothing when clicked
    // reads as a broken demo. On a machine with no installed voices (common on
    // Linux without speech-dispatcher) speak() succeeds and produces silence, so
    // the voice list has to be checked up front rather than trusting the call.
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!window.speechSynthesis || voices.length === 0) {
      finish();
      const audio = button && button.closest(".story-audio");
      if (audio && !audio.querySelector(".story-call-note")) {
        const note = document.createElement("p");
        note.className = "story-call-note";
        note.textContent =
          "No speech voice is installed on this machine, so there is nothing to play. "
          + "The call is written out below \u2014 read it in a flat, helpful tone.";
        audio.append(note);
      }
      if (button) button.textContent = "No voice available";
      return;
    }
    const utter = new SpeechSynthesisUtterance(CALL_SCRIPT);
    utter.rate = 0.95;
    utter.pitch = 0.9;
    const preferred = window.speechSynthesis
      .getVoices()
      .find((v) => /en-GB/i.test(v.lang)) || null;
    if (preferred) utter.voice = preferred;
    utter.addEventListener("end", finish);
    utter.addEventListener("error", finish);
    window.speechSynthesis.speak(utter);
  });
}

// --- Story mode -------------------------------------------------------------
// A narrated run of the housing safeguarding path under a silent ranking error.
// The beats are prose, but the two numbers that matter (when the consequence
// lands, when detection arrives) are read from the same profile the tabletop
// uses, so the story cannot drift from the model it is illustrating.

const STORY = {
  exampleKey: "housing",
  serviceId: "safeguarding",
  mode: "silent_error",
  beats: [
    {
      stamp: "Monday 09:00",
      head: "The model runs, exactly as specified.",
      body:
        "Overnight housing cases are ranked for staff review. One safeguarding referral moves "
        + "down the list. The model did not malfunction. It scored the case the way it was "
        + "trained to score it.",
    },
    {
      stamp: "Monday 09:01",
      head: "Nothing looks wrong.",
      body:
        "There is no error, no alert, no red banner. A list of ranked cases is what a normal "
        + "Monday looks like. The output is plausible, and plausible is the problem \u2014 an "
        + "outage announces itself, a wrong answer does not.",
    },
    {
      stamp: "consequence",
      head: "The window closes.",
      body:
        "This is the council's own estimate of how quickly this path reaches a person. Not a "
        + "worst case: the number already in their plan.",
      figure: "harm",
    },
    {
      stamp: "Monday 09:04",
      head: "The resident is told.",
      body:
        "An automated call goes out. Every word of it is true, procedurally correct, and "
        + "signed off by nobody. Listen to it \u2014 the smoothness is the point.",
      audio: true,
    },
    {
      stamp: "detection",
      head: "The council finds out.",
      body:
        "Also their own estimate. On this path the entered value is not a duration at all.",
      figure: "detect",
    },
    {
      stamp: "the gap",
      head: "For the whole of that gap, nobody could have stopped it.",
      body:
        "Not because the AI was clever, resisted shutdown, or wanted anything. Because the "
        + "people with the authority to act did not yet know there was anything to act on. "
        + "That gap is what loss of control actually feels like from inside an institution.",
      terminal: true,
    },
  ],
};

function storyPath() {
  const example = EXAMPLES[STORY.exampleKey];
  const assessment = assessScenario({
    systemId: example.systemId,
    nodes: example.nodes,
    edges: example.edges,
    mode: STORY.mode,
    profiles: example.paths,
  });
  return assessment.paths.find((p) => p.serviceId === STORY.serviceId) || assessment.paths[0];
}

function storyFigure(path, stage) {
  const entry = path?.profile?.[stage];
  if (!entry) return "unknown";
  const band = TIME_BANDS[entry.band];
  if (!band) return "unknown";
  if (band.special) return band.label;
  return formatInterval(intervalForBand(entry.band));
}

let storyStep = 0;

function renderStory() {
  const list = document.getElementById("story-beats");
  const next = document.getElementById("story-next");
  const reset = document.getElementById("story-reset");
  const progress = document.getElementById("story-progress");
  if (!list || !next) return;

  const path = storyPath();
  const shown = STORY.beats.slice(0, storyStep);

  list.innerHTML = shown
    .map((beat) => {
      const figure = beat.figure ? storyFigure(path, beat.figure) : null;
      return `
        <li class="story-beat${beat.terminal ? " story-beat-terminal" : ""}">
          <p class="story-stamp">${escapeHtml(beat.stamp)}</p>
          <h3>${escapeHtml(beat.head)}</h3>
          <p>${escapeHtml(beat.body)}</p>
          ${figure ? `<p class="story-figure">${escapeHtml(figure)}</p>` : ""}
          ${beat.audio ? `<div class="story-audio">
            <button type="button" class="button story-call">Play the call</button>
            <q class="story-call-script">${escapeHtml(CALL_SCRIPT)}</q>
          </div>` : ""}
        </li>`;
    })
    .join("");

  const callButton = list.querySelector(".story-call");
  if (callButton) {
    callButton.addEventListener("click", () => playCall(callButton));
  }

  const done = storyStep >= STORY.beats.length;
  next.hidden = done;
  next.textContent = storyStep === 0 ? "Start the clock" : "Next";
  reset.hidden = !done;
  progress.textContent = done
    ? "That is one path, in one borough. The tabletop below runs the same test on every path you map."
    : `Step ${storyStep} of ${STORY.beats.length}`;
}

function initialiseStory() {
  const next = document.getElementById("story-next");
  const reset = document.getElementById("story-reset");
  if (!next || !reset) return;
  next.addEventListener("click", () => {
    storyStep = Math.min(storyStep + 1, STORY.beats.length);
    renderStory();
  });
  reset.addEventListener("click", () => {
    stopCall();
    storyStep = 0;
    renderStory();
  });
  renderStory();
}

initialise();
renderScaleLadder();
initialiseStory();

