import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    addBodyText,
    getColors,
    getTypography
} from "../renderHelpers.mjs";


// =========================================================
// TEXT VISUAL SPLIT
// =========================================================
//
// Purpose:
//
// Creates a balanced explanatory slide with:
//
//      LEFT  → concise explanatory text
//      RIGHT → supporting visual area
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
// This renderer does NOT fetch images.
//
// It renders the visual information already resolved by
// the presentation/media pipeline.
//
// Until a media resolver is connected, the visual area
// remains a deliberate visual placeholder.
//
// =========================================================

export const renderTextVisualSplit = ({
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


    const text =
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
            w: 0.72
        }
    );


    // =====================================================
    // 4. LEFT TEXT AREA
    // =====================================================

    if (text) {

        addBodyText(
            slide,
            text,
            tokens,
            {
                x: 0.78,
                y: 1.78,
                w: 5.15,
                h: 4.45,

                fontSize:
                    Math.max(
                        typography.bodySize,
                        14
                    )
            }
        );

    } else {

        renderMissingText(
            slide,
            colors,
            typography
        );

    }


    // =====================================================
    // 5. DIVIDER
    // =====================================================

    slide.addShape(
        pptx.ShapeType.rect,
        {
            x: 6.28,
            y: 1.72,
            w: 0.035,
            h: 4.75,

            line: {
                transparency: 100
            },

            fill: {
                color:
                    colors.border
            }
        }
    );


    // =====================================================
    // 6. RIGHT VISUAL CONTAINER
    // =====================================================

    slide.addShape(
        pptx.ShapeType.roundRect,
        {
            x: 6.72,
            y: 1.58,
            w: 5.85,
            h: 4.95,

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
    // 7. VISUAL TYPE LABEL
    // =====================================================

    if (visual.type) {

        slide.addText(
            formatVisualType(
                visual.type
            ),
            {
                x: 7.12,
                y: 1.95,
                w: 4.95,
                h: 0.28,

                fontFace:
                    typography.bodyFamily,

                fontSize: 8,

                bold: true,

                charSpacing: 1,

                color:
                    colors.accentPrimary,

                align: "center",

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 8. VISUAL PLACEHOLDER
    // =====================================================
    //
    // Later the media resolver can replace this area with:
    //
    //      image
    //      illustration
    //      diagram
    //      screenshot
    //      icon composition
    //      generated visual
    //
    // =====================================================

    slide.addShape(
        pptx.ShapeType.roundRect,
        {
            x: 7.35,
            y: 2.55,
            w: 4.55,
            h: 2.65,

            fill: {
                color:
                    colors.surface
            },

            line: {
                color:
                    colors.border,

                width: 0.8
            }
        }
    );


    slide.addText(
        visual.description
            ? "SUPPORTING VISUAL"
            : "VISUAL AREA",
        {
            x: 7.7,
            y: 3.42,
            w: 3.85,
            h: 0.38,

            fontFace:
                typography.bodyFamily,

            fontSize: 9,

            bold: true,

            charSpacing: 1,

            color:
                colors.textMuted,

            align: "center",

            margin: 0
        }
    );


    // =====================================================
    // 9. VISUAL DESCRIPTION
    // =====================================================

    if (visual.description) {

        slide.addText(
            visual.description,
            {
                x: 7.28,
                y: 5.48,
                w: 4.7,
                h: 0.62,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.captionSize,
                        9
                    ),

                color:
                    colors.textSecondary,

                align: "center",

                margin: 0,

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
// MISSING TEXT STATE
// =========================================================

const renderMissingText = (
    slide,
    colors,
    typography
) => {

    slide.addText(
        "No explanatory text was provided.",
        {
            x: 0.78,
            y: 3.2,
            w: 5.15,
            h: 0.45,

            fontFace:
                typography.bodyFamily,

            fontSize: 11,

            color:
                colors.textMuted,

            align: "center",

            margin: 0
        }
    );

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