import { Actor, log } from 'apify';
import { setTimeout } from 'node:timers/promises';
import { createApp } from './server.js';

await Actor.init();

Actor.on('aborting', async () => {
    await setTimeout(1000);
    await Actor.exit();
});

const port = Number(process.env.ACTOR_WEB_SERVER_PORT) || 3000;
const app = createApp();

app.listen(port, () => {
    log.info('Web server is listening', { port });
});
