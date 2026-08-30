export const TIME_BANDS = Object.freeze({
  immediate: Object.freeze({ label: "Immediate (0–5 min)", short: "0–5m", lower: 0, upper: 5 }),
  within_15: Object.freeze({ label: "5–15 minutes", short: "5–15m", lower: 5, upper: 15 }),
  within_hour: Object.freeze({ label: "15–60 minutes", short: "15–60m", lower: 15, upper: 60 }),
  within_shift: Object.freeze({ label: "1–8 hours", short: "1–8h", lower: 60, upper: 480 }),
  next_day: Object.freeze({ label: "8–24 hours", short: "8–24h", lower: 480, upper: 1440 }),
  later: Object.freeze({ label: "1–3 days", short: "1–3d", lower: 1440, upper: 4320 }),
  within_fortnight: Object.freeze({ label: "3–14 days", short: "3–14d", lower: 4320, upper: 20160 }),
  within_quarter: Object.freeze({ label: "2 weeks–3 months", short: "2w–3mo", lower: 20160, upper: 129600 }),
  after_impact: Object.freeze({ label: "Only after consequence", short: "after harm", special: true }),
  no_route: Object.freeze({ label: "No route exists", short: "no route", special: true }),
  unknown: Object.freeze({ label: "Unknown", short: "unknown", special: true }),
});

export const RESPONSE_BAND_IDS = Object.freeze([
  "immediate",
  "within_15",
  "within_hour",
  "within_shift",
  "next_day",
  "later",
  "within_fortnight",
  "within_quarter",
  "after_impact",
  "no_route",
  "unknown",
]);

export const HARM_BAND_IDS = Object.freeze([
  "immediate",
  "within_15",
  "within_hour",
  "within_shift",
  "next_day",
  "later",
  "within_fortnight",
  "within_quarter",
  "unknown",
]);

export const EVIDENCE_LABELS = Object.freeze({
  unknown: "Unknown",
  asserted: "Asserted in the room",
  documented: "Documented",
  technically_verified: "Technically verified",
  exercised: "Exercised",
  observed: "Observed in operation",
});

export const EVIDENCE_IDS = Object.freeze(Object.keys(EVIDENCE_LABELS));

export const MODE_LABELS = Object.freeze({
  outage: "Visible outage",
  silent_error: "Silent ranking error",
  compromise: "Vendor or data compromise",
});

export const OUTCOME_LABELS = Object.freeze({
  contained: "Evidenced timing margin",
  paper: "Timing works on paper",
  no_margin: "No assured margin",
  escapes: "Consequence outruns response",
  unknown: "Insufficient evidence",
});

export const STAGE_LABELS = Object.freeze({
  harm: "resident consequence",
  detect: "detection",
  authorize: "authorisation",
  switch: "fallback startup",
});

const RESPONSE_STAGES = Object.freeze(["detect", "authorize", "switch"]);
const PROFILE_STAGES = Object.freeze(["harm", ...RESPONSE_STAGES]);
const NUMERIC_BAND_IDS = Object.freeze(
  RESPONSE_BAND_IDS.filter((id) => Number.isFinite(TIME_BANDS[id]?.upper)),
);

export function createUnknownProfile() {
  return Object.fromEntries(
    PROFILE_STAGES.map((stage) => [stage, { band: "unknown", evidence: "unknown" }]),
  );
}

export function descendants(systemId, nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set([systemId]);
  const queue = [systemId];

  while (queue.length) {
    const current = queue.shift();
    edges
      .filter((edge) => edge.from === current)
      .forEach((edge) => {
        if (byId.has(edge.to) && !seen.has(edge.to)) {
          seen.add(edge.to);
          queue.push(edge.to);
        }
      });
  }

  seen.delete(systemId);
  return [...seen];
}

function normaliseProfile(profile = {}) {
  return Object.fromEntries(
    PROFILE_STAGES.map((stage) => [
      stage,
      {
        band: (stage === "harm" ? HARM_BAND_IDS : RESPONSE_BAND_IDS).includes(
          profile?.[stage]?.band,
        )
          ? profile[stage].band
          : "unknown",
        evidence: EVIDENCE_LABELS[profile?.[stage]?.evidence]
          ? profile[stage].evidence
          : "unknown",
      },
    ]),
  );
}

export function intervalForBand(bandId) {
  const band = TIME_BANDS[bandId];
  if (!band || !Number.isFinite(band.lower) || !Number.isFinite(band.upper)) return null;
  return { lower: band.lower, upper: band.upper };
}

export function addIntervals(intervals) {
  if (!intervals.length || intervals.some((interval) => !interval)) return null;
  return intervals.reduce(
    (total, interval) => ({
      lower: total.lower + interval.lower,
      upper: total.upper + interval.upper,
    }),
    { lower: 0, upper: 0 },
  );
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return "not bounded";
  if (minutes === 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes > 1440) {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours ? `${days}d ${hours}h` : `${days}d`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function capitalise(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

export function formatInterval(interval) {
  if (!interval) return "not established";
  if (interval.lower === interval.upper) return formatMinutes(interval.lower);
  return `${formatMinutes(interval.lower)}–${formatMinutes(interval.upper)}`;
}

function evidenceSupportsStage(stage, entry) {
  const evidence = entry.evidence;
  if (stage === "harm") {
    return ["documented", "technically_verified", "exercised", "observed"].includes(evidence);
  }
  if (stage === "detect") {
    return ["technically_verified", "exercised", "observed"].includes(evidence);
  }
  if (["authorize", "switch"].includes(stage)) {
    return ["exercised", "observed"].includes(evidence);
  }
  return false;
}

function classifyTiming(response, harm) {
  const slack = {
    lower: harm.lower - response.upper,
    upper: harm.upper - response.lower,
  };
  if (slack.lower > 0) return { timing: "robust", slack };
  if (slack.upper <= 0) return { timing: "escape", slack };
  return { timing: "overlap", slack };
}

function counterfactualCandidates(profile, harm) {
  const unknownTimeStages = PROFILE_STAGES.filter((stage) => profile[stage].band === "unknown");
  if (unknownTimeStages.length) {
    return {
      kind: "information",
      stages: unknownTimeStages,
      plans: [],
      bindingStages: [],
    };
  }

  const stageOptions = RESPONSE_STAGES.map((stage) => {
    const current = profile[stage].band;
    const currentIndex = NUMERIC_BAND_IDS.indexOf(current);
    const candidates = currentIndex >= 0
      ? NUMERIC_BAND_IDS.slice(0, currentIndex + 1)
      : [...NUMERIC_BAND_IDS];
    return { stage, current, currentIndex: currentIndex >= 0 ? currentIndex : NUMERIC_BAND_IDS.length, candidates };
  });

  const successful = [];
  stageOptions[0].candidates.forEach((detect) => {
    stageOptions[1].candidates.forEach((authorize) => {
      stageOptions[2].candidates.forEach((switchBand) => {
        const bands = { detect, authorize, switch: switchBand };
        const response = addIntervals(RESPONSE_STAGES.map((stage) => intervalForBand(bands[stage])));
        if (!response || response.upper >= harm.lower) return;
        const changes = RESPONSE_STAGES
          .filter((stage) => bands[stage] !== profile[stage].band)
          .map((stage) => ({ stage, from: profile[stage].band, to: bands[stage] }));
        const deltas = Object.fromEntries(
          RESPONSE_STAGES.map((stage, index) => [
            stage,
            stageOptions[index].currentIndex - NUMERIC_BAND_IDS.indexOf(bands[stage]),
          ]),
        );
        successful.push({ bands, response, changes, deltas });
      });
    });
  });

  if (!successful.length) {
    return { kind: "resolution_limit", stages: [], plans: [], bindingStages: [] };
  }

  const pareto = successful.filter((candidate, index) =>
    !successful.some((other, otherIndex) => {
      if (index === otherIndex) return false;
      const noMoreDemanding = RESPONSE_STAGES.every(
        (stage) => other.deltas[stage] <= candidate.deltas[stage],
      );
      const lessDemandingSomewhere = RESPONSE_STAGES.some(
        (stage) => other.deltas[stage] < candidate.deltas[stage],
      );
      return noMoreDemanding && lessDemandingSomewhere;
    }),
  );

  pareto.sort((a, b) => {
    const changed = a.changes.length - b.changes.length;
    if (changed) return changed;
    const deltaA = Object.values(a.deltas).reduce((sum, value) => sum + value, 0);
    const deltaB = Object.values(b.deltas).reduce((sum, value) => sum + value, 0);
    if (deltaA !== deltaB) return deltaA - deltaB;
    return b.response.upper - a.response.upper;
  });

  const changedSets = pareto.map((plan) => new Set(plan.changes.map((change) => change.stage)));
  const bindingStages = RESPONSE_STAGES.filter((stage) => changedSets.every((set) => set.has(stage)));

  return {
    kind: "timing",
    stages: [],
    plans: pareto.slice(0, 6),
    totalPlans: pareto.length,
    bindingStages,
  };
}

export function assessPath({ serviceId, serviceLabel, groupIds = [], profile }) {
  const safeProfile = normaliseProfile(profile);
  const missingEvidenceStages = PROFILE_STAGES.filter(
    (stage) => safeProfile[stage].evidence === "unknown",
  );
  const unsupportedEvidenceStages = PROFILE_STAGES.filter(
    (stage) => !evidenceSupportsStage(stage, safeProfile[stage]),
  );
  const decisiveStage = RESPONSE_STAGES.find((stage) =>
    ["after_impact", "no_route"].includes(safeProfile[stage].band),
  );

  const base = {
    serviceId,
    serviceLabel,
    groupIds,
    profile: safeProfile,
    response: null,
    harm: intervalForBand(safeProfile.harm.band),
    slack: null,
    decisiveStage: decisiveStage || null,
    missingEvidenceStages,
    unsupportedEvidenceStages,
    counterfactual: null,
  };

  if (!groupIds.length) {
    return {
      ...base,
      timing: "unknown",
      outcome: "unknown",
      outcomeLabel: OUTCOME_LABELS.unknown,
      reason: "No affected group is mapped to this service.",
      counterfactual: { kind: "map", stages: ["harm"], plans: [], bindingStages: [] },
    };
  }

  if (decisiveStage) {
    return {
      ...base,
      timing: "escape",
      outcome: "escapes",
      outcomeLabel: OUTCOME_LABELS.escapes,
      slack: { lower: Number.NEGATIVE_INFINITY, upper: Number.NEGATIVE_INFINITY },
      reason: safeProfile[decisiveStage].band === "no_route"
        ? `${capitalise(STAGE_LABELS[decisiveStage])} has no available route.`
        : `${capitalise(STAGE_LABELS[decisiveStage])} begins only after consequence.`,
      counterfactual: base.harm
        ? counterfactualCandidates(safeProfile, base.harm)
        : { kind: "information", stages: ["harm"], plans: [], bindingStages: [] },
    };
  }

  const unknownTimeStages = PROFILE_STAGES.filter((stage) => safeProfile[stage].band === "unknown");
  if (unknownTimeStages.length || !base.harm) {
    return {
      ...base,
      timing: "unknown",
      outcome: "unknown",
      outcomeLabel: OUTCOME_LABELS.unknown,
      reason: `Timing is missing for ${unknownTimeStages.map((stage) => STAGE_LABELS[stage]).join(", ")}.`,
      counterfactual: counterfactualCandidates(safeProfile, base.harm),
    };
  }

  const response = addIntervals(
    RESPONSE_STAGES.map((stage) => intervalForBand(safeProfile[stage].band)),
  );
  const { timing, slack } = classifyTiming(response, base.harm);
  const counterfactual = timing === "robust"
    ? { kind: "maintain", stages: [], plans: [], bindingStages: [] }
    : counterfactualCandidates(safeProfile, base.harm);

  if (timing === "escape") {
    return {
      ...base,
      response,
      slack,
      timing,
      outcome: "escapes",
      outcomeLabel: OUTCOME_LABELS.escapes,
      reason: `Even the fastest entered response (${formatInterval(response)}) does not beat the latest consequence estimate (${formatInterval(base.harm)}).`,
      counterfactual,
    };
  }

  if (missingEvidenceStages.length) {
    return {
      ...base,
      response,
      slack,
      timing,
      outcome: "unknown",
      outcomeLabel: OUTCOME_LABELS.unknown,
      reason: `Evidence is unknown for ${missingEvidenceStages.map((stage) => STAGE_LABELS[stage]).join(", ")}.`,
      counterfactual,
    };
  }

  if (timing === "overlap") {
    return {
      ...base,
      response,
      slack,
      timing,
      outcome: "no_margin",
      outcomeLabel: OUTCOME_LABELS.no_margin,
      reason: `The response and consequence bands overlap (${formatInterval(response)} vs ${formatInterval(base.harm)}).`,
      counterfactual,
    };
  }

  const supported = unsupportedEvidenceStages.length === 0;
  return {
    ...base,
    response,
    slack,
    timing,
    outcome: supported ? "contained" : "paper",
    outcomeLabel: supported ? OUTCOME_LABELS.contained : OUTCOME_LABELS.paper,
    reason: supported
      ? `The slowest entered response (${formatInterval(response)}) beats the earliest consequence estimate (${formatInterval(base.harm)}), and each timing has sufficient evidence for this gate.`
      : `The timing margin is positive, but ${unsupportedEvidenceStages.map((stage) => STAGE_LABELS[stage]).join(", ")} is not sufficiently evidenced for this gate.`,
    counterfactual: supported
      ? counterfactual
      : { kind: "evidence", stages: unsupportedEvidenceStages, plans: [], bindingStages: [] },
  };
}

function worsePath(a, b) {
  const aSlack = a.slack?.lower ?? Number.POSITIVE_INFINITY;
  const bSlack = b.slack?.lower ?? Number.POSITIVE_INFINITY;
  if (aSlack !== bSlack) return aSlack - bSlack;
  const severity = { escapes: 0, no_margin: 1, paper: 2, contained: 3, unknown: 4 };
  return (severity[a.outcome] ?? 5) - (severity[b.outcome] ?? 5);
}

function describeChanges(plan) {
  return plan.changes
    .map((change) => {
      if (change.from === "no_route") {
        return `create and exercise a ${STAGE_LABELS[change.stage]} route able to finish in ${TIME_BANDS[change.to].short}`;
      }
      if (change.from === "after_impact") {
        return `move ${STAGE_LABELS[change.stage]} before consequence and finish in ${TIME_BANDS[change.to].short}`;
      }
      return `${STAGE_LABELS[change.stage]}: ${TIME_BANDS[change.from].short} → ${TIME_BANDS[change.to].short}`;
    })
    .join("; ");
}

function buildActions(paths, criticalPath, criticalPathRankable) {
  if (!paths.length) {
    return [{
      phase: "Map first",
      title: "Map one service path and affected group",
      detail: "A containment race needs a downstream service and the people who could face its earliest consequence.",
      printDetail: "Name one downstream service and the people who could face its earliest consequence.",
      key: "map",
    }];
  }

  const actions = [];
  const incomplete = paths.find((path) => !path.groupIds.length);
  if (incomplete) {
    actions.push({
      phase: "Map first",
      title: `Name who is affected by ${incomplete.serviceLabel}`,
      detail: "A service without an affected-group node has no consequence deadline, so its containment path cannot be assessed.",
      printDetail: "Add an affected group; without one, this path has no consequence deadline.",
      key: "map",
    });
  }

  const unknown = paths.find((path) =>
    path.groupIds.length &&
    (path.timing === "unknown" || path.missingEvidenceStages.length > 0),
  );
  if (unknown) {
    const stages = [...new Set([
      ...PROFILE_STAGES.filter((stage) => unknown.profile[stage].band === "unknown"),
      ...unknown.missingEvidenceStages,
    ])];
    actions.push({
      phase: "Establish",
      title: `Close the evidence gap on ${unknown.serviceLabel}`,
      detail: stages.length
        ? `Record and test ${stages.map((stage) => STAGE_LABELS[stage]).join(", ")}. Unknowns block a containment claim.`
        : "Complete the mapped path before relying on the result.",
      printDetail: stages.length
        ? `Establish ${stages.map((stage) => STAGE_LABELS[stage]).join(", ")}. Unknowns block a positive result.`
        : "Complete this mapped path before relying on the result.",
      key: "unknown",
    });
  }

  const timingTarget = ["escape", "overlap"].includes(criticalPath?.timing)
    ? criticalPath
    : paths.find((path) => ["escape", "overlap"].includes(path.timing));
  if (timingTarget) {
    const counterfactual = timingTarget.counterfactual;
    if (counterfactual.kind === "resolution_limit") {
      actions.push({
        phase: "Resolution limit",
        title: `No available band proves a margin for ${timingTarget.serviceLabel}`,
        detail: "Even three 0–5m legs do not finish strictly before the entered consequence boundary at this resolution. Measure finer timings, or add a pre-authorised safe state or buffer, decouple the service, or remove reliance. This is not proof that a faster exact response is impossible.",
        printDetail: "Coarse bands cannot prove a margin. Measure finer timings or add a pre-authorised safe state or buffer; otherwise decouple or remove reliance.",
        key: "resolution_limit",
      });
    } else if (counterfactual.kind === "timing" && counterfactual.plans.length) {
      const binding = counterfactual.bindingStages;
      const plans = counterfactual.plans;
      const totalPlans = counterfactual.totalPlans ?? plans.length;
      const planCopy = plans
        .map((plan, index) => `${index + 1}) ${describeChanges(plan)}; response ${formatInterval(plan.response)}`)
        .join(" | ");
      const truncationCopy = totalPlans > plans.length
        ? ` ${totalPlans - plans.length} further Pareto-minimal options are retained only as a count in this compact view.`
        : "";
      actions.push({
        phase: "Timing requirement",
        title: binding.length
          ? `Shorten ${binding.map((stage) => STAGE_LABELS[stage]).join(" and ")} to establish a margin`
          : `Choose 1 of ${totalPlans} band-level timing options for ${timingTarget.serviceLabel}`,
        detail: `${planCopy}.${truncationCopy} Each shown option puts the response upper bound before harm may begin at ${formatMinutes(timingTarget.harm.lower)}. This establishes the timing margin only; the decision also applies the evidence gate.`,
        printDetail: `${describeChanges(plans[0])}; response ${formatInterval(plans[0].response)}.${totalPlans > 1 ? ` ${totalPlans} Pareto-minimal options.` : ""} Timing only; the evidence gate still applies.`,
        key: "timing",
      });
    }
  }

  const paper = paths.find((path) => path.outcome === "paper");
  const evidenceTarget = timingTarget?.missingEvidenceStages.length === 0
    ? timingTarget
    : paper;
  if (
    evidenceTarget &&
    evidenceTarget.missingEvidenceStages.length === 0 &&
    evidenceTarget.unsupportedEvidenceStages.length
  ) {
    actions.push({
      phase: "Exercise",
      title: `Strengthen the basis for ${evidenceTarget.serviceLabel}`,
      detail: `Validate or exercise ${evidenceTarget.unsupportedEvidenceStages.map((stage) => STAGE_LABELS[stage]).join(", ")}. A sufficient timing margin still cannot pass the gate on assertion or documentation alone.`,
      printDetail: `Validate or exercise ${evidenceTarget.unsupportedEvidenceStages.map((stage) => STAGE_LABELS[stage]).join(", ")}; a provisional basis cannot pass.`,
      key: "evidence",
    });
  }

  if (!criticalPathRankable && paths.some((path) => path.timing === "unknown")) {
    actions.push({
      phase: "Do not rank",
      title: "Keep the critical path open",
      detail: "An unknown consequence deadline may be earlier than every ranked path. Do not call another path worst until the missing timing is established.",
      printDetail: "Unknown timing could be earlier; do not call another path worst yet.",
      key: "ranking",
    });
  }

  if (!actions.length) {
    actions.push({
      phase: "Maintain",
      title: "Re-run the timed rehearsal after material change",
      detail: "Repeat the exercise when the model, vendor, data, service scope, staffing, fallback, or incident authority changes.",
      printDetail: "Repeat after changes to the model, vendor, data, service scope, staffing, fallback, or authority.",
      key: "maintain",
    });
  }

  return actions.slice(0, 4);
}

export function assessScenario({ systemId, nodes, edges, mode, profiles = {} }) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const downstream = new Set(descendants(systemId, nodes, edges));
  const services = nodes.filter((node) => node.type === "service" && downstream.has(node.id));
  const paths = services.map((service) => {
    const groupIds = descendants(service.id, nodes, edges).filter(
      (id) => byId.get(id)?.type === "group",
    );
    return assessPath({
      serviceId: service.id,
      serviceLabel: service.label,
      groupIds,
      profile: profiles?.[service.id]?.[mode],
    });
  });

  const unknownTimingPaths = paths.filter((path) => path.timing === "unknown");
  const rankable = paths.filter((path) => path.timing !== "unknown").sort(worsePath);
  const criticalPath = rankable[0] || null;
  const criticalPathRankable = unknownTimingPaths.length === 0 && paths.length > 0;
  const containedCount = paths.filter((path) => path.outcome === "contained").length;
  const timingRobustCount = paths.filter((path) => path.timing === "robust").length;
  const affectedGroups = new Set(paths.flatMap((path) => path.groupIds));

  let decision = "supported";
  if (!paths.length) decision = "not_demonstrated";
  else if (paths.some((path) => path.outcome === "escapes")) decision = "no";
  else if (paths.some((path) => path.outcome !== "contained")) decision = "not_demonstrated";

  const decisionLabel = !paths.length
    ? "Not demonstrated — no service path mapped"
    : {
        no: "No — response loses on at least one path",
        not_demonstrated: "Not demonstrated for every path",
        supported: "Supported for the mapped paths",
      }[decision];

  return {
    decision,
    decisionLabel,
    paths,
    criticalPath,
    criticalPathRankable,
    containedCount,
    timingRobustCount,
    serviceCount: paths.length,
    groupCount: affectedGroups.size,
    actions: buildActions(paths, criticalPath, criticalPathRankable),
  };
}

function serializableInterval(interval) {
  if (!interval) return null;
  return {
    lowerMinutes: Number.isFinite(interval.lower) ? interval.lower : null,
    upperMinutes: Number.isFinite(interval.upper) ? interval.upper : null,
  };
}

function serializableCounterfactual(counterfactual) {
  if (!counterfactual) return null;
  return {
    kind: counterfactual.kind,
    stages: counterfactual.stages ?? [],
    bindingStages: counterfactual.bindingStages ?? [],
    totalPlans: counterfactual.totalPlans ?? counterfactual.plans?.length ?? 0,
    plans: (counterfactual.plans ?? []).map((plan) => ({
      bands: plan.bands,
      responseInterval: serializableInterval(plan.response),
      changes: plan.changes,
    })),
  };
}

export function serializeAssessment({ scenario, profiles, mode, assessment }) {
  const system = scenario.nodes.find((node) => node.id === scenario.systemId);
  return {
    schema: "civic-cascade/v0.2",
    generatedAt: new Date().toISOString(),
    method: {
      id: "time-to-containment-interval-race",
      version: "0.2",
      rule: "The upper response bound must be strictly below the lower consequence bound. Response legs are sequential.",
      evidenceRule: "Unknown evidence blocks a positive result; an evidenced timing margin also requires evidence appropriate to each timing claim.",
    },
    scenario: {
      name: scenario.name,
      authority: scenario.authority,
      systemId: scenario.systemId,
      systemLabel: system?.label ?? scenario.name,
      mode,
      modeLabel: MODE_LABELS[mode],
    },
    map: {
      nodes: scenario.nodes,
      edges: scenario.edges,
    },
    profiles,
    assessment: {
      decision: assessment.decision,
      decisionLabel: assessment.decisionLabel,
      pathsPassingGate: assessment.containedCount,
      mappedServicePaths: assessment.serviceCount,
      affectedGroups: assessment.groupCount,
      criticalPathRankable: assessment.criticalPathRankable,
      criticalServiceId: assessment.criticalPath?.serviceId ?? null,
      paths: assessment.paths.map((path) => ({
        serviceId: path.serviceId,
        serviceLabel: path.serviceLabel,
        affectedGroupIds: path.groupIds,
        timing: path.timing,
        outcome: path.outcome,
        outcomeLabel: path.outcomeLabel,
        responseInterval: serializableInterval(path.response),
        consequenceInterval: serializableInterval(path.harm),
        slackInterval: serializableInterval(path.slack),
        decisiveStage: path.decisiveStage,
        missingEvidenceStages: path.missingEvidenceStages,
        unsupportedEvidenceStages: path.unsupportedEvidenceStages,
        reason: path.reason,
        counterfactual: serializableCounterfactual(path.counterfactual),
      })),
      actions: assessment.actions,
      limitation:
        "A conservative tabletop comparison of user-entered time bands and evidence for mapped service paths. It does not estimate probability, certify safety or compliance, or replace legal, security, equality, procurement, service-owner, or resident review.",
    },
  };
}
