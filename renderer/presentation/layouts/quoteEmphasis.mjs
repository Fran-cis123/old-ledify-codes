import {
    applySlideBackground,
    addAccentLine,
    getColors,
    getTypography
} from "../renderHelpers.mjs";


// =========================================================
// QUOTE EMPHASIS
// =========================================================
//
// slideType:
//      quote
//
// Canonical content:
//
// content: {
//
//     quote: {
//         text: "string",
//         attribution: "string",
//         context: "string"
//     }
//
// }
//
// Purpose:
//
// Presents a quotation, testimonial, principle,
// attributed statement, or other intentionally emphasized
// source statement.
//
// IMPORTANT:
//
// This renderer only displays quote information already
// present in the canonical content.
//
// It does NOT:
// - invent an attribution
// - invent a source
// - rewrite the quotation
// - infer who said something
// - manufacture contextual information
//
// =========================================================

export const renderQuoteEmphasis = ({
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
    // 2. QUOTE DATA
    // =====================================================

    const quote =
        normalizeQuote(
            slideData
                ?.content
                ?.quote
        );


    // =====================================================
    // 3. SECTION LABEL
    // =====================================================

    slide.addText(
        "KEY PERSPECTIVE",
        {
            x: 0.9,
            y: 0.8,
            w: 3,
            h: 0.3,

            fontFace:
                typography.bodyFamily,

            fontSize: 8,

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
            x: 0.9,
            y: 1.3,
            w: 0.75
        }
    );


    // =====================================================
    // 5. EMPTY STATE
    // =====================================================

    if (!quote.text) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 6. DECORATIVE QUOTE MARK
    // =====================================================

    slide.addText(
        "“",
        {
            x: 0.85,
            y: 1.65,
            w: 1.2,
            h: 1.25,

            fontFace:
                typography.headingFamily,

            fontSize: 60,

            bold: true,

            color:
                colors.accentPrimary,

            margin: 0
        }
    );


    // =====================================================
    // 7. QUOTE TEXT
    // =====================================================

    slide.addText(
        quote.text,
        {
            x: 1.85,
            y: 1.95,
            w: 9.65,

            h:
                quote.context
                    ? 2.25
                    : 2.65,

            fontFace:
                typography.headingFamily,

            fontSize:
                resolveQuoteFontSize(
                    quote.text
                ),

            bold: true,

            italic: true,

            color:
                colors.textPrimary,

            margin: 0,

            valign: "mid",

            fit: "shrink"
        }
    );


    // =====================================================
    // 8. ATTRIBUTION
    // =====================================================

    if (quote.attribution) {

        slide.addShape(
            pptx.ShapeType.rect,
            {
                x: 1.85,
                y: 4.88,
                w: 0.65,
                h: 0.05,

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
            quote.attribution,
            {
                x: 1.85,
                y: 5.12,
                w: 7.5,
                h: 0.45,

                fontFace:
                    typography.bodyFamily,

                fontSize: 11,

                bold: true,

                color:
                    colors.textSecondary,

                margin: 0,

                fit: "shrink"
            }
        );

    }


    // =====================================================
    // 9. CONTEXT
    // =====================================================

    if (quote.context) {

        slide.addText(
            quote.context,
            {
                x: 1.85,

                y:
                    quote.attribution
                        ? 5.72
                        : 5.15,

                w: 8.75,
                h: 0.65,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    Math.max(
                        typography.captionSize,
                        9
                    ),

                color:
                    colors.textMuted,

                margin: 0,

                valign: "top",

                fit: "shrink"
            }
        );

    }


    return slide;

};


// =========================================================
// NORMALIZE QUOTE
// =========================================================
//
// Only the canonical quote schema is accepted here.
//
// We intentionally do NOT fall back to:
//
// author
// source
// speaker
// reference
// quote.quote
// textContent.body
//
// Schema normalization should happen before rendering,
// not inside individual renderers.
//
// =========================================================

const normalizeQuote = (
    quote
) => {

    if (
        !quote ||
        typeof quote !== "object" ||
        Array.isArray(quote)
    ) {

        return {
            text: "",
            attribution: "",
            context: ""
        };

    }


    return {

        text:
            normalizeText(
                quote.text
            ),

        attribution:
            normalizeText(
                quote.attribution
            ),

        context:
            normalizeText(
                quote.context
            )

    };

};


// =========================================================
// NORMALIZE TEXT
// =========================================================

const normalizeText = (
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
// RESOLVE QUOTE FONT SIZE
// =========================================================
//
// Longer quotations need slightly smaller typography.
//
// This changes presentation styling only.
// It does NOT alter the actual quote content.
//
// =========================================================

const resolveQuoteFontSize = (
    text
) => {

    const length =
        text.length;


    if (length > 280) {
        return 18;
    }


    if (length > 180) {
        return 21;
    }


    if (length > 100) {
        return 24;
    }


    return 27;

};


// =========================================================
// EMPTY STATE
// =========================================================

const renderEmptyState = (
    slide,
    colors,
    typography
) => {

    slide.addText(
        "Quotation content is unavailable.",
        {
            x: 0.8,
            y: 3.25,
            w: 11.7,
            h: 0.5,

            fontFace:
                typography.bodyFamily,

            fontSize: 12,

            color:
                colors.textMuted,

            align: "center",

            margin: 0
        }
    );

};