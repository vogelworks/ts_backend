import {TCPServer} from './tcp-server'
import {HTTPServer} from './http-server'
import {WSServer} from './ws-server'

export type ServerTypes = TCPServer | HTTPServer | WSServer;

/**
 * will return a server of the provided type. If the type does not match an available type OR something went
 * wrong, false is return. Otherwise the appropriate server will be returned.
 */
export function GetServer(config):any{
    if(!config){return false}//nothing was passed
    //config.type = config.type?config.type.toLowerCase():''
    switch(config.type){
        case 'tcp':{return new TCPServer(config);}
        case 'http':{return new HTTPServer(config);}
        case 'ws':{return new WSServer(config);}
    }
    return false
}