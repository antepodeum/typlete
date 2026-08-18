import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(repoRoot, 'node_modules', '.bin', 'vite');

async function getFreePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			const port = typeof address === 'object' && address ? address.port : 0;
			server.close((error) => (error ? reject(error) : resolve(port)));
		});
	});
}

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			...options,
			stdio: ['ignore', 'pipe', 'pipe']
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => (stdout += chunk));
		child.stderr.on('data', (chunk) => (stderr += chunk));
		child.once('error', reject);
		child.once('exit', (code) => {
			if (code === 0) resolve({ stdout, stderr });
			else reject(new Error(`${command} ${args.join(' ')} failed (${code})\n${stdout}\n${stderr}`));
		});
	});
}

function requestText(url) {
	return new Promise((resolve, reject) => {
		http
			.get(url, (response) => {
				let body = '';
				response.setEncoding('utf8');
				response.on('data', (chunk) => (body += chunk));
				response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
			})
			.on('error', reject);
	});
}

async function waitForPage(url, child) {
	let lastError;
	for (let attempt = 0; attempt < 80; attempt += 1) {
		if (child.exitCode !== null) throw new Error(`preview exited early with ${child.exitCode}`);
		try {
			return await requestText(url);
		} catch (error) {
			lastError = error;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
	throw lastError ?? new Error('preview did not start');
}

test(
	'published package SSR is self-contained and emits SVG without JavaScript',
	{ timeout: 120_000 },
	async () => {
		const fixture = await mkdtemp(path.join(repoRoot, '.consumer-ssr-'));
		const packageNodeModules = path.join(fixture, 'node_modules');
		const typleteLink = path.join(packageNodeModules, 'typlete');
		const port = await getFreePort();
		let preview;

		try {
			await mkdir(path.join(fixture, 'src', 'routes'), { recursive: true });
			await writeFile(
				path.join(fixture, 'src', 'app.html'),
				'<!doctype html><html><head>%sveltekit.head%</head><body><div style="display: contents">%sveltekit.body%</div></body></html>\n'
			);
			await mkdir(packageNodeModules, { recursive: true });
			await symlink(repoRoot, typleteLink, 'dir');
			await writeFile(
				path.join(fixture, 'package.json'),
				JSON.stringify(
					{ name: 'typlete-consumer-ssr-fixture', private: true, type: 'module' },
					null,
					2
				)
			);
			await writeFile(
				path.join(fixture, 'svelte.config.js'),
				`export default { compilerOptions: { experimental: { async: true } } };\n`
			);
			await writeFile(
				path.join(fixture, 'vite.config.js'),
				`import { sveltekit } from '@sveltejs/kit/vite';\nexport default { plugins: [sveltekit()] };\n`
			);
			await writeFile(path.join(fixture, 'src', 'routes', '+layout.svelte'), `<slot />\n`);
			await writeFile(
				path.join(fixture, 'src', 'routes', '+page.svelte'),
				`<script>import { TypstInline } from 'typlete';</script>\n` +
					`<p id="valid"><TypstInline source="integral_0^1 x^2 dif x" throwOnError={true} /></p>\n` +
					`<p id="fraction"><TypstInline source="a / b" throwOnError={true} /></p>\n` +
					`<p id="invalid"><TypstInline inputMode="raw" source="#let =" errorMode="badge" /></p>\n`
			);
			await writeFile(
				path.join(fixture, 'deny-network.mjs'),
				`const realFetch = globalThis.fetch;\n` +
					`globalThis.fetch = (input, init) => { const u = new URL(typeof input === 'string' ? input : input.url, 'http://127.0.0.1'); if (u.protocol === 'http:' || u.protocol === 'https:') { if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') throw new Error('External network denied during Typlete SSR: ' + u.href); } return realFetch(input, init); };\n`
			);

			await run(viteBin, ['build'], { cwd: fixture, env: process.env });

			preview = spawn(viteBin, ['preview', '--host', '127.0.0.1', '--port', String(port)], {
				cwd: fixture,
				env: {
					...process.env,
					NODE_OPTIONS:
						`${process.env.NODE_OPTIONS ?? ''} --import=${path.join(fixture, 'deny-network.mjs')}`.trim()
				},
				stdio: ['ignore', 'pipe', 'pipe']
			});
			let previewLog = '';
			preview.stdout.on('data', (chunk) => (previewLog += chunk));
			preview.stderr.on('data', (chunk) => (previewLog += chunk));

			const response = await waitForPage(`http://127.0.0.1:${port}/`, preview);
			assert.equal(response.status, 200, previewLog);
			assert.match(response.body, /<svg\b[^>]*class="typst-doc"/);
			assert.doesNotMatch(response.body, /id="valid"[\s\S]*?typst-placeholder/);
			assert.match(response.body, /stroke="currentColor"/);
			assert.doesNotMatch(response.body, /#01fe02/i);
			assert.match(response.body, /id="invalid"[\s\S]*?data-error=/);
			assert.match(response.body, /typst-error-badge/);
			assert.doesNotMatch(response.body, /cdn\.jsdelivr\.net/i);
		} finally {
			if (preview && preview.exitCode === null) {
				preview.kill('SIGTERM');
				await new Promise((resolve) => preview.once('exit', resolve));
			}
			await rm(fixture, { recursive: true, force: true });
		}
	}
);

test('published environment switch stays bundler-portable', async () => {
	const fontsModule = await readFile(path.join(repoRoot, 'dist', 'fonts.js'), 'utf8');

	assert.doesNotMatch(fontsModule, /import\.meta\.env/);
	assert.match(fontsModule, /from ['"]esm-env['"]/);
});
