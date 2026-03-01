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

import { runSuite } from './index.js';
import simpleReport from './reporters/simple.js';
import advancedReport from './reporters/advanced.js';

type Ctx = {
	array: unknown[];
};

const result = await runSuite<Ctx>({
	name: 'Test suite',
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
			name: 'Coalesce operator',
			fn() {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				[...this.array];
			},
		},
	],
});

console.log('=== START SIMPLE REPORT ===');
simpleReport(result);
console.log('=== END SIMPLE REPORT ===');

console.log('');

console.log('=== START ADVANCED REPORT ===');
advancedReport(result);
console.log('=== END ADVANCED REPORT ===');
