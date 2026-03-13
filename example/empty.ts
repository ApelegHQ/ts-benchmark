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

import { runSuite } from '../src/index.js';
import advancedReport from '../src/reporters/advanced.js';
import simpleReport from '../src/reporters/simple.js';

const result = await runSuite({
	name: 'Empty',
	functions: [
		{
			name: 'A',
			fn() {},
		},
		{
			name: 'B',
			fn() {},
		},
		{
			name: 'C',
			fn() {},
		},
		{
			name: 'D',
			fn() {},
		},
		{
			name: 'E',
			fn() {},
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
