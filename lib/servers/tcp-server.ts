import net from 'net';
import {CoreServer} from './CoreServer'
import {serverConfig,serverRequest,serverConnection} from '../structures'

export class TCPServer extends CoreServer {
    constructor(config:serverConfig){
        super(config);
        this.type='tcp';
    }
    
    start_server=(config)=>{
        return net.createServer(config)
    }

    accept_connection(socket,res){
        let conn = super.accept_connection(socket,res);
        return conn
    }

    parse_data(data:any):[boolean,string,any[]]{
        let messages = data.split(this.mesline)
        data = messages.pop();
        return [true,data,messages];
    }

    request_response(req:serverRequest|false,connection:serverConnection):serverRequest|any{
        let [message,request] = super.request_response(req,connection);
        if(!request){return false;}
        if(!connection){return request;}
        // console.log('Sending',request.rid)
        connection.socket.write(message+this.ridline+request.rid+this.mesline);
        request.status="SENT";
        return request;
    }
}