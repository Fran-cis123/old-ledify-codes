import {
    applySlideBackground,
    getColors,
    getTypography,
    addAccentLine,
    addBodyText
} from "../renderHelpers.mjs";


// =========================================================
// FOCUSED STATEMENT
// =========================================================
//
// Primarily used by:
//
//      focused-explanation
//
// Can also support concise:
//      summary
//      conclusion
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
// =========================================================

export const renderFocusedStatement = ({
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
        slideData?.content?.text || {};


    const heading =
        getText(
            text.heading ||
            slideData?.title
        );


    const body =
        getText(
            text.body
        );


    const supportingText =
        getText(
            text.subheading ||
            slideData?.subtitle
        );


    // =====================================================
    // 3. SMALL SECTION LABEL
    // =====================================================

    slide.addText(
        formatLabel(
            slideData?.slideType
        ),
        {
            x: 0.85,
            y: 0.72,
            w: 4.8,
            h: 0.28,

            fontFace:
                typography.bodyFamily,

            fontSize: 9,

            bold: true,

            charSpacing: 1.3,

            color:
                colors.accentPrimary,

            margin: 0
        }
    );


    // =====================================================
    // 4. ACCENT
    // =====================================================

    addAccentLine(
        slide,
        pptx,
        tokens,
        {
            x: 0.85,
            y: 1.25,
            w: 0.85,
            h: 0.055
        }
    );


    // =====================================================
    // 5. DOMINANT STATEMENT
    // =====================================================

    if (heading) {

        slide.addText(
            heading,
            {
                x: 0.85,
                y: 1.72,
                w: 10.6,
                h: 1.5,

                fontFace:
                    typography.headingFamily,

                fontSize:
                    Math.max(
                        typography.titleSize,
                        28
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
    // 6. BODY
    // =====================================================

    if (body) {

        addBodyText(
            slide,
            body,
            tokens,
            {
                x: 0.88,
                y: 3.55,
                w:
                    supportingText
                        ? 8.75
                        : 11.1,

                h: 2.05,

                fontSize:
                    Math.max(
                        typography.bodySize,
                        14
                    )
            }
        );

    }


    // =====================================================
    // 7. SUPPORTING INSIGHT
    // =====================================================

    if (supportingText) {

        slide.addShape(
            pptx.ShapeType.rect,
            {
                x: 10.25,
                y: 3.58,
                w: 0.06,
                h: 1.4,

                line: {
                    transparency: 100
                },

                fill: {
                    color:
                        colors.accentSecondary
                }
            }
        );


        slide.addText(
            supportingText,
            {
                x: 10.58,
                y: 3.58,
                w: 1.85,
                h: 1.45,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.captionSize,
                        10
                    ),

                color:
                    colors.textSecondary,

                margin: 0,

                valign: "top",

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