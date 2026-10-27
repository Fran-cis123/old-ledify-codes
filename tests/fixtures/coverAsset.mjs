import fs from 'node:fs/promises';
// Authorized test assets isolate rendering from external providers. These are
// deterministic fixtures, not claims that a provider generated the pixels.
export async function coverAsset(file='medical-mri.jpg',description='Medical imaging in a clinical setting'){
 return {slideNumber:1,buffer:await fs.readFile(new URL('../../assets/webpage/curated/'+file,import.meta.url)),description,source:'Authorized regression fixture',creator:'Test fixture',license:'Regression testing only'};
}
export const approvedImageEnv={AI_IMAGE_PROVIDER:'bfl',AI_IMAGE_MODEL:'flux-2-pro',AI_IMAGE_PROVIDER_APPROVED:'true',AI_IMAGE_API_KEY:'test-image-key'};
