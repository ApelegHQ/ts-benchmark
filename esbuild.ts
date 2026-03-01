#!/usr/bin/env -S node --import ./loader.mjs

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

import esbuild from 'esbuild';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const buildOptionsBase: esbuild.BuildOptions = {
	entryPoints: [
		'./src/index.ts',
		'./src/stats.ts',
		'./src/reporters/advanced.ts',
		'./src/reporters/simple.ts',
		'./src/reporters/xunit.ts',
	],
	target: 'es2018',
	outdir: 'dist',
	bundle: true,
	minify: true,
	entryNames: '[name]',
	platform: 'neutral',
	external: ['picocolors'],
};

const formats: esbuild.Format[] = ['cjs', 'esm'];

await Promise.all(
	formats.map((format) => {
		return esbuild.build({
			...buildOptionsBase,
			format,
			outExtension: {
				'.js': format === 'esm' ? '.mjs' : '.cjs',
			},
			define: {
				...buildOptionsBase.define,
				'import.meta.format': JSON.stringify(format),
			},
		});
	}),
);

const cjsDeclarationFiles = async (directoryPath: string) => {
	const entries = await readdir(directoryPath, {
		withFileTypes: true,
		recursive: true,
	});

	await Promise.all(
		entries
			.filter((entry) => {
				return entry.isFile() && entry.name.endsWith('.d.ts');
			})
			.map(async (file) => {
				const name = join(file.parentPath, file.name);
				const newName = name.slice(0, -2) + 'cts';

				const contents = await readFile(name, { encoding: 'utf-8' });
				await writeFile(
					newName,
					contents.replace(/(?<=\.)js(?=['"])/g, 'cjs'),
				);
			}),
	);
};

await cjsDeclarationFiles('dist');
