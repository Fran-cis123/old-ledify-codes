import path from 'node:path';
import {storageRoot} from './storageRoot.mjs';

// Set this to a mounted persistent directory in production. Both generation
// and delivery must resolve the same root, including after a process restart.
export function presentationStorageRoot(override) {
    return path.resolve(override || process.env.LEDIFY_PRESENTATION_ROOT || storageRoot('previews'));
}
