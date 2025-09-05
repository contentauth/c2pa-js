/**
 * Copyright 2023 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

const { stat, readFile } = require('node:fs/promises');
const { createWriteStream } = require('node:fs');
const { PassThrough } = require('node:stream');
const cliProgress = require('cli-progress');
const unzipper = require('unzipper');
const os = require('node:os');
const { mkdirp } = require('mkdirp');
const { resolve } = require('node:path');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');

const pExec = promisify(exec);

const execCallback = (err, stdout, stderr) => {
	if (err) {
		console.error(`ERROR: ${err}`);
	} else if (stdout) {
		console.log(stdout);
	} else if (stderr) {
		console.error(stderr);
	}
};

async function fileExists(path) {
	try {
		await stat(path);
		return true;
	} catch (err) {
		if (err.code === 'ENOENT') {
			return false;
		}
		throw err;
	}
}

function getPlatform() {
	const arch = os.arch();
	const platform = os.platform();

	console.debug('Detected', { arch, platform });

	if (arch === 'arm64' && platform === 'linux') {
		return 'aarch64-unknown-linux-gnu';
	} else if (arch === 'x64' && platform === 'linux') {
		return 'x86_64-unknown-linux-gnu';
	} else if (arch === 'arm64' && platform === 'darwin') {
		return 'aarch64-apple-darwin';
	} else if (arch === 'x64' && platform === 'darwin') {
		return 'x86_64-apple-darwin';
	} else if (platform === 'win32') {
		return 'x86_64-pc-windows-msvc';
	}

	console.log(
		`Can not find binary for architecture: ${arch} and platform: ${platform}, attempting to build Rust`,
	);

	return null;
}

async function downloadFromUrl(appRoot, url) {
	console.log(`Checking for a release at: ${url}`);
	// Dynamic import for ES modules
	const fetchModule = await import('node-fetch');
	const fetch = fetchModule.default;
	const res = await fetch(url);

	if (res.ok) {
		// Dynamic import for ES module
		const { default: prettyBytes } = await import('pretty-bytes');

		const destDir = resolve(appRoot, 'dist', 'generated');
		const totalSize = parseInt(res.headers.get('Content-Length'), 10);
		await mkdirp(destDir);
		const destPath = resolve(destDir, 'c2pa.node');
		const destStream = createWriteStream(destPath);
		const progress = new PassThrough();
		const bar = new cliProgress.SingleBar(
			{
				format:
					'Downloading | {bar} | {value_formatted} / {total_formatted} ({percentage}%) | ETA: {eta}s',
			},
			cliProgress.Presets.shades_classic,
		);
		let downloaded = 0;

		bar.start(totalSize, 0, {
			value_formatted: prettyBytes(0),
			total_formatted: prettyBytes(totalSize),
		});

		progress.on('data', (chunk) => {
			downloaded += chunk.length;
			bar.update(downloaded, {
				value_formatted: prettyBytes(downloaded),
				total_formatted: prettyBytes(totalSize),
			});
		});

		return new Promise((resolve, reject) => {
			res.body
				.pipe(progress)
				.pipe(unzipper.ParseOne())
				.pipe(destStream)
				.on('finish', () => {
					bar.stop();
					console.log(`Downloaded to ${destPath}`);
					resolve(true);
				})
				.on('error', reject);
		});
	}

	return false;
}

async function downloadBinary(appRoot) {
	const pkgPath = resolve(appRoot, 'package.json');
	const pkg = JSON.parse(await readFile(pkgPath));
	const repo = pkg.repository?.url ?? pkg.repository;
	const repoBase = (repo ?? '').replace(/^git\+/, '').replace(/\.git$/i, '');
	const version = pkg.version;
	const platform = getPlatform();

	if (repoBase && version && platform) {
		const fileName = `c2pa-node_${platform}-v${version}.zip`;
		const downloadUrl = [
			repoBase,
			'releases',
			'download',
			`v${version}`,
			fileName,
		].join('/');
		return downloadFromUrl(appRoot, downloadUrl);
	}

	return false;
}

async function rustExists() {
	try {
		await Promise.all([pExec('rustc --version'), pExec('cargo --version')]);
		return true;
	} catch {
		return false;
	}
}

async function buildRust(root) {
	console.log('🦀 Building Rust...');
	const generatedDir = resolve(root, 'generated');
	const bindingsPath = resolve(generatedDir, 'c2pa.node');
	const cargoPath = resolve(root, 'Cargo.toml');
	await mkdirp(generatedDir);
	return new Promise((resolve, reject) => {
		const result = exec(
			`npx cargo-cp-artifact -nc "${bindingsPath}" -- cargo build --message-format=json-render-diagnostics --release --manifest-path="${cargoPath}"`,
			execCallback,
		);
		result.on('exit', (code) => {
			code === 0 ? resolve() : reject();
		});
	});
}

async function main() {
	// Dynamic import for ES module
	const pkgDirModule = await import('pkg-dir');
	const pkgDir = pkgDirModule.packageDirectory;
	const appRoot = await pkgDir(__dirname);
	const distRoot = resolve(appRoot, 'dist');
	const cargoDistPath = resolve(distRoot, 'Cargo.toml');
	const libraryOverridePath = process.env.C2PA_LIBRARY_PATH;
	const cargoDistPathExists = await fileExists(cargoDistPath);
	const rustToolchainExists = await rustExists();

	if (libraryOverridePath) {
		console.log('Skipping Rust build since C2PA_LIBRARY_PATH is set');
		return;
	}

	if (process.env.SKIP_BINARY_DOWNLOAD) {
		console.log(
			'Skipping prebuilt binary download since SKIP_BINARY_DOWNLOAD is set',
		);
	} else if (await downloadBinary(appRoot)) {
		return;
	}

	if (!rustToolchainExists) {
		console.warn('Skipping Rust build since Rust and/or Cargo is not found');
	} else if (cargoDistPathExists) {
		await buildRust(distRoot);
	} else {
		await buildRust(appRoot);
	}
}

if (!process.env.SKIP_RUST_BUILD) {
	main();
} else {
	console.log('Skipping Rust build since SKIP_RUST_BUILD is set');
}
