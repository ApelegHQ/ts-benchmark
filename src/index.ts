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

// Runner
export { runSuite, Suite } from './runner.js';

// Report generation (useful for re-processing serialised trial data)
export { generateReport } from './report.js';

// Stats utilities (for custom consumer-side analysis)
export * as stats from './stats.js';

// Types
export { NULL_FUNCTION_NAME } from './types.js';
export type {
	ContextFn,
	IBenchmarkFn,
	IFunctionStatistics,
	IPairedComparison,
	ISuiteConfig,
	ISuiteReport,
	ITrialMeasurement,
	ITrialResult,
} from './types.js';

export * from './reporters/index.js';
