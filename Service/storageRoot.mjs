import path from 'node:path';

// All generated files must live on the same mounted storage lifecycle in
// production. Individual legacy root variables remain supported.
export const storageRoot=directory=>path.resolve(process.env.LEDIFY_STORAGE_ROOT||'generated',directory);
