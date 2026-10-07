import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography
} from "../renderHelpers.mjs";


// =========================================================
// IMAGE FOCUS
// =========================================================
//
// Purpose:
//
// Creates a visual-dominant presentation slide.
//
// Unlike text-visual-split, the visual is the primary
// communication element.
//
// Canonical content:
//
// content: {
//
//     visualContent: {
//
//         text: "string",
//
//         visual: {
//             type: "string",
//             description: "string",
//             searchQuery: "string"
//         }
//
//     }
//
// }
//
// IMPORTANT:
//
// This renderer does NOT perform image search or image
// generation.
//
// It provides the rendering surface that the media
// pipeline can later populate.
//
// =========================================================

export const renderImageFocus = ({
    slide,
    slideData,
    tokens,
    pptx
}) => {

    // =====================================================
    // 1. BACKGROUND
    // =====================================================

    applySlideBackground(
        slide,
        tokens
    );


    const colors =
        getColors(tokens);


    const typography =
        getTypography(tokens);


    // =====================================================
    // 2. CANONICAL CONTENT
    // =====================================================

    const visualContent =
        slideData?.content?.visualContent || {};


    const supportingText =
        getText(
            visualContent.text
        );


    const visual =
        normalizeVisual(
            visualContent.visual
        );


    // =====================================================
    // 3. TITLE
    // =====================================================

    addSlideTitle(
        slide,
        slideData.title,
        tokens
    );


    addAccentLine(
        slide,
        pptx,
        tokens,
        {
            x: 0.72,
            y: 1.22,
            w: 0.75
        }
    );


    // =====================================================
    // 4. LARGE VISUAL SURFACE
    // =====================================================

    slide.addShape(
        pptx.ShapeType.roundRect,
        {
            x: 0.75,
            y: 1.62,
            w: 11.83,
            h:
                supportingText
                    ? 3.95
                    : 4.95,

            fill: {
                color:
                    colors.surfaceSecondary
            },

            line: {
                color:
                    colors.border,

                width: 1
            }
        }
    );


    // =====================================================
    // 5. VISUAL TYPE
    // =====================================================

    if (visual.type) {

        slide.addText(
            formatVisualType(
                visual.type
            ),
            {
                x: 1.15,
                y: 1.98,
                w: 3.2,
                h: 0.28,

                fontFace:
                    typography.bodyFamily,

                fontSize: 8,

                bold: true,

                charSpacing: 1,

                color:
                    colors.accentPrimary,

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 6. VISUAL PLACEHOLDER
    // =====================================================

    slide.addText(
        visual.description
            ? "VISUAL CONTENT"
            : "VISUAL AREA",
        {
            x: 3.15,
            y:
                supportingText
                    ? 3.15
                    : 3.6,

            w: 7.0,
            h: 0.55,

            fontFace:
                typography.headingFamily,

            fontSize: 16,

            bold: true,

            color:
                colors.textMuted,

            align: "center",

            valign: "mid",

            margin: 0
        }
    );


    // =====================================================
    // 7. VISUAL DESCRIPTION
    // =====================================================

    if (visual.description) {

        slide.addText(
            visual.description,
            {
                x: 2.15,
                y:
                    supportingText
                        ? 4.15
                        : 4.6,

                w: 9.0,
                h: 0.7,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.captionSize,
                        10
                    ),

                color:
                    colors.textSecondary,

                align: "center",

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 8. SUPPORTING TEXT
    // =====================================================

    if (supportingText) {

        slide.addShape(
            pptx.ShapeType.rect,
            {
                x: 0.78,
                y: 5.92,
                w: 0.06,
                h: 0.72,

                line: {
                    transparency: 100
                },

                fill: {
                    color:
                        colors.accentPrimary
                }
            }
        );


        slide.addText(
            supportingText,
            {
                x: 1.08,
                y: 5.88,
                w: 11.0,
                h: 0.82,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.bodySize,
                        11
                    ),

                color:
                    colors.textPrimary,

                margin: 0,

                valign: "mid",

                fit: "shrink"
            }
        );

    }


    return slide;

};


// =========================================================
// NORMALIZE VISUAL
// =========================================================

const normalizeVisual = (
    visual
) => {

    if (
        typeof visual !== "object" ||
        visual === null
    ) {

        return {
            type: "",
            description: "",
            searchQuery: ""
        };

    }


    return {

        type:
            getText(
                visual.type
            ),

        description:
            getText(
                visual.description
            ),

        searchQuery:
            getText(
                visual.searchQuery
            )

    };

};


// =========================================================
// FORMAT VISUAL TYPE
// =========================================================

const formatVisualType = (
    value
) => {

    return String(value)
        .replaceAll("-", " ")
        .replaceAll("_", " ")
        .toUpperCase();

};


// =========================================================
// TEXT NORMALIZATION
// =========================================================

const getText = (
    value
) => {

    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value.trim();

};