//import ws from 'ws';
import GenHandler from './gen-handler'
import {connectionConfig} from '../structures'

class WSHandler{
    name='test';
    runners= {};
    streams={};
    socket;
    user=false;
    session=false;
    authenticated=false;
    constructor({address,user,session},config:connectionConfig){
        this.socket= new WebSocket(address);
        this.socket.addEventListener("open", (event) => {
            this.request('NEWCONNECTION',{user:user,session:session}).then(auth=>{
                if(auth&&auth.success){
                    this.authenticated=true;
                    this.session=auth.session;
                    this.user=auth.user;
                }
            });
        });
        // Listen for messages
        let data:any = '';
        let noroute = new CustomEvent('NOROUTE',{
            detail:{data:null}
        })
        let main = new CustomEvent('MAIN',{ //to accept main connections if needed
            detail:{data:null}
        })
        this.socket.addEventListener('NOROUTE',(result)=>{
            console.log('NO rid',result.detail.data)
        })
        this.socket.addEventListener("message", (event) => {
            data+=event.data;
            let messages = data.split(':/n');
            data = messages.pop();
            for(let m in messages){
                let [message,rid]:any[] = messages[m].split(':/t');
                if(!message){message={'success':false,'msg':'Could not parse Server Message','result':false}}
                try{message=JSON.parse(message);}
                catch{}
                let runner:any = false; //false or runner event
                if(rid=='MAIN'){runner = main;}
                else if(this.runners[rid]){runner=this.runners[rid]}
                else{runner=noroute;}
                runner.detail.data=message;
                this.socket.dispatchEvent(runner)
            }
        });
    }

    /**
     * for when you want to establish another connection with the WS. This is run on intial start to connect
     * the socket to a 'main' session connection. You COULD use this to establish another 'main' connection,
     * but you would more use this to setup a new binding.
     */
    new_connection(bind:string,stream:boolean=false):Promise<any>{return new Promise((resolve,reject)=>{
        let timeout = 0;
        !this.authenticated&&(timeout=3000)
        setTimeout(()=>{
            if(this.authenticated){
                return this.request('NEWCONNECTION',{session:this.session,bind:bind})
            }else{return resolve(false)}
        })
    })}
    request_id(){return `${this.name}-${Date.now()}`}
    request(route,pack):Promise<any>{return new Promise((resolve,reject)=>{
        if(this.authenticated||route=='NEWCONNECTION'){
            let rid = this.request_id();
            this.runners[rid] = new CustomEvent(rid,{
                detail:{data:null}
            })
            this.socket.addEventListener(rid,(result)=>{
                this.socket.removeEventListener(rid,this.runners[rid])
                return resolve({success:true,...result.detail.data})
            });//setup event for response
            //setup error event
            pack.route = route;//attach the route name to the pack
            this.socket.send(JSON.stringify(pack)+':/t'+rid+':/n')
        }else{return resolve({success:false,msg:'Could not Connect'})}
    })}
    stream(name:string,callback:(result:object)=>any):Promise<any>{return new Promise((resolve,reject)=>{
        let event:any|false = false;
        name = name+"-"+this.session;
        if(!this.stream[name]){
            event = new CustomEvent(name,{
                detail:{data:null}
            });
            this.stream[name]=event
        }else{event=this.stream[name]}
    })}
}
