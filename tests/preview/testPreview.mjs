import path from "path";
import {
    fileURLToPath
} from "url";

import {
    previewRenderer
} from "../../renderer/presentation/previewRenderer.mjs";


// =========================================================
// CURRENT DIRECTORY
// =========================================================

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


// =========================================================
// TEST OUTPUT DIRECTORY
// =========================================================

const outputDirectory =
    path.join(
        __dirname,
        "output",
        "renderer-test"
    );


// =========================================================
// TEST PRESENTATION
// =========================================================
//
// This deliberately uses a small renderer-ready
// presentation.
//
// We are testing:
//
// presentation object
//      ↓
// previewRenderer
//      ↓
// pptxRenderer
//      ↓
// PPTX
//      ↓
// PDF
//      ↓
// PNG
//
// =========================================================

const testPresentation = {

    outputType:
        "presentation",

    title:
        "Ledify Preview Test",

    subtitle:
        "Testing the complete preview pipeline",

    strategyId:
        "test-strategy",


    // =====================================================
    // DESIGN
    // =====================================================
    //
    // previewRenderer passes this presentation directly to
    // pptxRenderer.
    //
    // The tokens below provide the design system required
    // by the renderer.
    //
    // =====================================================

    design: {

        themeId:
            "test-theme",

        variantId:
            "test-variant",

        tokens: {

            colors: {

                background:
                    "FFFFFF",

                surface:
                    "F7F7F7",

                surfaceSecondary:
                    "EFEFEF",

                textPrimary:
                    "1F2937",

                textSecondary:
                    "4B5563",

                textMuted:
                    "9CA3AF",

                accentPrimary:
                    "2563EB",

                accentSecondary:
                    "7C3AED",

                border:
                    "D1D5DB",

                primary:
                    "1F2937",

                accent:
                    "2563EB"

            },


            typography: {

                displayFamily:
                    "Arial",

                headingFamily:
                    "Arial",

                bodyFamily:
                    "Arial",

                displaySize:
                    34,

                titleSize:
                    28,

                subheadingSize:
                    18,

                bodySize:
                    12,

                captionSize:
                    9,

                statisticSize:
                    30

            },


            chartPalette: [
                "2563EB",
                "7C3AED",
                "059669",
                "D97706"
            ]

        }

    },


    // =====================================================
    // TEST SLIDES
    // =====================================================

    slides: [

        // -------------------------------------------------
        // SLIDE 1 — TITLE
        // -------------------------------------------------

        {

            slideNumber: 1,

            slideType:
                "title",

            layoutId:
                "title-centered",

            title:
                "Ledify Preview System",

            subtitle:
                "Backend-generated PowerPoint previews",

            content: {

                titleContent: {

                    subtitle:
                        "Backend-generated PowerPoint previews",

                    supportingText:
                        "PPTX → PDF → PNG"

                }

            },

            speakerNotes:
                ""

        },


        // -------------------------------------------------
        // SLIDE 2 — KEY POINTS
        // -------------------------------------------------

        {

            slideNumber: 2,

            slideType:
                "key-points",

            layoutId:
                "key-points-stack",

            title:
                "How the Preview Works",

            subtitle:
                "",

            content: {

                keyPoints: [

                    {
                        title:
                            "Generate",

                        description:
                            "Ledify creates the PowerPoint presentation."
                    },

                    {
                        title:
                            "Convert",

                        description:
                            "LibreOffice converts the PowerPoint into PDF."
                    },

                    {
                        title:
                            "Preview",

                        description:
                            "Each PDF page becomes a browser-displayable PNG."
                    }

                ]

            },

            speakerNotes:
                ""

        }

    ]

};


// =========================================================
// RUN TEST
// =========================================================

const runTest = async () => {

    console.log(
        "\nStarting previewRenderer end-to-end test...\n"
    );


    try {

        const result =
            await previewRenderer(
                testPresentation,
                {
                    outputDirectory
                }
            );


        // =================================================
        // SUCCESS
        // =================================================

        console.log(
            "✅ previewRenderer completed successfully.\n"
        );


        console.log(
            "Preview ID:",
            result.previewId
        );


        console.log(
            "Title:",
            result.title
        );


        console.log(
            "Slide count:",
            result.slideCount
        );


        console.log(
            "\nGenerated slides:"
        );


        result.slides.forEach(
            (slide) => {

                console.log(
                    `Slide ${slide.slideNumber}: ${slide.filePath}`
                );

            }
        );


        console.log(
            "\nGenerated files:"
        );


        console.log(
            "PPTX:",
            result.files.pptxPath
        );


        console.log(
            "PDF:",
            result.files.pdfPath
        );


        console.log(
            "Images:",
            result.files.slidesDirectory
        );


        console.log(
            "\n✅ END-TO-END PREVIEW TEST PASSED.\n"
        );


    } catch (error) {

        console.error(
            "\n❌ END-TO-END PREVIEW TEST FAILED.\n"
        );


        console.error(
            error
        );


        process.exitCode = 1;

    }

};


// =========================================================
// START TEST
// =========================================================

runTest();