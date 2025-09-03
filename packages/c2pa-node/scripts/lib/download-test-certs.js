/**
 * Copyright 2023 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

const { pipeline } = require('node:stream/promises');
const fs = require('node:fs');
const { resolve } = require('node:path');

const pemUrl =
	'https://raw.githubusercontent.com/contentauth/c2pa-rs/main/sdk/tests/fixtures/certs/es256.pem';
const pubUrl =
	'https://raw.githubusercontent.com/contentauth/c2pa-rs/main/sdk/tests/fixtures/certs/es256.pub';

async function downloadTestCerts() {
	// Dynamic import for ES modules
	const pkgDirModule = await import('pkg-dir');
	const pkgDir = pkgDirModule.packageDirectory;
	const chalkModule = await import('chalk');
	const chalk = chalkModule.default;
	const fetchModule = await import('node-fetch');
	const fetch = fetchModule.default;

	const appRoot = await pkgDir(__dirname);
	const fixtureRoot = resolve(appRoot, 'tests/fixtures/certs');
	const pemFile = fs.createWriteStream(resolve(fixtureRoot, 'es256.pem'));
	const pubFile = fs.createWriteStream(resolve(fixtureRoot, 'es256.pub'));

	console.log(chalk.yellow('Downloading test certificates...'));

	const pemRes = await fetch(pemUrl);
	await pipeline(pemRes.body, pemFile);
	console.log(chalk.yellow('Downloaded es256.pem'));

	const pubRes = await fetch(pubUrl);
	await pipeline(pubRes.body, pubFile);
	console.log(chalk.yellow('Downloaded es256.pub'));
}

module.exports = downloadTestCerts;
