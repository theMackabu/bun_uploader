import { Hono } from "hono";
import { api } from '@/routes';
import { port } from '@/config';
import { db } from '@/database';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());
app.route('/', api);

app.notFound((res) => res.json({ message: 'Not Found', ok: false }, 404));
app.onError((err, res) => {
    console.error(err);
    return res.json({ message: 'Internal Error', ok: false, error: err.message }, 500);
})

db.initialize(['files']).then(() => { console.log(`running at [::]:${port}`); });

export default { port, fetch: app.fetch };
