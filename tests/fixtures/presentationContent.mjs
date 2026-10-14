const pair = [{ title: "Preparation", description: "Gather the supplied source material." }, { title: "Review", description: "Check the supplied facts before publication." }];
export const fixtures = {
    titleContent: { title: "Content review", subtitle: "A practical overview", supportingText: "Prepared from supplied source material." },
    sectionContent: { title: "Review process", subtitle: "How the stages connect" }, items: pair, cards: pair,
    textContent: { heading: "Careful source review", body: "Reviewing source material helps preserve important facts and communicate the intended message clearly." },
    visualContent: { text: "Review connects source material to clear communication.", visual: { type: "diagram", description: "Source material flows into a review stage.", searchQuery: "source review diagram" } },
    comparison: { items: [{ label: "Draft", points: ["Collect source material", "Outline the message"] }, { label: "Review", points: ["Check the facts", "Improve clarity"] }] },
    relationship: { nodes: [{ id: "a", label: "Source", description: "Supplied facts" }, { id: "b", label: "Review", description: "Fact checking" }], relationships: [{ from: "a", to: "b", label: "Informs" }] },
    process: { steps: pair.map((item, index) => ({ ...item, stepNumber: index + 1 })) },
    timeline: { events: pair.map((item, index) => ({ ...item, label: `Stage ${index + 1}` })) },
    roadmap: { phases: pair.map((item, index) => ({ ...item, label: `Phase ${index + 1}` })) },
    statistics: [{ value: "12", label: "Reviewed files", context: "Supplied fixture count" }],
    chart: { chartType: "bar", labels: ["Draft", "Reviewed"], datasets: [{ label: "Files", values: [12, 8] }], insight: "Eight of twelve fixture files were reviewed." },
    table: { columns: ["Stage", "Purpose"], rows: [{ cells: ["Draft", "Collect facts"] }, { cells: ["Review", "Check facts"] }] },
    quote: { text: "This quotation is a synthetic test fixture.", attribution: "Test fixture", context: "Used only for validation" },
    caseStudy: { context: "Synthetic fixture", challenge: "Unclear source structure", action: "Organize the supplied facts", outcome: "Clearer communication", lesson: "Review the facts first" },
    callToAction: { action: "Review your source material", supportingText: "Confirm key facts before sharing." },
    summary: { statement: "Source review supports clear communication.", points: ["Gather source material", "Check the facts"] },
    conclusion: { statement: "Review before publication.", supportingPoints: ["Preserve supplied facts", "Communicate clearly"] }
};
