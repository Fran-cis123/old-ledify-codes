const slide=(slideType,title,content,subtitle='')=>({slideType,title,subtitle,objective:title,content});
const items=(entries)=>entries.map(([title,description])=>({title,description}));
const process=(entries)=>({process:{steps:items(entries).map((p,i)=>({...p,stepNumber:i+1}))}});
const comparison=(entries)=>({comparison:{items:entries.map(([label,points])=>({label,points}))}});
const closing=(statement,points)=>({summary:{statement,points}});
function deck(name,title,subtitle,slides,theme,variant,strategyId='lecture-teaching'){
    return {name,context:{audience:'Professional and university audiences',designPreferences:{theme,variant}},presentation:{outputType:'presentation',title,subtitle,strategyId,
        slides:[slide('title',title,{titleContent:{title,subtitle,supportingText:'Concepts, applications and limitations'}}),...slides].map((s,i)=>({...s,slideNumber:i+1}))}};
}

export const healthcare=deck('healthcare','Artificial Intelligence in Modern Healthcare','Clinical applications, operational integration and responsible use',[
    slide('agenda','Curriculum and Discussion Roadmap',{items:items([
        ['Foundations and diagnostics','Distinguish learning methods and imaging applications.'],
        ['Discovery and workflow','Connect research tools to clinical operations.'],
        ['Oversight and governance','Examine accountability, bias and patient privacy.'],
        ['Future directions','Assess multimodal systems and their limitations.']])}),
    slide('comparison','Foundational AI Architectures in Medicine',comparison([
        ['Machine learning',['Learns patterns from examples','Supports prediction tasks','Depends on representative data']],
        ['Deep learning',['Uses layered neural networks','Processes images and signals','Requires external validation']],
        ['Clinical NLP',['Processes clinical language','Extracts entities from notes','Needs context and review']]
    ]),'Deep learning and NLP can overlap with broader machine learning'),
    slide('cards','Diagnostic Imaging and Automated Detection',{cards:items([
        ['Radiological triage','Flags candidate abnormalities for clinician review.'],
        ['Digital pathology','Supports tissue segmentation and cell counting.'],
        ['Skin lesion assessment','Assists assessment within a validated clinical scope.'],
        ['Visual explanations','Heatmaps highlight regions without proving causality.']])}),
    slide('process','AI in Drug Discovery and Biomarker Identification',process([
        ['Target exploration','Analyzes biological data to propose candidate targets.'],
        ['Compound screening','Prioritizes candidates for laboratory investigation.'],
        ['Experimental validation','Tests model predictions against biological evidence.'],
        ['Clinical evaluation','Assesses safety and efficacy through required trials.']
    ]),'Computational predictions require experimental and clinical evidence'),
    slide('process','Clinical Workflow and Operational Optimization',process([
        ['Capture clinical input','Collects notes and observations from care delivery.'],
        ['Extract information','NLP proposes structured clinical entities.'],
        ['Review and confirm','Clinicians correct errors before record updates.'],
        ['Support operations','Validated outputs inform triage and resource planning.']
    ]),'An illustrative workflow with a clinician review checkpoint'),
    slide('comparison','Human-in-the-Loop vs Fully Autonomous Systems',comparison([
        ['Human oversight',['Clinician reviews suggestions','Responsibility needs definition','Review can still miss errors']],
        ['Autonomous operation',['Acts within an approved scope','Needs defined safety controls','Accountability remains contextual']]
    ])),
    slide('cards','Ethical, Regulatory, and Algorithmic Bias Challenges',{cards:items([
        ['Fairness','Unrepresentative data can worsen disparities.'],
        ['Explainability','Explanations need evaluation alongside performance.'],
        ['Privacy','Access controls and lawful data use protect patients.']])}),
    slide('roadmap','Evolution of Multimodal Healthcare Systems',{roadmap:{phases:[
        {label:'Task-specific',title:'Narrow models',description:'Focus on a bounded task and a defined data type.'},
        {label:'Emerging use',title:'Multimodal models',description:'Combine text and imaging with careful evaluation.'},
        {label:'Research direction',title:'Adaptive systems',description:'Explore changing data while monitoring safety and drift.'}
    ]}},'A conceptual progression, rather than a dated or guaranteed forecast'),
    slide('summary',"Key Takeaways and the Clinician's Role",closing('Clinical responsibility remains central to useful medical AI.',[
        'Match each model to a validated clinical task.',
        'Treat predictions as evidence requiring review.',
        'Evaluate bias and protect patient information.',
        'Monitor systems as clinical practice changes.'
    ]))
],'scholarly-clean','ivory-journal');

export const categorySamples=[healthcare,
    deck('business','A Clearer Project Handover','A proposed approach for a design studio',[
        slide('comparison','From informal transfer to shared ownership',comparison([
            ['Informal handover',['Context stays with individuals','Missing decisions surface late']],
            ['Proposed approach',['Records decisions and owners','Checks readiness before transfer']]])),
        slide('process','A Review Workflow',process([['Prepare','Collect decisions and open questions.'],['Review','Check completeness with the receiving team.'],['Transfer','Confirm ownership of remaining actions.']])),
        slide('case-study','A Proposed Pilot',{caseStudy:{context:'A design studio planning a handover pilot.',challenge:'Important project context is difficult to find.',action:'Trial a shared checklist on a future project.',outcome:'No measured outcome is available yet.',lesson:'Evaluate the pilot before broader adoption.'}}),
        slide('summary','Ownership Makes Handover Actionable',closing('A shared checklist works when responsibilities are explicit.',['Name the receiving owner.','Record unresolved decisions.','Review the proposed pilot before scaling.']))
    ],'corporate-modern','slate-blue','business-strategy'),
    deck('research','Urban Shade and Thermal Comfort','A research proposal without collected results',[
        slide('focused-explanation','A Testable Research Question',{textContent:{heading:'A Testable Research Question',body:'How does shade relate to perceived thermal comfort in public space? A proposed field study would compare shaded and exposed locations while accounting for weather and activity.'}}),
        slide('process','Proposed Measurement Sequence',process([['Select sites','Match comparable shaded and exposed areas.'],['Observe conditions','Record environmental context and comfort reports.'],['Evaluate patterns','Separate observed associations from causal claims.']])),
        slide('table','Design Limits and Confounders',{table:{columns:['Factor','Why it matters'],rows:[{cells:['Weather','Changes exposure during sampling']},{cells:['Activity','Changes perceived comfort']},{cells:['Site selection','May introduce systematic differences']}]}}),
        slide('summary','Evidence Will Determine the Conclusion',closing('The proposal defines a method, without claiming results.',['Document sampling decisions.','Report uncertainty and limitations.','Test explanations against collected evidence.']))
    ],'scholarly-clean','midnight-research','research-defense'),
    deck('finance','Financial Reporting Review','Synthetic fixture figures, not actual company performance',[
        slide('data-chart','Illustrative Revenue by Period',{chart:{chartType:'column',labels:['Q1','Q2','Q3'],datasets:[{label:'Illustrative revenue ($000)',values:[120,135,128]}],insight:'Illustrative assumptions, not actual company performance.'}}),
        slide('data-chart','An Illustrative Trend',{chart:{chartType:'line',labels:['Q1','Q2','Q3'],datasets:[{label:'Illustrative revenue ($000)',values:[120,135,128]}],insight:'These fixture values do not establish a forecast.'}}),
        slide('statistics','Review the Reporting Basis',{statistics:[{value:'3',label:'Illustrative periods',context:'Synthetic data supplied by this test fixture.'},{value:'$000',label:'Reporting unit',context:'All fixture revenue values use the same unit.'}]}),
        slide('summary','Keep Assumptions Visible',closing('A chart communicates only as reliably as its source data.',['Check periods and reporting units.','Distinguish actuals from assumptions.','Explain changes without inventing causes.']))
    ],'analytical-data','precision-light','performance-report'),
    deck('technology','Secure Web Request Handling','Mechanisms and their boundaries',[
        slide('process','The Request Lifecycle',process([['Receive','Parse the request within bounded limits.'],['Validate','Check supported input and authentication.'],['Authorize','Verify access to the requested resource.'],['Respond','Return only the intended public fields.']])),
        slide('comparison','Identity and Access Are Separate Checks',comparison([['Authentication',['Establishes who is requesting','Checks credentials or a session']],['Authorization',['Checks permission for this action','Depends on resource and context']]])),
        slide('relationship','Controls Within a Request Boundary',{relationship:{nodes:[{id:'r',label:'Request controls',description:'Complementary controls with distinct scopes'},{id:'v',label:'Input validation',description:'Checks permitted input'},{id:'a',label:'Access checks',description:'Checks identity and permissions'},{id:'q',label:'Bound queries',description:'Separates values from query text'}],relationships:[{from:'r',to:'v',label:'Includes'},{from:'r',to:'a',label:'Includes'},{from:'r',to:'q',label:'Includes'}]}}),
        slide('summary','No Single Control Covers Every Risk',closing('Match controls to specific threats and verify their behavior.',['Validate supported input.','Authorize each sensitive action.','Keep secrets out of public responses.']))
    ],'startup-bold','midnight-cyan','general-presentation'),
    deck('environment','The Water Cycle','Transfers, storage and changing conditions',[
        slide('text-visual','Water Moves Between Stores',{visualContent:{text:'Evaporation transfers water to the atmosphere. Condensation forms droplets, precipitation returns water to the surface, and collection supplies later evaporation. This simplified cycle omits many pathways.',visual:{type:'diagram',description:'A simplified cycle of water transfers.',searchQuery:'',diagram:{kind:'cycle',nodes:[{id:'e',label:'Evaporation',description:'Water enters air'},{id:'c',label:'Condensation',description:'Droplets form'},{id:'p',label:'Precipitation',description:'Water falls'},{id:'s',label:'Collection',description:'Water is stored'}],edges:[{from:'e',to:'c',label:''},{from:'c',to:'p',label:''},{from:'p',to:'s',label:''},{from:'s',to:'e',label:''}],caption:'A simplified water cycle'}}}}),
        slide('comparison','Different Stores, Different Timescales',comparison([['Atmospheric water',['Moves with atmospheric circulation','Can return through precipitation']],['Surface and groundwater',['Storage varies with local conditions','Transfers include runoff and infiltration']]])),
        slide('focused-explanation','A Cycle Does Not Mean Constant Storage',{textContent:{heading:'A Cycle Does Not Mean Constant Storage',body:'Water moves between stores while individual stores can gain or lose water. Weather, climate and human use affect those transfers. The diagram simplifies these changing pathways.'}}),
        slide('summary','Track the Transfers and the Stores',closing('A useful cycle diagram explains movement and its limits.',['Name the transfer mechanism.','Identify the water store.','Recognize what a simplified model omits.']))
    ],'professional-neutral','graphite-sage','lecture-teaching'),
    deck('academic','Reading an Argument Critically','Claims, evidence and justified conclusions',[
        slide('cards','Different Parts of an Argument',{cards:items([['Claim','The statement the author asks the reader to accept.'],['Evidence','The observations or sources supporting the claim.'],['Reasoning','The explanation connecting evidence to the claim.']])}),
        slide('timeline','A Proposed Reading Sequence',{timeline:{events:[{label:'First reading',title:'Find the claim',description:'Identify the central proposition.'},{label:'Second reading',title:'Check evidence',description:'Assess the support and its limitations.'},{label:'Discussion',title:'Test the reasoning',description:'Consider alternative explanations.'}]}}),
        slide('quote','A Classroom Example',{quote:{text:'An example alone does not establish a universal claim.',attribution:'Synthetic classroom example',context:'Teaching fixture, not an attributed historical quotation.'}}),
        slide('summary','Conclusions Need Proportionate Support',closing('Assess what the evidence permits the author to conclude.',['Identify the central claim.','Check the quality of its support.','Distinguish explanation from assumption.']))
    ],'scholarly-clean','ivory-journal','lecture-teaching')
];
