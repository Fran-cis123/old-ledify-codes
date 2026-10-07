import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography
} from "../renderHelpers.mjs";


// =========================================================
// CASE STUDY FLOW
// =========================================================

export const renderCaseStudyFlow = ({
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


    const caseStudy =
        normalizeCaseStudy(
            slideData.content
        );


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


    const sections = [
        {
            label: "CONTEXT",
            title:
                caseStudy.contextTitle ||
                "Context",

            body:
                caseStudy.context
        },
        {
            label: "CHALLENGE",
            title:
                caseStudy.challengeTitle ||
                "Challenge",

            body:
                caseStudy.challenge
        },
        {
            label: "RESPONSE",
            title:
                caseStudy.responseTitle ||
                "Response",

            body:
                caseStudy.response
        },
        {
            label: "OUTCOME",
            title:
                caseStudy.outcomeTitle ||
                "Outcome",

            body:
                caseStudy.outcome
        }
    ];


    const startX = 0.72;
    const totalWidth = 11.9;
    const gap = 0.18;

    const sectionWidth =
        (
            totalWidth -
            gap * 3
        ) / 4;


    // =====================================================
    // FLOW LINE
    // =====================================================

    slide.addShape(
        pptx.ShapeType.rect,
        {
            x: 1.15,
            y: 2.42,
            w: 11.0,
            h: 0.04,

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
    // CASE STUDY SECTIONS
    // =====================================================

    sections.forEach(
        (section, index) => {

            const x =
                startX +
                index *
                (
                    sectionWidth +
                    gap
                );


            // ---------------------------------------------
            // FLOW NODE
            // ---------------------------------------------

            slide.addShape(
                pptx.ShapeType.ellipse,
                {
                    x:
                        x +
                        sectionWidth / 2 -
                        0.18,

                    y: 2.25,

                    w: 0.36,
                    h: 0.36,

                    fill: {
                        color:
                            index === 3
                                ? colors.accentSecondary
                                : colors.accentPrimary
                    },

                    line: {
                        color:
                            colors.background,

                        width: 1
                    }
                }
            );


            // ---------------------------------------------
            // LABEL
            // ---------------------------------------------

            slide.addText(
                section.label,
                {
                    x,
                    y: 1.7,
                    w: sectionWidth,
                    h: 0.28,

                    fontFace:
                        typography.bodyFamily,

                    fontSize: 8,

                    bold: true,

                    charSpacing: 0.8,

                    color:
                        index === 3
                            ? colors.accentSecondary
                            : colors.accentPrimary,

                    align: "center",

                    margin: 0
                }
            );


            // ---------------------------------------------
            // TITLE
            // ---------------------------------------------

            slide.addText(
                section.title,
                {
                    x: x + 0.15,
                    y: 3.0,
                    w: sectionWidth - 0.3,
                    h: 0.6,

                    fontFace:
                        typography.headingFamily,

                    fontSize: 14,

                    bold: true,

                    color:
                        colors.textPrimary,

                    align: "center",

                    margin: 0,

                    fit: "shrink"
                }
            );


            // ---------------------------------------------
            // BODY
            // ---------------------------------------------

            slide.addText(
                section.body ||
                "—",
                {
                    x: x + 0.15,
                    y: 3.85,
                    w: sectionWidth - 0.3,
                    h: 1.75,

                    fontFace:
                        typography.bodyFamily,

                    fontSize: 9.5,

                    color:
                        section.body
                            ? colors.textSecondary
                            : colors.textMuted,

                    align: "center",

                    valign: "top",

                    margin: 0,

                    fit: "shrink"
                }
            );

        }
    );

};


// =========================================================
// NORMALIZE CASE STUDY
// =========================================================

const normalizeCaseStudy = (
    content = {}
) => {

    const caseStudy =
        content.caseStudy || {};


    return {

        contextTitle:
            caseStudy.contextTitle ||
            "",

        context:
            getText(
                caseStudy.context ||
                caseStudy.background ||
                content.context
            ),


        challengeTitle:
            caseStudy.challengeTitle ||
            "",

        challenge:
            getText(
                caseStudy.challenge ||
                caseStudy.problem ||
                content.challenge
            ),


        responseTitle:
            caseStudy.responseTitle ||
            "",

        response:
            getText(
                caseStudy.response ||
                caseStudy.solution ||
                caseStudy.action ||
                content.response
            ),


        outcomeTitle:
            caseStudy.outcomeTitle ||
            "",

        outcome:
            getText(
                caseStudy.outcome ||
                caseStudy.result ||
                content.outcome
            )

    };

};


const getText = (
    value
) => {

    if (!value) {
        return "";
    }


    if (typeof value === "string") {
        return value;
    }


    return (
        value.description ||
        value.text ||
        value.body ||
        value.title ||
        ""
    );

};