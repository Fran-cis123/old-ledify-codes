import {
    applySlideBackground,
    getColors,
    getTypography,
    addAccentLine
} from "../renderHelpers.mjs";


// =========================================================
// TITLE CENTERED
// =========================================================
//
// slideType:
//      title
//
// layoutId:
//      title-centered
//
// Canonical content structure:
//
// content: {
//     text: {
//         heading: "string",
//         subheading: "string",
//         body: "string"
//     }
// }
//
// =========================================================

export const renderTitleCentered = ({
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

    const text =
        slideData?.content?.titleContent || slideData?.content?.text || {};


    // slideData.title remains the primary presentation
    // title because title is also part of the slide-level
    // structure.
    //
    // content.text.heading is accepted as the canonical
    // content fallback.

    const title =
        getText(
            slideData?.title ||
            text.heading
        );


    const subtitle =
        getText(
            slideData?.subtitle ||
            text.subtitle || text.subheading
        );


    const supportingText =
        getText(
            text.supportingText || text.body
        );


    // =====================================================
    // 3. DECORATIVE TOP LABEL
    // =====================================================

    // =====================================================
    // 4. MAIN TITLE
    // =====================================================

    if (title) {

        slide.addText(
            title,
            {
                x: 1.3,
                y: 2.05,
                w: 10.73,
                h: 1.55,

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

                align: "center",

                valign: "mid",

                margin: 0,

                fit: "shrink",

                breakLine: false
            }
        );

    }


    // =====================================================
    // 5. ACCENT
    // =====================================================

    addAccentLine(
        slide,
        pptx,
        tokens,
        {
            x: 6.04,
            y: 3.85,
            w: 1.25,
            h: 0.055
        }
    );


    // =====================================================
    // 6. SUBTITLE
    // =====================================================

    if (subtitle) {

        slide.addText(
            subtitle,
            {
                x: 2.4,
                y: 4.18,
                w: 8.53,
                h: 0.72,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    typography.subheadingSize,

                color:
                    colors.textSecondary,

                align: "center",

                valign: "mid",

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 7. SUPPORTING TEXT
    // =====================================================

    if (supportingText) {

        slide.addText(
            supportingText,
            {
                x: 3.1,
                y: 5.12,
                w: 7.13,
                h: 0.7,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.captionSize,
                        10
                    ),

                color:
                    colors.textMuted,

                align: "center",

                valign: "top",

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
