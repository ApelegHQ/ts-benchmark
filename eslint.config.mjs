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

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import plugin from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

export default [
	{
		ignores: [
			'**/node_modules/*',
			'**/.nyc_output/*',
			'**/dist/*',
			'**/build/*',
			'**/coverage/*',
			'**/package-lock.json',
		],
	},
	js.configs.recommended,
	...compat.extends('plugin:@typescript-eslint/recommended'),
	prettierRecommended,
	{
		languageOptions: {
			parser,
			globals: {
				...globals.node,
			},
		},
		plugins: { plugin },
		rules: {
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'typeParameter',
					format: ['PascalCase'],
					prefix: ['T'],
				},
				{
					selector: 'interface',
					format: ['PascalCase'],
					prefix: ['I'],
				},
				{
					selector: 'enumMember',
					format: ['UPPER_CASE'],
				},
				{
					selector: 'variable',
					modifiers: ['exported'],
					format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
				},
				{
					selector: 'typeProperty',
					format: ['camelCase'],
				},
				{
					selector: 'method',
					format: ['camelCase'],
				},
			],
		},
	},
	{
		files: ['**/*.json'],
		rules: {
			'@typescript-eslint/no-unused-expressions': 'off',
		},
	},
	{
		files: ['**/*.cjs'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
];
