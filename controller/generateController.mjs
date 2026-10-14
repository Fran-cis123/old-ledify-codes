import { resolveSlideCount } from '../Service/ai/slideCount.mjs';
import generateModel from '../model/generateModel.mjs';
import { fileService } from '../Service/fileService.mjs';
import { urlService } from '../Service/urlService.mjs';
import { generateService } from '../Service/generateService.mjs';
import { publicGenerationResult, compactOptionalContext } from '../Service/publicGenerationResult.mjs';
import { validateUploadedFile } from '../Service/input/fileValidation.mjs';
import { combineGenerationInput } from '../Service/input/combinedInput.mjs';

export function createGenerationHandlers({ model = generateModel, generator = generateService, extractFile = fileService, extractUrl = urlService } = {}) {
    const handle = inputType => async (req, res) => {
        let record;
        try {
            if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))throw invalid('Provide a JSON object for text or URL requests, or a multipart form for the file endpoint.');
            const { outputType, slideCount } = req.body;
            if (!['presentation', 'document', 'webpage'].includes(outputType)) throw invalid('outputType must be presentation, document or webpage');
            let context = req.body.context;
            if (['file','combined'].includes(inputType) && typeof context === 'string') {
                try { context = JSON.parse(context); } catch { throw Object.assign(new Error('Context must be valid JSON'), { code: 'INVALID_CONTEXT' }); }
            }
            context = requestContext(context, slideCount);
            if (outputType === 'presentation') resolveSlideCount('', context);
            let input, label,kind=inputType,sources;
            if(inputType==='combined') {
                const combined=await combineGenerationInput({body:req.body,file:req.file,context,extractFile,extractUrl});
                ({input,label,sources}=combined);kind=combined.inputType;context=combined.context;
            } else if (inputType === 'file') {
                if (!req.file) throw invalid('File is required');
                await validateUploadedFile(req.file);
                input = await extractFile(req.file); label = req.file.originalname;
            } else {
                const field = inputType === 'prompt' ? 'textPrompt' : 'urlPrompt';
                if (typeof req.body[field] !== 'string' || !req.body[field].trim()) throw invalid(field + ' and outputType are required');
                label = req.body[field];
                input = inputType === 'url' ? await extractUrl(label) : label;
            }
            record = await model.create({ inputType:kind, input: label, outputType, status: 'processing' });
            let result = await generator(kind, input, outputType, context);
            if(sources)result={...result,sources};
            result = publicGenerationResult(result);
            for(const key of ['context','resolvedContext']) result[key]=compactOptionalContext(result[key]);
            if(result.generatedContent?.inferredContext) result.generatedContent.inferredContext=compactOptionalContext(result.generatedContent.inferredContext);
            record.status = 'completed'; record.generatedContent = result.generatedContent;
            if (result.artifacts || result.preview) record.artifacts = result.artifacts || result.preview;
            await record.save();
            const legacy=req.get?.('X-Ledify-Response-Version')==='1';
            const request=legacy?(record.toObject?.() || {...record}):Object.fromEntries(['_id','inputType','outputType','status','createdAt','updatedAt'].filter(k=>record[k]!=null).map(k=>[k,record[k]]));
            const status=result.status || 'completed';
            res.set?.('X-Ledify-Response-Version',legacy?'1':'2');
            if(result.timings) {
                const entries=Object.entries(result.timings).filter(([name,duration])=>/^[a-z]+Ms$/i.test(name)&&Number.isFinite(duration)&&duration>=0);
                if(entries.length)res.set?.('Server-Timing',entries.map(([name,duration])=>`${name.slice(0,-2)};dur=${duration}`).join(', '));
            }
            if(legacy) res.set?.('Warning','299 Ledify "Response v1 duplicates generated content; migrate to data.result.generatedContent"');
            const message=status==='partial_success'?'Generation partially completed; review warnings':status==='completed_with_warnings'?'Generated with quality warnings; review before use':`${outputType === 'presentation' ? 'Presentation' : outputType === 'webpage' ? 'Webpage' : 'Document'} generated successfully`;
            return res.status(201).json({ message, data: { responseVersion:legacy?1:2,request:publicGenerationResult(request),result } });
        } catch (error) {
            if (record) { record.status = 'failed'; try { await record.save(); } catch {} }
            const code = error.code || 'GENERATION_FAILED';
            console.error('[GENERATION]',JSON.stringify({errorCode:code,stage:error.stage||'generation',requestId:error.requestId,slideNumber:error.slideNumber,sectionId:error.sectionId,validationRule:error.validationRule,field:error.field,maxCharacters:error.maxCharacters,lastErrorCode:error.lastErrorCode}));
            if (code === 'UNSUPPORTED_FILE_FORMAT') return res.status(415).json({ message: 'Unsupported file format', error: error.message, errorCode: code });
            if(['SOURCE_URL_TOO_LARGE','SOURCE_URL_TEXT_TOO_LARGE'].includes(code))return res.status(413).json({message:error.message,error:error.message,errorCode:code,stage:error.stage,maxBytes:error.maxBytes,maxCharacters:error.maxCharacters});
            const clientError = /^(INVALID_|SOURCE_URL|WEBPAGE_VALIDATION|WEBPAGE_STATIC)/.test(code);
            return res.status(clientError ? 400 : 500).json({ message: clientError ? error.message : 'Generation failed; see errorCode and stage', error: clientError ? error.message : 'Unable to complete generation',
                errorCode: code, stage: error.stage||'generation', slideNumber: error.slideNumber,sectionId:error.sectionId,validationRule:error.validationRule, field: error.field, maxCharacters:error.maxCharacters, requestId: error.requestId, lastErrorCode: error.lastErrorCode });
        }
    };
    return { userText: handle('prompt'), userUrl: handle('url'), userFile: handle('file'),userCombined:handle('combined') };
}
function invalid(message) { return Object.assign(new Error(message), { code: 'INVALID_REQUEST' }); }
function requestContext(context, slideCount) {
    if (context != null && (typeof context !== 'object' || Array.isArray(context))) throw Object.assign(new Error('Context must be an object'), { code: 'INVALID_CONTEXT' });
    return { ...(context || {}), ...(slideCount == null ? {} : { slideCount }) };
}
export const { userText, userUrl, userFile, userCombined } = createGenerationHandlers();
