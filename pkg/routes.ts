import { Hono } from 'hono';
import * as os from 'node:os';
import { db } from '@/database';
import { html } from 'hono/html';
import { nanoid } from '@/helpers';
import { port, appURL } from '@/config';
import { writeFileSync, readFileSync } from 'fs';

const api = new Hono();

const routesDocumentation = [
	{ type: 'GET', name: 'health', url: '/cdn/health', param: '', body: '', info: 'get cdn status' },
	{ type: 'GET', name: 'documentation', url: '/cdn/docs', param: '', body: '', info: 'read these docs' },
	{ type: 'GET', name: 'file list', url: '/cdn/list', param: '', body: '', info: 'View all files on cdn' },
	{ type: 'GET', name: 'file info', url: '/cdn/info', param: 'id', body: '', info: 'View info about a file' },
	{ type: 'GET', name: 'download file', url: '/cdn', param: 'uuid/:name', body: '', info: 'Download file from cdn' },
	{ type: 'POST', name: 'upload file', url: '/cdn/upload', param: 'name', body: '{arrayBuffer}', info: 'Upload file to cdn' },
	{ type: 'GET', name: 'takedown request', url: '/cdn/takedown', param: '', body: '', info: 'takedown request for file' },
];

api.get('/docs', (res) => {
	return res.html(
		html`<!DOCTYPE html> ${routesDocumentation.map((item) => {
				return html` <p>
					<b>(${item.type})</b> ${item.name} <b>[${item.url}${item.param && '/:' + item.param}] </b>
					<span>${item.body ? 'body: ' + item.body : ''}</span>
					<a href="${item.url}">goto</a><br />
					<span>${item.info ? ' - ' + item.info : ''}</span>
				</p>`;
			})}`
	);
});

api.get('/list', (res) => {
	const query = db.client.query(`SELECT * FROM files WHERE private = 0`).all();

	return res.json({
		files: query.map((data) => {
			return {
				name: data.name,
				id: data.id,
				download: data.url,
				meta: {
					date: data.date,
					size: { formatted: `${Number((data.size / 1024).toFixed(3))}kb`, raw: Number(data.size) },
				},
			};
		}),
	});
});

api.get('/info/:id', (res) => {
	const { id } = res.req.param();
	const query = db.client.query('SELECT * FROM files WHERE id = ?').all(id);

	return res.json(
		query.length == 0
			? { [id]: { message: 'Not Found', ok: false } }
			: {
					ok: true,
					[id]: query.map((data) => {
						return {
							name: data.name,
							id: data.id,
							download: data.url,
							meta: {
								date: data.date,
								size: { formatted: `${Number((data.size / 1024).toFixed(3))}kb`, raw: Number(data.size) },
							},
						};
					}),
			  }
	);
});

api.get('/:uuid/:name', (c) => {
	const { uuid, name } = c.req.param();
	const query = db.client.query('SELECT * FROM files WHERE id = $id AND name = $name').get({
		$id: uuid,
		$name: name,
	});

	c.header('Content-disposition', `attachment; filename=${query.name}`);

	return c.body(readFileSync(`/var/www/cdn/files/${uuid}-${name}`), 200);
});

api.post('/upload/:name', async (c) => {
	const body = await c.req.arrayBuffer();
	const query = c.req.query('q');
	const { name } = c.req.param();
	const randomId = nanoid();

	writeFileSync(`/var/www/cdn/files/${randomId}-${name}`, Buffer.from(body));

	if (query == 'private') {
		db.client.exec(`INSERT INTO files (id, name, size, date, url, private) VALUES ($id, $name, $size, $date, $url, $private)`, {
			$id: randomId,
			$name: name,
			$size: Buffer.from(body).toString().length,
			$date: new Date(Date.now()).toISOString(),
			$url: `${appURL}/${randomId}/${name}`,
			$private: 1,
		});
	} else {
		db.client.exec(`INSERT INTO files (id, name, size, date, url, private) VALUES ($id, $name, $size, $date, $url, $private)`, {
			$id: randomId,
			$name: name,
			$size: Buffer.from(body).toString().length,
			$date: new Date(Date.now()).toISOString(),
			$url: `${appURL}/${randomId}/${name}`,
			$private: 0,
		});
	}

	return c.json({
		id: randomId,
		private: query == 'private' ? true : false,
		name: name,
		size: Buffer.from(body).toString().length,
		date: new Date(Date.now()).toISOString(),
		url: `${appURL}/${randomId}/${name}`,
	});
});

api.get('/takedown', (res) => {
	return res.html(
		html`<!DOCTYPE html>
			<p>takedown page wip</p>`
	);
});

api.get('/health', (res) => {
	return res.json({
		port: port,
		uptime: `${(os.uptime() / 86400).toFixed(2)}d`,
		status: 'online',
		timestamp: Date.now().toString(),
		arch: os.arch(),
		freemem: os.freemem(),
		hostname: os.hostname(),
		loadavg: os.loadavg(),
		platform: os.platform(),
		release: os.release(),
		tmpdir: os.tmpdir(),
		totalmem: os.totalmem(),
		type: os.type(),
		userInfo: os.userInfo(),
		version: os.version(),
	});
});

export { api };
