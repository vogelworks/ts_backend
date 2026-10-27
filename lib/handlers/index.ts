import {connectionConfig} from '../structures';
import TCPhandler from './tcp-handler'
import HTTPhandler from './http-handler'

/**
 * This allows us to export the types in a group. each type requires a handler and a start function
 */
const handlers = {
    http:HTTPhandler,
    tcp:TCPhandler
}
export type HandlerTypes = TCPhandler | HTTPhandler;

export function GetConnections(connections:connectionConfig[]):{[name:string]:HandlerTypes}{
    let upstreams:{[name:string]:HandlerTypes}={};
    for(let u in connections){//loop names
        if(connections[u].type){
            let type = handlers[connections[u].type]||false;
            if(type && !upstreams[connections[u].name]){
                upstreams[connections[u].name.toLowerCase()] = new type({
                    ...connections[u]
                    //logChannel:this.logger.CreateChannel(`${upstreams[u].name}-connection`)
                })
            }
        }
    }
    return upstreams;
}
