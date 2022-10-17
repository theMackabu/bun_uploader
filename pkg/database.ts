import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'fs';

const client = new Database('files.sqlite');
const initialize = async (table: Array<string>) => {
	table.map((name: string) => {
		client.run(`CREATE TABLE IF NOT EXISTS ${name} (id TEXT, name TEXT, size TEXT, date TEXT, url TEXT, private INTEGER)`);
		console.log(`initialized table ${name}`);
	});

	client.run(`CREATE TABLE IF NOT EXISTS takedowns (id TEXT, name TEXT, reason TEXT)`);
	console.log(`initialized table takedowns`);

	console.log('db init complete');

	if (!existsSync('/var/www/cdn/files')) {
		mkdirSync('/var/www/cdn/files');
		console.log('created file storage');
	}
};

export const db = {
	initialize,
	client,
};
