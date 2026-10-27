import http from 'http'
import {CoreServer} from './CoreServer'
import {serverConfig,serverRequest} from '../structures'

export class HTTPServer extends CoreServer {
    constructor(config:serverConfig){
        super(config);
        this.type='http'
    }
    
    start_server=(config)=>{
        return http.createServer(config)
    }

    accept_connection(socket:any,res:any){
        let conn = super.accept_connection(socket,res);
        conn.info = {//provides information about the requester
            url: URL.parse(conn.socket.url), //full path request
            path: conn.socket.url.split('/'),
            program:'',
            route:''
        }
        conn.cookies = this.parse_cookies(socket.headers['cookie'])
        try{
            conn.info.program = conn.info.path[1] != undefined ? conn.info.path[1].toUpperCase() : '';
            conn.info.route = conn.info.path[1] != undefined ? conn.info.path[1].toUpperCase() : '';
        }catch{}
        return conn
    }

    request_response(req:serverRequest,connection):serverRequest|false{
        let [message,request] = super.request_response(req,connection);
        if(!request){return false;}
        if(connection==false){return request;}
        connection.res.write(message);
        connection.res.end();
        request.status="SENT"
        return request;
    }

    parse_data(data:string):[boolean,string,any[]]{
        return [true,data,[data]]
    }
}