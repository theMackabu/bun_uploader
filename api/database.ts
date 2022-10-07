import { Database } from "bun:sqlite";

const client = new Database("files.sqlite");
const initialize = async (table: Array<string>) => {
    table.map((name: string) => {
        client.run(`CREATE TABLE IF NOT EXISTS ${name} (id TEXT, delkey TEXT, name TEXT, buffer BLOB, size TEXT, date TEXT, url TEXT)`);
        console.log(`initialized table ${name}`)
    })

    console.log("db init complete")
}

export const db = {
    initialize,
    client,
};
