import { AiGenerationError, parseResponse } from "./responseValidation.mjs";
import { randomUUID } from "node:crypto";

const recoverable = new Set(["AI_RESPONSE_TRUNCATED", "AI_RESPONSE_EMPTY", "AI_RESPONSE_INCOMPLETE", "AI_JSON_PARSE_FAILED", "AI_SCHEMA_VALIDATION_FAILED", "AI_REPETITIVE_OUTPUT", "AI_TEXT_TOO_LONG"]);
function jsonSchemaTypes(value) {
    if(Array.isArray(value)) return value.map(jsonSchemaTypes);
    if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='type'&&typeof child==='string'?child.toLowerCase():jsonSchemaTypes(child)]));
    return value;
}

export async function generateJsonWithRetry({ client, request, schema, outputType, validate,
    stage, slideNumber, sectionId, requestId = randomUUID(), maxAttempts = 3,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), logger = entry => console.info("[AI]", JSON.stringify(entry)), strict = true }) {
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new Error("AI attempts must be between 1 and 3");
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const started = Date.now();
        let response;
        try {
            response = await client.models.generateContent({ ...request,
                config: { ...request.config, responseJsonSchema:jsonSchemaTypes(request.config?.responseJsonSchema), httpOptions: { ...request.config?.httpOptions, timeout: 90000, retryOptions: { attempts: 1 } } },
                contents: attempt === 1 ? request.contents : `${request.contents}\nPrevious attempt failed (${lastError.code}). Return complete concise JSON satisfying the schema; avoid repetitive text.${lastError.repairHint ? ` Validation requirement: ${lastError.repairHint}` : ''}${lastError.field ? ` Repair field ${lastError.field}.${lastError.maxCharacters ? ` Shorten or restructure this field to at most ${lastError.maxCharacters} characters without dropping essential facts.` : ""}` : ""}`
            });
            const value = parseResponse(response, { schema, outputType, strict });
            try { validate?.(value); }
            catch (error) { throw error instanceof AiGenerationError ? error : new AiGenerationError("AI_SCHEMA_VALIDATION_FAILED", error.message, { field: /^[$a-zA-Z0-9_.\[\]-]+$/.test(error.field || "") ? error.field : undefined, maxCharacters: Number.isInteger(error.maxCharacters) ? error.maxCharacters : undefined,
                // Semantic validators often throw ordinary Errors. Preserve their
                // actionable requirement in the private retry prompt, never logs.
                repairHint: String(error.repairHint || error.message || 'Correct the invalid slide content.').slice(0, 300) }); }
            logger({ requestId, stage, slideNumber, sectionId, attempt, status: "completed", elapsedMs: Date.now() - started, model: request.model,
                finishReason: response.candidates[0].finishReason, usage: response.usageMetadata });
            return value;
        } catch (error) {
            const status = Number(error.status || error.statusCode || error.error?.code);
            const transient = [408, 429, 500, 502, 503, 504].includes(status) || (!status && ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(error.cause?.code || error.code));
            lastError = error instanceof AiGenerationError ? error : new AiGenerationError(transient ? "AI_PROVIDER_TRANSIENT" : "AI_PROVIDER_ERROR", "AI provider request failed", { providerStatus: status || undefined });
            Object.assign(lastError, { requestId, stage, slideNumber, sectionId, attempt });
            logger({ requestId, stage, slideNumber, sectionId, validationRule:lastError.validationRule, attempt, status: "failed", errorCode: lastError.code, providerStatus: status || undefined,
                field: lastError.field, maxCharacters: lastError.maxCharacters,
                finishReason: response?.candidates?.[0]?.finishReason, usage: response?.usageMetadata, elapsedMs: Date.now() - started, model: request.model });
            if (!transient && !recoverable.has(lastError.code)) throw lastError;
            if (attempt < maxAttempts) await sleep(transient ? 500 * 2 ** (attempt - 1) : 100);
        }
    }
    const exhausted = new AiGenerationError("AI_RETRY_EXHAUSTED", `AI generation failed after ${maxAttempts} attempts (${lastError.code})`,
        { requestId, stage, slideNumber, sectionId,validationRule:lastError.validationRule, attempts: maxAttempts, lastErrorCode: lastError.code, field: lastError.field });
    exhausted.cause = lastError;
    throw exhausted;
}
