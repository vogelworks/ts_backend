import {CoreServer} from './CoreServer';
import { WebSocketServer } from 'ws';
import {serverConfig,serverRequest,serverConnection} from '../structures'

export class WSServer extends CoreServer{
    constructor(config:serverConfig){
        super(config);
        this.type='ws'
    }
    start_server=(config)=>{
        this.listening=true;
        return new WebSocketServer({port:this.port});
    }
    accept_connection(socket,res){
        let conn:any= super.accept_connection(socket,res);
        // console.log('WS ',res.headers)
        conn.cookies = this.parse_cookies(res.headers['cookie'])
        return conn;
    }
    parse_data(data:any):[boolean,string,any[]]{
        let messages = data.split(this.mesline)
        data = messages.pop();
        return [true,data,messages];
    }
    request_response(req:serverRequest|false,connection:serverConnection):serverRequest|false{
        let [message,request] = super.request_response(req,connection);
        if(!request){return false;}
        if(!connection){return request;}
        connection.socket.send(message+this.ridline+request.rid+this.mesline);
        request.status="SENT"
        return request
    }
}