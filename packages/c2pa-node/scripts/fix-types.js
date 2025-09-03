#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix TypeScript declarations to resolve module resolution issues.
 *
 * The issue is that the generated declaration files reference "index.node"
 * which doesn't exist for consumers. This script:
 * 1. Converts the module declaration in types.d.ts to regular exports
 * 2. Creates an index.node.d.ts file that maps to the types
 * 3. Updates the class declaration files to import from the correct module
 */

const distTypesDir = path.join(__dirname, '..', 'dist', 'types');

function createIndexNodeDeclaration() {
	// Create index.node.d.ts in the types directory
	const indexNodePath = path.join(distTypesDir, 'index.node.d.ts');
	const content = `// Copyright 2024 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

// Unless required by applicable law or agreed to in writing,
// this software is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or
// implied. See the LICENSE-MIT and LICENSE-APACHE files for the
// specific language governing permissions and limitations under
// each license.

// This file provides type declarations for the native index.node module
// It re-exports all types from the types file
export * from "./types";
`;

	fs.writeFileSync(indexNodePath, content);
	console.log('Created index.node.d.ts in dist/types');
}

function fixTypesFile() {
	const typesPath = path.join(distTypesDir, 'types.d.ts');
	let content = fs.readFileSync(typesPath, 'utf8');

	// Remove the module declaration wrapper and fix indentation
	const lines = content.split('\n');
	let inModule = false;
	let braceCount = 1;
	let fixedLines = [];

	for (let line of lines) {
		if (line.includes('declare module "index.node"')) {
			inModule = true;
			continue;
		}
		if (inModule) {
			// Count braces to find the end of the module
			braceCount += (line.match(/\{/g) || []).length;
			braceCount -= (line.match(/\}/g) || []).length;

			if (braceCount === 0 && line.trim() === '}') {
				inModule = false;
				continue;
			}

			// Remove 2 spaces of indentation
			if (line.startsWith('  ')) {
				line = line.substring(2);
			}
		}
		fixedLines.push(line);
	}

	// Fix the ManifestStore interface structure
	let fixedContent = fixedLines.join('\n');

	fs.writeFileSync(typesPath, fixedContent);
	console.log('Fixed types.d.ts');
}

function fixClassDeclarations() {
	const classFiles = ['Builder.d.ts', 'Reader.d.ts', 'Signer.d.ts', 'IdentityAssertion.d.ts', 'Trustmark.d.ts'];

	classFiles.forEach(fileName => {
		const filePath = path.join(distTypesDir, fileName);
		if (fs.existsSync(filePath)) {
			let content = fs.readFileSync(filePath, 'utf8');
			// Replace 'index.node' imports with './types'
			content = content.replace(/from ['"]index\.node['"]/g, 'from "./types"');
			fs.writeFileSync(filePath, content);
			console.log(`Fixed imports in ${fileName}`);
		}
	});
}

function fixIndexDeclaration() {
	const indexPath = path.join(distTypesDir, 'index.d.ts');
	if (fs.existsSync(indexPath)) {
		let content = fs.readFileSync(indexPath, 'utf8');
		// Replace 'index.node' exports with './types'
		content = content.replace(/from ['"]index\.node['"]/g, 'from "./types"');
		fs.writeFileSync(indexPath, content);
		console.log('Fixed exports in index.d.ts');
	}
}

function main() {
	try {
		console.log('Fixing TypeScript declarations...');

		fixTypesFile();
		fixClassDeclarations();
		fixIndexDeclaration();
		createIndexNodeDeclaration();

		console.log('TypeScript declarations fixed successfully!');
	} catch (error) {
		console.error('Error fixing TypeScript declarations:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
