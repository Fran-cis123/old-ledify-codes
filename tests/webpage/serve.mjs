import 'dotenv/config';
import express from 'express';
import { createGenerationRouter } from '../../route/generateRoute.mjs';
const app = express();
app.use('/api', createGenerationRouter());
const server = app.listen(4310, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:4310'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
