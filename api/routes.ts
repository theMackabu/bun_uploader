import { Hono } from "hono";
import * as os from "node:os";
import { db } from '@/database';
import { decode } from 'base-64';
import { port, appURL } from '@/config';
import { nanoid, token } from '@/helpers';


const api = new Hono()

api.get("/list", (res) => {
    const query = db.client.query(`SELECT * FROM files`).all();

    return res.json({
        files: query.map((data) => {
            return {
                name: data.name,
                id: data.id,
                download: `${appURL}/api/v1/download/${data.id}/${data.name}`,
                meta: {
                    url: data.url,
                    date: data.date,
                    size: { formatted: `${Number((data.size / 1024).toFixed(3))}kb`, raw: Number(data.size) }
                }
            }
        })
    });
});

api.get("/info/:id", (res) => {
    const { id } = res.req.param();
    const query = db.client.query("SELECT * FROM files WHERE id = ?").all(id);

    return res.json(query.length == 0 ? { [id]: { message: 'Not Found', ok: false } } : {
        ok: true, [id]: query.map((data) => {
            return {
                name: data.name,
                id: data.id,
                download: `${appURL}/api/v1/download/${data.id}/${data.name}`,
                meta: {
                    url: data.url,
                    date: data.date,
                    size: { formatted: `${Number((data.size / 1024).toFixed(3))}kb`, raw: Number(data.size) }
                }
            }
        })

    });
});

api.get("/download/:id/:name", (c) => {
    const { id, name } = c.req.param();
    const query = db.client.query("SELECT * FROM files WHERE id = $id AND name = $name").get({
        $id: id,
        $name: name,
    });

    c.header('Content-disposition', `attachment; filename=${query.name}`)

    return c.body(decode(query.buffer), 200)
});

api.post("/upload/:name", async (c) => {
    const body = await c.req.arrayBuffer()
    const { name } = c.req.param();
    const randomId = nanoid();
    const staticToken = token()

    db.client.exec(`INSERT INTO files (id, delkey, name, buffer, size, date, url) VALUES ($id, $delkey, $name, $buffer, $size, $date, $url)`, {
        $id: randomId,
        $delkey: staticToken,
        $name: name,
        $buffer: Buffer.from(body).toString('base64'),
        $size: Buffer.from(body).toString().length,
        $date: new Date(Date.now()).toISOString(),
        $url: `${appURL}/cdn/${randomId}/${name}`,
    });

    return c.json({
        id: randomId,
        ["File Removal Key"]: staticToken,
        data: {
            name: name,
            size: Buffer.from(body).toString().length,
            date: new Date(Date.now()).toISOString(),
            url: `${appURL}/cdn/${randomId}/${name}`,
        },
    });
});

api.post("/delete", async (res) => {
    const data = await res.req.json<{ id: string, name: string, token: string }>();
    if (data.token) {
        db.client.query(`DELETE FROM files WHERE id = $id AND name = $name AND delkey = $delkey`).get({
            $id: data.id,
            $name: data.name,
            $delkey: data.token
        });

        return res.json({ [data.id]: `deleted ${data.name}` });
    } else {
        return res.json({ validation: { item: 'token', missing: true }, error: 'missing removal token' });
    }
});

api.get("/health", (res) => {
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