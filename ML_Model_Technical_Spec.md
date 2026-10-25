# ML Model and Behavioural Drift Specification

## Identity Drift Detection in Autonomous AI Agents

**Status:** Research/implementation plan for MVP\
**Initial stack:** Python, NumPy, pandas, scikit-learn\
**Core rule:** The ML model is a risk signal. It does not authorize tool
execution and cannot override hard policy.

## 1. Model Objective

Estimate whether an agent action is unusual for its role, task, resource
sensitivity, destination, and recent/long-term behaviour. Produce
interpretable risk evidence that the backend decision engine can combine
with deterministic policy results and action impact.

This is not the same as directly detecting hidden LLM reasoning or
proving malicious intent. The model sees available structured data:
proposed tool call, arguments/features, identity, task context,
permissions, provenance tags, and action history.

## 2. Inputs and Feature Groups

### 2.1 Identity and task context

-   Agent ID and role.
-   Declared task or task category.
-   Policy version and permission scope.
-   Delegation chain / parent agent where available.
-   Session age and credential age where appropriate.

### 2.2 Action features

-   Tool/API name and operation.
-   Resource class and sensitivity.
-   Destination class / trust tier.
-   Read/write/delete/execute/export category.
-   Data volume or record count.
-   Request frequency and rate.
-   Time window and environment.
-   Whether the tool/resource/destination is allowed by policy.

### 2.3 Sequence features

-   Previous action category.
-   Transition count from previous category to current category.
-   Frequency of recent action patterns.
-   Sensitive-read followed by outbound transfer.
-   Unusual order of otherwise permitted actions.
-   Number of repeated failed/blocked attempts.

### 2.4 Provenance / taint features

-   Whether data came from an untrusted source.
-   Whether sensitive data was accessed in the session.
-   Known data lineage from read to write/egress.
-   Destination trust and egress category.
-   Whether provenance is missing or incomplete.

Do not claim taint tracking unless the implementation actually
propagates provenance through relevant transformations and tool
boundaries.

### 2.5 Long-window drift features

-   Rolling tool-use distribution.
-   Destination distribution changes.
-   Change in action volume/frequency.
-   Change in sensitive-resource access.
-   Divergence between a stable role reference and recent behaviour.

## 3. Model Pipeline

``` text
Action request + context
    -> schema validation and hard policy checks
    -> feature extraction
    -> role-conditioned probability estimates
    -> sequence anomaly features
    -> long-window drift features
    -> score fusion and uncertainty handling
    -> anomaly score + explanations
    -> backend decision engine
    -> allow / observe / step-up / block / isolate
```

Mandatory policy violations must be denied before or independently of
model scoring.

## 4. Baseline A: Smoothed Per-Dimension Probabilities

For categorical features, estimate a role/context-conditioned
probability:

\[ P(x`\mid `{=tex}r)=`\frac{N_{x,r}+\alpha}{N_r+\alpha K}`{=tex} \]

Where: - `x` is an observed feature value. - `r` is the relevant
role/context. - `N_x,r` is the count of that feature value for the
context. - `N_r` is the total relevant observations. - `K` is the number
of possible categories. - `alpha` is a smoothing parameter.

Smoothing avoids assigning zero probability to an unseen event. Unknown
values should still be identified explicitly and handled conservatively
when the action is sensitive.

For continuous variables, start with log transformations and robust
statistics or a distribution appropriate to the feature. Do not use
categorical frequency counts for continuous measurements without a
defined binning strategy.

### Candidate anomaly score

\[ A=`\sum`{=tex}\_i w_i\[-`\log`{=tex}(p_i)\] \]

`p_i` is the estimated likelihood for dimension `i`, and `w_i` is a
documented weight. Higher values indicate greater unusualness under the
chosen baseline.

Important limitations: - The sum is an anomaly score, not automatically
a probability of compromise. - Correlated dimensions can double-count
evidence. - Weights and normalization must be evaluated on held-out
scenarios. - A rare but harmless action should not automatically be
blocked. - Impact, permissions, and uncertainty must be considered
separately by the decision engine.

## 5. Baseline B: Sequence Analysis

Start with transition counts or a first-order Markov model rather than a
deep sequence network.

Example:
`search_supplier -> compare_prices -> read_hr_salary -> send_external_data`

The transition pattern may be unusual for a procurement role, especially
if the destination is external and sensitive data is involved.

Maintain a bounded per-agent deque of recent events. Extract transition
features, frequency of patterns, and context-dependent action order. A
linked list is not required; the algorithm and correct event context
matter more than the data structure.

Test both: - Suspicious sequences that should be flagged. - Rare but
legitimate sequences that should not be automatically treated as
malicious.

## 6. Baseline C: Slow Drift Detection

Keep two references: 1. A stable role-defined/reference baseline. 2. A
recent behavioural window.

Compare current distributions with the stable reference and track
sustained changes. Candidate methods include: - Distribution divergence
such as Jensen--Shannon divergence. - EWMA for gradual changes in
numerical features. - CUSUM for persistent shifts. - Rolling
frequency/quantile comparisons.

Choose a method after testing synthetic gradual-drift scenarios. Do not
let a continuously updated baseline replace the stable reference.
Baseline updates should be versioned, cautious, and based on trusted
data to reduce poisoning.

## 7. Model Comparison Plan

Do not assume a complex model will be best. Evaluate candidates on the
same labelled scenarios:

1.  Hard rules only (required baseline).
2.  Smoothed per-dimension probabilities.
3.  Per-dimension probabilities + sequence features.
4.  Per-dimension + sequence + slow-drift features.
5.  Optional logistic regression trained on reviewed labels.
6.  Optional Isolation Forest for anomaly detection if enough
    representative features exist.

The selected model must improve useful detection without unacceptable
false positives or latency. Use an offline evaluation dataset and keep a
versioned holdout set.

## 8. Risk Output Contract

Suggested output:

``` json
{
  "anomaly_score": 8.2,
  "calibrated_probability": null,
  "dimension_scores": {
    "tool_unusualness": 0.7,
    "resource_sensitivity": 1.0,
    "destination_risk": 0.9,
    "sequence_anomaly": 0.8,
    "slow_drift": 0.2
  },
  "reasons": [
    "RESOURCE_SENSITIVE",
    "UNUSUAL_DESTINATION",
    "SUSPICIOUS_ACTION_SEQUENCE"
  ],
  "model_version": "baseline-v1",
  "baseline_version": "role-procurement-v1",
  "uncertainty": "medium"
}
```

Values are illustrative, not validated. A dimension score's meaning and
scale must be documented. `calibrated_probability` stays null until a
calibration procedure has been evaluated on representative labelled
data.

## 9. Decision Integration

The backend decision engine should combine: - Hard policy result. -
Model anomaly score and uncertainty. - Resource/action impact. -
Role/task context. - Provenance and sensitive-data indicators. -
Approval requirements.

Illustrative tiers: - L0: allow. - L1: observe/enhanced logging. - L2:
step-up checks or human approval. - L3: block/restrict current action. -
L4: isolate agent and alert, subject to policy.

Thresholds are not universal constants. Tune them on labelled scenarios
and version the threshold configuration. Hard policy denials always take
precedence.

## 10. Training and Feedback

The first MVP can run without supervised training: it can use smoothed
frequencies and a baseline anomaly score.

If labelled examples become available: - Separate train, validation, and
holdout sets. - Include legitimate rare actions and multiple agent
roles. - Use analyst-confirmed labels rather than treating successful
execution as a positive label. - Track label provenance and class
imbalance. - Calibrate probabilities only after evaluation. - Version
the dataset, feature schema, model, threshold config, and baseline. -
Keep a rollback path. - Do not automatically learn from every event.

## 11. Evaluation Dataset

Create synthetic, explicitly labelled scenarios: 1. Normal in-role tool
usage. 2. Forbidden resource access. 3. Unusual but legitimate action.
4. Sensitive data read followed by external transfer. 5. Prompt
injection attempt causing an unexpected tool request. 6. Repeated denied
actions. 7. Slow gradual shift in destinations or volume. 8. Cold-start
agent with little history. 9. Missing or incomplete provenance. 10.
Multi-agent delegation and downstream action.

Synthetic scenarios are useful for testing logic but cannot establish
real-world efficacy alone. Later evaluation should use appropriately
governed, representative customer or benchmark data where available.

## 12. Metrics

Report: - True-positive rate / recall. - False-positive rate. -
Precision. - F1 where useful. - PR-AUC when labels and class balance
support it. - Calibration metrics such as Brier score if probabilities
are emitted. - Detection delay for sequence/drift scenarios. -
p50/p95/p99 scoring latency. - Legitimate actions held or blocked. -
Incremental detection over hard rules. - Model failure and
unknown-feature rates.

Always report sample size, scenario composition, and whether data is
synthetic.

## 13. Model Governance and Failure Modes

-   **Cold start:** Use role templates and conservative rules; show low
    confidence instead of inventing a strong probability.
-   **Correlated signals:** Avoid naive over-counting; compare fused
    model performance.
-   **Baseline poisoning:** Maintain a stable reference and reviewed
    updates.
-   **Concept drift:** Track versions and allow rollback.
-   **Missing features:** Return uncertainty; do not silently assign
    safe values.
-   **Model outage:** Hard policies remain active; sensitive/high-impact
    actions follow conservative policy.
-   **False positives:** Use shadow mode, thresholds, approvals, and
    reviewed feedback.
-   **Evasion:** Combine multiple dimensions and long-window behaviour;
    no detector guarantees complete coverage.

## 14. MVP Implementation Order

1.  Define feature schema and event taxonomy.
2.  Create deterministic hard-policy baseline.
3.  Implement smoothed categorical probabilities.
4.  Add sequence features using bounded per-agent history.
5.  Create synthetic labelled scenarios and a repeatable evaluation
    script.
6.  Compare rules-only versus model-assisted detection.
7.  Add drift metrics after the basic pipeline is reliable.
8.  Add calibration only when reliable labels and enough evaluation
    examples exist.
9.  Integrate the versioned risk output with the backend decision
    engine.
10. Document model limitations and avoid unvalidated security claims.
