
import {serverLog} from './errors'
import {requestPack} from './routing'



export type connectionOptions = {
    host:string;
    port:number;
    path?:string;
    method?:string;//GET POST DELETE
    header?:{
        [prop:string]:string
    }
}

export type connectionConfig = {
    name:string;
    type:'tcp'|'http'|null;
    auth:{
        user:string;
        session:string;
    }|null;
    options:connectionOptions|null;
    logChannel?;
}