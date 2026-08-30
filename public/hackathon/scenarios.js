// Worked examples for the tabletop.
//
// Extracted from app.js so the scenarios can be imported by the test suite without
// a DOM. Story mode and the scale ladder both make claims in prose about specific
// values in here (notably that the safeguarding path's detection band is
// "after_impact"); tests/engine.test.mjs asserts those, so the narrative cannot
// silently drift away from the data it describes.

function pathProfile(harm, detect, authorize, switchBand, evidence = {}) {
  return {
    harm: { band: harm, evidence: evidence.harm ?? "documented" },
    detect: { band: detect, evidence: evidence.detect ?? "asserted" },
    authorize: { band: authorize, evidence: evidence.authorize ?? "documented" },
    switch: { band: switchBand, evidence: evidence.switch ?? "asserted" },
  };
}

export const EXAMPLES = {
  housing: {
    key: "housing",
    exampleLabel: "Housing-assistance triage",
    name: "Housing-assistance triage model",
    authority: "Example Borough",
    systemId: "housing-ai",
    nodes: [
      { id: "model-api", type: "dependency", label: "Model vendor API", detail: "Shared hosted model" },
      { id: "case-data", type: "dependency", label: "Housing case data", detail: "Nightly case export" },
      { id: "housing-ai", type: "system", label: "Triage model", detail: "Ranks cases for staff review" },
      { id: "temp-housing", type: "service", label: "Temporary housing queue", detail: "Priority order" },
      { id: "safeguarding", type: "service", label: "Safeguarding referrals", detail: "Escalation signal" },
      { id: "advice", type: "service", label: "Benefits advice team", detail: "Case routing" },
      { id: "eviction", type: "group", label: "Families facing eviction", detail: "Time-sensitive cases" },
      { id: "disabled", type: "group", label: "Disabled applicants", detail: "Access and support needs" },
      { id: "language", type: "group", label: "Residents using interpreters", detail: "Communication barriers" },
    ],
    edges: [
      { from: "model-api", to: "housing-ai" },
      { from: "case-data", to: "housing-ai" },
      { from: "housing-ai", to: "temp-housing" },
      { from: "housing-ai", to: "safeguarding" },
      { from: "housing-ai", to: "advice" },
      { from: "temp-housing", to: "eviction" },
      { from: "safeguarding", to: "disabled" },
      { from: "advice", to: "language" },
    ],
    paths: {
      "temp-housing": {
        outage: pathProfile("within_hour", "immediate", "within_15", "within_hour", { detect: "technically_verified" }),
        silent_error: pathProfile("within_hour", "within_hour", "within_15", "within_shift"),
        compromise: pathProfile("within_hour", "within_hour", "within_hour", "next_day"),
      },
      safeguarding: {
        outage: pathProfile("within_15", "immediate", "within_15", "within_hour", { detect: "technically_verified" }),
        silent_error: pathProfile("within_15", "after_impact", "within_15", "within_hour"),
        compromise: pathProfile("within_15", "within_hour", "within_hour", "no_route"),
      },
      advice: {
        outage: pathProfile("within_shift", "immediate", "within_15", "within_hour", { detect: "technically_verified", authorize: "exercised", switch: "exercised" }),
        silent_error: pathProfile("within_shift", "within_hour", "within_15", "within_hour", { authorize: "exercised", switch: "exercised" }),
        compromise: pathProfile("within_hour", "within_hour", "within_hour", "within_shift"),
      },
    },
  },
  chatbot: {
    key: "chatbot",
    exampleLabel: "Resident-services chatbot",
    name: "Resident-services chatbot",
    authority: "Example City",
    systemId: "chatbot-ai",
    nodes: [
      { id: "chat-vendor", type: "dependency", label: "Chat platform", detail: "Hosted model and search" },
      { id: "web-content", type: "dependency", label: "Council web content", detail: "Published service guidance" },
      { id: "chatbot-ai", type: "system", label: "Resident chatbot", detail: "Answers and routes requests" },
      { id: "waste", type: "service", label: "Waste and street services", detail: "Request routing" },
      { id: "revenue", type: "service", label: "Benefits and revenue", detail: "Eligibility guidance" },
      { id: "contact-centre", type: "service", label: "Contact centre", detail: "Escalated conversations" },
      { id: "digital-only", type: "group", label: "Digital-only residents", detail: "No alternative channel" },
      { id: "claimants", type: "group", label: "Benefits claimants", detail: "Deadline-sensitive guidance" },
      { id: "frontline", type: "group", label: "Frontline staff", detail: "Absorb failed escalation" },
    ],
    edges: [
      { from: "chat-vendor", to: "chatbot-ai" },
      { from: "web-content", to: "chatbot-ai" },
      { from: "chatbot-ai", to: "waste" },
      { from: "chatbot-ai", to: "revenue" },
      { from: "chatbot-ai", to: "contact-centre" },
      { from: "waste", to: "digital-only" },
      { from: "revenue", to: "claimants" },
      { from: "contact-centre", to: "frontline" },
    ],
    paths: {
      waste: {
        outage: pathProfile("within_shift", "immediate", "within_15", "within_15", { detect: "technically_verified", authorize: "exercised", switch: "exercised" }),
        silent_error: pathProfile("within_shift", "within_hour", "within_15", "within_15", { authorize: "exercised", switch: "exercised" }),
        compromise: pathProfile("within_hour", "within_hour", "within_15", "within_shift"),
      },
      revenue: {
        outage: pathProfile("within_hour", "immediate", "within_15", "within_15", { detect: "technically_verified", authorize: "exercised", switch: "exercised" }),
        silent_error: pathProfile("within_shift", "within_hour", "immediate", "within_15", { authorize: "exercised", switch: "exercised" }),
        compromise: pathProfile("within_hour", "within_hour", "within_hour", "no_route"),
      },
      "contact-centre": {
        outage: pathProfile("within_shift", "immediate", "immediate", "within_15", { detect: "technically_verified", authorize: "technically_verified", switch: "exercised" }),
        silent_error: pathProfile("within_shift", "within_15", "within_15", "within_15", { detect: "technically_verified", authorize: "exercised", switch: "exercised" }),
        compromise: pathProfile("within_shift", "within_hour", "within_15", "within_hour", { detect: "technically_verified", authorize: "exercised", switch: "exercised" }),
      },
    },
  },
  copilot: {
    key: "copilot",
    exampleLabel: "Staff casework copilot",
    name: "Staff casework summarisation copilot",
    authority: "Example County",
    systemId: "copilot-ai",
    nodes: [
      { id: "copilot-vendor", type: "dependency", label: "Enterprise AI vendor", detail: "Shared tenant" },
      { id: "records", type: "dependency", label: "Case records", detail: "Multiple source systems" },
      { id: "copilot-ai", type: "system", label: "Casework copilot", detail: "Summaries and draft notes" },
      { id: "adult-care", type: "service", label: "Adult social care", detail: "Case summaries" },
      { id: "children", type: "service", label: "Children's services", detail: "Handover notes" },
      { id: "complaints", type: "service", label: "Complaints team", detail: "Draft responses" },
      { id: "care-users", type: "group", label: "People receiving care", detail: "Sensitive records" },
      { id: "families", type: "group", label: "Children and families", detail: "High-consequence cases" },
      { id: "complainants", type: "group", label: "Residents challenging decisions", detail: "Accuracy and reasons" },
    ],
    edges: [
      { from: "copilot-vendor", to: "copilot-ai" },
      { from: "records", to: "copilot-ai" },
      { from: "copilot-ai", to: "adult-care" },
      { from: "copilot-ai", to: "children" },
      { from: "copilot-ai", to: "complaints" },
      { from: "adult-care", to: "care-users" },
      { from: "children", to: "families" },
      { from: "complaints", to: "complainants" },
    ],
    paths: {
      "adult-care": {
        outage: pathProfile("within_hour", "immediate", "within_hour", "within_shift", { detect: "technically_verified" }),
        silent_error: pathProfile("within_hour", "within_shift", "within_hour", "within_shift"),
        compromise: pathProfile("within_hour", "within_hour", "within_hour", "no_route"),
      },
      children: {
        outage: pathProfile("within_15", "immediate", "within_hour", "within_shift", { detect: "technically_verified" }),
        silent_error: pathProfile("within_15", "after_impact", "within_hour", "within_shift"),
        compromise: pathProfile("within_15", "within_hour", "within_hour", "no_route"),
      },
      complaints: {
        outage: pathProfile("within_shift", "immediate", "within_hour", "within_hour", { detect: "technically_verified", switch: "exercised" }),
        silent_error: pathProfile("within_shift", "within_hour", "within_hour", "within_hour", { switch: "exercised" }),
        compromise: pathProfile("within_hour", "within_hour", "within_hour", "within_shift"),
      },
    },
  },
  frontier: {
    key: "frontier",
    exampleLabel: "Frontier model deployment (scale comparison)",
    name: "Frontier model deployment",
    authority: "Example Lab",
    scale: "frontier",
    scaleNote:
      "Illustrative, not an assessment of any real laboratory. It exists to show that the "
      + "decision rule does not change with scale \u2014 only the numbers do.",
    systemId: "frontier-model",
    nodes: [
      { id: "train-pipeline", type: "dependency", label: "Training pipeline", detail: "Data and reward signal" },
      { id: "checkpoint", type: "dependency", label: "Model checkpoint", detail: "Weights promoted to serving" },
      { id: "frontier-model", type: "system", label: "Deployed model", detail: "Serves API and products" },
      { id: "agent-products", type: "service", label: "Agentic products", detail: "Act on user systems" },
      { id: "downstream-api", type: "service", label: "Downstream developer API", detail: "Third-party products inherit outputs" },
      { id: "eval-harness", type: "service", label: "Internal evaluation harness", detail: "Monitors its own behaviour" },
      { id: "api-users", type: "group", label: "Users of dependent products", detail: "Never chose this model" },
      { id: "automated-subjects", type: "group", label: "People decided about automatically", detail: "No visibility, no appeal route" },
      { id: "operators", type: "group", label: "Operators relying on the eval signal", detail: "Absorb undetected drift" },
    ],
    edges: [
      { from: "train-pipeline", to: "frontier-model" },
      { from: "checkpoint", to: "frontier-model" },
      { from: "frontier-model", to: "agent-products" },
      { from: "frontier-model", to: "downstream-api" },
      { from: "frontier-model", to: "eval-harness" },
      { from: "agent-products", to: "automated-subjects" },
      { from: "downstream-api", to: "api-users" },
      { from: "eval-harness", to: "operators" },
    ],
    paths: {
      "agent-products": {
        outage: pathProfile("within_hour", "immediate", "within_hour", "within_shift", { detect: "technically_verified" }),
        silent_error: pathProfile("within_fortnight", "within_quarter", "later", "later"),
        compromise: pathProfile("within_shift", "later", "later", "within_quarter"),
      },
      "downstream-api": {
        outage: pathProfile("within_hour", "immediate", "within_hour", "next_day", { detect: "technically_verified" }),
        silent_error: pathProfile("within_fortnight", "within_quarter", "later", "no_route"),
        compromise: pathProfile("next_day", "later", "later", "within_quarter"),
      },
      "eval-harness": {
        outage: pathProfile("within_shift", "immediate", "immediate", "within_15", { harm: "observed", detect: "technically_verified", authorize: "exercised", switch: "exercised" }),
        silent_error: pathProfile("later", "after_impact", "later", "within_fortnight"),
        compromise: pathProfile("next_day", "within_quarter", "later", "no_route"),
      },
    },
  },
};
