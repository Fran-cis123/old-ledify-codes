import {createServer} from 'node:http';

export function createHttpServer(app) {
    // Give Render's proxy time to reuse idle connections without racing Node's
    // short default keep-alive timeout. This does not limit generation duration.
    return createServer({keepAliveTimeout:120_000,headersTimeout:125_000},app);
}
