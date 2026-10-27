import net from 'net'
import GenHandler from './gen-handler'
import {connectionConfig} from '../structures'

/**
 * Handler for a client tcp connection OR for a 
 */
export default class TCPhandler extends GenHandler{
    constructor(pack:connectionConfig,reader=()=>{console.log('Second Read')}){
        super(pack)
        this.reconnects=1;
        //if this.connection, set one up
        this.socket = new net.Socket();
        this.socket.setEncoding('utf8');
        this.socket.on('connect',this.onconnect);
        this.ondata();
        this.connect();
        this.socket.on('close',this.onclose);
        this.socket.on('error',this.onerror);
        this.socket.on('timeout',()=>{
            console.log('Connection has not responded in set time');
        })
        this.eventer.on('NOROUTE',(data)=>{
            console.log('NO rid',data);
            //do something 
        })
    }

    //forward()

    /**
     * 
     */
    listen(name:string,callback:(data)=>void){return new Promise((resolve,reject)=>{
        this.create_event(name,callback);
    })}

    end_listen(name:string){
        //this.close_event(name);
    }

    /**
     * ask a connect socket for information
     */
    request(route,pack:any){return new Promise((resolve,reject)=>{
        if(this.ready){
            let rid = this.request_id();
            let runner = (data)=>{
                this.close_event(rid);
                return resolve({success:true,...data})
            }
            this.create_event(rid,runner);//setup event for response
            pack.route = route;//attach the route name to the pack
            // console.log("mart ",rid);
            this.socket.write(JSON.stringify(pack)+this.ridline+rid+this.mesline)
            
        }else{return resolve({success:false,msg:'Could not Connect'})}
    })}
}