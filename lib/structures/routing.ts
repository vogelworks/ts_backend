export type requestPack = {
    route?:string,
    [p:string]:any
}

export type routeMessage = {
    result:{
        success:boolean;
        msg:string;
        result:any
    };
    error?:{
        name:string;
        msg:string;
        route:string
    }
}

// ROUTE CONFIG //////////////////////////////////////////////////////////

export type routeConfig = {
    name:string,
    models?:any,
    schemes?:any
}

export type request_schemaConfig = {
    [p:string]:{
        required?:boolean;
        type?:'string'|'object'|'array'|'number'|'boolean';
        desc?:string;
        default?:any;
        object?:object
    }
}

export type controllerConfig = {
    routes:routeConfig[];
    request_schemes:{[rs:string]:request_schemaConfig}
}

type routepack = {[prop:string]:any;} //want this to be a base for custom packs
