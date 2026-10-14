import { SLIDE_TYPE_CONTENT_MAP, PRESENTATION_COLLECTION_LIMITS as limits } from "../templates/presentation/slideContentSchemas.mjs";

// =========================================================
// PRESENTATION CONTENT VALIDATOR
// =========================================================
//
// Final quality-control layer between:
//
// AI generation
//      ↓
// presentationContentValidator
//      ↓
// presentationLayoutService
//      ↓
// presentationThemeService
//      ↓
// renderer
//
// This validator does NOT rewrite AI content.
//
// It rejects content that is:
//
// - structurally incompatible
// - excessively verbose
// - too empty
// - repetitive
// - malformed
// - obviously off-topic
// - internally inconsistent
// - incompatible with its semantic slide type
//
// IMPORTANT:
//
// The AI response schema controls the basic JSON shape.
//
// This validator provides a SECOND protection layer for
// presentation quality and semantic correctness.
//
// =========================================================


// =========================================================
// CANONICAL SLIDE → CONTENT CONTRACT
// =========================================================
//
// There must be ONE authoritative semantic contract.
//
// slideType
//      ↓
// expected content property
//
// =========================================================



// =========================================================
// NON-EMPTY STRING CHECK
// =========================================================

const isNonEmptyString = (
    value
) => {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );

};


// =========================================================
// ALL RECOGNIZED CONTENT KEYS
// =========================================================

const RECOGNIZED_CONTENT_KEYS =
    new Set(
        Object.values(
            SLIDE_TYPE_CONTENT_MAP
        )
    );


// =========================================================
// HARD FIELD LIMITS
// =========================================================
//
// These are HARD safety limits.
//
// The AI prompt normally asks for considerably less.
//
// We deliberately keep validator limits slightly more generous
// than prompt targets so harmless variation does not cause
// unnecessary generation failure.
//
// =========================================================

const HARD_WORD_LIMITS = {

    presentationTitle: 30,
    presentationSubtitle: 30,

    slideTitle: 24,
    slideSubtitle: 30,

    // TITLE

    titleContentTitle: 30,
    titleContentSubtitle: 30,
    titleSupportingText: 45,

    // SECTION DIVIDER

    sectionTitle: 20,
    sectionSubtitle: 30,

    // GENERIC ITEMS

    itemTitle: 15,
    itemDescription: 40,

    // FOCUSED EXPLANATION

    textHeading: 20,
    textBody: 90,

    // VISUAL

    visualText: 70,
    visualType: 10,
    visualDescription: 40,
    visualSearchQuery: 20,

    // CARDS

    cardTitle: 15,
    cardDescription: 45,

    // COMPARISON

    comparisonLabel: 15,
    comparisonPoint: 30,

    // RELATIONSHIP

    relationshipNodeId: 10,
    relationshipLabel: 15,
    relationshipDescription: 35,
    relationshipEdgeLabel: 15,

    // PROCESS

    processTitle: 15,
    processDescription: 40,

    // TIMELINE

    timelineLabel: 15,
    timelineTitle: 15,
    timelineDescription: 40,

    // ROADMAP

    roadmapLabel: 15,
    roadmapTitle: 15,
    roadmapDescription: 40,

    // STATISTICS

    statisticValue: 12,
    statisticLabel: 15,
    statisticContext: 30,

    // CHART

    chartType: 10,
    chartLabel: 15,
    chartDatasetLabel: 15,
    chartInsight: 60,

    // TABLE

    tableColumn: 15,
    tableCell: 30,

    // QUOTE

    quoteText: 70,
    quoteAttribution: 20,
    quoteContext: 35,

    // CASE STUDY

    caseContext: 45,
    caseChallenge: 45,
    caseAction: 45,
    caseOutcome: 45,
    caseLesson: 35,

    // SUMMARY

    summaryStatement: 50,
    summaryPoint: 30,

    // CONCLUSION

    conclusionStatement: 50,
    conclusionPoint: 30,

    // CALL TO ACTION

    ctaAction: 15,
    ctaSupportingText: 50

};


// =========================================================
// HARD COLLECTION LIMITS
// =========================================================

const HARD_COLLECTION_LIMITS = {
    slides: 12, items: limits.items, cards: limits.cards,
    comparisonItems: limits['comparison.items'], comparisonPointsPerItem: limits['comparison.items.points'],
    relationshipNodes: limits['relationship.nodes'], relationships: limits['relationship.relationships'],
    processSteps: limits['process.steps'], timelineEvents: limits['timeline.events'], roadmapPhases: limits['roadmap.phases'],
    statistics: limits.statistics, chartLabels: limits['chart.labels'], chartDatasets: limits['chart.datasets'],
    tableColumns: limits['table.columns'], tableRows: limits['table.rows'],
    summaryPoints: limits['summary.points'], conclusionPoints: limits['conclusion.supportingPoints']
};


// =========================================================
// SLIDE DENSITY LIMITS
// =========================================================

const HARD_SLIDE_WORD_LIMIT = 180;

const HARD_PRESENTATION_AVERAGE_WORD_LIMIT = 130;


// =========================================================
// REPETITION SETTINGS
// =========================================================

const MAX_IDENTICAL_PHRASE_OCCURRENCES = 4;

const MIN_REPETITION_PHRASE_LENGTH = 3;


// =========================================================
// MINIMUM USEFUL CONTENT RULES
// =========================================================
//
// Maximum limits stop slides from becoming too wordy.
//
// Minimum limits prevent the opposite problem:
// technically valid slides that contain almost nothing.
//
// =========================================================

const MINIMUM_USEFUL_CONTENT_RULES = {

    title: {
        minMeaningfulItems: 1
    },

    "section-divider": {
        minMeaningfulItems: 1
    },

    agenda: {
        minMeaningfulItems: 2
    },

    "key-points": {
        minMeaningfulItems: 2
    },

    "focused-explanation": {
        minMeaningfulItems: 2
    },

    "text-visual": {
        minMeaningfulItems: 2
    },

    comparison: {
        minMeaningfulItems: 2
    },

    relationship: {
        minMeaningfulItems: 2
    },

    process: {
        minMeaningfulItems: 2
    },

    timeline: {
        minMeaningfulItems: 2
    },

    roadmap: {
        minMeaningfulItems: 2
    },

    "data-chart": {
        minMeaningfulItems: 1
    },

    statistics: {
        minMeaningfulItems: 1
    },

    table: {
        minMeaningfulItems: 2
    },

    cards: {
        minMeaningfulItems: 2
    },

    quote: {
        minMeaningfulItems: 1
    },

    "case-study": {
        minMeaningfulItems: 2
    },

    recommendation: {
        minMeaningfulItems: 2
    },

    "next-steps": {
        minMeaningfulItems: 2
    },

    "call-to-action": {
        minMeaningfulItems: 1
    },

    summary: {
        minMeaningfulItems: 2
    },

    conclusion: {
        minMeaningfulItems: 2
    }

};


// =========================================================
// MAIN VALIDATOR
// =========================================================

export const validatePresentationContent = (
    presentation,
    source = {}
) => {

    const errors = [];


    // =====================================================
    // BASIC PRESENTATION VALIDATION
    // =====================================================

    if (
        !presentation ||
        typeof presentation !== "object" ||
        Array.isArray(presentation)
    ) {

        throw new Error(
            "Presentation validation failed: presentation must be an object"
        );

    }


    if (
        presentation.outputType !==
        "presentation"
    ) {

        errors.push(
            `Expected outputType "presentation" but received "${presentation.outputType}"`
        );

    }


    // =====================================================
    // SPEAKER NOTES
    // =====================================================

    detectForbiddenSpeakerNotes(
        presentation,
        errors
    );


    // =====================================================
    // PRESENTATION TITLE / SUBTITLE
    // =====================================================

    validateWordLimit(
        presentation.title,
        HARD_WORD_LIMITS.presentationTitle,
        "Presentation title",
        errors
    );


    validateWordLimit(
        presentation.subtitle,
        HARD_WORD_LIMITS.presentationSubtitle,
        "Presentation subtitle",
        errors
    );


    // =====================================================
    // SLIDES
    // =====================================================

    if (
        !Array.isArray(
            presentation.slides
        )
    ) {

        errors.push(
            "Presentation slides must be an array"
        );

    } else {

        if (
            presentation.slides.length === 0
        ) {

            errors.push(
                "Presentation must contain at least one slide"
            );

        }


        validateCollectionLimit(
            presentation.slides,
            HARD_COLLECTION_LIMITS.slides,
            "Presentation slides",
            errors
        );


        presentation.slides.forEach(
            (slide, index) => {

                validateSlide(
                    slide,
                    index,
                    errors
                );

            }
        );


        validatePresentationDensity(
            presentation.slides,
            errors
        );


        validateDuplicateSlides(
            presentation.slides,
            errors
        );

    }


    // =====================================================
    // GLOBAL REPETITION
    // =====================================================

    validateRepetition(
        presentation,
        errors
    );


    // =====================================================
    // MALFORMED TEXT
    // =====================================================

    validateMalformedText(
        presentation,
        errors
    );


    // =====================================================
    // TOPIC CONSISTENCY
    // =====================================================

    validateTopicConsistency(
        presentation,
        source,
        errors
    );


    // =====================================================
    // SOURCE-SENSITIVE CLAIM CHECKS
    // =====================================================
    //
    // This is deliberately conservative.
    //
    // A deterministic validator cannot determine whether
    // arbitrary world knowledge is "100% correct".
    //
    // What it CAN do is detect suspicious source-specific
    // numerical claims when the presentation is supposed to
    // be based on supplied file/URL material.
    //
    // =====================================================

    validateSourceSensitiveClaims(
        presentation,
        source,
        errors
    );


    // =====================================================
    // THROW IF INVALID
    // =====================================================

    if (
        errors.length > 0
    ) {

        const formattedErrors =
            errors
                .slice(0, 25)
                .map(
                    (error, index) =>
                        `${index + 1}. ${error}`
                )
                .join("\n");


        const additionalErrors =
            errors.length > 25
                ? `\n...and ${errors.length - 25} additional validation error(s).`
                : "";


        throw new Error(
            `Generated presentation failed content validation:\n${formattedErrors}${additionalErrors}`
        );

    }


    return true;

};


// =========================================================
// VALIDATE INDIVIDUAL SLIDE
// =========================================================

const validateSlide = (
    slide,
    index,
    errors
) => {

    const slideNumber =
        slide?.slideNumber ||
        index + 1;


    const prefix =
        `Slide ${slideNumber}`;


    if (
        !slide ||
        typeof slide !== "object" ||
        Array.isArray(slide)
    ) {

        errors.push(
            `${prefix} is not a valid slide object`
        );

        return;

    }


    // =====================================================
    // SLIDE TYPE
    // =====================================================

    if (
        !isNonEmptyString(
            slide.slideType
        )
    ) {

        errors.push(
            `${prefix} does not have a valid slideType`
        );

        return;

    }


    if (
        !Object.prototype.hasOwnProperty.call(
            SLIDE_TYPE_CONTENT_MAP,
            slide.slideType
        )
    ) {

        errors.push(
            `${prefix} uses unsupported slideType "${slide.slideType}"`
        );

        return;

    }


    // =====================================================
    // TITLE / SUBTITLE
    // =====================================================

    validateWordLimit(
        slide.title,
        HARD_WORD_LIMITS.slideTitle,
        `${prefix} title`,
        errors
    );


    validateWordLimit(
        slide.subtitle,
        HARD_WORD_LIMITS.slideSubtitle,
        `${prefix} subtitle`,
        errors
    );


    // =====================================================
    // CONTENT OBJECT
    // =====================================================

    if (
        !slide.content ||
        typeof slide.content !== "object" ||
        Array.isArray(slide.content)
    ) {

        errors.push(
            `${prefix} does not contain a valid content object`
        );

        return;

    }


    // =====================================================
    // SEMANTIC COMPATIBILITY
    // =====================================================

    const bodyCollections = {
        items: slide.content.items, cards: slide.content.cards,
        'process.steps': slide.content.process?.steps, 'timeline.events': slide.content.timeline?.events,
        'roadmap.phases': slide.content.roadmap?.phases
    };
    for (const [field, entries] of Object.entries(bodyCollections)) {
        if (Array.isArray(entries)) entries.forEach((item, i) => {
            if (!isNonEmptyString(item?.description)) errors.push(`${prefix} content.${field}[${i}].description must contain meaningful text`);
        });
    }
    if (slide.content.textContent && !isNonEmptyString(slide.content.textContent.body)) {
        errors.push(`${prefix} content.textContent.body must contain meaningful text`);
    }

    validateSlideTypeCompatibility(
        slide,
        prefix,
        errors
    );


    // =====================================================
    // MINIMUM USEFUL CONTENT
    // =====================================================

    validateMinimumUsefulContent(
        slide,
        index,
        errors
    );


    // =====================================================
    // CONTENT STRUCTURES
    // =====================================================

    validateTitleContent(
        slide.content.titleContent,
        prefix,
        errors
    );


    validateSectionContent(
        slide.content.sectionContent,
        prefix,
        errors
    );


    validateItems(
        slide.content.items,
        prefix,
        errors
    );


    validateTextContent(
        slide.content.textContent,
        prefix,
        errors
    );


    validateVisualContent(
        slide.content.visualContent,
        prefix,
        errors
    );


    validateCards(
        slide.content.cards,
        prefix,
        errors
    );


    validateComparison(
        slide.content.comparison,
        prefix,
        errors
    );


    validateRelationship(
        slide.content.relationship,
        prefix,
        errors
    );


    validateProcess(
        slide.content.process,
        prefix,
        errors
    );


    validateTimeline(
        slide.content.timeline,
        prefix,
        errors
    );


    validateRoadmap(
        slide.content.roadmap,
        prefix,
        errors
    );


    validateStatistics(
        slide.content.statistics,
        prefix,
        errors
    );


    validateChart(
        slide.content.chart,
        prefix,
        errors
    );


    validateTable(
        slide.content.table,
        prefix,
        errors
    );


    validateQuote(
        slide.content.quote,
        prefix,
        errors
    );


    validateCaseStudy(
        slide.content.caseStudy,
        prefix,
        errors
    );


    validateCallToAction(
        slide.content.callToAction,
        prefix,
        errors
    );


    validateSummary(
        slide.content.summary,
        prefix,
        errors
    );


    validateConclusion(
        slide.content.conclusion,
        prefix,
        errors
    );


    // =====================================================
    // TOTAL SLIDE DENSITY
    // =====================================================

    const slideWordCount =
        countWordsInValue(
            slide
        );


    if (
        slideWordCount >
        HARD_SLIDE_WORD_LIMIT
    ) {

        errors.push(
            `${prefix} contains approximately ${slideWordCount} visible words. Hard limit is ${HARD_SLIDE_WORD_LIMIT}.`
        );

    }

};


// =========================================================
// SLIDE TYPE / CONTENT COMPATIBILITY
// =========================================================

const validateSlideTypeCompatibility = (
    slide,
    prefix,
    errors
) => {

    const content =
        slide.content || {};


    const slideType =
        slide.slideType;


    const expectedKey =
        SLIDE_TYPE_CONTENT_MAP[
            slideType
        ];


    if (!expectedKey) {
        return;
    }


    // =====================================================
    // FIND POPULATED RECOGNIZED STRUCTURES
    // =====================================================

    const populatedKeys =
        Object.keys(content)
            .filter(
                (key) =>
                    RECOGNIZED_CONTENT_KEYS.has(
                        key
                    ) &&
                    hasMeaningfulContent(
                        content[key]
                    )
            );


    // =====================================================
    // EXPECTED STRUCTURE MUST EXIST
    // =====================================================

    if (
        !hasMeaningfulContent(
            content[expectedKey]
        )
    ) {

        errors.push(
            `${prefix} uses slideType "${slideType}" but does not contain expected content.${expectedKey}`
        );

    }


    // =====================================================
    // OTHER STRUCTURES MUST NOT BE POPULATED
    // =====================================================

    const incompatible =
        populatedKeys.filter(
            (key) =>
                key !== expectedKey
        );


    if (
        incompatible.length > 0
    ) {

        errors.push(
            `${prefix} uses slideType "${slideType}" but also contains incompatible populated content: ${incompatible.join(", ")}`
        );

    }


    // =====================================================
    // UNKNOWN POPULATED CONTENT KEYS
    // =====================================================

    const unknownPopulatedKeys =
        Object.keys(content)
            .filter(
                (key) =>
                    !RECOGNIZED_CONTENT_KEYS.has(
                        key
                    ) &&
                    hasMeaningfulContent(
                        content[key]
                    )
            );


    if (
        unknownPopulatedKeys.length > 0
    ) {

        errors.push(
            `${prefix} contains unsupported content structure(s): ${unknownPopulatedKeys.join(", ")}`
        );

    }

};


// =========================================================
// MINIMUM USEFUL CONTENT
// =========================================================

const validateMinimumUsefulContent = (
    slide,
    index,
    errors
) => {

    const slideType =
        slide?.slideType;


    const rules =
        MINIMUM_USEFUL_CONTENT_RULES[
            slideType
        ];


    if (!rules) {
        return;
    }


    const expectedKey =
        SLIDE_TYPE_CONTENT_MAP[
            slideType
        ];


    const meaningfulItems =
        countMeaningfulContentItems(
            expectedKey,
            slide?.content?.[
                expectedKey
            ]
        );


    if (
        meaningfulItems <
        rules.minMeaningfulItems
    ) {

        errors.push(
            `Slide ${slide?.slideNumber || index + 1} (${slideType}) does not contain enough meaningful content. Expected at least ${rules.minMeaningfulItems} meaningful content item(s), but found ${meaningfulItems}.`
        );

    }

};


// =========================================================
// COUNT MEANINGFUL CONTENT ITEMS
// =========================================================

const countMeaningfulContentItems = (
    key,
    value
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return 0;
    }


    // =====================================================
    // TITLE CONTENT
    // =====================================================

    if (
        key === "titleContent"
    ) {

        return countTruthy([
            value?.title,
            value?.subtitle,
            value?.supportingText
        ]);

    }


    // =====================================================
    // SECTION CONTENT
    // =====================================================

    if (
        key === "sectionContent"
    ) {

        return countTruthy([
            value?.title,
            value?.subtitle
        ]);

    }


    // =====================================================
    // GENERIC ITEMS
    // =====================================================

    if (
        key === "items"
    ) {

        if (!Array.isArray(value)) {
            return 0;
        }


        return value.filter(
            (item) =>
                item &&
                (
                    hasMeaningfulText(
                        item.title
                    ) ||
                    hasMeaningfulText(
                        item.description
                    )
                )
        ).length;

    }


    // =====================================================
    // TEXT CONTENT
    // =====================================================

    if (
        key === "textContent"
    ) {

        return countTruthy([
            value?.heading,
            value?.body
        ]);

    }


    // =====================================================
    // VISUAL CONTENT
    // =====================================================

    if (
        key === "visualContent"
    ) {

        let count = 0;


        if (
            hasMeaningfulText(
                value?.text
            )
        ) {
            count += 1;
        }


        if (
            value?.visual &&
            (
                hasMeaningfulText(
                    value.visual.description
                ) ||
                hasMeaningfulText(
                    value.visual.searchQuery
                )
            )
        ) {
            count += 1;
        }


        return count;

    }


    // =====================================================
    // CARDS
    // =====================================================

    if (
        key === "cards"
    ) {

        if (!Array.isArray(value)) {
            return 0;
        }


        return value.filter(
            (card) =>
                card &&
                (
                    hasMeaningfulText(
                        card.title
                    ) ||
                    hasMeaningfulText(
                        card.description
                    )
                )
        ).length;

    }


    // =====================================================
    // COMPARISON
    // =====================================================

    if (
        key === "comparison"
    ) {

        if (
            !Array.isArray(
                value?.items
            )
        ) {
            return 0;
        }


        return value.items.filter(
            (item) =>
                item &&
                (
                    hasMeaningfulText(
                        item.label
                    ) ||
                    (
                        Array.isArray(
                            item.points
                        ) &&
                        item.points.some(
                            hasMeaningfulText
                        )
                    )
                )
        ).length;

    }


    // =====================================================
    // RELATIONSHIP
    // =====================================================

    if (
        key === "relationship"
    ) {

        const nodes =
            Array.isArray(
                value?.nodes
            )
                ? value.nodes
                : [];


        return nodes.filter(
            (node) =>
                node &&
                (
                    hasMeaningfulText(
                        node.label
                    ) ||
                    hasMeaningfulText(
                        node.description
                    )
                )
        ).length;

    }


    // =====================================================
    // PROCESS
    // =====================================================

    if (
        key === "process"
    ) {

        if (
            !Array.isArray(
                value?.steps
            )
        ) {
            return 0;
        }


        return value.steps.filter(
            (step) =>
                step &&
                (
                    hasMeaningfulText(
                        step.title
                    ) ||
                    hasMeaningfulText(
                        step.description
                    )
                )
        ).length;

    }


    // =====================================================
    // TIMELINE
    // =====================================================

    if (
        key === "timeline"
    ) {

        if (
            !Array.isArray(
                value?.events
            )
        ) {
            return 0;
        }


        return value.events.filter(
            (event) =>
                event &&
                (
                    hasMeaningfulText(
                        event.label
                    ) ||
                    hasMeaningfulText(
                        event.title
                    ) ||
                    hasMeaningfulText(
                        event.description
                    )
                )
        ).length;

    }


    // =====================================================
    // ROADMAP
    // =====================================================

    if (
        key === "roadmap"
    ) {

        if (
            !Array.isArray(
                value?.phases
            )
        ) {
            return 0;
        }


        return value.phases.filter(
            (phase) =>
                phase &&
                (
                    hasMeaningfulText(
                        phase.label
                    ) ||
                    hasMeaningfulText(
                        phase.title
                    ) ||
                    hasMeaningfulText(
                        phase.description
                    )
                )
        ).length;

    }


    // =====================================================
    // STATISTICS
    // =====================================================

    if (
        key === "statistics"
    ) {

        if (!Array.isArray(value)) {
            return 0;
        }


        return value.filter(
            (statistic) =>
                statistic &&
                (
                    hasMeaningfulText(
                        statistic.value
                    ) ||
                    hasMeaningfulText(
                        statistic.label
                    ) ||
                    hasMeaningfulText(
                        statistic.context
                    )
                )
        ).length;

    }


    // =====================================================
    // CHART
    // =====================================================

    if (
        key === "chart"
    ) {

        const hasLabels =
            Array.isArray(
                value?.labels
            ) &&
            value.labels.length > 0;


        const hasDatasetValues =
            Array.isArray(
                value?.datasets
            ) &&
            value.datasets.some(
                (dataset) =>
                    Array.isArray(
                        dataset?.values
                    ) &&
                    dataset.values.length > 0
            );


        let count = 0;


        if (
            hasLabels &&
            hasDatasetValues
        ) {
            count += 1;
        }


        if (
            hasMeaningfulText(
                value?.insight
            )
        ) {
            count += 1;
        }


        return count;

    }


    // =====================================================
    // TABLE
    // =====================================================

    if (
        key === "table"
    ) {

        let count = 0;


        if (
            Array.isArray(
                value?.columns
            ) &&
            value.columns.some(
                hasMeaningfulText
            )
        ) {
            count += 1;
        }


        if (
            Array.isArray(
                value?.rows
            )
        ) {

            count +=
                value.rows.filter(
                    (row) =>
                        Array.isArray(
                            row?.cells
                        ) &&
                        row.cells.some(
                            hasMeaningfulText
                        )
                ).length;

        }


        return count;

    }


    // =====================================================
    // QUOTE
    // =====================================================

    if (
        key === "quote"
    ) {

        return countTruthy([
            value?.text,
            value?.attribution,
            value?.context
        ]);

    }


    // =====================================================
    // CASE STUDY
    // =====================================================

    if (
        key === "caseStudy"
    ) {

        return countTruthy([
            value?.context,
            value?.challenge,
            value?.action,
            value?.outcome,
            value?.lesson
        ]);

    }


    // =====================================================
    // CALL TO ACTION
    // =====================================================

    if (
        key === "callToAction"
    ) {

        return countTruthy([
            value?.action,
            value?.supportingText
        ]);

    }


    // =====================================================
    // SUMMARY
    // =====================================================

    if (
        key === "summary"
    ) {

        let count =
            hasMeaningfulText(
                value?.statement
            )
                ? 1
                : 0;


        if (
            Array.isArray(
                value?.points
            )
        ) {

            count +=
                value.points.filter(
                    hasMeaningfulText
                ).length;

        }


        return count;

    }


    // =====================================================
    // CONCLUSION
    // =====================================================

    if (
        key === "conclusion"
    ) {

        let count =
            hasMeaningfulText(
                value?.statement
            )
                ? 1
                : 0;


        if (
            Array.isArray(
                value?.supportingPoints
            )
        ) {

            count +=
                value.supportingPoints.filter(
                    hasMeaningfulText
                ).length;

        }


        return count;

    }


    return 0;

};


// =========================================================
// TITLE CONTENT
// =========================================================

const validateTitleContent = (
    titleContent,
    prefix,
    errors
) => {

    if (!titleContent) {
        return;
    }


    validatePlainObject(
        titleContent,
        `${prefix} titleContent`,
        errors
    );


    validateWordLimit(
        titleContent.title,
        HARD_WORD_LIMITS.titleContentTitle,
        `${prefix} titleContent.title`,
        errors
    );


    validateWordLimit(
        titleContent.subtitle,
        HARD_WORD_LIMITS.titleContentSubtitle,
        `${prefix} titleContent.subtitle`,
        errors
    );


    validateWordLimit(
        titleContent.supportingText,
        HARD_WORD_LIMITS.titleSupportingText,
        `${prefix} titleContent.supportingText`,
        errors
    );

};


// =========================================================
// SECTION CONTENT
// =========================================================

const validateSectionContent = (
    sectionContent,
    prefix,
    errors
) => {

    if (!sectionContent) {
        return;
    }


    validatePlainObject(
        sectionContent,
        `${prefix} sectionContent`,
        errors
    );


    validateWordLimit(
        sectionContent.title,
        HARD_WORD_LIMITS.sectionTitle,
        `${prefix} sectionContent.title`,
        errors
    );


    validateWordLimit(
        sectionContent.subtitle,
        HARD_WORD_LIMITS.sectionSubtitle,
        `${prefix} sectionContent.subtitle`,
        errors
    );

};


// =========================================================
// GENERIC ITEMS
// =========================================================
//
// Used by:
//
// agenda
// key-points
// recommendation
// next-steps
//
// =========================================================

const validateItems = (
    items,
    prefix,
    errors
) => {

    if (!items) {
        return;
    }


    if (!Array.isArray(items)) {

        errors.push(
            `${prefix} items must be an array`
        );

        return;

    }


    validateCollectionLimit(
        items,
        HARD_COLLECTION_LIMITS.items,
        `${prefix} items`,
        errors
    );


    items.forEach(
        (item, index) => {

            if (
                !item ||
                typeof item !== "object" ||
                Array.isArray(item)
            ) {

                errors.push(
                    `${prefix} item ${index + 1} must be an object`
                );

                return;

            }


            validateWordLimit(
                item.title,
                HARD_WORD_LIMITS.itemTitle,
                `${prefix} item ${index + 1} title`,
                errors
            );


            validateWordLimit(
                item.description,
                HARD_WORD_LIMITS.itemDescription,
                `${prefix} item ${index + 1} description`,
                errors
            );

        }
    );

};


// =========================================================
// TEXT CONTENT
// =========================================================

const validateTextContent = (
    textContent,
    prefix,
    errors
) => {

    if (!textContent) {
        return;
    }


    validatePlainObject(
        textContent,
        `${prefix} textContent`,
        errors
    );


    validateWordLimit(
        textContent.heading,
        HARD_WORD_LIMITS.textHeading,
        `${prefix} textContent.heading`,
        errors
    );


    validateWordLimit(
        textContent.body,
        HARD_WORD_LIMITS.textBody,
        `${prefix} textContent.body`,
        errors
    );

};


// =========================================================
// VISUAL CONTENT
// =========================================================

const validateVisualContent = (
    visualContent,
    prefix,
    errors
) => {

    if (!visualContent) {
        return;
    }


    validatePlainObject(
        visualContent,
        `${prefix} visualContent`,
        errors
    );


    validateWordLimit(
        visualContent.text,
        HARD_WORD_LIMITS.visualText,
        `${prefix} visualContent.text`,
        errors
    );


    if (
        visualContent.visual
    ) {

        validatePlainObject(
            visualContent.visual,
            `${prefix} visualContent.visual`,
            errors
        );


        validateWordLimit(
            visualContent.visual.type,
            HARD_WORD_LIMITS.visualType,
            `${prefix} visualContent.visual.type`,
            errors
        );


        validateWordLimit(
            visualContent.visual.description,
            HARD_WORD_LIMITS.visualDescription,
            `${prefix} visualContent.visual.description`,
            errors
        );


        validateWordLimit(
            visualContent.visual.searchQuery,
            HARD_WORD_LIMITS.visualSearchQuery,
            `${prefix} visualContent.visual.searchQuery`,
            errors
        );

    }

};


// =========================================================
// CARDS
// =========================================================

const validateCards = (
    cards,
    prefix,
    errors
) => {

    if (!cards) {
        return;
    }


    if (!Array.isArray(cards)) {

        errors.push(
            `${prefix} cards must be an array`
        );

        return;

    }


    validateCollectionLimit(
        cards,
        HARD_COLLECTION_LIMITS.cards,
        `${prefix} cards`,
        errors
    );


    cards.forEach(
        (card, index) => {

            validateWordLimit(
                card?.title,
                HARD_WORD_LIMITS.cardTitle,
                `${prefix} card ${index + 1} title`,
                errors
            );


            validateWordLimit(
                card?.description,
                HARD_WORD_LIMITS.cardDescription,
                `${prefix} card ${index + 1} description`,
                errors
            );

        }
    );

};


// =========================================================
// COMPARISON
// =========================================================

const validateComparison = (
    comparison,
    prefix,
    errors
) => {

    if (!comparison) {
        return;
    }


    const items =
        comparison.items;


    if (!Array.isArray(items)) {

        errors.push(
            `${prefix} comparison.items must be an array`
        );

        return;

    }


    validateCollectionLimit(
        items,
        HARD_COLLECTION_LIMITS.comparisonItems,
        `${prefix} comparison items`,
        errors
    );


    items.forEach(
        (item, index) => {

            validateWordLimit(
                item?.label,
                HARD_WORD_LIMITS.comparisonLabel,
                `${prefix} comparison item ${index + 1} label`,
                errors
            );


            if (
                !Array.isArray(
                    item?.points
                )
            ) {

                errors.push(
                    `${prefix} comparison item ${index + 1} points must be an array`
                );

                return;

            }


            validateCollectionLimit(
                item.points,
                HARD_COLLECTION_LIMITS.comparisonPointsPerItem,
                `${prefix} comparison item ${index + 1} points`,
                errors
            );


            item.points.forEach(
                (point, pointIndex) => {

                    validateWordLimit(
                        point,
                        HARD_WORD_LIMITS.comparisonPoint,
                        `${prefix} comparison item ${index + 1} point ${pointIndex + 1}`,
                        errors
                    );

                }
            );

        }
    );

};


// =========================================================
// RELATIONSHIP
// =========================================================

const validateRelationship = (
    relationship,
    prefix,
    errors
) => {

    if (!relationship) {
        return;
    }


    const nodes =
        relationship.nodes;


    const relationships =
        relationship.relationships;


    if (!Array.isArray(nodes)) {

        errors.push(
            `${prefix} relationship.nodes must be an array`
        );

    } else {

        validateCollectionLimit(
            nodes,
            HARD_COLLECTION_LIMITS.relationshipNodes,
            `${prefix} relationship nodes`,
            errors
        );


        const nodeIds =
            new Set();


        nodes.forEach(
            (node, index) => {

                validateWordLimit(
                    node?.id,
                    HARD_WORD_LIMITS.relationshipNodeId,
                    `${prefix} relationship node ${index + 1} id`,
                    errors
                );


                validateWordLimit(
                    node?.label,
                    HARD_WORD_LIMITS.relationshipLabel,
                    `${prefix} relationship node ${index + 1} label`,
                    errors
                );


                validateWordLimit(
                    node?.description,
                    HARD_WORD_LIMITS.relationshipDescription,
                    `${prefix} relationship node ${index + 1} description`,
                    errors
                );


                if (
                    isNonEmptyString(
                        node?.id
                    )
                ) {

                    if (
                        nodeIds.has(
                            node.id
                        )
                    ) {

                        errors.push(
                            `${prefix} contains duplicate relationship node id "${node.id}"`
                        );

                    }


                    nodeIds.add(
                        node.id
                    );

                }

            }
        );


        if (
            Array.isArray(
                relationships
            )
        ) {

            relationships.forEach(
                (edge, index) => {

                    if (
                        isNonEmptyString(
                            edge?.from
                        ) &&
                        !nodeIds.has(
                            edge.from
                        )
                    ) {

                        errors.push(
                            `${prefix} relationship ${index + 1} references unknown "from" node "${edge.from}"`
                        );

                    }


                    if (
                        isNonEmptyString(
                            edge?.to
                        ) &&
                        !nodeIds.has(
                            edge.to
                        )
                    ) {

                        errors.push(
                            `${prefix} relationship ${index + 1} references unknown "to" node "${edge.to}"`
                        );

                    }

                }
            );

        }

    }


    if (
        !Array.isArray(
            relationships
        )
    ) {

        errors.push(
            `${prefix} relationship.relationships must be an array`
        );

        return;

    }


    validateCollectionLimit(
        relationships,
        HARD_COLLECTION_LIMITS.relationships,
        `${prefix} relationships`,
        errors
    );


    relationships.forEach(
        (edge, index) => {

            validateWordLimit(
                edge?.label,
                HARD_WORD_LIMITS.relationshipEdgeLabel,
                `${prefix} relationship ${index + 1} label`,
                errors
            );

        }
    );

};


// =========================================================
// PROCESS
// =========================================================

const validateProcess = (
    process,
    prefix,
    errors
) => {

    if (!process) {
        return;
    }


    const steps =
        process.steps;


    if (!Array.isArray(steps)) {

        errors.push(
            `${prefix} process.steps must be an array`
        );

        return;

    }


    validateCollectionLimit(
        steps,
        HARD_COLLECTION_LIMITS.processSteps,
        `${prefix} process steps`,
        errors
    );


    steps.forEach(
        (step, index) => {

            if (
                step?.stepNumber !==
                    undefined &&
                (
                    !Number.isInteger(
                        step.stepNumber
                    ) ||
                    step.stepNumber < 1
                )
            ) {

                errors.push(
                    `${prefix} process step ${index + 1} stepNumber must be a positive integer`
                );

            }


            validateWordLimit(
                step?.title,
                HARD_WORD_LIMITS.processTitle,
                `${prefix} process step ${index + 1} title`,
                errors
            );


            validateWordLimit(
                step?.description,
                HARD_WORD_LIMITS.processDescription,
                `${prefix} process step ${index + 1} description`,
                errors
            );

        }
    );

};


// =========================================================
// TIMELINE
// =========================================================

const validateTimeline = (
    timeline,
    prefix,
    errors
) => {

    if (!timeline) {
        return;
    }


    const events =
        timeline.events;


    if (!Array.isArray(events)) {

        errors.push(
            `${prefix} timeline.events must be an array`
        );

        return;

    }


    validateCollectionLimit(
        events,
        HARD_COLLECTION_LIMITS.timelineEvents,
        `${prefix} timeline events`,
        errors
    );


    events.forEach(
        (event, index) => {

            validateWordLimit(
                event?.label,
                HARD_WORD_LIMITS.timelineLabel,
                `${prefix} timeline event ${index + 1} label`,
                errors
            );


            validateWordLimit(
                event?.title,
                HARD_WORD_LIMITS.timelineTitle,
                `${prefix} timeline event ${index + 1} title`,
                errors
            );


            validateWordLimit(
                event?.description,
                HARD_WORD_LIMITS.timelineDescription,
                `${prefix} timeline event ${index + 1} description`,
                errors
            );

        }
    );

};


// =========================================================
// ROADMAP
// =========================================================

const validateRoadmap = (
    roadmap,
    prefix,
    errors
) => {

    if (!roadmap) {
        return;
    }


    const phases =
        roadmap.phases;


    if (!Array.isArray(phases)) {

        errors.push(
            `${prefix} roadmap.phases must be an array`
        );

        return;

    }


    validateCollectionLimit(
        phases,
        HARD_COLLECTION_LIMITS.roadmapPhases,
        `${prefix} roadmap phases`,
        errors
    );


    phases.forEach(
        (phase, index) => {

            validateWordLimit(
                phase?.label,
                HARD_WORD_LIMITS.roadmapLabel,
                `${prefix} roadmap phase ${index + 1} label`,
                errors
            );


            validateWordLimit(
                phase?.title,
                HARD_WORD_LIMITS.roadmapTitle,
                `${prefix} roadmap phase ${index + 1} title`,
                errors
            );


            validateWordLimit(
                phase?.description,
                HARD_WORD_LIMITS.roadmapDescription,
                `${prefix} roadmap phase ${index + 1} description`,
                errors
            );

        }
    );

};


// =========================================================
// STATISTICS
// =========================================================

const validateStatistics = (
    statistics,
    prefix,
    errors
) => {

    if (!statistics) {
        return;
    }


    if (!Array.isArray(statistics)) {

        errors.push(
            `${prefix} statistics must be an array`
        );

        return;

    }


    validateCollectionLimit(
        statistics,
        HARD_COLLECTION_LIMITS.statistics,
        `${prefix} statistics`,
        errors
    );


    statistics.forEach(
        (statistic, index) => {

            validateWordLimit(
                statistic?.value,
                HARD_WORD_LIMITS.statisticValue,
                `${prefix} statistic ${index + 1} value`,
                errors
            );


            validateWordLimit(
                statistic?.label,
                HARD_WORD_LIMITS.statisticLabel,
                `${prefix} statistic ${index + 1} label`,
                errors
            );


            validateWordLimit(
                statistic?.context,
                HARD_WORD_LIMITS.statisticContext,
                `${prefix} statistic ${index + 1} context`,
                errors
            );

        }
    );

};


// =========================================================
// CHART
// =========================================================

const validateChart = (
    chart,
    prefix,
    errors
) => {

    if (!chart) {
        return;
    }


    validateWordLimit(
        chart.chartType,
        HARD_WORD_LIMITS.chartType,
        `${prefix} chart type`,
        errors
    );


    if (
        !Array.isArray(
            chart.labels
        )
    ) {

        errors.push(
            `${prefix} chart.labels must be an array`
        );

    } else {

        validateCollectionLimit(
            chart.labels,
            HARD_COLLECTION_LIMITS.chartLabels,
            `${prefix} chart labels`,
            errors
        );


        chart.labels.forEach(
            (label, index) => {

                validateWordLimit(
                    label,
                    HARD_WORD_LIMITS.chartLabel,
                    `${prefix} chart label ${index + 1}`,
                    errors
                );

            }
        );

    }


    if (
        !Array.isArray(
            chart.datasets
        )
    ) {

        errors.push(
            `${prefix} chart.datasets must be an array`
        );

    } else {

        validateCollectionLimit(
            chart.datasets,
            HARD_COLLECTION_LIMITS.chartDatasets,
            `${prefix} chart datasets`,
            errors
        );


        chart.datasets.forEach(
            (dataset, index) => {

                validateWordLimit(
                    dataset?.label,
                    HARD_WORD_LIMITS.chartDatasetLabel,
                    `${prefix} chart dataset ${index + 1} label`,
                    errors
                );


                if (
                    !Array.isArray(
                        dataset?.values
                    )
                ) {

                    errors.push(
                        `${prefix} chart dataset ${index + 1} values must be an array`
                    );

                    return;

                }


                const invalidValue =
                    dataset.values.find(
                        (value) =>
                            typeof value !==
                                "number" ||
                            !Number.isFinite(
                                value
                            )
                    );


                if (
                    invalidValue !==
                    undefined
                ) {

                    errors.push(
                        `${prefix} chart dataset ${index + 1} contains a non-numeric value`
                    );

                }


                if (
                    Array.isArray(
                        chart.labels
                    ) &&
                    chart.labels.length !==
                        dataset.values.length
                ) {

                    errors.push(
                        `${prefix} chart dataset ${index + 1} contains ${dataset.values.length} values but chart has ${chart.labels.length} labels`
                    );

                }

            }
        );

    }


    validateWordLimit(
        chart.insight,
        HARD_WORD_LIMITS.chartInsight,
        `${prefix} chart insight`,
        errors
    );

};


// =========================================================
// TABLE
// =========================================================

const validateTable = (
    table,
    prefix,
    errors
) => {

    if (!table) {
        return;
    }


    if (
        !Array.isArray(
            table.columns
        )
    ) {

        errors.push(
            `${prefix} table.columns must be an array`
        );

    } else {

        validateCollectionLimit(
            table.columns,
            HARD_COLLECTION_LIMITS.tableColumns,
            `${prefix} table columns`,
            errors
        );


        table.columns.forEach(
            (column, index) => {

                validateWordLimit(
                    column,
                    HARD_WORD_LIMITS.tableColumn,
                    `${prefix} table column ${index + 1}`,
                    errors
                );

            }
        );

    }


    if (
        !Array.isArray(
            table.rows
        )
    ) {

        errors.push(
            `${prefix} table.rows must be an array`
        );

        return;

    }


    validateCollectionLimit(
        table.rows,
        HARD_COLLECTION_LIMITS.tableRows,
        `${prefix} table rows`,
        errors
    );


    table.rows.forEach(
        (row, rowIndex) => {

            if (
                !Array.isArray(
                    row?.cells
                )
            ) {

                errors.push(
                    `${prefix} table row ${rowIndex + 1} cells must be an array`
                );

                return;

            }


            if (
                Array.isArray(
                    table.columns
                ) &&
                table.columns.length > 0 &&
                row.cells.length !==
                    table.columns.length
            ) {

                errors.push(
                    `${prefix} table row ${rowIndex + 1} contains ${row.cells.length} cells but table has ${table.columns.length} columns`
                );

            }


            row.cells.forEach(
                (cell, cellIndex) => {

                    validateWordLimit(
                        cell,
                        HARD_WORD_LIMITS.tableCell,
                        `${prefix} table row ${rowIndex + 1} cell ${cellIndex + 1}`,
                        errors
                    );

                }
            );

        }
    );

};


// =========================================================
// QUOTE
// =========================================================

const validateQuote = (
    quote,
    prefix,
    errors
) => {

    if (!quote) {
        return;
    }


    validateWordLimit(
        quote.text,
        HARD_WORD_LIMITS.quoteText,
        `${prefix} quote text`,
        errors
    );


    validateWordLimit(
        quote.attribution,
        HARD_WORD_LIMITS.quoteAttribution,
        `${prefix} quote attribution`,
        errors
    );


    validateWordLimit(
        quote.context,
        HARD_WORD_LIMITS.quoteContext,
        `${prefix} quote context`,
        errors
    );

};


// =========================================================
// CASE STUDY
// =========================================================

const validateCaseStudy = (
    caseStudy,
    prefix,
    errors
) => {

    if (!caseStudy) {
        return;
    }


    validatePlainObject(
        caseStudy,
        `${prefix} caseStudy`,
        errors
    );


    validateWordLimit(
        caseStudy.context,
        HARD_WORD_LIMITS.caseContext,
        `${prefix} caseStudy.context`,
        errors
    );


    validateWordLimit(
        caseStudy.challenge,
        HARD_WORD_LIMITS.caseChallenge,
        `${prefix} caseStudy.challenge`,
        errors
    );


    validateWordLimit(
        caseStudy.action,
        HARD_WORD_LIMITS.caseAction,
        `${prefix} caseStudy.action`,
        errors
    );


    validateWordLimit(
        caseStudy.outcome,
        HARD_WORD_LIMITS.caseOutcome,
        `${prefix} caseStudy.outcome`,
        errors
    );


    validateWordLimit(
        caseStudy.lesson,
        HARD_WORD_LIMITS.caseLesson,
        `${prefix} caseStudy.lesson`,
        errors
    );

};


// =========================================================
// CALL TO ACTION
// =========================================================

const validateCallToAction = (
    callToAction,
    prefix,
    errors
) => {

    if (!callToAction) {
        return;
    }


    validatePlainObject(
        callToAction,
        `${prefix} callToAction`,
        errors
    );


    validateWordLimit(
        callToAction.action,
        HARD_WORD_LIMITS.ctaAction,
        `${prefix} CTA action`,
        errors
    );


    validateWordLimit(
        callToAction.supportingText,
        HARD_WORD_LIMITS.ctaSupportingText,
        `${prefix} CTA supporting text`,
        errors
    );

};


// =========================================================
// SUMMARY
// =========================================================

const validateSummary = (
    summary,
    prefix,
    errors
) => {

    if (!summary) {
        return;
    }


    validatePlainObject(
        summary,
        `${prefix} summary`,
        errors
    );


    validateWordLimit(
        summary.statement,
        HARD_WORD_LIMITS.summaryStatement,
        `${prefix} summary statement`,
        errors
    );


    if (
        summary.points !== undefined &&
        !Array.isArray(
            summary.points
        )
    ) {

        errors.push(
            `${prefix} summary.points must be an array`
        );

        return;

    }


    if (
        Array.isArray(
            summary.points
        )
    ) {

        validateCollectionLimit(
            summary.points,
            HARD_COLLECTION_LIMITS.summaryPoints,
            `${prefix} summary points`,
            errors
        );


        summary.points.forEach(
            (point, index) => {

                validateWordLimit(
                    point,
                    HARD_WORD_LIMITS.summaryPoint,
                    `${prefix} summary point ${index + 1}`,
                    errors
                );

            }
        );

    }

};


// =========================================================
// CONCLUSION
// =========================================================

const validateConclusion = (
    conclusion,
    prefix,
    errors
) => {

    if (!conclusion) {
        return;
    }


    validatePlainObject(
        conclusion,
        `${prefix} conclusion`,
        errors
    );


    validateWordLimit(
        conclusion.statement,
        HARD_WORD_LIMITS.conclusionStatement,
        `${prefix} conclusion statement`,
        errors
    );


    if (
        conclusion.supportingPoints !==
            undefined &&
        !Array.isArray(
            conclusion.supportingPoints
        )
    ) {

        errors.push(
            `${prefix} conclusion.supportingPoints must be an array`
        );

        return;

    }


    if (
        Array.isArray(
            conclusion.supportingPoints
        )
    ) {

        validateCollectionLimit(
            conclusion.supportingPoints,
            HARD_COLLECTION_LIMITS.conclusionPoints,
            `${prefix} conclusion supporting points`,
            errors
        );


        conclusion.supportingPoints.forEach(
            (point, index) => {

                validateWordLimit(
                    point,
                    HARD_WORD_LIMITS.conclusionPoint,
                    `${prefix} conclusion supporting point ${index + 1}`,
                    errors
                );

            }
        );

    }

};


// =========================================================
// PRESENTATION DENSITY
// =========================================================

const validatePresentationDensity = (
    slides,
    errors
) => {

    if (
        !Array.isArray(slides) ||
        slides.length === 0
    ) {
        return;
    }


    const totalWords =
        slides.reduce(
            (total, slide) =>
                total +
                countWordsInValue(
                    slide
                ),
            0
        );


    const average =
        Math.round(
            totalWords /
            slides.length
        );


    if (
        average >
        HARD_PRESENTATION_AVERAGE_WORD_LIMIT
    ) {

        errors.push(
            `Presentation averages approximately ${average} visible words per slide. Hard average limit is ${HARD_PRESENTATION_AVERAGE_WORD_LIMIT}.`
        );

    }

};


// =========================================================
// DUPLICATE SLIDES
// =========================================================

const validateDuplicateSlides = (
    slides,
    errors
) => {

    const fingerprints =
        new Map();


    slides.forEach(
        (slide, index) => {

            const fingerprint =
                normalizeText(
                    [
                        slide?.title || "",
                        extractText(
                            slide?.content
                        )
                    ]
                        .join(" ")
                );


            if (
                fingerprint.length < 30
            ) {
                return;
            }


            if (
                fingerprints.has(
                    fingerprint
                )
            ) {

                const previousSlide =
                    fingerprints.get(
                        fingerprint
                    );


                errors.push(
                    `Slide ${index + 1} substantially duplicates slide ${previousSlide}`
                );

            } else {

                fingerprints.set(
                    fingerprint,
                    index + 1
                );

            }

        }
    );

};


// =========================================================
// REPETITION DETECTION
// =========================================================

const validateRepetition = (
    presentation,
    errors
) => {

    const strings =
        collectStrings(
            presentation
        );


    strings.forEach(
        ({ path, value }) => {

            const words =
                tokenize(
                    value
                );


            if (
                words.length <
                MIN_REPETITION_PHRASE_LENGTH *
                MAX_IDENTICAL_PHRASE_OCCURRENCES
            ) {
                return;
            }


            const phraseCounts =
                new Map();


            for (
                let phraseLength =
                    MIN_REPETITION_PHRASE_LENGTH;
                phraseLength <= 6;
                phraseLength++
            ) {

                if (
                    words.length <
                    phraseLength
                ) {
                    continue;
                }


                for (
                    let i = 0;
                    i <=
                    words.length -
                    phraseLength;
                    i++
                ) {

                    const phrase =
                        words
                            .slice(
                                i,
                                i +
                                phraseLength
                            )
                            .join(" ");


                    const count =
                        (
                            phraseCounts.get(
                                phrase
                            ) || 0
                        ) + 1;


                    phraseCounts.set(
                        phrase,
                        count
                    );


                    if (
                        count >
                        MAX_IDENTICAL_PHRASE_OCCURRENCES
                    ) {

                        errors.push(
                            `Excessive repeated phrase detected at ${path}: "${phrase}"`
                        );

                        return;

                    }

                }

            }

        }
    );

};


// =========================================================
// MALFORMED TEXT DETECTION
// =========================================================

const validateMalformedText = (
    presentation,
    errors
) => {

    const strings =
        collectStrings(
            presentation
        );


    strings.forEach(
        ({ path, value }) => {

            const trimmed =
                value.trim();


            if (!trimmed) {
                return;
            }


            const suspiciousToken =
                trimmed
                    .split(/\s+/)
                    .find(
                        (token) =>
                            token.length > 100
                    );


            if (suspiciousToken) {

                errors.push(
                    `Suspicious malformed text detected at ${path}`
                );

            }


            if (
                /(.)\1{12,}/i.test(
                    trimmed
                )
            ) {

                errors.push(
                    `Excessive repeated characters detected at ${path}`
                );

            }


            if (
                /[!?.,;:_-]{12,}/.test(
                    trimmed
                )
            ) {

                errors.push(
                    `Excessive punctuation repetition detected at ${path}`
                );

            }

        }
    );

};


// =========================================================
// SPEAKER NOTES DETECTION
// =========================================================

const detectForbiddenSpeakerNotes = (
    value,
    errors,
    path = "presentation"
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return;
    }


    if (
        Array.isArray(value)
    ) {

        value.forEach(
            (item, index) => {

                detectForbiddenSpeakerNotes(
                    item,
                    errors,
                    `${path}[${index}]`
                );

            }
        );

        return;

    }


    if (
        typeof value !== "object"
    ) {
        return;
    }


    Object.entries(value)
        .forEach(
            ([key, child]) => {

                const normalizedKey =
                    key
                        .toLowerCase()
                        .replace(
                            /[^a-z]/g,
                            ""
                        );


                if (
                    normalizedKey ===
                        "speakernotes" ||
                    normalizedKey ===
                        "presenternotes" ||
                    normalizedKey ===
                        "notesforpresenter" ||
                    normalizedKey ===
                        "notesforspeaker"
                ) {

                    errors.push(
                        `Forbidden speaker notes field detected at ${path}.${key}`
                    );

                    return;

                }


                detectForbiddenSpeakerNotes(
                    child,
                    errors,
                    `${path}.${key}`
                );

            }
        );

};


// =========================================================
// TOPIC CONSISTENCY
// =========================================================
//
// Semantic topic drift cannot be perfectly detected through
// lexical matching.
//
// Therefore this check is deliberately conservative.
//
// It catches severe disconnection without rejecting legitimate
// slides simply because they use different vocabulary.
//
// =========================================================

const validateTopicConsistency = (
    presentation,
    source,
    errors
) => {

    const inferredTopic =
        presentation
            ?.inferredContext
            ?.topic;


    if (
        !isNonEmptyString(
            inferredTopic
        )
    ) {
        return;
    }


    const topicTokens =
        getMeaningfulTokens(
            inferredTopic
        );


    if (
        topicTokens.length === 0
    ) {
        return;
    }


    const sourceText =
        buildSourceText(
            source
        );


    const sourceTokens =
        new Set(
            getMeaningfulTokens(
                sourceText
            )
        );


    // =====================================================
    // INFERRED TOPIC SHOULD CONNECT TO INPUT
    // =====================================================

    if (
        sourceText &&
        sourceTokens.size > 0
    ) {

        const matchingTopicTokens =
            topicTokens.filter(
                (token) =>
                    sourceTokens.has(
                        token
                    )
            );


        if (
            matchingTopicTokens.length === 0
        ) {

            errors.push(
                `Inferred presentation topic "${inferredTopic}" appears disconnected from the supplied request`
            );

        }

    }


    // =====================================================
    // PRESENTATION ANCHORS
    // =====================================================

    const anchorTokens =
        new Set([
            ...topicTokens,

            ...getMeaningfulTokens(
                presentation.title || ""
            ),

            ...getMeaningfulTokens(
                sourceText
            )
        ]);


    if (
        anchorTokens.size === 0 ||
        !Array.isArray(
            presentation.slides
        )
    ) {
        return;
    }


    // =====================================================
    // SEVERE INTERNAL TOPIC SHIFT
    // =====================================================

    presentation.slides.forEach(
        (slide, index) => {

            const slideText =
                [
                    slide?.title || "",

                    extractText(
                        slide?.content
                    )
                ]
                    .join(" ");


            const slideTokens =
                getMeaningfulTokens(
                    slideText
                );


            if (
                slideTokens.length < 12
            ) {
                return;
            }


            const uniqueSlideTokens =
                [
                    ...new Set(
                        slideTokens
                    )
                ];


            const matches =
                uniqueSlideTokens.filter(
                    (token) =>
                        anchorTokens.has(
                            token
                        )
                );


            const titleTokens =
                getMeaningfulTokens(
                    slide?.title || ""
                );


            const titleMatches =
                titleTokens.filter(
                    (token) =>
                        anchorTokens.has(
                            token
                        )
                );


            if (
                uniqueSlideTokens.length >= 25 &&
                matches.length === 0 &&
                titleMatches.length === 0
            ) {

                errors.push(
                    `Slide ${slide?.slideNumber || index + 1} may have drifted away from the presentation topic "${inferredTopic}"`
                );

            }

        }
    );

};


// =========================================================
// SOURCE-SENSITIVE CLAIM CHECKS
// =========================================================
//
// IMPORTANT:
//
// This is NOT a universal fact checker.
//
// JavaScript cannot determine whether arbitrary statements
// produced by the model are true.
//
// Instead, this catches a particularly dangerous category:
//
// source-based presentations containing numerical claims that
// appear nowhere in the supplied source.
//
// This check is limited to file/URL input because those modes
// explicitly treat supplied content as the primary factual
// source.
//
// =========================================================

const validateSourceSensitiveClaims = (
    presentation,
    source,
    errors
) => {

    const inputType =
        source?.inputType;


    if (
        inputType !== "file" &&
        inputType !== "url"
    ) {
        return;
    }


    const sourceText =
    buildSourceText(
        source
    );


if (
    !isNonEmptyString(
        sourceText
    )
) {
    return;
}

    const sourceNumbers = new Set(extractNumericClaims(sourceText));

    const strings =
        collectStrings(
            presentation
        );


    const suspiciousClaims =
        [];


    strings.forEach(
        ({ path, value }) => {

            // Ignore structural/internal metadata.

            if (
                path.endsWith(
                    ".slideType"
                ) ||
                path.endsWith(
                    ".strategyId"
                ) ||
                path.endsWith(
                    ".searchQuery"
                )
            ) {
                return;
            }


            const numbers =
                extractNumericClaims(
                    value
                );


            numbers.forEach(
                (number) => {

                    if (
                        sourceNumbers.has(
                            number
                        )
                    ) {
                        return;
                    }


                    // Ignore ordinary small sequence numbers.
                    // They frequently occur in process labels,
                    // versions, etc.

                    const numericValue =
                        Number(
                            number
                                .replace(
                                    /[%,$£€₦]/g,
                                    ""
                                )
                                .replace(
                                    /,/g,
                                    ""
                                )
                        );


                    if (
                        Number.isFinite(
                            numericValue
                        ) &&
                        Number.isInteger(
                            numericValue
                        ) &&
                        numericValue >= 0 &&
                        numericValue <= 10
                    ) {
                        return;
                    }


                    suspiciousClaims.push({
                        path,
                        number
                    });

                }
            );

        }
    );


    // =====================================================
    // KEEP THIS CONSERVATIVE
    // =====================================================
    //
    // We only reject when several unsupported numerical claims
    // appear.
    //
    // A single number may legitimately be structural or
    // explanatory.
    //
    // =====================================================

    const uniqueClaims =
        [
            ...new Map(
                suspiciousClaims.map(
                    (claim) => [
                        `${claim.path}:${claim.number}`,
                        claim
                    ]
                )
            ).values()
        ];


    if (
        uniqueClaims.length >= 3
    ) {

        const examples =
            uniqueClaims
                .slice(0, 3)
                .map(
                    (claim) =>
                        `"${claim.number}" at ${claim.path}`
                )
                .join(", ");


        errors.push(
            `Source-based presentation contains multiple numerical claims not found in the supplied source. Examples: ${examples}`
        );

    }

};


// =========================================================
// WORD LIMIT VALIDATOR
// =========================================================

const validateWordLimit = (
    value,
    limit,
    label,
    errors
) => {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return;
    }


    if (
        typeof value !== "string"
    ) {

        errors.push(
            `${label} must be a string`
        );

        return;

    }


    const count =
        countWords(
            value
        );


    if (
        count > limit
    ) {

        errors.push(
            `${label} contains approximately ${count} words. Hard limit is ${limit}.`
        );

    }

};


// =========================================================
// COLLECTION LIMIT VALIDATOR
// =========================================================

const validateCollectionLimit = (
    value,
    limit,
    label,
    errors
) => {

    if (
        !Array.isArray(value)
    ) {
        return;
    }


    if (
        value.length > limit
    ) {

        errors.push(
            `${label} contains ${value.length} items. Hard limit is ${limit}.`
        );

    }

};


// =========================================================
// PLAIN OBJECT VALIDATOR
// =========================================================

const validatePlainObject = (
    value,
    label,
    errors
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return;
    }


    if (
        typeof value !== "object" ||
        Array.isArray(value)
    ) {

        errors.push(
            `${label} must be an object`
        );

    }

};


// =========================================================
// COUNT WORDS
// =========================================================

const countWords = (
    value
) => {

    if (
        typeof value !== "string"
    ) {
        return 0;
    }


    const cleaned =
        value
            .trim()
            .replace(
                /\s+/g,
                " "
            );


    if (!cleaned) {
        return 0;
    }


    return cleaned
        .split(" ")
        .filter(Boolean)
        .length;

};


// =========================================================
// COUNT WORDS RECURSIVELY
// =========================================================
//
// Internal metadata should not contribute to visible slide
// density.
//
// =========================================================

const countWordsInValue = (
    value,
    key = ""
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return 0;
    }


    if (
        typeof value === "string"
    ) {

        const ignoredKeys =
            new Set([
                "slideType",
                "strategyId",
                "searchQuery",
                "type",
                "id"
            ]);


        if (
            ignoredKeys.has(key)
        ) {
            return 0;
        }


        return countWords(
            value
        );

    }


    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return 0;
    }


    if (
        Array.isArray(value)
    ) {

        return value.reduce(
            (total, item) =>
                total +
                countWordsInValue(
                    item,
                    key
                ),
            0
        );

    }


    if (
        typeof value === "object"
    ) {

        return Object.entries(value)
            .reduce(
                (
                    total,
                    [childKey, childValue]
                ) =>
                    total +
                    countWordsInValue(
                        childValue,
                        childKey
                    ),
                0
            );

    }


    return 0;

};


// =========================================================
// COLLECT ALL STRINGS
// =========================================================

const collectStrings = (
    value,
    path = "presentation",
    results = []
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return results;
    }


    if (
        typeof value === "string"
    ) {

        results.push({
            path,
            value
        });


        return results;

    }


    if (
        Array.isArray(value)
    ) {

        value.forEach(
            (item, index) => {

                collectStrings(
                    item,
                    `${path}[${index}]`,
                    results
                );

            }
        );


        return results;

    }


    if (
        typeof value === "object"
    ) {

        Object.entries(value)
            .forEach(
                ([key, child]) => {

                    collectStrings(
                        child,
                        `${path}.${key}`,
                        results
                    );

                }
            );

    }


    return results;

};


// =========================================================
// EXTRACT TEXT
// =========================================================

const extractText = (
    value
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    if (
        typeof value === "string"
    ) {
        return value;
    }


    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }


    if (
        Array.isArray(value)
    ) {

        return value
            .map(
                extractText
            )
            .filter(Boolean)
            .join(" ");

    }


    if (
        typeof value === "object"
    ) {

        return Object.values(value)
            .map(
                extractText
            )
            .filter(Boolean)
            .join(" ");

    }


    return "";

};


// =========================================================
// BUILD SOURCE TEXT
// =========================================================

const buildSourceText = (
    source
) => {

    if (
        !source ||
        typeof source !== "object"
    ) {
        return "";
    }


    const values = [];


    if (
        typeof source.input ===
        "string"
    ) {

        values.push(
            source.input
        );

    } else if (
        source.input !== null &&
        source.input !== undefined
    ) {

        values.push(
            extractText(
                source.input
            )
        );

    }


    if (
        source.context &&
        typeof source.context ===
            "object"
    ) {

        values.push(
            extractText(
                source.context
            )
        );

    }


    return values
        .filter(Boolean)
        .join(" ")
        .trim();

};


// =========================================================
// EXTRACT NUMERIC CLAIMS
// =========================================================

const extractNumericClaims = (
    value
) => {

    if (
        typeof value !== "string"
    ) {
        return [];
    }


    const matches =
        value.match(
            /(?:[$£€₦]\s*)?\d[\d,]*(?:\.\d+)?%?/g
        );


    if (!matches) {
        return [];
    }


    return matches
        .map(
            (item) =>
                item
                    .replace(
                        /\s+/g,
                        ""
                    )
                    .trim()
        )
        .filter(Boolean);

};


// =========================================================
// MEANINGFUL CONTENT
// =========================================================

const hasMeaningfulContent = (
    value
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return false;
    }


    if (
        typeof value === "string"
    ) {

        return hasMeaningfulText(
            value
        );

    }


    if (
        typeof value === "number"
    ) {

        return Number.isFinite(
            value
        );

    }


    if (
        typeof value === "boolean"
    ) {
        return true;
    }


    if (
        Array.isArray(value)
    ) {

        return value.some(
            hasMeaningfulContent
        );

    }


    if (
        typeof value === "object"
    ) {

        return Object.values(value)
            .some(
                hasMeaningfulContent
            );

    }


    return false;

};


// =========================================================
// MEANINGFUL TEXT
// =========================================================

const hasMeaningfulText = (
    value
) => {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );

};


// =========================================================
// COUNT TRUTHY TEXT VALUES
// =========================================================

const countTruthy = (
    values
) => {

    return values.filter(
        hasMeaningfulText
    ).length;

};


// =========================================================
// TOKENIZE
// =========================================================

const tokenize = (
    value
) => {

    if (
        typeof value !== "string"
    ) {
        return [];
    }


    return value
        .toLowerCase()
        .replace(
            /[^a-z0-9\s-]/g,
            " "
        )
        .split(/\s+/)
        .map(
            (word) =>
                word.trim()
        )
        .filter(Boolean);

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


    return value
        .toLowerCase()
        .replace(
            /[^a-z0-9\s]/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

};


// =========================================================
// MEANINGFUL TOPIC TOKENS
// =========================================================

const getMeaningfulTokens = (
    value
) => {

    const stopWords =
        new Set([
            "a",
            "an",
            "and",
            "are",
            "as",
            "at",
            "be",
            "by",
            "for",
            "from",
            "has",
            "have",
            "how",
            "in",
            "into",
            "is",
            "it",
            "its",
            "of",
            "on",
            "or",
            "our",
            "that",
            "the",
            "their",
            "this",
            "to",
            "using",
            "was",
            "were",
            "what",
            "when",
            "where",
            "which",
            "with",
            "your",
            "you",
            "create",
            "make",
            "generate",
            "presentation",
            "slide",
            "slides",
            "deck",
            "content"
        ]);


    return tokenize(
        value
    )
        .filter(
            (token) =>
                token.length >= 3 &&
                !stopWords.has(
                    token
                )
        );

};

export function validateSlideContent(slide) {
    const errors = [];
    validateSlide(slide, (slide?.slideNumber || 1) - 1, errors);
    validateMalformedText({ slides: [slide] }, errors);
    if (errors.length) {
        const message = errors.slice(0, 15).join('; ');
        throw Object.assign(new Error(message), { field: message.match(/content\.[a-zA-Z0-9_.\[\]]+/)?.[0], slideNumber: slide?.slideNumber });
    }
    return true;
}
