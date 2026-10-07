import {
    getLayoutsForSlideType
} from "../templates/presentation/presentationLayouts.mjs";


// =========================================================
// PRESENTATION LAYOUT SERVICE
// =========================================================
//
// Responsibility:
//
// This service decides WHICH registered layout each
// generated slide should use.
//
// It does NOT:
//
// - generate presentation content
// - validate AI content
// - choose semantic slide types
// - draw PowerPoint slides
// - apply presentation themes
//
// The AI has already chosen the semantic slideType.
//
// This service chooses the most appropriate visual layout
// available for that slideType.
//
// Example:
//
// slideType: "cards"
//      ↓
// cards-horizontal OR cards-grid
//      ↓
// layoutRegistry
//      ↓
// actual PPTX renderer
//
// =========================================================

export const presentationLayoutService = (
    generatedContent
) => {

    // =====================================================
    // 1. VALIDATE PRESENTATION
    // =====================================================

    if (
        !generatedContent ||
        typeof generatedContent !== "object"
    ) {

        throw new Error(
            "Generated presentation content is required"
        );

    }


    if (
        !Array.isArray(
            generatedContent.slides
        ) ||
        generatedContent.slides.length === 0
    ) {

        throw new Error(
            "Presentation slides are required"
        );

    }


    // =====================================================
    // 2. ASSIGN LAYOUT TO EVERY SLIDE
    // =====================================================

    const slidesWithLayouts =
        generatedContent.slides.map(
            (slide, index) => {

                if (
                    !slide ||
                    typeof slide !== "object"
                ) {

                    throw new Error(
                        `Slide ${index + 1} is invalid`
                    );

                }


                if (
                    typeof slide.slideType !==
                        "string" ||
                    !slide.slideType.trim()
                ) {

                    throw new Error(
                        `Slide ${index + 1} does not have a valid slideType`
                    );

                }


                const layoutId =
                    selectLayout(
                        slide
                    );


                return {

                    ...slide,

                    slideNumber:
                        slide.slideNumber ||
                        index + 1,

                    layoutId

                };

            }
        );


    // =====================================================
    // 3. RETURN PRESENTATION WITH LAYOUT IDS
    // =====================================================

    return {

        ...generatedContent,

        slides:
            slidesWithLayouts

    };

};


// =========================================================
// SELECT LAYOUT
// =========================================================

const selectLayout = (
    slide
) => {

    const slideType =
        slide.slideType;


    // =====================================================
    // GET REGISTERED LAYOUTS FOR SLIDE TYPE
    // =====================================================

    const availableLayouts =
        getLayoutsForSlideType(
            slideType
        );


    if (
        !Array.isArray(
            availableLayouts
        ) ||
        availableLayouts.length === 0
    ) {

        throw new Error(
            `No presentation layout found for slide type: ${slideType}`
        );

    }


    // =====================================================
    // ONE AVAILABLE LAYOUT
    // =====================================================
    //
    // Most semantic slide types currently have one visual
    // layout.
    //
    // In those cases there is nothing to decide.
    //
    // =====================================================

    if (
        availableLayouts.length === 1
    ) {

        return availableLayouts[0].id;

    }


    // =====================================================
    // TITLE
    // =====================================================
    //
    // The canonical title content structure is:
    //
    // content.titleContent
    //
    // It does NOT contain visualContent.
    //
    // For now, title-centered is therefore our default title
    // layout.
    //
    // title-split remains registered so that we can support
    // visual title slides later without breaking the layout
    // architecture.
    //
    // =====================================================

    if (
        slideType ===
        "title"
    ) {

        return findLayout(
            availableLayouts,
            "title-centered"
        );

    }


    // =====================================================
    // FOCUSED EXPLANATION
    // =====================================================
    //
    // focused-explanation uses:
    //
    // content.textContent
    //
    // text-visual is a DIFFERENT semantic slide type and
    // uses:
    //
    // content.visualContent
    //
    // Therefore focused-explanation must not inspect
    // visualContent to decide whether it should become a
    // text-visual layout.
    //
    // =====================================================

    if (
        slideType ===
        "focused-explanation"
    ) {

        return findLayout(
            availableLayouts,
            "focused-statement"
        );

    }


    // =====================================================
    // TEXT + VISUAL
    // =====================================================

    if (
        slideType ===
        "text-visual"
    ) {

        return findLayout(
            availableLayouts,
            "text-visual-split"
        );

    }


    // =====================================================
    // SUMMARY / CONCLUSION
    // =====================================================

    if (
        slideType === "summary" ||
        slideType === "conclusion"
    ) {

        return findLayout(
            availableLayouts,
            "focused-statement"
        );

    }


    // =====================================================
    // CARDS
    // =====================================================

    if (
        slideType ===
        "cards"
    ) {

        const cards =
            Array.isArray(
                slide.content?.cards
            )
                ? slide.content.cards
                : [];


        const cardCount =
            cards.length;


        // -------------------------------------------------
        // 2–4 cards:
        // horizontal composition works well.
        // -------------------------------------------------

        if (
            cardCount >= 2 &&
            cardCount <= 4
        ) {

            return findLayout(
                availableLayouts,
                "cards-horizontal"
            );

        }


        // -------------------------------------------------
        // Larger collections:
        // use the grid.
        //
        // Validation already protects against excessive
        // collection sizes.
        // -------------------------------------------------

        return findLayout(
            availableLayouts,
            "cards-grid"
        );

    }


    // =====================================================
    // PROCESS
    // =====================================================

    if (
        slideType ===
        "process"
    ) {

        const steps =
            Array.isArray(
                slide.content
                    ?.process
                    ?.steps
            )
                ? slide.content
                    .process
                    .steps
                : [];


        const stepCount =
            steps.length;


        // -------------------------------------------------
        // 2–5 steps:
        // horizontal progression.
        // -------------------------------------------------

        if (
            stepCount >= 2 &&
            stepCount <= 5
        ) {

            return findLayout(
                availableLayouts,
                "process-horizontal"
            );

        }


        // -------------------------------------------------
        // More than five:
        // vertical layout provides more room.
        // -------------------------------------------------

        return findLayout(
            availableLayouts,
            "process-vertical"
        );

    }


    // =====================================================
    // COMPARISON
    // =====================================================

    if (
        slideType ===
        "comparison"
    ) {

        const items =
            Array.isArray(
                slide.content
                    ?.comparison
                    ?.items
            )
                ? slide.content
                    .comparison
                    .items
                : [];


        const itemCount =
            items.length;


        // -------------------------------------------------
        // Exactly two alternatives:
        // direct two-column comparison.
        // -------------------------------------------------

        if (
            itemCount === 2
        ) {

            return findLayout(
                availableLayouts,
                "comparison-two-column"
            );

        }


        // -------------------------------------------------
        // Three or more:
        // multi-column comparison.
        // -------------------------------------------------

        return findLayout(
            availableLayouts,
            "comparison-multi-column"
        );

    }


    // =====================================================
    // DATA CHART
    // =====================================================

    if (
        slideType ===
        "data-chart"
    ) {

        const insight =
            typeof slide.content
                ?.chart
                ?.insight === "string"
                ? slide.content
                    .chart
                    .insight
                    .trim()
                : "";


        // -------------------------------------------------
        // A substantial interpretation gets a dedicated
        // insight area.
        // -------------------------------------------------

        if (
            insight.length >= 40
        ) {

            return findLayout(
                availableLayouts,
                "chart-with-insight"
            );

        }


        // -------------------------------------------------
        // Otherwise maximize chart space.
        // -------------------------------------------------

        return findLayout(
            availableLayouts,
            "chart-primary"
        );

    }


    // =====================================================
    // DEFAULT
    // =====================================================
    //
    // The remaining semantic types currently have one
    // compatible layout:
    //
    // section-divider
    // agenda
    // key-points
    // relationship
    // timeline
    // roadmap
    // statistics
    // table
    // quote
    // case-study
    // recommendation
    // next-steps
    // call-to-action
    //
    // If additional layouts are registered for any of these
    // types later, selection logic can be added above.
    //
    // =====================================================

    return availableLayouts[0].id;

};


// =========================================================
// FIND LAYOUT
// =========================================================

const findLayout = (
    availableLayouts,
    layoutId
) => {

    const layout =
        availableLayouts.find(
            (candidate) =>
                candidate.id ===
                layoutId
        );


    if (!layout) {

        throw new Error(
            `Layout "${layoutId}" is not available for this slide type`
        );

    }


    return layout.id;

};