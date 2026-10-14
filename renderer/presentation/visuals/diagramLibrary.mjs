// Original declarative educational assets. Domain facts live in this catalog,
// never in the general planning, coverage, layout or rendering engine.
// Schematics communicate relationships; they are not diagnostic anatomy.
export const diagramLibrary = [
    {
        id:'human-heart-valves',matches:/(?:heart|cardiac|valvular).*(?:valve|chordae|papillary)|(?:valve|chordae|papillary).*heart/i,
        caption:'AV valves: chordae anchor leaflets to papillary muscles.',
        altText:'Schematic identifying the tricuspid, mitral, pulmonary and aortic valves and the chambers or vessels they connect.',
        source:'Ledify original schematic',license:'Original artwork; project license',
        references:['https://www.nhlbi.nih.gov/health/heart/blood-flow','https://www.ncbi.nlm.nih.gov/books/NBK557802/'],
        diagram:{kind:'labeled',nodes:[
            {id:'tricuspid',label:'Tricuspid valve',description:'Right atrium → RV'},
            {id:'mitral',label:'Mitral valve',description:'Left atrium → LV'},
            {id:'pulmonary',label:'Pulmonary valve',description:'RV → pulmonary artery'},
            {id:'aortic',label:'Aortic valve',description:'LV → aorta'}
        ],edges:[],caption:'A schematic of the four major cardiac valves'}
    },
    {
        id: 'human-heart-chambers', matches: /(?:heart|cardiac).*(?:anatom|chamber|valve)|(?:anatom|chamber|valve).*heart/i,
        caption: 'Pulmonary valve: RV → lungs. Aortic valve: LV → body.',
        altText: 'Simplified heart diagram identifying right and left atria and ventricles, the tricuspid and mitral valves, and pulmonary and aortic outlets.',
        source: 'Ledify original schematic', license: 'Original artwork; project license',
        references: ['https://www.nhlbi.nih.gov/health/heart/blood-flow'],
        diagram: { kind: 'labeled', nodes: [
            { id: 'ra', label: 'Right atrium', description: 'Receives venous blood' },
            { id: 'la', label: 'Left atrium', description: 'Receives blood from lungs' },
            { id: 'rv', label: 'Right ventricle', description: 'Pumps to lungs' },
            { id: 'lv', label: 'Left ventricle', description: 'Pumps to body' }
        ], edges: [{ from: 'ra', to: 'rv', label: 'Tricuspid' }, { from: 'la', to: 'lv', label: 'Mitral' }],
        caption: 'Pulmonary valve: right ventricle → pulmonary artery. Aortic valve: left ventricle → aorta.' }
    }
];
