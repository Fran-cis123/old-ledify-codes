import { webpageLayoutService } from './webpageLayoutService.mjs';
import { webpageThemeService } from './webpageThemeService.mjs';
import { webpageRenderer } from '../renderer/webpage/webpageRenderer.mjs';
import { webpageArtifactService } from './webpageArtifactService.mjs';
import { acquireWebsiteImages } from './webpage/imagePipeline.mjs';
import { compileWebsiteBrief } from './webpage/websiteBrief.mjs';
import {inspectWebsite} from './webpage/qualityGate.mjs';
import {websiteSpecification} from './webpage/websiteSpecification.mjs';
import { planWebpageDesign } from './webpageDesignService.mjs';
import { aiService } from "./aiService.mjs";
import { resolvePresentationVisuals } from './visual/presentationVisuals.mjs';
import { createDiagramPlanner } from './visual/diagramPlanner.mjs';
import { documentArtifactService } from './document/documentArtifactService.mjs';
import {measureStage,profileGeneration,performanceReport} from './performance.mjs';
import {presentationPrefetch} from './visual/presentationPrefetch.mjs';

import {
    presentationLayoutService
} from "./presentationLayoutService.mjs";

import {
    presentationThemeService
} from "./presentationThemeService.mjs";

import {
    presentationRendererService
} from "./presentationRendererService.mjs";

import {
    previewRenderer
} from "../renderer/presentation/previewRenderer.mjs";


// =========================================================
// GENERATE SERVICE
// =========================================================

const generate = async (
    inputType,
    input,
    outputType,
    context = {},
    options = {}
) => {
    const started=performance.now(),timings={};
    const finish=result=>({...result,timings:{...timings,totalMs:Math.round(performance.now()-started)},performance:performanceReport()});

    // =====================================================
    // 1. GENERATE STRUCTURED CONTENT WITH AI
    // =====================================================

    const early=outputType==='presentation'&&options.prefetchImages!==false?presentationPrefetch({inputType,input,context,options:options.visuals}):null;
    const aiOptions={...options.ai,
        onSlideReady:async(slide,deck)=>{
            await options.ai?.onSlideReady?.(slide,deck);
            // A locally validated later slide can start its image while an
            // earlier text call is still running. Durable checkpoints stay ordered.
            early?.update({...deck,slides:deck.slides.map(current=>current.slideNumber===slide.slideNumber?slide:current)});
        },
        onSlideCheckpoint:async deck=>{await options.ai?.onSlideCheckpoint?.(deck);early?.update(deck);}};
    let aiResult;
    try{aiResult = options.completedContent || await measureStage('content',()=>aiService(
        inputType,
        input,
        outputType,
        context, aiOptions
    ));}catch(error){early?.cancel();throw error;}
    await options.onContentReady?.(aiResult);
    timings.aiMs=Math.round(performance.now()-started);
    const artifactStarted=performance.now();


    // =====================================================
    // 2. PRESENTATION-SPECIFIC PROCESSING
    // =====================================================

    if (outputType === 'webpage') {
        const normalized=webpageLayoutService(aiResult.generatedContent,{...context,topic:context.topic||input.slice(0,4000)});
        const requested=context.websiteBrief || {};
        if(requested.name)normalized.brandName=requested.name;
        if(requested.industry)normalized.designBrief.industry=requested.industry;
        if(context.designPreferences?.heroComposition)normalized.designSpec.heroComposition=context.designPreferences.heroComposition;
        const designed=await measureStage('website-design',()=>planWebpageDesign(normalized,context));
        designed.websiteBrief=compileWebsiteBrief(designed,input,context);
        const resolved = await measureStage('website-images',()=>acquireWebsiteImages(webpageThemeService(designed, context), {...context,instructions:[context.instructions,inputType==='prompt'?input:''].filter(Boolean).join('\n')}, options.webpageAssets));
        const page = resolved.page;
        const rendered=await measureStage('website-html-css-js',()=>webpageRenderer(page,resolved.assets));
        const inspected = await measureStage('website-validation',()=>inspectWebsite(rendered,options.webpageQuality));
        page.quality={...page.quality,validation:inspected.report};
        page.websiteSpecification=websiteSpecification(page);
        const artifacts = await measureStage('website-packaging',()=>webpageArtifactService(inspected.files, options.artifacts));
        if(artifacts.status!=='completed'&&page.imageStrategy.plan.some(p=>p.required))page.imageValidation={...page.imageValidation,status:'incomplete',export:'failed'};
        timings.renderMs=Math.round(performance.now()-artifactStarted);
        const needsReview=page.contentSpecification?.missingInformation.length||resolved.warnings.length||inspected.warnings.length||inspected.report.browser!=='passed';
        return finish({ ...aiResult, generatedContent: page,imageValidation:page.imageValidation, status: page.imageValidation?.status==='incomplete'?'incomplete':artifacts.status==='completed'&&needsReview?'completed_with_warnings':artifacts.status, artifacts,
            warnings: [...(page.warnings || []),...(page.limitations || []).map(message => ({ code: 'STATIC_SCOPE_LIMITATION', message })), ...resolved.warnings, ...inspected.warnings, ...artifacts.warnings] });
    }
    if (outputType === 'document') {
        const document=aiResult.generatedContent;
        const artifacts=await documentArtifactService(document,{instructions:inputType==='prompt'?input:context.instructions,...context},options.document);
        timings.renderMs=Math.round(performance.now()-artifactStarted);
        return finish({...aiResult,status:artifacts.status,...(artifacts.pdf.status==='failed'?{exportValidation:{status:'incomplete',errorCode:'DOCUMENT_PDF_UNAVAILABLE'}}:{}),documentId:artifacts.id,previewUrl:artifacts.previewUrl,downloadUrl:artifacts.downloadUrl,artifacts,warnings:[...(document.warnings||[]),...(artifacts.pdf.status==='failed'?[{code:'DOCUMENT_PDF_UNAVAILABLE',stage:'document-export',message:'PDF export failed. Word and HTML preview remain available; retry the PDF link.'}]:[])]});
    }

    if (outputType === "presentation") {

        // -------------------------------------------------
        // GET AI-INFERRED CONTEXT
        // -------------------------------------------------

        const inferredContext =
            aiResult?.generatedContent?.inferredContext || {};


        // -------------------------------------------------
        // RESOLVE CONTEXT
        // -------------------------------------------------
        //
        // Explicit context wins when supplied.
        // Otherwise, use context inferred by the AI.
        // -------------------------------------------------

        const resolvedContext = {

            userRole:
                context?.userRole ||
                inferredContext?.userRole ||
                "",

            purpose:
                context?.purpose ||
                inferredContext?.purpose ||
                "",

            audience:
                context?.audience ||
                inferredContext?.audience ||
                "",

            topic:
                context?.topic ||
                inferredContext?.topic ||
                "",

            tone:
                context?.tone ||
                inferredContext?.tone ||
                "",

            keyInstructions:
                context?.keyInstructions ||
                inferredContext?.keyInstructions ||
                [],

            designPreferences:
                context?.designPreferences || {}

        };


        // =================================================
        // 3. SELECT SLIDE LAYOUTS
        // =================================================

        const presentationWithLayouts =
            presentationLayoutService(
                aiResult.generatedContent, resolvedContext
            );


        // =================================================
        // 4. SELECT PRESENTATION THEME
        // =================================================

        const presentationWithTheme =
            presentationThemeService(
                presentationWithLayouts,
                resolvedContext
            );


        // =================================================
        // 5. PREPARE PRESENTATION FOR RENDERING
        // =================================================
        //
        // Resolves the selected presentation design into
        // renderer-ready design tokens and normalizes the
        // slides for the PowerPoint rendering engine.
        //
        // =================================================

        let rendererReadyPresentation =
            presentationRendererService(
                presentationWithTheme
            );


        // =================================================
        // 6. GENERATE PRESENTATION PREVIEW
        // =================================================
        //
        // Pipeline:
        //
        // renderer-ready presentation
        //          ↓
        // PPTX
        //          ↓
        // PDF
        //          ↓
        // PNG preview images
        //
        // =================================================

        const visualStarted=performance.now();
        timings.layoutMs=Math.round(visualStarted-artifactStarted);
        const visualContext={...resolvedContext,instructions:[context.instructions,inputType==='prompt'?input:''].filter(Boolean).join('\n')};
        rendererReadyPresentation = await measureStage('presentation-images',()=>resolvePresentationVisuals(rendererReadyPresentation, visualContext,
            {diagramPlanner:createDiagramPlanner(options.ai),...options.visuals,prefetch:early}));
        timings.visualsMs=Math.round(performance.now()-visualStarted);
        const renderStarted=performance.now();

        const incomplete=rendererReadyPresentation.imageValidation?.status==='incomplete';
        const preview =
            await previewRenderer(
                incomplete?{...rendererReadyPresentation,imageCoveragePlan:{...rendererReadyPresentation.imageCoveragePlan,required:false}}:rendererReadyPresentation, options.preview
            );
        const imageValidation=rendererReadyPresentation.imageCoveragePlan.required&&(preview.stages.pdf!=='completed'||preview.stages.png!=='completed')?{...rendererReadyPresentation.imageValidation,status:'incomplete',rendering:'unverified'}:rendererReadyPresentation.imageValidation;
        // Image completeness describes quality, not whether usable artifacts can
        // be delivered. Best-effort requests retain that evidence as warnings.
        const imagesUnmet=imageValidation?.status==='incomplete';
        const strictImages=rendererReadyPresentation.imageCoveragePlan.enforcement==='strict';
        const warnings=[...rendererReadyPresentation.warnings,...preview.warnings];
        if(imagesUnmet&&!warnings.some(w=>w.code==='IMAGE_REQUIREMENTS_UNMET'))warnings.push({
            code:'IMAGE_REQUIREMENTS_UNMET',stage:'image-validation',
            message:'Presentation delivered with image quality warnings. Review missing images and preview availability before use.',
            missingSlides:imageValidation.requiredMissing||[],
            ...(imageValidation.rendering?{rendering:imageValidation.rendering}:{})
        });


        // =================================================
        // 7. RETURN FINAL PRESENTATION RESULT
        // =================================================

        timings.renderMs=Math.round(performance.now()-renderStarted);
        return finish({

            ...aiResult,
            status: imagesUnmet&&strictImages?'incomplete':preview.status === 'completed' && warnings.length ? 'completed_with_warnings' : preview.status,
            imageValidation,
            warnings,

            resolvedContext,

            generatedContent:
                rendererReadyPresentation,

            preview

        });

    }


    // =====================================================
    // 8. DOCUMENT / WEBPAGE
    // =====================================================
    //
    // Their own design/template pipelines will be built
    // separately.
    //
    // They do NOT enter the PowerPoint preview pipeline.
    //
    // =====================================================

    return finish(aiResult);

};
export const generateService=(...args)=>profileGeneration(()=>generate(...args),args[4]?.performance);
