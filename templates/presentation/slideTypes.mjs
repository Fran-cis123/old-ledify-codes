export const slideTypes = [

    // =====================================================
    // OPENING & NAVIGATION
    // =====================================================

    {
        id: "title",
        category: "opening-navigation",

        description:
            "Introduces the presentation, topic, project, proposal, report, lesson, or other central subject.",

        bestFor: [
            "Presentation opening",
            "Topic introduction",
            "Project or product introduction",
            "Research title",
            "Proposal title"
        ],

        contentGuidance:
            "Keep the slide visually light. Prioritize the presentation title and a concise subtitle or contextual statement. Avoid unnecessary body content."
    },

    {
        id: "section-divider",
        category: "opening-navigation",

        description:
            "Marks a meaningful transition between major sections or phases of a presentation.",

        bestFor: [
            "Long presentations",
            "Major topic transitions",
            "Research sections",
            "Project phases",
            "Multi-part presentations"
        ],

        contentGuidance:
            "Use minimal content. Clearly introduce the upcoming section without duplicating information that belongs on later slides."
    },

    {
        id: "agenda",
        category: "opening-navigation",

        description:
            "Provides the audience with a concise overview of the major areas, stages, or questions the presentation will cover.",

        bestFor: [
            "Formal presentations",
            "Meetings",
            "Project kickoffs",
            "Executive briefings",
            "Long presentations"
        ],

        contentGuidance:
            "Show only the major presentation stages. Do not turn the agenda into a detailed table of contents."
    },


    // =====================================================
    // EXPLANATION & INFORMATION
    // =====================================================

    {
        id: "key-points",
        category: "explanation-information",

        description:
            "Communicates several related ideas, findings, features, arguments, considerations, or takeaways that collectively explain one central message.",

        bestFor: [
            "Core concepts",
            "Findings",
            "Features",
            "Benefits",
            "Objectives",
            "Recommendations",
            "Important considerations"
        ],

        contentGuidance:
            "Use concise, parallel points that support one clear slide message. Avoid using this type as the automatic default for every slide."
    },

    {
        id: "focused-explanation",
        category: "explanation-information",

        description:
            "Explains one important concept, argument, issue, finding, or idea in greater depth than a conventional bullet slide.",

        bestFor: [
            "Academic explanations",
            "Technical concepts",
            "Business insights",
            "Important findings",
            "Complex ideas"
        ],

        contentGuidance:
            "Prioritize one central idea. Use supporting explanation only where it improves understanding. Avoid introducing several unrelated concepts."
    },

    {
        id: "text-visual",
        category: "explanation-information",

        description:
            "Combines explanatory content with a meaningful visual such as an image, illustration, diagram, screenshot, figure, or other visual aid.",

        bestFor: [
            "Concept explanation",
            "Products",
            "Scientific subjects",
            "Case studies",
            "Places",
            "Processes",
            "Visual examples"
        ],

        contentGuidance:
            "The visual should contribute meaning rather than merely decorate the slide. Keep accompanying text concise enough to preserve visual balance."
    },


    // =====================================================
    // COMPARISON & RELATIONSHIPS
    // =====================================================

    {
        id: "comparison",
        category: "comparison-relationships",

        description:
            "Places two or more alternatives, groups, concepts, approaches, periods, products, conditions, or findings side by side to reveal meaningful similarities and differences.",

        bestFor: [
            "Before versus after",
            "Option comparison",
            "Experimental groups",
            "Competitors",
            "Methods",
            "Advantages and disadvantages",
            "Alternative solutions"
        ],

        contentGuidance:
            "Use consistent comparison dimensions. The audience should be able to understand the important differences quickly."
    },

    {
        id: "relationship",
        category: "comparison-relationships",

        description:
            "Shows how multiple concepts, entities, variables, systems, or components relate to one another.",

        bestFor: [
            "Conceptual relationships",
            "System components",
            "Cause and effect",
            "Organizational relationships",
            "Research variables",
            "Connected ideas"
        ],

        contentGuidance:
            "Emphasize the relationships themselves rather than presenting disconnected descriptions of each component."
    },


    // =====================================================
    // PROCESS & SEQUENCE
    // =====================================================

    {
        id: "process",
        category: "process-sequence",

        description:
            "Explains an ordered sequence of actions, stages, procedures, methods, or operations.",

        bestFor: [
            "Research methodology",
            "Workflows",
            "Business processes",
            "Instructions",
            "Implementation processes",
            "User journeys"
        ],

        contentGuidance:
            "Each stage should have a clear position in the sequence. Keep individual stage descriptions concise and emphasize progression."
    },

    {
        id: "timeline",
        category: "process-sequence",

        description:
            "Communicates events, milestones, phases, or developments according to chronological progression.",

        bestFor: [
            "Project schedules",
            "Historical developments",
            "Product roadmaps",
            "Research schedules",
            "Implementation plans",
            "Milestones"
        ],

        contentGuidance:
            "Associate each event or milestone with meaningful timing information where available. Do not invent dates that were not supplied or reasonably requested."
    },

    {
        id: "roadmap",
        category: "process-sequence",

        description:
            "Shows planned progression toward a future objective through phases, priorities, milestones, or strategic initiatives.",

        bestFor: [
            "Product development",
            "Project planning",
            "Business strategy",
            "Implementation plans",
            "Future priorities"
        ],

        contentGuidance:
            "Emphasize direction, sequencing, priorities, and major outcomes rather than excessive task-level detail."
    },


    // =====================================================
    // DATA & EVIDENCE
    // =====================================================

    {
        id: "data-chart",
        category: "data-evidence",

        description:
            "Communicates quantitative evidence through a chart or graph when relationships, trends, distributions, or differences are more effectively understood visually.",

        bestFor: [
            "Research results",
            "Performance trends",
            "Financial information",
            "Survey results",
            "Growth data",
            "Comparative measurements"
        ],

        contentGuidance:
            "Use only when meaningful quantitative data is available or intentionally generated as part of a creative prompt. The chart should communicate a clear analytical message rather than display numbers without purpose."
    },

    {
        id: "statistics",
        category: "data-evidence",

        description:
            "Highlights a small number of important numerical values, KPIs, measurements, percentages, or other quantitative indicators.",

        bestFor: [
            "KPIs",
            "Key research values",
            "Business metrics",
            "Market figures",
            "Performance summaries",
            "Impact measures"
        ],

        contentGuidance:
            "Prioritize only the numbers that matter most. Each statistic should have enough context for the audience to understand its significance."
    },

    {
        id: "table",
        category: "data-evidence",

        description:
            "Presents structured information in rows and columns when precise comparison or lookup is more important than visual storytelling.",

        bestFor: [
            "Structured comparisons",
            "Research results",
            "Feature matrices",
            "Schedules",
            "Requirements",
            "Compact datasets"
        ],

        contentGuidance:
            "Keep tables small enough to remain readable on a presentation slide. Large datasets should be summarized rather than reproduced."
    },


    // =====================================================
    // STRUCTURED GROUPS
    // =====================================================

    {
        id: "cards",
        category: "structured-groups",

        description:
            "Presents several distinct but equally important items as separate visual units, allowing the audience to scan and understand them independently.",

        bestFor: [
            "Features",
            "Services",
            "Benefits",
            "Objectives",
            "Strategic priorities",
            "Team roles",
            "Categories"
        ],

        contentGuidance:
            "Each card should represent one clear item and use a consistent information structure. Avoid excessive text inside individual cards."
    },


    // =====================================================
    // EMPHASIS & STORYTELLING
    // =====================================================

    {
        id: "quote",
        category: "emphasis-storytelling",

        description:
            "Centers the slide around an important quotation, statement, testimonial, principle, or other short piece of language that deserves strong emphasis.",

        bestFor: [
            "Verified quotations",
            "Testimonials",
            "Mission statements",
            "Key principles",
            "Powerful statements"
        ],

        contentGuidance:
            "Use sparingly. The quoted or emphasized statement should genuinely contribute to the presentation narrative."
    },

    {
        id: "case-study",
        category: "emphasis-storytelling",

        description:
            "Presents a concrete example, scenario, organization, project, event, or application to demonstrate how an idea works in practice.",

        bestFor: [
            "Business cases",
            "Academic examples",
            "Customer stories",
            "Project examples",
            "Real-world applications"
        ],

        contentGuidance:
            "Focus on the context, important action or situation, and meaningful outcome or lesson."
    },


    // =====================================================
    // DECISION & ACTION
    // =====================================================

    {
        id: "recommendation",
        category: "decision-action",

        description:
            "Communicates a proposed course of action and the reasoning or priorities supporting it.",

        bestFor: [
            "Business recommendations",
            "Research recommendations",
            "Consulting presentations",
            "Strategic proposals",
            "Decision support"
        ],

        contentGuidance:
            "Make the recommended action clear. Supporting points should explain why it matters and, where appropriate, what should happen next."
    },

    {
        id: "next-steps",
        category: "decision-action",

        description:
            "Defines the immediate actions, responsibilities, priorities, or follow-up activities that should occur after the presentation or current stage.",

        bestFor: [
            "Project kickoffs",
            "Project updates",
            "Meetings",
            "Proposals",
            "Implementation plans",
            "Executive briefings"
        ],

        contentGuidance:
            "Focus on actionable items. Where supported, clarify responsibilities, sequence, timing, or dependencies."
    },

    {
        id: "call-to-action",
        category: "decision-action",

        description:
            "Concentrates attention on a specific action or decision the presenter wants the audience to take.",

        bestFor: [
            "Sales presentations",
            "Startup pitches",
            "Campaigns",
            "Proposals",
            "Persuasive presentations"
        ],

        contentGuidance:
            "Make the desired action unmistakable and connect it clearly to the value or argument established by the presentation."
    },


    // =====================================================
    // CLOSING
    // =====================================================

    {
        id: "summary",
        category: "closing",

        description:
            "Synthesizes the most important messages, findings, arguments, or lessons from the presentation.",

        bestFor: [
            "Academic presentations",
            "Teaching",
            "Reports",
            "Technical presentations",
            "Long presentations"
        ],

        contentGuidance:
            "Synthesize rather than merely repeat earlier slide text. Focus on what the audience should remember."
    },

    {
        id: "conclusion",
        category: "closing",

        description:
            "Provides intellectual or narrative closure by communicating the final conclusion, implication, position, or overall message of the presentation.",

        bestFor: [
            "Research defenses",
            "Academic seminars",
            "Analytical reports",
            "Proposals",
            "Formal presentations"
        ],

        contentGuidance:
            "Connect the ending to the presentation's central purpose. Avoid introducing major new ideas that have not been developed previously."
    }
];