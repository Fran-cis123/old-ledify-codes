import { aiService } from "./aiService.mjs";

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

export const generateService = async (
    inputType,
    input,
    outputType,
    context = {}
) => {

    // =====================================================
    // 1. GENERATE STRUCTURED CONTENT WITH AI
    // =====================================================

    const aiResult = await aiService(
        inputType,
        input,
        outputType,
        context
    );


    // =====================================================
    // 2. PRESENTATION-SPECIFIC PROCESSING
    // =====================================================

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
                aiResult.generatedContent
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

        const rendererReadyPresentation =
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

        const preview =
            await previewRenderer(
                rendererReadyPresentation
            );


        // =================================================
        // 7. RETURN FINAL PRESENTATION RESULT
        // =================================================

        return {

            ...aiResult,

            resolvedContext,

            generatedContent:
                presentationWithTheme,

            preview

        };

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

    return aiResult;

};