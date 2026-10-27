// Provider-neutral schema constants. Validation normalizes case locally.
export const Type=Object.freeze(Object.fromEntries(['STRING','NUMBER','INTEGER','BOOLEAN','ARRAY','OBJECT','NULL'].map(value=>[value,value])));
