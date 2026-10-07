import {
    applySlideBackground,
    getColors,
    getTypography
} from "../renderHelpers.mjs";


// =========================================================
// CTA FOCUS
// =========================================================

export const renderCtaFocus = ({
    slide,
    slideData,
    tokens,
    pptx
}) => {

    applySlideBackground(slide, tokens);

    const colors =
        getColors(tokens);

    const typography =
        getTypography(tokens);


    const cta =
        normalizeCta(
            slideData
        );


    // =====================================================
    // LARGE BACKGROUND ACCENT
    // =====================================================

    slide.addShape(
        pptx.ShapeType.ellipse,
        {
            x: 9.65,
            y: -1.3,
            w: 5.0,
            h: 5.0,

            fill: {
                color:
                    colors.surfaceSecondary,

                transparency: 20
            },

            line: {
                transparency: 100
            }
        }
    );


    slide.addShape(
        pptx.ShapeType.ellipse,
        {
            x: 10.8,
            y: 4.85,
            w: 3.2,
            h: 3.2,

            fill: {
                color:
                    colors.accentPrimary,

                transparency: 85
            },

            line: {
                transparency: 100
            }
        }
    );


    // =====================================================
    // LABEL
    // =====================================================

    slide.addText(
        "NEXT STEP",
        {
            x: 0.95,
            y: 1.15,
            w: 3,
            h: 0.3,

            fontFace:
                typography.bodyFamily,

            fontSize: 8,

            bold: true,

            charSpacing: 1.4,

            color:
                colors.accentPrimary,

            margin: 0
        }
    );


    // =====================================================
    // TITLE
    // =====================================================

    slide.addText(
        cta.title,
        {
            x: 0.95,
            y: 1.85,
            w: 8.5,
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

            margin: 0,

            fit: "shrink"
        }
    );


    // =====================================================
    // DESCRIPTION
    // =====================================================

    if (cta.description) {

        slide.addText(
            cta.description,
            {
                x: 0.98,
                y: 3.75,
                w: 7.6,
                h: 1.05,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.bodySize,
                        13
                    ),

                color:
                    colors.textSecondary,

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // ACTION BUTTON
    // =====================================================

    if (cta.action) {

        slide.addShape(
            pptx.ShapeType.roundRect,
            {
                x: 0.98,
                y: 5.25,
                w: 3.4,
                h: 0.72,

                rectRadius: 0.08,

                fill: {
                    color:
                        colors.accentPrimary
                },

                line: {
                    transparency: 100
                }
            }
        );


        slide.addText(
            cta.action,
            {
                x: 1.18,
                y: 5.25,
                w: 3.0,
                h: 0.72,

                fontFace:
                    typography.bodyFamily,

                fontSize: 11,

                bold: true,

                color:
                    colors.background,

                align: "center",
                valign: "mid",

                margin: 0,

                fit: "shrink"
            }
        );

    }

};


// =========================================================
// NORMALIZE CTA
// =========================================================

const normalizeCta = (
    slideData
) => {

    const content =
        slideData?.content || {};

    const cta =
        content.cta ||
        content.callToAction ||
        {};


    if (typeof cta === "string") {

        return {
            title:
                slideData.title ||
                "Next Steps",

            description: "",

            action:
                cta
        };

    }


    return {

        title:
            cta.title ||
            slideData.title ||
            "Next Steps",

        description:
            cta.description ||
            cta.body ||
            content.textContent?.body ||
            "",

        action:
            cta.action ||
            cta.buttonText ||
            cta.label ||
            ""

    };

};