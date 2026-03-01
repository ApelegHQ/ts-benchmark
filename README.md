# @apeleghq/benchmark

![NPM Downloads](https://img.shields.io/npm/dw/@apeleghq/benchmark?style=flat-square)
[![License](https://img.shields.io/badge/License-Apache%202.0%20with%20llvm%20exception-blue.svg)](https://github.com/ApelegHQ/ts-cms-ep-sfx/blob/master/LICENSE)

A statistically rigorous benchmarking library with paired t-tests, baseline
correction, and confidence intervals.

---

## Features

- No runtime dependencies (except `picocolor` with some built-in reporters)
- Runtime and framework agnostic (ESM and CJS dual-package).
- Automatically injects a no-op baseline function to subtract loop and call
  overhead from every measurement on a per-trial basis.
- Runs all functions within the same trial to enable
  **paired statistical tests** — shared noise sources (GC pauses, thermal
  throttling, etc.) cancel out in per-trial differences $d_i = a_i - b_i$.
- Computes descriptive statistics per function: mean, median, standard
  deviation, SEM, min, max, and percentiles ($p_5$, $p_{25}$, $p_{75}$,
  $p_{95}$).
- Reports 95% confidence intervals for all means.
- Performs all $\binom{k}{2}$ pairwise **paired t-tests** with two-tailed
  p-values and significance flags.
- Randomises execution order within each trial to reduce systematic bias.
- Per-benchmark and suite-level `setup`/`teardown` hooks with shared typed
  context.
- Configurable warmup iterations, iterations per trial, and number of trials.
- Includes three built-in reporters: **simple**, **advanced**, and **xUnit**.
- Fully JSON-serialisable output for custom reporting or CI integration.

---

## Installation

```sh
npm install @apeleghq/benchmark
```

or

```sh
yarn add @apeleghq/benchmark
```

---

## Usage

### Basic suite

```typescript
import { runSuite } from '@apeleghq/benchmark';
import simpleReport from '@apeleghq/benchmark/reporters/simple';

type Ctx = {
  array: unknown[];
};

const result = await runSuite<Ctx>({
  name: 'Array copy comparison',
  setup() {
    this.array = [1, 2, 3];
  },
  functions: [
    {
      name: 'Array.from',
      fn() {
        Array.from(this.array);
      },
    },
    {
      name: 'Spread operator',
      fn() {
        [...this.array];
      },
    },
  ],
});

simpleReport(result);
```

### Advanced reporter

```typescript
import advancedReport from '@apeleghq/benchmark/reporters/advanced';

advancedReport(result);
```

### xUnit reporter (for CI integration)

```typescript
import xunitReport from '@apeleghq/benchmark/reporters/xunit';

console.log(xunitReport(result));
```

### Configuration options

All fields in `ISuiteConfig` beyond `name` and `functions` are optional:

```typescript
const result = await runSuite({
  name: 'My suite',
  warmupIterations: 10,    // default: 10
  iterationsPerTrial: 1000, // default: 1000
  trials: 30,               // default: 30
  setup() { /* suite-level context setup */ },
  teardown() { /* suite-level context teardown */ },
  functions: [
    {
      name: 'my-fn',
      fn() { /* ... */ },
      setup() { /* function-level setup, runs before warmup+measurement */ },
      teardown() { /* function-level teardown, runs after measurement */ },
    },
  ],
});
```

### Using the statistics module directly

The `stats` subpackage exposes the underlying statistical primitives:

```typescript
import { mean, median, stdDev, tDistPValue } from '@apeleghq/benchmark/stats';
```

---

## How it works

<details>
<summary>Statistical methodology</summary>

### Baseline correction

A no-op function (internally named `@@null`) is automatically added to every
suite. Its per-trial measurement captures pure loop and call overhead. This
baseline value is subtracted from every other function's measurement on a
**per-trial basis** before any statistics are computed:

$$\hat{x}_{i,\text{fn}} = x_{i,\text{fn}} - x_{i,\text{null}}$$

All reported aggregate statistics (mean, median, standard deviation, confidence
intervals) are computed from these baseline-corrected samples.

### Paired t-test

Because all functions are measured within the same trial, comparisons use a
**paired (dependent) t-test** rather than an independent-samples test.
Per-trial differences are:

$$d_i = a_i - b_i$$

The t-statistic is:

$$t = \frac{\bar{d}}{s_d / \sqrt{n}}$$

where $\bar{d}$ is the mean of the differences and $s_d$ is their sample
standard deviation. This is more powerful than an unpaired test because shared
noise sources cancel out.

### Confidence intervals

The 95% confidence interval for the true mean difference is:

$$\bar{d} \pm t_{\alpha/2,\, n-1} \cdot \frac{s_d}{\sqrt{n}}$$

where $t_{\alpha/2,\, n-1}$ is the critical value from the Student's
t-distribution with $n-1$ degrees of freedom.

</details>

---

## Output format

`runSuite` returns a fully JSON-serialisable `ISuiteReport` object:

| Field | Description |
|---|---|
| `name` | Suite name |
| `config` | Effective configuration (iterations, trials, warmup) |
| `trials` | Every trial with raw timings and execution order |
| `functions` | Per-function aggregate statistics (corrected and raw samples) |
| `comparisons` | All pairwise paired t-test results |
| `baselineName` | Name of the injected null baseline (`@@null`) |

Each entry in `comparisons` includes:

| Field | Description |
|---|---|
| `meanDifference` | $\bar{d}$ — mean of paired differences (ms) |
| `relativeDifference` | $\bar{d} / \bar{b}$ — relative difference as a ratio |
| `tStatistic` | Computed t-statistic |
| `pValue` | Two-tailed p-value |
| `significant` | `true` if `pValue < 0.05` |
| `confidenceInterval` | 95% CI for the true mean difference (ms) |

---

## Exports

```
| Export path | Description |
|---|---|
| `@apeleghq/benchmark` | `runSuite` — main entry point |
| `@apeleghq/benchmark/stats` | Statistical primitives (mean, stdDev, t-test, etc.) |
| `@apeleghq/benchmark/reporters/simple` | Simple console reporter |
| `@apeleghq/benchmark/reporters/advanced` | Advanced console reporter with full statistics |
| `@apeleghq/benchmark/reporters/xunit` | xUnit XML reporter for CI systems |
```

---

## Contributing

Contributions welcome. Please open issues or pull requests on the repository.
Consider adding unit tests for edge cases and additional reporters if extending
the library.

---

## License

This project is licensed under the Apache 2.0 License with the LLVM exception.
You are free to use this package in compliance with the terms of the license.
For more information, see the [`LICENSE`](./LICENSE) file.
