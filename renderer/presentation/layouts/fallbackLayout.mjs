import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography
} from "../renderHelpers.mjs";


// =========================================================
// FALLBACK LAYOUT
// =========================================================

export const renderFallbackLayout = ({
    slide,
    slideData,
    tokens,
    pptx
}) => {

    console.warn(
        `[PRESENTATION RENDERER] Falling back for layout: ${
            slideData?.layoutId ||
            "unknown"
        }`
    );


    applySlideBackground(
        slide,
        tokens
    );


    const colors =
        getColors(tokens);

    const typography =
        getTypography(tokens);


    // =====================================================
    // TITLE
    // =====================================================

    addSlideTitle(
        slide,
        slideData?.title ||
        "Presentation",
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
    // EXTRACT READABLE CONTENT
    // =====================================================

    const body =
        extractReadableContent(
            slideData?.content
        );


    // =====================================================
    // BODY
    // =====================================================

    slide.addText(
        body ||
        "No renderable content was provided for this slide.",
        {
            x: 0.82,
            y: 1.8,
            w: 11.65,
            h: 4.65,

            fontFace:
                typography.bodyFamily,

            fontSize: 15,

            color:
                body
                    ? colors.textPrimary
                    : colors.textMuted,

            margin: 0,

            valign: "top",

            breakLine: false,

            fit: "shrink"
        }
    );


    // =====================================================
    // DEBUG LABEL
    // =====================================================

    slide.addText(
        `Fallback • ${
            slideData?.layoutId ||
            "unregistered-layout"
        }`,
        {
            x: 9.3,
            y: 6.9,
            w: 3.1,
            h: 0.25,

            fontFace:
                typography.bodyFamily,

            fontSize: 7,

            color:
                colors.textMuted,

            align: "right",

            margin: 0
        }
    );

};


// =========================================================
// EXTRACT READABLE CONTENT
// =========================================================

const extractReadableContent = (
    content
) => {

    if (!content) {
        return "";
    }


    if (typeof content === "string") {
        return content;
    }


    // =====================================================
    // TEXT CONTENT
    // =====================================================

    if (content.textContent) {

        const heading =
            content.textContent.heading ||
            "";

        const body =
            content.textContent.body ||
            "";


        return [
            heading,
            body
        ]
            .filter(Boolean)
            .join("\n\n");

    }


    // =====================================================
    // KEY POINTS
    // =====================================================

    if (
        Array.isArray(
            content.keyPoints
        )
    ) {

        return content.keyPoints
            .map(
                (item) => {

                    if (
                        typeof item === "string"
                    ) {
                        return `• ${item}`;
                    }


                    const title =
                        item?.title ||
                        "";

                    const description =
                        item?.description ||
                        item?.text ||
                        "";


                    return `• ${
                        [
                            title,
                            description
                        ]
                            .filter(Boolean)
                            .join(": ")
                    }`;

                }
            )
            .join("\n");

    }


    // =====================================================
    // CARDS
    // =====================================================

    if (
        Array.isArray(
            content.cards
        )
    ) {

        return content.cards
            .map(
                (card) => {

                    const title =
                        card?.title ||
                        "";

                    const description =
                        card?.description ||
                        "";


                    return [
                        title,
                        description
                    ]
                        .filter(Boolean)
                        .join(": ");

                }
            )
            .filter(Boolean)
            .join("\n\n");

    }


    // =====================================================
    // LAST RESORT
    // =====================================================

    try {

        return JSON.stringify(
            content,
            null,
            2
        );

    } catch {

        return "";

    }

};