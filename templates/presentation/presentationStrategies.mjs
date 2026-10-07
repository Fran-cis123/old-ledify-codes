export const presentationStrategyRules = {

    strategyPrinciple:
        "A presentation strategy is a communication framework, not a fixed slide template.",

    adaptationRules: [

        "Use the selected strategy to guide the presentation's reasoning, priorities, narrative direction, terminology, depth, and communication style.",

        "The narrativeFlow describes a recommended logical progression. It must NOT be treated as a mandatory list of slides.",

        "Adapt the narrative structure to the user's actual input, source material, purpose, audience, role, instructions, and requested presentation length.",

        "Do not create a slide merely because a stage appears in the narrativeFlow.",

        "Do not force the presentation to include sections for which the user's input or source material provides no meaningful information.",

        "Do not invent facts, statistics, research findings, references, customers, financial figures, dates, milestones, testimonials, market information, or other unsupported information simply to complete a strategy.",

        "When a narrative stage is irrelevant to the user's request, omit it.",

        "When multiple narrative stages can be communicated more effectively on one slide, combine them where appropriate.",

        "When a subject requires greater depth, expand an important narrative stage across multiple slides rather than overcrowding a single slide.",

        "Respect explicit user instructions about slide count, presentation length, sections, emphasis, terminology, or content organization whenever they do not conflict with factual accuracy.",

        "Match the level of explanation and terminology to the intended audience. The same topic should be communicated differently to beginners, specialists, executives, investors, students, clients, or technical teams.",

        "Prioritize information according to the presentation's communication goal rather than attempting to include every available detail.",

        "Preserve important information from the user's supplied source material and avoid changing its meaning during summarization or restructuring.",

        "Use speaker notes for valuable explanation that would make the visible slide unnecessarily dense.",

        "Choose slide structures according to the meaning of the content. Do not default every idea to bullet points.",

        "Maintain narrative continuity between slides so that the presentation develops as a coherent argument, explanation, report, lesson, proposal, or story rather than a collection of disconnected slides.",

        "The final presentation should feel specifically designed for the user's situation rather than generated from a generic presentation formula."
    ]
};


export const presentationStrategies = [

    // =========================================================
    // ACADEMIC & EDUCATIONAL
    // =========================================================

    {
        id: "academic-seminar",
        family: "academic-educational",

        description:
            "Designed for formal academic presentations that explain, examine, or discuss a subject before lecturers, students, researchers, or other academic audiences. The presentation should demonstrate subject understanding, logical organization, academic relevance, and clear communication rather than simply listing facts.",

        communicationGoal:
            "Build the audience's understanding of the topic through a logically developed academic explanation that moves from context and foundational concepts toward deeper discussion, evidence, applications, and conclusions.",

        contentPriorities: [
            "Establish the topic, scope, and academic relevance early.",
            "Explain essential concepts before introducing more advanced ideas.",
            "Organize information into a coherent intellectual progression.",
            "Use evidence, examples, figures, comparisons, or applications where they improve understanding.",
            "Highlight relationships between concepts rather than presenting disconnected facts.",
            "Conclude with meaningful takeaways that reflect the central argument or learning points.",
            "Preserve and appropriately present genuine references when reliable sources are available."
        ],

        narrativeFlow: [
            "Topic and context",
            "Purpose or objectives",
            "Background or foundational concepts",
            "Core concepts and explanations",
            "Evidence, examples, comparisons, or applications",
            "Implications or significance",
            "Key takeaways",
            "References when supported"
        ],

        styleGuidance:
            "Use formal but understandable academic language. Maintain enough depth to demonstrate knowledge while keeping visible slide content concise. Detailed explanation should be moved into speaker notes where appropriate.",

        avoid: [
            "Turning every slide into bullet lists.",
            "Overloading slides with textbook-style paragraphs.",
            "Using unexplained technical terminology.",
            "Inventing academic references, statistics, or evidence.",
            "Repeating the same information across multiple slides."
        ]
    },


    {
        id: "research-defense",
        family: "academic-educational",

        description:
            "Designed for thesis, dissertation, final-year project, research proposal, or other formal research defenses where the presenter must communicate not only what was studied, but why the study was necessary, how it was conducted, what was found, and what the findings mean.",

        communicationGoal:
            "Construct a defensible research narrative that demonstrates the significance, methodological credibility, evidence, interpretation, and contribution of the study to an academic panel or research audience.",

        contentPriorities: [
            "Establish the research problem and its significance.",
            "Clearly communicate the aim, objectives, questions, or hypotheses provided by the user.",
            "Present methodology accurately enough for the audience to understand how the study was conducted.",
            "Give results and major findings appropriate visual emphasis.",
            "Separate factual results from interpretation.",
            "Connect the discussion to the research objectives and available evidence.",
            "Communicate limitations when they are provided or legitimately supported.",
            "End with conclusions and recommendations that follow from the presented research."
        ],

        narrativeFlow: [
            "Research background",
            "Problem statement",
            "Aim and objectives",
            "Research questions or hypotheses where applicable",
            "Methodology",
            "Results",
            "Discussion and interpretation",
            "Conclusion",
            "Recommendations where appropriate",
            "References"
        ],

        styleGuidance:
            "Use precise, formal, evidence-oriented academic communication. Prioritize research findings, figures, tables, charts, and methodological clarity over decorative content. Keep slides defensible and avoid claims that exceed the supplied research evidence.",

        avoid: [
            "Inventing research findings or numerical results.",
            "Inventing citations or literature.",
            "Changing the meaning of the user's methodology.",
            "Presenting interpretations as measured results.",
            "Hiding important limitations behind persuasive language.",
            "Reducing complex findings to unsupported claims."
        ]
    },


    {
        id: "lecture-teaching",
        family: "academic-educational",

        description:
            "Designed for presentations whose primary purpose is teaching. The presentation should progressively develop understanding, moving from learning objectives and foundational knowledge toward explanation, examples, application, and reinforcement.",

        communicationGoal:
            "Help the intended learners understand, retain, and apply the subject by presenting information in a deliberate instructional sequence rather than merely summarizing the topic.",

        contentPriorities: [
            "Identify what the audience should understand or be able to explain.",
            "Introduce prerequisite concepts before dependent concepts.",
            "Break complex subjects into manageable learning units.",
            "Use examples, comparisons, diagrams, processes, or scenarios where they improve comprehension.",
            "Emphasize relationships, mechanisms, causes, consequences, and applications.",
            "Reinforce major concepts through summaries or key takeaways."
        ],

        narrativeFlow: [
            "Topic introduction",
            "Learning objectives",
            "Foundational concepts",
            "Progressive explanation",
            "Examples or demonstrations",
            "Applications",
            "Common distinctions or important considerations",
            "Summary and key takeaways"
        ],

        styleGuidance:
            "Prioritize clarity and instructional progression. Match terminology and conceptual depth to the audience's expected knowledge level. Slides should support teaching rather than function as dense lecture notes.",

        avoid: [
            "Introducing advanced concepts before necessary foundations.",
            "Using unexplained jargon.",
            "Creating unnecessarily dense slides.",
            "Repeating definitions without developing understanding.",
            "Using visuals that do not contribute to learning."
        ]
    },


    {
        id: "scientific-presentation",
        family: "academic-educational",

        description:
            "Designed for scientific, laboratory, technical, clinical, or experimental presentations in which methods, evidence, measurements, results, mechanisms, and interpretation are central to the communication.",

        communicationGoal:
            "Communicate scientific information accurately and efficiently while preserving the distinction between evidence, interpretation, and conclusion.",

        contentPriorities: [
            "Establish the scientific question or objective.",
            "Present relevant scientific background without overwhelming the main investigation.",
            "Explain experimental or analytical methods where necessary.",
            "Prioritize genuine quantitative and qualitative findings.",
            "Use charts, diagrams, processes, tables, or figures when supported by the source material.",
            "Explain the significance and interpretation of findings.",
            "Identify limitations or uncertainty when supported."
        ],

        narrativeFlow: [
            "Scientific context",
            "Question or objective",
            "Methods or experimental approach",
            "Results",
            "Evidence visualization",
            "Interpretation",
            "Scientific implications",
            "Limitations",
            "Conclusion"
        ],

        styleGuidance:
            "Use technically precise terminology appropriate to the audience. Favor evidence-rich visual communication and concise interpretation over long descriptive text.",

        avoid: [
            "Inventing experimental data.",
            "Creating unsupported scientific claims.",
            "Confusing correlation with causation.",
            "Inventing citations.",
            "Using decorative charts without meaningful data."
        ]
    },


    // =========================================================
    // BUSINESS & CORPORATE
    // =========================================================

    {
        id: "business-overview",
        family: "business-corporate",

        description:
            "Designed to give stakeholders a structured understanding of a company, department, product, service, initiative, or business operation by communicating what it is, why it matters, how it works, and where its value lies.",

        communicationGoal:
            "Give the audience a coherent business-level understanding of the subject while emphasizing relevance, capabilities, value, performance, and priorities.",

        contentPriorities: [
            "Establish the business context.",
            "Clearly define the organization, product, initiative, or offering.",
            "Highlight core capabilities or functions.",
            "Explain the value delivered to relevant stakeholders.",
            "Present meaningful evidence, performance indicators, or differentiators when available.",
            "Communicate current priorities and future direction where appropriate."
        ],

        narrativeFlow: [
            "Business context",
            "Overview",
            "Core offering or capabilities",
            "Customers or stakeholders",
            "Value proposition",
            "Performance or evidence",
            "Priorities",
            "Future direction"
        ],

        styleGuidance:
            "Use polished professional language and strong information hierarchy. Keep the presentation business-focused rather than unnecessarily technical unless the audience requires technical depth.",

        avoid: [
            "Generic corporate filler.",
            "Unsupported claims of market leadership.",
            "Overloading slides with operational details.",
            "Inventing business metrics."
        ]
    },


    {
        id: "business-strategy",
        family: "business-corporate",

        description:
            "Designed for strategic business communication where leaders or teams must understand the current situation, important challenges or opportunities, strategic objectives, chosen priorities, proposed initiatives, and expected business impact.",

        communicationGoal:
            "Move the audience from understanding the current business situation to understanding what should be prioritized, why those choices matter, and what actions should follow.",

        contentPriorities: [
            "Establish the current situation using available evidence.",
            "Identify meaningful challenges and opportunities.",
            "Define strategic objectives.",
            "Explain strategic priorities and the reasoning behind them.",
            "Connect initiatives to expected outcomes.",
            "Address important dependencies, risks, or trade-offs.",
            "Conclude with actionable next steps."
        ],

        narrativeFlow: [
            "Current situation",
            "Challenges and opportunities",
            "Strategic objectives",
            "Strategic priorities",
            "Key initiatives",
            "Expected impact",
            "Risks and dependencies",
            "Execution priorities",
            "Next steps"
        ],

        styleGuidance:
            "Use concise, decision-oriented business communication. Emphasize implications and strategic choices rather than simply describing information.",

        avoid: [
            "Generic strategy statements without actionable meaning.",
            "Invented market information.",
            "Listing initiatives without connecting them to objectives.",
            "Confusing operational tasks with strategic priorities."
        ]
    },


    {
        id: "executive-briefing",
        family: "business-corporate",

        description:
            "Designed for senior executives and decision-makers who need the most important information, implications, risks, recommendations, and required decisions communicated rapidly and with minimal unnecessary detail.",

        communicationGoal:
            "Enable informed executive decision-making by surfacing what matters, why it matters, what the evidence indicates, and what action or decision is required.",

        contentPriorities: [
            "Lead with the central message or executive conclusion.",
            "Prioritize decision-relevant evidence.",
            "Highlight business impact.",
            "Surface significant risks and opportunities.",
            "Provide clear recommendations.",
            "Make decisions or actions required from the audience explicit."
        ],

        narrativeFlow: [
            "Executive message",
            "Critical context",
            "Key findings",
            "Business impact",
            "Risks or opportunities",
            "Recommendation",
            "Decision or next action"
        ],

        styleGuidance:
            "Use highly concise, authoritative, executive-level communication. Favor insight-led slide titles, metrics, charts, and clear recommendations over lengthy explanation.",

        avoid: [
            "Long background sections.",
            "Operational detail that does not affect executive decisions.",
            "Vague recommendations.",
            "Buried conclusions.",
            "Dense paragraphs."
        ]
    },


    // =========================================================
    // PITCH & PROPOSAL
    // =========================================================

    {
        id: "startup-pitch",
        family: "pitch-proposal",

        description:
            "Designed for entrepreneurs and teams presenting a startup, venture, product, or business opportunity to investors, accelerators, partners, or other stakeholders who must understand the problem, opportunity, solution, commercial potential, evidence, and ask.",

        communicationGoal:
            "Build a credible and persuasive investment or partnership case by demonstrating that an important problem exists, the proposed solution creates meaningful value, the opportunity is attractive, and the team has a credible path forward.",

        contentPriorities: [
            "Define the problem clearly.",
            "Explain the proposed solution and value proposition.",
            "Demonstrate the product or offering where information is available.",
            "Present market opportunity using supported evidence.",
            "Explain the business model.",
            "Communicate meaningful differentiation.",
            "Show genuine traction or validation when provided.",
            "Present the team when relevant information exists.",
            "Communicate the requested investment, partnership, or next step."
        ],

        narrativeFlow: [
            "Problem",
            "Solution",
            "Product",
            "Market opportunity",
            "Business model",
            "Competitive advantage",
            "Traction or validation",
            "Go-to-market strategy",
            "Team",
            "Roadmap",
            "Ask"
        ],

        styleGuidance:
            "Use persuasive, high-impact communication with low text density and strong visual storytelling. Every slide should advance the business case.",

        avoid: [
            "Inventing market size.",
            "Inventing customers, revenue, traction, or partnerships.",
            "Generic claims such as 'no competitors'.",
            "Overloading the pitch with technical implementation details.",
            "Hiding the actual ask."
        ]
    },


    {
        id: "sales-proposal",
        family: "pitch-proposal",

        description:
            "Designed for persuading a prospective customer or client by demonstrating understanding of their situation, connecting a proposed solution to their needs, establishing value, reducing perceived risk, and defining a clear path toward engagement.",

        communicationGoal:
            "Move the prospective customer from recognition of their challenge to confidence that the proposed solution can address it effectively.",

        contentPriorities: [
            "Demonstrate understanding of the customer's situation.",
            "Define the relevant challenge or opportunity.",
            "Connect solution capabilities directly to customer needs.",
            "Translate features into business or user benefits.",
            "Present deliverables and implementation approach.",
            "Use genuine proof, evidence, or case material when supplied.",
            "Make the next commercial step clear."
        ],

        narrativeFlow: [
            "Customer context",
            "Challenge",
            "Desired outcome",
            "Proposed solution",
            "Benefits and value",
            "Deliverables",
            "Implementation approach",
            "Evidence or proof",
            "Commercial proposition where supplied",
            "Next step"
        ],

        styleGuidance:
            "Keep the presentation customer-centered. Focus on outcomes and value rather than making the presentation primarily about the seller.",

        avoid: [
            "Generic sales language.",
            "Unsupported ROI claims.",
            "Inventing customer testimonials.",
            "Listing product features without explaining customer value."
        ]
    },


    {
        id: "project-proposal",
        family: "pitch-proposal",

        description:
            "Designed to secure approval, resources, sponsorship, or stakeholder support for a proposed project or initiative by establishing the need, presenting a credible solution, defining scope and execution, and demonstrating expected value.",

        communicationGoal:
            "Give decision-makers enough clarity and confidence to evaluate and approve the proposed project or initiative.",

        contentPriorities: [
            "Establish the problem or opportunity.",
            "Define the proposed project clearly.",
            "State objectives and expected outcomes.",
            "Clarify scope and major deliverables.",
            "Explain the proposed approach.",
            "Present realistic timelines and resource requirements when supplied.",
            "Identify significant risks and dependencies.",
            "Conclude with the approval or action required."
        ],

        narrativeFlow: [
            "Problem or opportunity",
            "Proposed solution",
            "Objectives",
            "Scope",
            "Deliverables",
            "Approach",
            "Timeline",
            "Resources",
            "Expected outcomes",
            "Risks",
            "Approval required"
        ],

        styleGuidance:
            "Use structured, credible and decision-oriented communication. Balance persuasive value with realistic execution details.",

        avoid: [
            "Inventing budgets or timelines.",
            "Ignoring implementation risks.",
            "Using vague project objectives.",
            "Promising outcomes unsupported by the available information."
        ]
    },


    // =========================================================
    // PROJECT & PLANNING
    // =========================================================

    {
        id: "project-kickoff",
        family: "project-planning",

        description:
            "Designed to formally initiate a project by creating shared understanding among the project team and stakeholders regarding why the project exists, what success means, what is in scope, who is responsible, how the work will proceed, and what happens next.",

        communicationGoal:
            "Create alignment before execution begins so that participants leave with a common understanding of objectives, scope, responsibilities, milestones, working arrangements, risks, and immediate actions.",

        contentPriorities: [
            "Establish project vision and business or organizational context.",
            "Define objectives and success criteria.",
            "Clarify scope and major deliverables.",
            "Identify stakeholders, teams, and responsibilities.",
            "Present the execution approach.",
            "Communicate milestones and dependencies.",
            "Establish communication and governance expectations.",
            "Surface known risks or constraints.",
            "End with concrete immediate actions."
        ],

        narrativeFlow: [
            "Project vision",
            "Context and objectives",
            "Success criteria",
            "Scope",
            "Deliverables",
            "Team and responsibilities",
            "Approach",
            "Timeline and milestones",
            "Communication and governance",
            "Risks and dependencies",
            "Immediate next steps"
        ],

        styleGuidance:
            "Use structured, action-oriented professional communication. Favor timelines, role structures, process diagrams, milestones and clearly defined actions where appropriate.",

        avoid: [
            "Ambiguous responsibilities.",
            "Unclear scope.",
            "Invented deadlines.",
            "Long conceptual explanations that do not help project alignment."
        ]
    },


    {
        id: "project-status",
        family: "project-planning",

        description:
            "Designed for recurring or milestone-based project reporting where stakeholders need an accurate view of progress, achievements, schedule, issues, risks, dependencies, decisions required, and upcoming work.",

        communicationGoal:
            "Give stakeholders an accurate, concise and actionable understanding of project health and what requires attention.",

        contentPriorities: [
            "Communicate overall project status.",
            "Show progress against planned milestones.",
            "Highlight completed and current work.",
            "Present genuine KPIs or delivery metrics when available.",
            "Surface blockers, issues, risks, and dependencies.",
            "Identify decisions or support required.",
            "Clarify priorities for the next reporting period."
        ],

        narrativeFlow: [
            "Overall status",
            "Progress summary",
            "Milestone performance",
            "Completed work",
            "Current work",
            "KPIs",
            "Issues and blockers",
            "Risks and dependencies",
            "Decisions required",
            "Next-period priorities"
        ],

        styleGuidance:
            "Use concise status-oriented communication with strong visual indicators, timelines, metrics and action items. Prioritize exceptions and matters requiring stakeholder attention.",

        avoid: [
            "Hiding project problems.",
            "Inventing progress percentages.",
            "Reporting activity without connecting it to progress.",
            "Overloading stakeholders with low-level task details."
        ]
    },


    {
        id: "project-roadmap",
        family: "project-planning",

        description:
            "Designed to communicate how a project, product, programme, or initiative is expected to evolve across phases, priorities, milestones, dependencies, and future outcomes.",

        communicationGoal:
            "Give stakeholders a clear temporal and strategic view of where the initiative is going, how major phases connect, and what must happen along the way.",

        contentPriorities: [
            "Establish the roadmap objective or future state.",
            "Identify major priorities.",
            "Organize work into meaningful phases.",
            "Highlight important milestones.",
            "Show dependencies where relevant.",
            "Connect near-term work to longer-term outcomes."
        ],

        narrativeFlow: [
            "Vision or target state",
            "Current position",
            "Strategic priorities",
            "Phases",
            "Milestones",
            "Dependencies",
            "Future state"
        ],

        styleGuidance:
            "Favor timeline, phase, milestone and dependency-based visual communication. Keep supporting text concise.",

        avoid: [
            "Treating a roadmap as a detailed task list.",
            "Inventing dates.",
            "Presenting unrelated initiatives without hierarchy.",
            "Overcrowding timeline slides."
        ]
    },


    // =========================================================
    // ANALYSIS & REPORTING
    // =========================================================

    {
        id: "analytical-report",
        family: "analysis-reporting",

        description:
            "Designed for evidence-based presentations that examine a question, dataset, situation, investigation, or problem and communicate the resulting findings, interpretation, implications, and recommendations.",

        communicationGoal:
            "Move the audience from the analytical question through evidence and interpretation toward defensible conclusions and actionable implications.",

        contentPriorities: [
            "Define the analytical objective.",
            "Provide necessary context.",
            "Explain the data source or analytical approach where relevant.",
            "Prioritize significant findings.",
            "Visualize genuine evidence appropriately.",
            "Distinguish observation from interpretation.",
            "Explain implications.",
            "Develop recommendations supported by the findings."
        ],

        narrativeFlow: [
            "Objective or question",
            "Context",
            "Data or methodology",
            "Key findings",
            "Evidence",
            "Interpretation",
            "Implications",
            "Recommendations"
        ],

        styleGuidance:
            "Use evidence-led communication. Prefer insight-oriented titles, charts, comparisons, and concise analytical commentary over descriptive text.",

        avoid: [
            "Inventing missing data.",
            "Presenting unsupported conclusions.",
            "Using charts merely for decoration.",
            "Confusing findings with recommendations."
        ]
    },


    {
        id: "performance-report",
        family: "analysis-reporting",

        description:
            "Designed to communicate organizational, business, team, campaign, operational, or project performance by connecting metrics and trends to targets, drivers, problems, achievements, and future actions.",

        communicationGoal:
            "Help stakeholders understand not only what performance occurred, but why it occurred, whether it met expectations, and what should happen next.",

        contentPriorities: [
            "Provide an overall performance picture.",
            "Highlight the most decision-relevant KPIs.",
            "Compare actual performance with targets when target data exists.",
            "Show meaningful trends.",
            "Identify successes and underperformance.",
            "Explain likely drivers only when supported.",
            "Translate findings into actions and outlook."
        ],

        narrativeFlow: [
            "Performance overview",
            "Key metrics",
            "Targets versus actuals",
            "Trends",
            "Successes",
            "Areas of concern",
            "Performance drivers",
            "Recommended actions",
            "Outlook"
        ],

        styleGuidance:
            "Use metric-driven, visual and concise reporting. Make significant changes and exceptions immediately visible.",

        avoid: [
            "Inventing KPIs.",
            "Inventing target values.",
            "Showing numbers without interpretation.",
            "Using excessive narrative where visualization communicates more effectively."
        ]
    },


    // =========================================================
    // CREATIVE & SHOWCASE
    // =========================================================

    {
        id: "portfolio-showcase",
        family: "creative-showcase",

        description:
            "Designed for professionals, students, creators, designers, agencies, consultants, and other users presenting selected work, capabilities, achievements, or case studies in a visually compelling and coherent professional narrative.",

        communicationGoal:
            "Demonstrate capability and credibility through carefully selected work and evidence while allowing the work itself to remain the visual focus.",

        contentPriorities: [
            "Establish the creator's positioning or area of expertise.",
            "Prioritize the strongest and most relevant work.",
            "Provide enough context to understand each project.",
            "Explain role, challenge, approach, and outcome where appropriate.",
            "Highlight meaningful skills and achievements.",
            "End with a clear professional closing or contact direction."
        ],

        narrativeFlow: [
            "Introduction",
            "Professional positioning",
            "Selected work",
            "Case studies",
            "Capabilities",
            "Achievements",
            "Closing"
        ],

        styleGuidance:
            "Use low text density, strong visual hierarchy and image-led storytelling. Let projects and outcomes dominate rather than long descriptions.",

        avoid: [
            "Overcrowding slides with portfolio items.",
            "Using long biographies.",
            "Inventing achievements or project outcomes.",
            "Allowing decorative design to overpower the showcased work."
        ]
    },


    {
        id: "campaign-concept",
        family: "creative-showcase",

        description:
            "Designed for presenting marketing, communication, advertising, social media, brand, or creative campaign concepts by connecting audience insight and strategic intent to a central creative idea and its execution across relevant channels.",

        communicationGoal:
            "Make the audience understand the strategic reasoning behind the campaign and visualize how the creative concept translates into a coherent execution.",

        contentPriorities: [
            "Define the communication challenge.",
            "Identify the intended audience.",
            "Surface the key insight.",
            "Establish campaign objectives.",
            "Present the central creative idea.",
            "Demonstrate how the idea can appear across relevant channels.",
            "Explain execution and expected impact where supported."
        ],

        narrativeFlow: [
            "Challenge",
            "Audience",
            "Insight",
            "Objective",
            "Big idea",
            "Creative concept",
            "Channels",
            "Content or activation examples",
            "Execution",
            "Expected impact"
        ],

        styleGuidance:
            "Use highly visual storytelling, concise copy and strong concept presentation. Strategy and creativity should reinforce each other rather than appearing as separate parts.",

        avoid: [
            "Generic campaign ideas.",
            "Inventing audience research.",
            "Overexplaining creative concepts.",
            "Using visuals without strategic relevance."
        ]
    },


    // =========================================================
    // GENERAL FALLBACK
    // =========================================================

    {
        id: "general-presentation",
        family: "general",

        description:
            "A flexible fallback strategy for requests that do not meaningfully fit a specialized presentation strategy. The presentation should derive its organization from the user's actual topic, purpose, audience, instructions, and available source material rather than forcing the content into an inappropriate predefined narrative.",

        communicationGoal:
            "Transform the user's information into a coherent, purposeful and professionally structured presentation when no specialized strategy provides a better fit.",

        contentPriorities: [
            "Identify the user's central communication objective.",
            "Determine the most important information for the intended audience.",
            "Organize ideas into a logical progression.",
            "Choose presentation structures appropriate to the nature of the content.",
            "Maintain professional clarity and appropriate content density."
        ],

        narrativeFlow: [
            "Determine dynamically from the user's request and source content."
        ],

        styleGuidance:
            "Adapt tone, depth, terminology, organization and content density to the user's purpose and audience. Do not impose a specialized business, academic, sales, or project structure without justification.",

        avoid: [
            "Using the fallback when a specialized strategy clearly fits.",
            "Creating a generic sequence of repetitive bullet slides.",
            "Inventing information to make the presentation appear complete."
        ]
    }

];