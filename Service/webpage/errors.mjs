export function webpageError(message,field='',code='WEBPAGE_VALIDATION_FAILED'){
    return Object.assign(new Error(message),{code,field,repairHint:message,validationRule:code,stage:'webpage-validation'});
}
