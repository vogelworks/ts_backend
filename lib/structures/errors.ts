
type logInfo = {
    [other:string]:any
}

export type serverLog = {
    server:string;
    protocol:string;
    rid:number;
    cid:number;
    type:string;
    tags:string[];
    info:logInfo;
    error:boolean;
    msg:string;
}