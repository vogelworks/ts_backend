
import Events from 'events';
import crypto from 'crypto';
import {connectionConfig,connectionOptions} from '../structures'

/**
 * The GenHandler is the main engine behind the handling of server request.
 * It will work in two ways:
 *
 *   1) handle connections to upstream servers.
 *   2) handle request to this server.
 *
 * The first setup is used by the server in routing to upstreams. Each handler Will
 * have tools to reach out and gather information, In a "connected" mode, any
 * communication through the handler is to the connection.
 *
 * The second setup is used for tracking a request within the server. Any outward
 * connections will have to be declared (or given) to the "standard" communication
 * tools.
 */
export default class GenHandler {
	name='';
	type='';
	auth:{
		user:string; //user code
		session:string; //session code
	}|any;
	connection:connectionOptions; //all of the connection options
	
	socket:any; //used tcp | websocket
	reconnect:any=false;
    reconnects:0|1|number=0; //0=no reconnect 1=will reconnect . also tracks reconnect attempts
	eventer=new Events();
	events:any=[];//olding the active events
	
	ready=false;
	
	data:any='';
	ridline='\r\r\t'
	mesline='\r\r\n'
	
	errorlist:{[errfun:string]:(err:any)=>void}
	logger;
	
	/**
	 * Intakes information passed from the server and starts trying to resolve the
	 * request of the 'reqpack'. Upon creation, the item is stamped and the request is
	 * attempted to be fullfiled. After creation, this.handler.then() can be called
	 * to watch for return of the request.
	 *
	 * @param { object } param0
	 * @param { object } param0.models
	 * @param { object } param0.auth
	 * @param { object } param0.pack - packet describing request
	 * @param { object } param0.connection - describes a server to connect to
	 * @param { LogChannel } param0.logChannel - channel to use for logging
	 */
	constructor({
		name = "",
		type = null,
		auth = null,
		options = null,
		logChannel = null
	}:connectionConfig) {
		this.name = name||'gen-handler';
		this.type = type||'';
		this.auth = auth;
		
		if (options) {//is upstream
			this.connection = options||{port:'',host:''}
			this.logger = logChannel; //setup logging to upstream
			this.errorlist={//init default errors
				'ECONNREFUSED':this.#connection_refused
			}
		}

	}

	/**
	 * used to connect to a server with tcp. Maybe this works with websocket?
	 * Does not get automatically called.
	 */
    connect=()=>{this.socket.connect({port:this.connection.port,host:this.connection.host})}

    ///////////////////////////////////////////////////////////////////////////////
    // Events /////////////////////////////////////////////////////////////////////

	create_event(name,fun){
		this.events[name]=fun;
		this.eventer.on(name,fun);
	}
	close_event(name){
		if(this.events[name]){
			this.eventer.removeListener(name,this.events[name]);
			delete this.events[name];
			return true;
		}return false;
	}
	// Data /////////////

    /**
     * to read in chunks of data and form them into messages. messages will be delivered
     * to the registered events (rid OR MAIN), or to NOROUTE if it cannot resolve. In order
     * to recieve the appropriate message. It is not required to setup event if you intend
     * recieve them through different methods.
     * 
     * You can also override this funtion to  
     */
    chunker=(chnk)=>{
        this.data+=chnk;
        let messages = this.data.split(this.mesline);
        this.data = messages.pop();
        for(let m in messages){
            let [message,rid]:any = messages[m].split(this.ridline);
            try{message = JSON.parse(message)}
            catch{
                //check the message to see if it can be trimmed?
				message = {success:false,msg:'Could not Parse from server',result:false}
            }
			if(this.events[rid]){this.eventer.emit(rid,message)}
			else{this.eventer.emit('NOROUTE',false)}
        }
    }
	//creates an listen event on data using default chunker
	//removes any old data listeners
    ondata=()=>{
        //this.socket.removeListener('data',this.chunker);
        //reset this.data = '';
        this.socket.on('data',this.chunker);
    }

	// Connected ///////

	onconnect=(connect)=>{
		this.ready=true;
		this.reconnects>0&&this.clear_reconnect();
	}

	// Reconnect ///////

    launch_reconnect=()=>{
		let wait = 0;
		if(this.reconnects<=30){wait=5000;}
		else if(this.reconnects<=100){wait=10000;}//extend time
		if(wait>30){//reset to extend interval
			clearInterval(this.reconnect);
			this.reconnect=false;
		}
		this.reconnects++;
		if(this.reconnect!=false)return
		this.ready=false;
        this.reconnect=setInterval(this.connect, wait)
    }
	clear_reconnect=()=>{
		clearInterval(this.reconnect);
		this.reconnect=false;
		this.reconnects=1;
	}

	// Close //////////

	onclose=()=>{
		this.reconnects>0&&this.launch_reconnect();
		//check for open request
		//inform all open requests
	}

	// Errors /////////

	onerror=(err)=>{
		if(this.errorlist[err.code]){
			try{
				this.errorlist[err.code](err);
				return;
			}catch{}
		}
		//do something with other errors
	}

	//will attemt to reconnect
	#connection_refused=(err)=>{
		this.reconnects>0&&this.launch_reconnect()
	}

    request_id(){return `${this.name}-${crypto.randomBytes(20).toString('hex')}`}

	//forward
	//request
	//write
	//close
}
