/**
 * Checks the request input against the required scheme object
 * Recursive to handle nested properties
 * 
 * @param {object} pack = request input object
 * @param {object} scheme = scheme object
 * @param {object} tracker = does not get passed to, default to empty
 */
export function checkScheme(pack={},scheme,tracker={}){
    for(let s in scheme){//loop through scheme
        let required=false, type='any';
        //let fullname = parentprop != '' ? parentprop + '.' + s : s;
        if(scheme[s].required){required=true}
        
        if('object' in scheme[s]){type='object'}
        else if(scheme[s].type){type=scheme[s].type}

        if(!pack[s]){//is required by scheme, does not exist in pack
            if(scheme[s].default){
                pack[s]=scheme[s].default;
                tracker[s]=true; //mark as true becuase default exists
            }
            else if(required){//there is no default and it is required
                tracker[s] = {
                    checkError:true,
                    required:true,
                    needType:type,
                    msg:'Field is Required',
                    object:scheme[s].object?JSON.stringify(scheme[s].object): undefined,
                    desc:scheme[s].desc || ''
                }
            }
        }else{//item does exists in pack
            let ptype = getType(pack[s]);
            if(ptype != type && type != 'any'){ //type does not match
                tracker[s] = {
                    needType:type,
                    isType:ptype,
                    msg:'Type Did not match scheme type',
                    desc:scheme[s].desc || ''
                }
            }else if(type == 'object'){ //scheme contains an object that needs to be checked
                tracker[s]=checkScheme(pack[s],scheme[s].object);
            }else{//check passed
                tracker[s]=true;
            }
        }
    }
    return tracker;
}

/**
 * Takes in an "error list" object to test for successful validation
 * @param {*} object
 * @returns "validation object" = { success: Boolean, errors: Object, newdata: Object}
 */
export function validateObject(object,nestObj=object,resp={success:true,errors:{}}) {
    for (let ea in nestObj) {
        if(typeof nestObj[ea] == 'object'){
            if(nestObj[ea].checkError){//an error was found
                resp.success=false;
                break;
            }else{return validateObject(object,nestObj[ea],resp)}
        }
    }
    if (!resp.success){
        resp.errors = object;
    }

    return resp;
}

/**
 * Figures out what a variable's data type is
 * @param {*} data = variable to be tested
 * @returns string reflecting data type
 */
function getType(data) {
    if (data === undefined) { return 'undefined' }
    if (data === null) { return 'null' }                      // should this be expanded on?

    switch (typeof data) {
        case 'number':
        case 'string':
        case 'boolean':
        case 'function':
            return typeof data;
            break;
        case 'object':
            if (Array.isArray(data)) { return 'array' }
            else { return 'object' }
            break;
        default:
            return 'BROKEN'
            break;
    }
    /**
     * Data Types = {
     *      string
     *      number
     *      boolean
     *      object
     *      function
     * }
     *
     * objects = {
     *      Object
     *      Date
     *      Array
     *      String
     *      Number
     *      Boolean
     *      null
     * }
     */
}