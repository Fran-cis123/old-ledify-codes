import 'dotenv/config';
import {createAnthropicService,textProvider,textModel} from '../Service/ai/textProvider.mjs';
import {imageGenerationSettings} from '../Service/visual/imageGenerationService.mjs';
const result={textProvider:textProvider(),requestedModel:textModel(),textKeyConfigured:!!process.env.ANTHROPIC_API_KEY,imageProvider:imageGenerationSettings(),liveAccountVerification:'not-run'};
if(process.argv.includes('--verify-model')){
 if(!result.textKeyConfigured){result.liveAccountVerification='blocked-missing-key';process.exitCode=1;}
 else try{const model=await createAnthropicService().verifyModel();result.liveAccountVerification='passed';result.resolvedModelId=model.id;}
 catch(error){result.liveAccountVerification='failed';result.errorCode=error.code||'ANTHROPIC_VERIFICATION_FAILED';result.httpStatus=error.status;process.exitCode=1;}
}
console.log(JSON.stringify(result,null,2));
