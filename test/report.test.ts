/* Copyright © 2026 Apeleg Limited. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License") with LLVM
 * exceptions; you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 * http://llvm.org/foundation/relicensing/LICENSE.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateReport } from '../src/report.js';
import type { ITrialMeasurement, ITrialResult } from '../src/types.js';

function makeTrial(
	index: number,
	order: string[],
	measurements: Record<string, { totalMs: number; iterations: number }>,
): ITrialResult {
	const meas: Record<string, ITrialMeasurement> = {};
	for (const name of Object.keys(measurements)) {
		const m = measurements[name];
		meas[name] = {
			name,
			totalMs: m.totalMs,
			iterations: m.iterations,
			perIterationMs: m.totalMs / m.iterations,
		};
	}
	return {
		trialIndex: index,
		executionOrder: order,
		measurements: meas,
	};
}

describe('generateReport (statistics & comparisons)', () => {
	it('computes baseline-corrected samples and basic function stats', () => {
		// Two functions plus null baseline across 3 trials
		const baseline = '@@null';
		const fnA = 'A';
		const fnB = 'B';

		// Setup trials so that:
		// trial 0: baseline 1ms/it, A 6ms/it, B 11ms/it
		// trial 1: baseline 2ms/it, A 7ms/it, B 12ms/it
		// trial 2: baseline 1.5ms/it, A 6.5ms/it, B 11.5ms/it
		const trials: ITrialResult[] = [
			makeTrial(0, [baseline, fnA, fnB], {
				[baseline]: { totalMs: 1000, iterations: 1000 }, // 1.0
				[fnA]: { totalMs: 6000, iterations: 1000 }, // 6.0
				[fnB]: { totalMs: 11000, iterations: 1000 }, //11.0
			}),
			makeTrial(1, [fnA, baseline, fnB], {
				[baseline]: { totalMs: 2000, iterations: 1000 }, //2.0
				[fnA]: { totalMs: 7000, iterations: 1000 }, //7.0
				[fnB]: { totalMs: 12000, iterations: 1000 }, //12.0
			}),
			makeTrial(2, [fnB, fnA, baseline], {
				[baseline]: { totalMs: 1500, iterations: 1000 }, //1.5
				[fnA]: { totalMs: 6500, iterations: 1000 }, //6.5
				[fnB]: { totalMs: 11500, iterations: 1000 }, //11.5
			}),
		];

		const config = {
			warmupIterations: 10,
			iterationsPerTrial: 1000,
			trials: 3,
		};
		const report = generateReport(
			'suite1',
			config,
			trials,
			[fnA, fnB, baseline],
			baseline,
		);

		// Basic structure
		assert.equal(report.name, 'suite1');
		assert.deepEqual(report.config, config);
		assert.equal(report.trials.length, 3);
		assert.equal(report.baselineName, baseline);

		// Find function stats
		const byName = new Map(report.functions.map((f) => [f.name, f]));

		// Raw per-iteration values:
		// A raw: [6.0,7.0,6.5]  baseline: [1.0,2.0,1.5]
		// -> corrected: [5.0,5.0,5.0]
		// B raw: [11.0,12.0,11.5] baseline: [1.0,2.0,1.5]
		// -> corrected: [10.0,10.0,10.0]
		const statsA = byName.get(fnA)!;
		const statsB = byName.get(fnB)!;
		const statsNull = byName.get(baseline)!;

		// Samples should equal the corrected per-iteration values
		assert.deepEqual(
			statsA.samples.map((v) => Math.round(v * 1000) / 1000),
			[5, 5, 5],
		);
		assert.deepEqual(
			statsB.samples.map((v) => Math.round(v * 1000) / 1000),
			[10, 10, 10],
		);

		// Raw samples should equal measured per-iteration times
		assert.deepEqual(
			statsA.rawSamples.map((v) => Math.round(v * 1000) / 1000),
			[6, 7, 6.5],
		);
		assert.deepEqual(
			statsB.rawSamples.map((v) => Math.round(v * 1000) / 1000),
			[11, 12, 11.5],
		);

		// Mean/median/stdDev/sem for A: all samples identical
		// -> mean=5, median=5, stdDev=0, sem=0
		assert.equal(statsA.mean, 5);
		assert.equal(statsA.median, 5);
		assert.equal(statsA.stdDev, 0);
		assert.equal(statsA.sem, 0);
		assert.equal(statsA.sampleSize, 3);

		// Null baseline stats: should be baseline per-iteration values
		// corrected by itself -> samples ~ 0
		assert.deepEqual(
			statsNull.samples.map(
				(v) => Math.round((v + Number.EPSILON) * 1000) / 1000,
			),
			[0, 0, 0],
		);
		assert.equal(statsNull.mean, 0);

		// Percentiles: since samples identical, all percentiles equal the
		// sample value
		assert.equal(statsB.p5, 10);
		assert.equal(statsB.p25, 10);
		assert.equal(statsB.p75, 10);
		assert.equal(statsB.p95, 10);
	});

	it('computes paired comparisons including p-value, t-statistic and CI', () => {
		const baseline = '@@null';
		const fnA = 'A';
		const fnB = 'B';

		// Create 5 trials with small differences
		// baseline constant 1.0
		// A: [6,6,6,6,6] -> corrected [5,5,5,5,5]
		// B: [6.5,6.5,6.5,6.5,6.5] -> corrected [5.5,5.5,5.5,5.5,5.5]
		const trials: ITrialResult[] = [];
		for (let i = 0; i < 5; i++) {
			trials.push(
				makeTrial(i, [baseline, fnA, fnB], {
					[baseline]: { totalMs: 1000, iterations: 1000 },
					[fnA]: { totalMs: 6000, iterations: 1000 },
					[fnB]: { totalMs: 6500, iterations: 1000 },
				}),
			);
		}

		const config = {
			warmupIterations: 10,
			iterationsPerTrial: 1000,
			trials: 5,
		};
		const report = generateReport(
			'suite2',
			config,
			trials,
			[fnA, fnB, baseline],
			baseline,
		);

		// There should be 3 comparisons: (A,B), (A,baseline), (B,baseline)
		// Only check A vs B comparison
		const cmp = report.comparisons.find((c) => c.a === fnA && c.b === fnB);
		assert.ok(cmp, 'A vs B comparison present');

		// meanDifference = mean(A-B) => (5 - 5.5) = -0.5
		assert.ok(Math.abs(cmp!.meanDifference + 0.5) < 1e-12);

		// stdDevDifference = 0 because identical diffs
		assert.equal(cmp!.stdDevDifference, 0);

		// relativeDifference = mean(B_adj) = 5.5 -> meanD / meanB = -0.5 / 5.5
		assert.ok(Math.abs(cmp!.relativeDifference - -0.5 / 5.5) < 1e-12);

		// With zero variance, tStatistic should be 0 and pValue 1 (code sets pValue=1 when seD is NaN/0)
		assert.equal(cmp!.tStatistic, 0);
		assert.equal(cmp!.pValue, 1);
		assert.equal(cmp!.significant, false);

		// Confidence interval should be
		// [mean - tCrit*seD, mean + tCrit*seD] -> seD = 0
		// -> both ends equal mean
		assert.deepEqual(cmp!.confidenceInterval, [
			cmp!.meanDifference,
			cmp!.meanDifference,
		]);
	});

	it('handles single-trial edge cases (n=1) without throwing and computes df=1', () => {
		const baseline = '@@null';
		const fnA = 'A';
		const trials: ITrialResult[] = [
			makeTrial(0, [baseline, fnA], {
				// 0.5 ms/it
				[baseline]: { totalMs: 500, iterations: 1000 },
				// 2.5 ms/it => corrected 2.0
				[fnA]: { totalMs: 2500, iterations: 1000 },
			}),
		];

		const config = {
			warmupIterations: 0,
			iterationsPerTrial: 1000,
			trials: 1,
		};
		const report = generateReport(
			'single-trial',
			config,
			trials,
			[fnA, baseline],
			baseline,
		);

		// stats exist
		const f = report.functions.find((x) => x.name === fnA)!;
		assert.equal(f.sampleSize, 1);
		// For n=1, stdDev may be 0
		// (implementation uses stats.stdDev which should return 0)
		assert.equal(f.samples.length, 1);
		assert.equal(f.samples[0], 2.0);

		// comparisons will include only (A,baseline)
		const cmp = report.comparisons.find(
			(c) => c.a === fnA && c.b === baseline,
		);
		assert.ok(cmp);
		// Degrees of freedom computed as Math.max(n - 1, 1) => 1
		assert.equal(cmp!.degreesOfFreedom, 1);
	});

	it('keeps execution order irrelevant for numeric results (mapping by names)', () => {
		const baseline = '@@null';
		const fnA = 'A';
		const fnB = 'B';

		// Trial with non-uniform executionOrder
		const trials: ITrialResult[] = [
			makeTrial(0, [fnB, fnA, baseline], {
				[baseline]: { totalMs: 1000, iterations: 1000 },
				[fnA]: { totalMs: 3000, iterations: 1000 },
				[fnB]: { totalMs: 5000, iterations: 1000 },
			}),
			makeTrial(1, [baseline, fnB, fnA], {
				[baseline]: { totalMs: 1000, iterations: 1000 },
				[fnA]: { totalMs: 3000, iterations: 1000 },
				[fnB]: { totalMs: 5000, iterations: 1000 },
			}),
		];

		const config = {
			warmupIterations: 0,
			iterationsPerTrial: 1000,
			trials: 2,
		};
		const report = generateReport(
			'order-irrelevant',
			config,
			trials,
			[fnA, fnB, baseline],
			baseline,
		);

		const A = report.functions.find((f) => f.name === fnA)!;
		const B = report.functions.find((f) => f.name === fnB)!;

		// Raw samples for A: [3,3], baseline [1,1] -> corrected [2,2]
		assert.deepEqual(
			A.samples.map((v) => Math.round(v * 1000) / 1000),
			[2, 2],
		);
		assert.deepEqual(
			B.samples.map((v) => Math.round(v * 1000) / 1000),
			[4, 4],
		);
	});

	it('includes all pairwise comparisons (k choose 2) and correct ordering (i<j)', () => {
		const baseline = '@@null';
		const names = ['a', 'b', 'c', baseline];
		const trials: ITrialResult[] = [
			makeTrial(0, names, {
				[baseline]: { totalMs: 1000, iterations: 1000 },
				a: { totalMs: 2000, iterations: 1000 },
				b: { totalMs: 3000, iterations: 1000 },
				c: { totalMs: 4000, iterations: 1000 },
			}),
			makeTrial(1, names, {
				[baseline]: { totalMs: 1000, iterations: 1000 },
				a: { totalMs: 2000, iterations: 1000 },
				b: { totalMs: 3000, iterations: 1000 },
				c: { totalMs: 4000, iterations: 1000 },
			}),
		];

		const report = generateReport(
			'k-choose-2',
			{ warmupIterations: 0, iterationsPerTrial: 1000, trials: 2 },
			trials,
			names,
			baseline,
		);

		// number of functions passed is 4 -> comparisons = C(4,2) = 6
		assert.equal(report.comparisons.length, 6);

		// Ensure no duplicate unordered pairs and ordering matches i<j
		const pairs = report.comparisons.map((c) => `${c.a}~${c.b}`);
		const expectedPairs = [
			'a~b',
			'a~c',
			'a~@@null',
			'b~c',
			'b~@@null',
			'c~@@null',
		];
		assert.deepEqual(pairs.sort(), expectedPairs.sort());
	});
});
