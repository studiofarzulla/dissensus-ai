# Civic Cascade methodology

## 1. Intended use and decision question

Civic Cascade is a structured tabletop for a local-government team considering or already using an AI-enabled system. Version 0.2 addresses one narrow question:

> **Can the authority rely on its current incident response to finish before the earliest mapped public consequence?**

The tool does not produce a general risk score. It compares a conservative response-time interval with a conservative consequence-time interval for every mapped service path. Its result is a decision prompt for a cross-functional review, not an approval.

The smallest assessed unit is one AI use, one downstream service inheriting its output or operational failure, and the affected groups mapped below that service. If several affected groups are mapped to one service, the user is instructed to enter the earliest plausible consequence among them. A service with no affected-group node remains visible as an incomplete path.

## 2. Inputs

The user selects one incident shape:

1. visible outage;
2. silent ranking or output error;
3. vendor or data compromise.

Each service has a separate profile for each incident shape. Switching from an outage to a silent error therefore does not silently reuse the same detection assumption.

For the selected service path, the user enters four elapsed-time bands:

1. **Consequence**: time from the incident trigger to the earliest material consequence for any mapped affected group;
2. **Detection**: time from the incident trigger until the failure is detected;
3. **Authorisation**: additional time after detection until someone can authorise a pause, isolation, or switch;
4. **Fallback startup**: additional time after authorisation until a safe fallback route is operating.

The three response legs are modelled as sequential. If a real workflow overlaps them, that overlap should be demonstrated with a measured workflow rather than represented by silently subtracting time.

The user also records the basis for each timing assertion:

- unknown;
- asserted in the room;
- documented;
- technically verified;
- exercised;
- observed in operation.

These categories are displayed as evidence provenance. They are not converted into score points.

## 3. Time bands

The numeric bands are deliberately coarse and share endpoints. Shared endpoints prevent an estimate at a bucket boundary from producing an accidental green result.

| Band | Closed interval in elapsed minutes |
|---|---:|
| Immediate | 0–5 |
| 5–15 minutes | 5–15 |
| 15–60 minutes | 15–60 |
| 1–8 hours | 60–480 |
| 8–24 hours | 480–1,440 |
| 1–3 days | 1,440–4,320 |

Response legs also allow three non-numeric states:

- **only after consequence**: the response leg cannot precede first consequence under the entered workflow;
- **no route exists**: the required detection, authority, or fallback route is structurally absent;
- **unknown**: the time has not been established.

The prototype treats all bands as elapsed clock time, not business time.

## 4. Interval race

For each complete service path, response time is the interval sum:

```text
T_response = T_detect + T_authorize + T_switch
```

If the three legs have lower bounds `Ld`, `La`, and `Ls` and upper bounds `Ud`, `Ua`, and `Us`, then:

```text
T_response = [Ld + La + Ls, Ud + Ua + Us]
```

With consequence interval `[Lh, Uh]`, the implied slack interval is:

```text
S = [Lh - U_response, Uh - L_response]
```

Timing is classified deterministically:

- **robust margin** when `U_response < Lh`: even the slowest entered response beats the earliest entered consequence;
- **escape** when `L_response >= Uh`: even the fastest entered response does not beat the latest entered consequence;
- **overlap** otherwise: containment may be possible, but the bands do not demonstrate it;
- **unknown** when a required time is unknown;
- **decisive escape** when a response leg occurs only after consequence or no route exists.

Equality is not green. The rule requires response to finish strictly before consequence, not at the same boundary.

This is a conservative interval comparison, not a probability model. The intervals do not encode distributions, confidence levels, likelihood, frequency, severity, or expected loss.

## 5. Evidence gate

Timing and evidence are separate axes. A favourable clock calculation is not enough to claim an evidenced timing margin.

Unknown evidence blocks a positive result. For an **evidenced timing margin** result, the prototype also requires:

- consequence timing to be documented, technically verified, exercised, or observed;
- detection timing to be technically verified, exercised, or observed;
- authorisation timing to be exercised or observed;
- fallback startup to be exercised or observed.

Technical verification alone is not treated as proof of an authorisation or fallback handoff, because the current prototype does not separately establish whether that handoff is fully automated. Those legs remain provisional until exercised or observed.

The displayed path outcomes are:

| Timing result | Evidence result | Displayed outcome |
|---|---|---|
| robust | operationally supported | Evidenced timing margin |
| robust | known but provisional | Timing works on paper |
| overlap | any known basis | No assured margin |
| escape / decisive escape | any basis | Consequence outruns response |
| unknown time, unknown evidence, or incomplete map | incomplete | Insufficient evidence |

A negative timing result remains visible even when evidence is weak: the interface says the response loses **under the entered bands**. Weak evidence can never turn a failing path green.

## 6. Scenario decision gate

Paths are aggregated without adding risk points:

- if any complete path has an escape result, the gate is **No — response loses on at least one path**;
- otherwise, if any path is overlapping, provisional, unknown, or incomplete, the gate is **Not demonstrated for every path**;
- only if every mapped service path has a robust margin and operational evidence is the gate **Supported for the mapped paths**.

“Supported for the mapped paths” does not mean safe, compliant, lawful, approved, or suitable for deployment. It means only that the entered response bounds finish before the entered consequence bounds for the paths currently in the map, with the evidence rule above satisfied.

The critical path is the rankable path with the smallest conservative slack, `Lh - U_response`. If any path has unknown timing, the interface says the critical path is not fully rankable rather than pretending that a known path must be worst.

## 7. What to resolve next

For a failing path with known consequence timing, the engine searches all monotonically earlier numeric bands for detection, authorisation, and fallback startup. A candidate is sufficient only when its new upper response bound is strictly lower than the consequence lower bound.

The search then removes candidates that demand at least as much improvement on every response leg as another successful candidate. The remaining plans are Pareto-minimal sufficient timing changes. A response leg appearing in every remaining plan is reported as a binding constraint. The compact interface and JSON serialise up to six plans and preserve the total count when more exist; no displayed plan is described as uniquely optimal.

No financial, staffing, or implementation cost is assigned to a band change. If several alternative plans are sufficient, the tool shows the alternatives rather than inventing a single optimum. If even three 0–5 minute response bands cannot finish strictly before the earliest consequence boundary, the tool reports a **resolution limit**, not structural impossibility. Finer measured timings could still establish a margin. Other options are to introduce a pre-authorised safe state or buffer, decouple the service, or remove the reliance.

Evidence actions remain separate from timing actions. “Exercise the authorisation handoff” is not treated as commensurable with “shorten detection from one hour to fifteen minutes.” A sufficient timing counterfactual does not by itself make the path, let alone the all-path gate, green if its evidence remains provisional; the interface lists both requirements. The compact action list prioritises the current critical path. Clearing it may expose another blocking path, so these are next actions rather than a claim that one edit will make the aggregate gate pass. When timing itself is unknown, the first action is to establish it rather than optimise a fictional value.

## 8. Dependency-map semantics

The graph is directed. An edge means that the target consumes an output, dependency, or operational consequence from the source. The interface permits a shallow map of:

```text
upstream dependency → AI use → service path → affected group
```

It caps service and affected-group columns at four nodes to keep the tabletop and printed brief usable. Custom editing cannot create cycles. The graph colours each service and affected-group branch by the corresponding path outcome; the status word is also printed inside service nodes and in the all-path result cards, so colour is not the only signal.

The graph is user-entered structure. It is not empirical evidence of contagion, causal identification, a coupled network simulation, or an enterprise architecture model.

## 9. Relationship to existing work

Civic Cascade can support mapping and management conversations in the NIST AI Risk Management Framework, particularly context documentation, potential impacts, relevant actors, prioritised risks, and planned responses. It does not claim conformance with NIST AI RMF or any jurisdiction-specific requirement.

*The Loaded Wheel* contributes the operational intuition that response depends on legibility, actionable attribution, and a receiving institution with authority and practised capacity. Civic Cascade turns that intuition into explicit detection, authorisation, and fallback clocks; it does not reuse the paper's historical domain ranking.

*Stakes Without Voice* contributes the requirement to name materially affected groups. The prototype uses those groups to define a public-consequence boundary without inferring consciousness, moral status, legal standing, or consent.

ASRI contributes a practice of transparent composite monitoring and explicit claim ceilings. ASRI is not used as a network-contagion model here, and Civic Cascade no longer constructs an aggregate weighted risk score.

## 10. Validation status and limitations

Version 0.2 has deterministic tests for interval addition, strict boundary behavior, overlap, guaranteed escape, unknown and absent routes, stage-valid bands, evidence-gated positive results, fail-closed aggregation, critical-path selection, joint timing-and-evidence actions, counterfactual soundness, band-resolution limits, monotonicity, and serialization.

It has not yet been:

- tested with council service owners or resident representatives;
- calibrated against historical municipal AI incidents;
- checked against a particular jurisdiction's law or policy;
- evaluated for inter-rater agreement on time bands or evidence labels;
- validated for workflows whose response legs run in parallel;
- accessibility-audited by disabled users or a specialist;
- security-reviewed for use with sensitive organisational maps.

The examples are synthetic. The app does not collect case or resident data, call a model, upload the map, or independently verify any assertion. The next defensible step is a facilitated pilot with one service team using a non-sensitive architecture sketch, followed by revision from observed disagreements and missing dependencies—not a larger taxonomy.
