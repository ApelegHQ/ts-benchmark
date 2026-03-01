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

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	mean,
	median,
	variance,
	stdDev,
	sem,
	percentile,
	min,
	max,
	trimmedMean,
	tDistPValue,
	tCritical005TwoTailed,
} from '../src/stats.js';

function assertApprox(
	actual: number,
	expected: number,
	tolerance = 1e-9,
): void {
	const diff = Math.abs(actual - expected);
	assert.ok(
		diff <= tolerance,
		`Expected ${actual} ≈ ${expected} (diff=${diff}, tol=${tolerance})`,
	);
}

describe('basic statistics', () => {
	const vals = [1, 2, 3, 4, 5];

	it('mean', () => {
		assert.equal(mean(vals), 3);
	});

	it('median odd-length', () => {
		assert.equal(median(vals), 3);
	});

	it('median even-length', () => {
		assert.equal(median([1, 2, 3, 4]), 2.5);
	});

	it('min and max', () => {
		assert.equal(min(vals), 1);
		assert.equal(max(vals), 5);
	});

	it('variance (sample, Bessel-corrected)', () => {
		// For 1..5 sample variance = 2.5
		const v = variance(vals);
		assertApprox(v, 2.5);
	});

	it('stdDev (sqrt(variance))', () => {
		const s = stdDev(vals);
		assertApprox(s, Math.sqrt(2.5));
	});

	it('sem (s / sqrt(n))', () => {
		const s = stdDev(vals);
		const expected = s / Math.sqrt(vals.length);
		assertApprox(sem(vals), expected);
	});
});

// ── Descriptive statistics ──────────────────────────────────────────────

describe('mean', () => {
	it('returns NaN for an empty array', () => {
		assert.equal(mean([]), NaN);
	});

	it('computes the arithmetic mean', () => {
		assert.equal(mean([2, 4, 6]), 4);
		assert.equal(mean([1, 2, 3, 4, 5]), 3);
	});

	it('handles a single element', () => {
		assert.equal(mean([7]), 7);
	});
});

describe('median', () => {
	it('returns NaN for an empty array', () => {
		assert.equal(median([]), NaN);
	});

	it('returns the middle value for odd-length arrays', () => {
		assert.equal(median([3, 1, 2]), 2);
		assert.equal(median([5, 1, 3, 2, 4]), 3);
	});

	it('returns the average of the two middle values for even-length', () => {
		assert.equal(median([4, 1, 3, 2]), 2.5);
		assert.equal(median([1, 3]), 2);
	});
});

describe('variance', () => {
	it('returns NaN for fewer than 2 values', () => {
		assert.equal(variance([]), NaN);
		assert.equal(variance([42]), NaN);
	});

	it('uses Bessel correction (n−1 denominator)', () => {
		// [2, 4]: mean=3, Σ(xi−3)²=2, var=2/1=2
		assert.equal(variance([2, 4]), 2);
	});

	it('returns 0 for identical values', () => {
		assert.equal(variance([5, 5, 5]), 0);
	});

	it('matches a hand-computed value', () => {
		// [2,4,4,4,5,5,7,9] → mean=5, Σ(xi−5)²=32, var=32/7
		assertApprox(variance([2, 4, 4, 4, 5, 5, 7, 9]), 32 / 7);
	});
});

describe('stdDev', () => {
	it('equals √variance', () => {
		assertApprox(stdDev([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7));
	});
});

describe('sem', () => {
	it('returns NaN for fewer than 2 values', () => {
		assert.equal(sem([]), NaN);
		assert.equal(sem([1]), NaN);
	});

	it('equals stdDev / √n', () => {
		const v = [2, 4, 4, 4, 5, 5, 7, 9];
		assertApprox(sem(v), Math.sqrt(32 / 7) / Math.sqrt(8));
	});
});

describe('percentile', () => {
	it('returns NaN for an empty array', () => {
		assert.equal(percentile([], 50), NaN);
	});

	it('clamps at p=0 and p=100', () => {
		assert.equal(percentile([1, 2, 3], 0), 1);
		assert.equal(percentile([1, 2, 3], 100), 3);
	});

	it('returns exact values at integer indices', () => {
		// [10,20,30,40,50]: p25 → idx=1 → 20, p50 → idx=2 → 30
		assert.equal(percentile([10, 20, 30, 40, 50], 25), 20);
		assert.equal(percentile([10, 20, 30, 40, 50], 50), 30);
	});

	it('interpolates linearly between values', () => {
		// [10,20,30,40,50]: p10 → idx=0.4 → 10·0.6 + 20·0.4 = 14
		assertApprox(percentile([10, 20, 30, 40, 50], 10), 14);
	});

	it('min (0%) and max (100%)', () => {
		const arr = [10, 20, 30, 40];
		assert.equal(percentile(arr, 0), 10);
		assert.equal(percentile(arr, 100), 40);
	});

	it('50% equals median', () => {
		const arr = [1, 2, 3, 4, 5, 6];
		const p50 = percentile(arr, 50);
		assertApprox(p50, median(arr));
	});

	it('linear interpolation', () => {
		const arr = [0, 10, 20, 30];
		// 25% should be 7.5 (between 0 and 10)
		assertApprox(percentile(arr, 25), 7.5);
		// 75% should be 22.5 (between 20 and 30)
		assertApprox(percentile(arr, 75), 22.5);
	});
});

describe('min / max', () => {
	it('return NaN for empty arrays', () => {
		assert.equal(min([]), NaN);
		assert.equal(max([]), NaN);
	});

	it('find the extremes', () => {
		assert.equal(min([3, 1, 4, 1, 5]), 1);
		assert.equal(max([3, 1, 4, 1, 5]), 5);
	});
});

describe('trimmedMean', () => {
	it('returns NaN for an empty array', () => {
		assert.equal(trimmedMean([]), NaN);
	});

	it('trims the specified fraction from each end', () => {
		// sorted [1..8], 25% → drop 2 each end → [3,4,5,6] → mean=4.5
		assert.equal(trimmedMean([8, 3, 1, 6, 4, 7, 5, 2], 0.25), 4.5);
	});

	it('defaults to 10 %', () => {
		// 10 values → drop 1 each end → [2..9] → mean=5.5
		assert.equal(trimmedMean([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 5.5);
	});

	it('trimmedMean default fraction 0.1 and custom fraction', () => {
		const arr = [1, 2, 3, 100]; // outlier 100
		// With default fraction 0.1, no values removed on small array -> mean = 26.5
		assertApprox(trimmedMean(arr), mean(arr));
		// With fraction 0.25 remove 25% from each end -> remove one smallest and one largest -> [2,3] -> mean 2.5
		assertApprox(trimmedMean(arr, 0.25), 2.5);
	});
});

// ── t-distribution utilities ────────────────────────────────────────────

describe('tDistPValue', () => {
	it('returns 1 when t = 0', () => {
		assert.equal(tDistPValue(0, 10), 1);
	});

	it('returns NaN for df ≤ 0', () => {
		assert.ok(Number.isNaN(tDistPValue(1, 0)));
		assert.ok(Number.isNaN(tDistPValue(1, -5)));
	});

	it('≈ 0.05 at the df = 10 critical value (t ≈ 2.228)', () => {
		assertApprox(tDistPValue(2.228, 10), 0.05, 0.002);
	});

	it('is symmetric: same p for +t and −t', () => {
		assertApprox(tDistPValue(2.5, 15), tDistPValue(-2.5, 15));
	});

	it('yields small p for large |t|', () => {
		assert.ok(tDistPValue(10, 20) < 0.001);
	});

	it('yields large p for small |t|', () => {
		assert.ok(tDistPValue(0.1, 20) > 0.9);
	});

	it('tDistPValue symmetry and limits', () => {
		// p-value is two-tailed: p(|T| > |t|)
		const p1 = tDistPValue(0, 10);
		assertApprox(p1, 1); // t=0 -> p=1

		const pLargeT = tDistPValue(1000, 10);
		assert.ok(
			pLargeT < 1e-6,
			`expected very small p-value, got ${pLargeT}`,
		);
	});

	it('tDistPValue decreases with increasing |t|', () => {
		const pSmall = tDistPValue(0.5, 10);
		const pLarge = tDistPValue(2.5, 10);
		assert.ok(pLarge < pSmall);
	});
});

describe('tCritical005TwoTailed', () => {
	it('matches exact table entries', () => {
		assert.equal(tCritical005TwoTailed(1), 12.706);
		assert.equal(tCritical005TwoTailed(10), 2.228);
		assert.equal(tCritical005TwoTailed(20), 2.086);
	});

	it('returns 1.96 for large df', () => {
		assert.equal(tCritical005TwoTailed(5000), 1.96);
	});

	it('interpolates linearly between table entries', () => {
		// df = 22 sits between 20 (2.086) and 25 (2.060)
		const expected = 2.086 + (2 / 5) * (2.06 - 2.086);
		assertApprox(tCritical005TwoTailed(22), expected);
	});

	it('tCritical005TwoTailed uses standard normal for large df', () => {
		const tc = tCritical005TwoTailed(1_000_001);
		// standard-normal z_{0.975} ≈ 1.959963984540054
		assertApprox(tc, 1.96, 1e-2);
	});

	it('tCritical005TwoTailed monotonic and reasonable for small df', () => {
		const t1 = tCritical005TwoTailed(1);
		const t5 = tCritical005TwoTailed(5);
		const t30 = tCritical005TwoTailed(30);
		// critical value should decrease as df increases
		assert.ok(t1 > t5 && t5 > t30);
		// check approximate known values
		// df=1 ~ 12.706, df=30 ~ 2.042
		assert.ok(t1 > 10);
		assert.ok(t30 > 2 && t30 < 3);
	});
});
