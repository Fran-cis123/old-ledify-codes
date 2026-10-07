import {
    getColors,
    getTypography,
    safeText,
    hasText
} from "../renderHelpers.mjs";


// =========================================================
// SECTION DIVIDER CENTERED
// =========================================================
//
// slideType:
//      section-divider
//
// layoutId:
//      section-divider-centered
//
// Canonical content:
//
// content: {
//     text: {
//         heading: "string",
//         subheading: "string",
//         body: "string"
//     }
// }
//
// Purpose:
//
// Creates a strong visual transition between major
// sections of a presentation.
//
// Section-divider slides are intentionally minimal.
// They introduce the next major part of the presentation
// rather than carrying dense explanatory content.
//
// =========================================================

export const renderSectionDividerCentered = ({
    slide,
    slideData,
    tokens,
    pptx
}) => {

    // =====================================================
    // 1. VALIDATION
    // =====================================================

    if (!slide) {

        throw new Error(
            "PowerPoint slide instance is required"
        );

    }


    if (!slideData) {

        throw new Error(
            "Section divider slide data is required"
        );

    }


    if (!tokens) {

        throw new Error(
            "Presentation design tokens are required"
        );

    }


    if (!pptx) {

        throw new Error(
            "PowerPoint instance is required"
        );

    }


    // =====================================================
    // 2. DESIGN VALUES
    // =====================================================

    const colors =
        getColors(tokens);


    const typography =
        getTypography(tokens);


    // =====================================================
    // 3. CANONICAL CONTENT
    // =====================================================

    const text =
        slideData?.content?.text || {};


    const title =
        safeText(
            slideData.title ||
            text.heading
        );


    const subtitle =
        safeText(
            slideData.subtitle ||
            text.subheading ||
            text.body
        );


    // =====================================================
    // 4. BACKGROUND
    // =====================================================

    slide.background = {

        color:
            colors.primary

    };


    // =====================================================
    // 5. TOP ACCENT
    // =====================================================

    slide.addShape(
        pptx.ShapeType.rect,
        {
            x: 5.67,
            y: 1.72,
            w: 2,
            h: 0.06,

            line: {
                color:
                    colors.accent,

                transparency: 100
            },

            fill: {
                color:
                    colors.accent
            }
        }
    );


    // =====================================================
    // 6. SECTION INDICATOR
    // =====================================================

    if (
        slideData.slideNumber
    ) {

        slide.addText(
            `SECTION ${slideData.slideNumber}`,
            {
                x: 4.2,
                y: 2.02,
                w: 4.93,
                h: 0.35,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    typography.captionSize,

                bold: true,

                color:
                    colors.accent,

                align: "center",

                valign: "mid",

                charSpacing: 2,

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 7. MAIN TITLE
    // =====================================================

    if (
        hasText(title)
    ) {

        slide.addText(
            title,
            {
                x: 1.45,
                y: 2.65,
                w: 10.43,
                h: 1.15,

                fontFace:
                    typography.displayFamily,

                fontSize:
                    typography.displaySize,

                bold: true,

                color:
                    colors.background,

                align: "center",

                valign: "mid",

                margin: 0,

                breakLine: false,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 8. SUBTITLE / SUPPORTING TEXT
    // =====================================================

    if (
        hasText(subtitle)
    ) {

        slide.addText(
            subtitle,
            {
                x: 2.3,
                y: 4.02,
                w: 8.73,
                h: 0.8,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    typography.bodySize,

                color:
                    colors.background,

                align: "center",

                valign: "mid",

                margin: 0,

                breakLine: false,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 9. LOWER ACCENT
    // =====================================================

    slide.addShape(
        pptx.ShapeType.rect,
        {
            x: 6.17,
            y: 5.25,
            w: 1,
            h: 0.05,

            line: {
                color:
                    colors.accent,

                transparency: 100
            },

            fill: {
                color:
                    colors.accent
            }
        }
    );


    return slide;

};