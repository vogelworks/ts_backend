import {CoreController} from '../CoreController'
import {loggingConfig} from './logging';
import {connectionConfig} from './connections';
import {serverLog} from './errors';
import {requestPack} from './routing';

export type startReport = {
    middles:{
        success:boolean;
        chain:any;
    };
    handler:{
        success:boolean;
        msg:string;
        further:any;
    };
    controls:any
}

//server health

// Config ///////////////////////////////////////////////////////////

export type serverConfig = {
    type:string|'tcp'|'http'|'ws';
    name:string;
    port:string|number;
    host?:string;
}

// THINGS////////////////////////////////////////////////////////////
export type serverConnection = {
    server:string;
    cid:number;
    socket:any; //net.socket OR http.req
    res?:any; //http.res
    info?:{
        url:string|any,
        path:string[]|string,
        program:string,
        route:string,
    };
    errors:any|serverLog[]
    cookies?:any,
    token?:any,
}

export type serverRequest = {
    server:string;
    cid:number;
    rid:number;
    success:boolean;
    status?:string; //SENT | PENDING
    finish?:boolean; //used to signal midware complete change this
    pack?:requestPack|boolean|string;
    message?;
    info?:{
        url:string;
        path:[string];
        program:string;
        route:string;
    };
    errors:any[];
    error?:serverLog|string;
}

// MANAGER //////////////////////////////////////////////////////////

//
export type routerfn = (message:serverRequest)=>Promise<serverRequest>
export type routefn = (handler:serverRequest,pack:any)=>Promise<serverRequest>
export type authenticatefn = (socker:any)=>any

export type coreControllers = {
    [controls:string]:CoreController // {
    //     [route:string]:routefn;
    // }
}
export type coreManagerConfig = {
    name:string;
    auth:any;
    dev:boolean;
    logging:loggingConfig|boolean;
    servers:serverConfig[];
    upstreams:connectionConfig[];
    controllers?:any; //fuction to start controllers?
}

export type appConfig = coreManagerConfig &{
    dbcreds:{
        user:string;
        pswrd:string;
        db:string;
        cluster:string;
        clusterid:string;
    }
}