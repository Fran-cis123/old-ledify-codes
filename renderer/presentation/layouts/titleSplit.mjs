import {
    applySlideBackground,
    getColors,
    getTypography
} from "../renderHelpers.mjs";


// =========================================================
// TITLE SPLIT
// =========================================================
//
// slideType:
//      title
//
// layoutId:
//      title-split
//
// Purpose:
//
// Provides a title-led opening composition with space
// reserved for meaningful visual content.
//
// Canonical content structure:
//
// content: {
//
//     text: {
//         heading: "string",
//         subheading: "string",
//         body: "string"
//     },
//
//     visualContent: {
//         visual: {
//             type: "string",
//             description: "string",
//             searchQuery: "string"
//         }
//     }
//
// }
//
// =========================================================

export const renderTitleSplit = ({
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

    const content =
        slideData?.content || {};


    const text =
        content.text || {};


    const visualContent =
        content.visualContent || {};


    const visual =
        visualContent.visual || null;


    const title =
        getText(
            slideData?.title ||
            text.heading
        );


    const subtitle =
        getText(
            slideData?.subtitle ||
            text.subheading
        );


    const supportingText =
        getText(
            text.body
        );


    // =====================================================
    // 3. RIGHT VISUAL PANEL
    // =====================================================

    slide.addShape(
        pptx.ShapeType.rect,
        {
            x: 8.75,
            y: 0,
            w: 4.583,
            h: 7.5,

            line: {
                transparency: 100
            },

            fill: {
                color:
                    colors.surfaceSecondary
            }
        }
    );


    // =====================================================
    // 4. LARGE ACCENT ELEMENT
    // =====================================================

    slide.addShape(
        pptx.ShapeType.rect,
        {
            x: 9.45,
            y: 1.1,
            w: 0.11,
            h: 2.15,

            line: {
                transparency: 100
            },

            fill: {
                color:
                    colors.accentPrimary
            }
        }
    );


    // =====================================================
    // 5. CATEGORY
    // =====================================================

    slide.addText(
        formatLabel(
            slideData?.slideType ||
            "presentation"
        ),
        {
            x: 0.85,
            y: 1.15,
            w: 6.9,
            h: 0.3,

            fontFace:
                typography.bodyFamily,

            fontSize: 9,

            bold: true,

            charSpacing: 1.4,

            color:
                colors.accentPrimary,

            margin: 0
        }
    );


    // =====================================================
    // 6. TITLE
    // =====================================================

    if (title) {

        slide.addText(
            title,
            {
                x: 0.85,
                y: 1.75,
                w: 7.05,
                h: 2.05,

                fontFace:
                    typography.headingFamily,

                fontSize:
                    Math.max(
                        typography.titleSize,
                        30
                    ),

                bold: true,

                color:
                    colors.textPrimary,

                margin: 0,

                valign: "mid",

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 7. SUBTITLE
    // =====================================================

    if (subtitle) {

        slide.addText(
            subtitle,
            {
                x: 0.85,
                y: 4.15,
                w: 6.75,
                h: 0.9,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    typography.subheadingSize,

                color:
                    colors.textSecondary,

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 8. SUPPORTING TEXT
    // =====================================================

    if (supportingText) {

        slide.addText(
            supportingText,
            {
                x: 0.85,
                y: 5.25,
                w: 6.75,
                h: 0.85,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.captionSize,
                        10
                    ),

                color:
                    colors.textMuted,

                margin: 0,

                valign: "top",

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 9. VISUAL DESCRIPTION
    // =====================================================
    //
    // We do NOT fabricate an image here.
    //
    // Actual image resolution belongs to the media/image
    // layer. Until that layer supplies an image, this area
    // remains a deliberate visual placeholder.
    //
    // =====================================================

    const visualDescription =
        getText(
            visual?.description
        );


    if (visualDescription) {

        slide.addText(
            visualDescription,
            {
                x: 9.85,
                y: 4.25,
                w: 2.55,
                h: 1.35,

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

                valign: "mid",

                margin: 0,

                fit: "shrink"
            }
        );

    }


    return slide;

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


// =========================================================
// FORMAT LABEL
// =========================================================

const formatLabel = (
    value = ""
) => {

    return String(value)
        .replaceAll("-", " ")
        .toUpperCase();

};