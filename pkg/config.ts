const appURL = process.env.APP_URL || 'http://localhost:3000';
const port = parseInt(process.env.PORT) || 3000;

export { port, appURL };