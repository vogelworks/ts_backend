import {CoreController} from  '../../lib/index'
import crypto from 'crypto';

import {serverRequest,serverConnection} from '../../lib/structures'
import {user,userSession,sessionConnection} from './structures';

let tconfig = {
    routes:[
        {name:"LOGIN"},
        {name:"NEWCONNECTION"},
        {name:"SERVICES"},
        {name:"API"},
        {name:"DOCUMENT"},
        {name:'JAPI'}
    ],
    request_schemes:{
    }
}

export default class AuthController extends CoreController{
    config=tconfig;
    active:{[user:string]:user}={};
    constructor(){
        super('AuthController');
        // setInterval(()=>{console.log('Active ',this.active)},3000)
    }

    /** HTTP
     * Takes user credentials and validates them. If valid the user is added to the
     */
    LOGIN=async(handler:serverRequest,{app="",user="",pswrd=""})=>{
        let connection = this.get_server(handler.server,handler.cid);
        if( connection && (connection.cookies.user_token || connection.socket.headers['authentication'])){
            let code:string = '';
            try{ code = connection.cookies.user_token?connection.cookies.user_token:this.#user_encode(user,pswrd)}
            catch(e){console.error("ERROR finding code ",e)}
            if(!code){return{
                success:false,
                msg:'Could not find user auth',
                result:false
            }}
            let auth = await this.authentication(app,code)
                console.log("Login >>>",app,code,auth?true:false)
                if(auth!=false){
                    try{connection.res.setHeader("Set-Cookie",[
                        `user_token=${auth.user}; HttpOnly; max-age=80000; Path=/LOGIN`,
                        `session_token=${auth.session}; HttpOnly; max-age=8000; Path=/SESSION`,
                    ])}catch{console.error('Error | Setting Cookies ',connection.res)}
                    return {
                        success:true,
                        result:{
                            ...auth
                        }
                    }
                }else{return {
                    success:false,
                    msg:'Could not establish Credentials',
                    result:false
                }}
        }else{return {
            success:false,
            msg:'Incorrect Passing for credentials',
            result:false
        }}
    }

    /**
     * 
     */
    NEWCONNECTION=async(handler:serverRequest,{user,session,bind,binding={}}:
        {user:string,session:string,bind:string,binding?:object})=>{

        let usession = this.#get_session(user,session);//find user session

        if(usession){
            let conname = this.binding_encode(handler.cid,bind,binding); //encode with the binding to ensure proper sharing
            if(bind&&usession.connections[conname]){//increment client listeners on bind
                usession.connections[conname].listeners++;
                return {
                    success:true,
                    msg:'Binding for this connection already exists',
                    result:{bind:usession.connections[conname].service}//what to listen for rid
                }
            }
            let client = this.get_server(handler.server,handler.cid);
            if(client){
                if(bind){ //create bound connection
                    let connection = await this.bind_connection(
                        user,
                        session,
                        client,
                        bind,
                        binding
                    );
                    if(typeof connection == 'string'){switch(connection){
                        case 'NOUPSTREAM':return{
                            success:false,
                            msg:"Upstream Services Not Setup",
                            result:false
                        }
                        case 'BINDFAIL':return{
                            success:false,
                            msg:'Could NOT establish bind to service',
                            result:false
                        }
                    }}
                    usession.connections[conname]=connection;
                    return{success:true,msg:'Service Bind has been setup',result:{
                        bind:usession.connections[conname].service,
                    }}
                }else{ //create / reset main connection
                    //try{usession.connections.main&&usession.connections.main.socket.close()}//close the old connection?
                    //catch{}//
                    usession.connections.main=client;//save new connection as main
                    client.socket.on('close',()=>{this.close_session(user,session)})
                    setTimeout(()=>{usession.connections.main.socket.send("{'user':'something'}"+"\r\r\t"+"MAIN"+"\r\r\n")},3000)//ping client main to confirm
                    return{success:true,msg:'Main Session has been updated',result:{
                        session:session,
                        user:user
                    }}
                }
            }else{return{
                success:false,
                msg:'Could not find connection',
                result:false
            }}
        }else{return{success:false,msg:'Could not validate session'}}//close socket
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////      
    // ROUTES TO OTHER SERVICES ///////////////////////////////////////////////////////////////////////////

    //Router for the services upstream
    SERVICES=async(handler:serverRequest,pack:any)=>{
        let {route}=pack;
        delete pack.route;
        return this.connect.services.request(route,pack)
    }

    //Router for the api upstream. Could be versioned by adding another route and upstream
    API=async(handler:serverRequest,pack:any)=>{
        let {route}=pack;
        delete pack.route;
        return this.connect.api.request(route,pack)
    }
    
    //Router for the api upstream. Could be versioned by adding another route and upstream
    JAPI=async(handler:serverRequest,pack:any)=>{
        let {route}=pack;
        delete pack.route;
        return this.connect.japi.request(route,pack)
    }

    //Router for the api upstream. Could be versioned by adding another route and upstream
    DOCUMENT=async(handler:serverRequest,pack:any)=>{
        let {route}=pack;
        delete pack.route;
        return this.connect.document.request(route,pack)
    }
 
    ///////////////////////////////////////////////////////////////////////////////////////////////////////      
    // authentication /////////////////////////////////////////////////////////////////////////////////////
    /**
     * Takes in a auth code, parses it, and validates it.
     * If authenticated and there is a session token, it will validate the session
     * If authed and no token, one is created
     */
    authentication=async(app:string,code:string,session:false|string=false):Promise<false|{user:string,session:any,authorized:any}>=>{
        if(!code){return false}
        if(code.includes(' ')){
            let [type,jumble]=code.split(' ');
            if(!jumble){return false;}//bad auth code
            code=jumble; //will be without the type
        }
        
        let authorized:false|any=false;
        if(session==false){session = this.#session_token();}//create a session token
        if(!this.active[code]){//user has timed out
            let creds:any = this.#user_decode(code);
            if(!creds){return false;}//bad decode

            //validate creds

            if(true){
                //authorize the user
                authorized = await this.#authorization(app,creds.name);
                if(!authorized){return false;}
                this.active[code]={
                    login:Date.now(),
                    authorization:authorized.settings,
                    sessions:{}
                }
            }else{return false;}//authentication failed
        }
        if(!this.active[code].sessions[session]){
            if(!this.active[code].sessions[session]){
                this.active[code].sessions[session]={
                    user:code,
                    checkin:Date.now(),
                    connections:{},
                    main:null
                }
            }
        }
        return {user:code,session,authorized:this.active[code].authorization};
    }

    //gathers authorization for the user
    #authorization=async(app:string,user:string):Promise<false|{user:string,settings:any,employee:any}>=>{
        let usetts:any = await this.route('GETusersettings',{user})
        if(usetts.success&&usetts.result){
            usetts=usetts.result;
            if(!app || (app=='Office' || app=='Help' || !usetts.access || usetts.access.includes(app))){
                let emp = await this.connect.api.request('GETemployee',{empID:usetts.empID})
                if(emp.success){emp=emp.result}
                else{emp=false}
                return {
                    user:user,
                    settings:usetts,
                    employee:!emp?false:{
                        lName:emp.lName,
                        fName:emp.fName,
                        name:emp.fName+' '+emp.lName,
                        empID:emp.empID,
                        type:emp.type,
                        dept:emp.dept

                    }
                }
            }else{return false}
        }else{return false}
    }

    #user_encode(name:string,password:string):boolean|any{return Buffer.from(`${name}:${password}`).toString('base64')}
    #user_decode(code:string):{name:string,pswrd:string}|false{
        try{
            let [name,pswrd] = Buffer.from(code,"base64").toString('utf8').split(":");
            return {name,pswrd}
        }catch{return false;}
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////     
    // SESSIONS ///////////////////////////////////////////////////////////////////////////////////////////

    //returns a user session
    #get_session=(code:string,session:string):userSession|false=>{
        if(!code || !session){return false;}
        if(this.active[code] && this.active[code].sessions[session]){return this.active[code].sessions[session]}
        return false;
    }
    #session_token():string{return crypto.randomBytes(20).toString('hex');}
    #session_encode(user:string,device:string){return `${user}-${device}`}
    #session_decode(code:string){
        try{
            let [user,pswrd,device]=code.split('-');
            return {user:this.#session_encode(user,pswrd),device}
        }catch{return false;}
    }
    close_session=(user:string,session:string)=>{
        if(this.active[user]&&this.active[user].sessions[session]){
            let rsession = this.active[user].sessions[session];
            for(let c in rsession.connections){
                //see if any of the connections.socket == ression.main
                //do something if not the same connection
                //log conn
            }
            delete this.active[user].sessions[session]
        }else{return false}
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // BINDING ////////////////////////////////////////////////////////////////////////////////////////////

    //create a new bound connection
    bind_connection=async(user:string,session:string,client:serverConnection,bind:string,binding:object={}):Promise<sessionConnection|'NOUPSTREAM'|'BINDFAIL'>=>{
        if(!this.connect.services){return 'NOUPSTREAM'}

        let service = Date.now()+'-'+bind;
        let upstream = await this.connect.services.request(bind,{bindto:service,binding})
        console.log('Upstream ',upstream)
  
        if(upstream && upstream.success){//setup the session bind
            this.connect.services.listen(service,(data:object)=>{//listen to the binded service
                client.socket.send(JSON.stringify(data)+'\r\r\t'+service+"\r\r\n"); //do not do this. instead
            }); 

            //change this to use a listen / forwarding pipe
            let reconnect = ()=>{console.log('Reconnect Bind ')
                this.connect.services.request(bind,{bindto:service,binding});//pass the requesting service, and any other binding info to the service
            };
            this.connect.services.socket.on('connect',reconnect)//for reconnecting to the binded service
            client.socket.on('close',()=>{console.log('Client Closing in Bind');
                this.close_bind(user,session,this.binding_encode(client.cid,bind,binding),bind,service);
                this.connect.services.socket.removeListener('connect',reconnect);
            })

            return {
                service,
                bind,
                socket:client.socket,
                listeners:1
            };
        }else{return 'BINDFAIL'}
    }
    binding_decode(bindcode:string):false|{cid:number,bind:string,binding:object}{
        try{
            let [cid,bind,binding]:any=Buffer.from(bindcode,'base64').toString('utf8').split(":")
            cid = Number(cid);
            binding = JSON.parse(binding);
            return {cid,bind,binding}
        }
        catch(e){console.error('Error | Binding Decode ',e);return false;}
    }
    binding_encode(cid:number,bind:string,binding:object|string='NONE'):string{
        if(typeof binding =='object'){binding=JSON.stringify(binding)}
        else{binding={}}
        return Buffer.from(`${String(cid)}:${bind}:${binding}`).toString('base64');
    }
    //close bind / connection
    close_bind=async(user:string,session:string,bindcode:string,bind:string,service:string)=>{
        this.connect.services.request(bind,{bindto:service,unbind:true}).then((closing:any)=>{//tell the service
            //confirm upstream knows about closing
            //try and send the final response to MAIN connection, OR ->
            //cache the final response from the bind. If user connects to the same session, return and note the cache
            this.connect.services.end_listen(service);
            let usession = this.#get_session(user,session);

            try{usession && delete usession.connections[bindcode]}//if the connection has no responses in cache OR listeners,
            catch(e){console.error('Error | BIND CLOSE ERROR ',e)}
        })
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    clean_users(){}
    clean_sessions(){}
    clean_connections(){}

}