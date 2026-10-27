import VHPhttpHandler from '../handlers/http-handler';
import {connectionConfig} from '../structures';
let LogManager;

/** Manage Logs
 * 
 *  This is a tool to be shared the app process in charge of monitoring 'child' process logs.
 *  Desired logs can be tracked by sharing the AppLogger in charge of the logs. That AppLogger will
 *  be placed into a dictionary based on the given name as the indentifier. On construction the class
 *  will recieve a config on how the logs should be treated. This is fairly open right now but will
 *  be focused on flagging and storing logs.
 * 
 * @param {string} name - name of application
 * @param {object} config
 * @param {string} config.storage = the method of storage? json , nedb, server?
 * @param {object} config.connection - if storage='server' supply connection options. http handler only for now
 * @param {string} config.folder - optional if saving to a file (storage='json','nedb') if not then default folder
 * @param {array} config.flags - any flags that should be saved. Will store seperatly?
 */
export default class ManageLogs{
    name
    #config:{
        storage:any;
        connection:connectionConfig|false;
        folder:any;
        flags:[];
    }={
        storage:'',
        connection:false,
        folder:'',
        flags: []
    };//the configuration for logging
    applogs={}; //any added AppLogger to be managed
    #external:any=false; //an exteral connection per config
    #saveInterval=3000; //the time interval between saves
    constructor(name?,config?){
        if(LogManager){return LogManager}
        this.name = name;
        this.#config = this.#setConfig(config); //set config. Need to check for valid config
        if(this.#config.storage =='server' && this.#config.connection){//setup the connection
            console.log('Set External ')
            this.#external = new VHPhttpHandler(this.#config.connection)
        }
        if(this.#config.storage){
            setTimeout(()=>{ //wait for server to setup
                this.#saveServerHealth(true)//ensure server has heath document
                setInterval(()=>{ //setup store loop
                    this.SaveLogs()
                },this.#saveInterval)
            },10000);
        }
        LogManager=this;
        return LogManager;
    }

    /** Add Logger
     * 
     *  With a name and logger, adds the logger to 'appslogs'
     * 
     * @param {AppLogger} logger 
     * @returns Boolean
     */
    AddLogger(logger){
        if(logger && logger.name && !this.applogs[logger.name]){
            //make sure the looger is type AppLogger
            this.applogs[logger.name]=logger
            return true;//logger was added
        }
        return false;//could not add logger
    }

    /** Check Logger
     * 
     *  Checks if the logger is registered in Manager
     * 
     * @param {string} name 
     * @returns {boolean}
     */
    CheckLogger(name){
        if(this.applogs[name]){return true}
        else{return false}
    }

    /** Catch Errors
     * 
     *  Loops through all loggers and checks if there are any new error logs in them.
     *  If there are, these channels are retrieved and handled per config. As the errors
     *  are retrieved, that applogs errors channel is purged. Doing this will override any
     *  storage config in that applog
     */
    CatchErrors(){
        let errors:any = [];
        for(let al in this.applogs){
            let lerror = this.applogs[al].RetrieveChannel('errors');
            if(lerror.length>0){errors=[...errors,...lerror]}
        }
        if(errors.length>0){return errors}
        else{return false}
    }

    /**
     * Organize the saving of this servers logs to the required location. Server is the focus
     * for right now.
     */
    SaveLogs(){
        let health = true;
        for(let a in this.applogs){
            let channels = this.applogs[a].GetChannels();
            for(let c=0;c<channels.length;c++){
                let chanlog = this.applogs[a].RetrieveChannel(channels[c],{purge:true}) //get and purge logs in channel
                let saver:any = null;
                switch(chanlog.length>0?this.#config.storage:'PASS'){
                    case 'server':{
                        health&&this.#saveServerHealth(); //only save health once
                        health=false;
                        this.#saveToServer(chanlog,a,channels[c])
                        break;
                    }
                    case 'PASS':{break;}
                    default:{
                        //what to do if no storage type
                    }
                }
                if(saver){
                    saver.then(saved=>{
                        if(!saved){// merge non save chanlog back into channel
                            this.applogs[a].PushChannel(channels[c],chanlog)
                        }
                    })
                }
            }
        }
    }

    /**
     * Takes an array and attempts to send it to an external server. This
     * external server needs to have an endpoint of 'SAVEchannel' or else
     * it will fail.
     * 
     * @param {array} logs 
     * @param {string} logger 
     * @param {string} channel 
     * @returns 
     */
    #saveToServer(logs,logger,channel){
        try{
            this.#external.request({
                body:{
                    app:this.name,
                    logger:logger,
                    channel:channel,
                    logs:logs
                },route:'SAVEvapichannel'
            }).then(loga=>{
                
            })
        }catch(e){console.log('Logging Save to server error ',e)}
    }

    /**
     * Compiles the health of the server and sends it to the database. It will look for the server name first
     * then loop through and attach all other items as "children" in .modules. The actual server's health is
     * stored in .health.
     * THe function has an 'ensure' boolean that will only ensure the server health document exists in the database
     * already. This will be called at construction. It will insert a blank document to the database, but not update any
     * server health information when ensure=true.
     * 
     * @param {boolean} ensure
     */
    #saveServerHealth(ensure=false){
        let serverHealth = {
            name:this.name,
            routes:{},
            modules:{}
        }
        try{
            if(ensure){
                this.#external.request({
                    body:{
                        db:'Logs',
                        collect:'ServerHealth',
                        method:'QUERY',
                        options:{query:{name:this.name}}
                    },route:'ROUTEmart'
                }).then(a=>{
                    if((a.success && a.result.length == 0) || !a.success){
                        this.#external.request({
                            body:{
                                db:'Logs',
                                collect:'ServerHealth',
                                method:'INSERT',
                                options:{docs:serverHealth}
                            },route:'ROUTEmart'
                        })
                    }
                })
            }else{
                for(let x in this.applogs){
                    if(this.applogs[x].name==this.name){serverHealth.routes=this.applogs[x].errors.CheckHealth()}
                    else{serverHealth.modules[this.applogs[x].name] = this.applogs[x].errors.CheckHealth()}
                }
                this.#external.request({
                    body:{
                        db:'Logs',
                        collect:'ServerHealth',
                        method:'UPDATE',
                        options:{
                            query:{name:this.name},
                            update:serverHealth
                        }
                    },route:'ROUTEmart'
                })
            }
        }catch(e){console.log('Logging Error saving server health ',e)}
    }

    /**
     * Appends an array of logs to the provided loggers channel file. This really
     * could be broadened to handle all file types, but json is the only one used
     * now anyway (outside of nedb).
     * @param {array} logs 
     * @param {string} logger 
     * @param {string} channel 
     */
    #saveToJSON(logs,logger,channel){

    }


    /** Retrieve Logs
     * 
     *  Tries to access a logger's channel with the logger and channel name.
     *  You can also pass options for the AppLogger to use. Failure will return 
     *  a false boolean, otherwise an array is returned.
     *  
     * @param {string} logger 
     * @param {string} channel 
     * @param {object} options 
     * @returns {array | false}
     */
    RetrieveLogs(logger,channel,options){
        if(this.CheckLogger(logger) && this.applogs[logger].CheckChannel(channel)){
            return this.applogs[logger].RetrieveChannel(channel);
        }else{return false}
    }
    
    /** Set Config
     * 
     *  Function to build the config. Will ensure all the needed elements are
     *  in the config even if the config was not passed to the class
     * 
     * @param {Object} c - empty, partial, or full config
     * @returns {object}
     */
    #setConfig(c:any = {}){
        return {
            storage:c.storage || '',
            connection:c.connection || false,
            folder:c.folder || '',
            flags:c.flags || []
        }
    }
}