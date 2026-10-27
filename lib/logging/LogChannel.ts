import BaseLogger from './bin/BaseLogger';
/** Log Channel
 *  
 * Log channels are used to put and hold logs related to each other. Channels do not have strict
 * definitions and could range from 'main' (default with any AppLogger), or 'error' (optional for
 * AppLoggers), the channel does not care.
 *  
 * The biggest feature in here is the ability to chain related logs together. This is done by passing
 * 'start' and a 'process' to the 
 * -Setup the appropriate Channel type
 * -Manage channel Access
 * -Perform
 *  
 * @param {string} name - Name of the channel
 */
export default class LogChannel{
    #logger:any=BaseLogger //A specific type of logging class. Using BaseLogger only right now
    #logs:any = [] //array of all logs
    #active = {} //dictionary for all active log strings
    name;

    constructor(name){
        if(name){this.name=name}
        //else{return undefined}//cannot careate un named channels
    }

    /** Log
     *  Takes in a msg of either string or object and attaches it to the logs array. If the log
     *  is marked with start, a string of logs is run until '
     * 
     * @param {string | object} msg 
     */
    log(msg:any=null){
        if(msg){
            if(msg && msg.span && this.#active[msg.span] || (msg && msg.start)){//handle active logging
                if(msg.start){
                    this.#stopActive(msg.span);
                    this.#startActive(msg);
                }
                let aspan = this.#active[msg.span];
                if(aspan.purge){
                    return this.#stopActive(msg.span)
                }
            }else{
                this.#logs.push(new this.#logger(msg))
            }
        }else{console.log('No Message')}
    }

    /** View Logs
     * 
     * @returns Array of channel logs
     */
    viewLogs(){return this.#logs;}

    /**
     * clears the logs array
     * @todo - what to do with active strings when clearing
     */
    clearLogs(){
        this.#logs = [];
    }

    /**
     * adds a list of logs to the channels logs array. If it was done successfully
     * TRUE is returned. If not, FALSE. This does not check if the log already exist
     * in the logs array
     * @param {array} newLogs 
     */
    addLogs(newLogs){
        if(newLogs.length&&this.#logs.length>0){
            this.#logs = [...this.#logs,...newLogs];
            return true;
        }else{return false;}
    }
    /* PRIVATE */

    /** Start Active
     * 
     *  If this is used the log is an ongoing "array" log. The process
     *  being logged is being started.
     * 
     * @param {object} msg 
     */
    #startActive(msg){
        this.#active[msg.span] = new this.#logger(msg);
        this.#logs.push({ span:msg.span,active:true,group:[]})
    }
    /** Stop Process
     * 
     *  Given an ongoing process name, stops said process.
     * @param {string} span 
     */
    #stopActive(span){
        let proc:any;
        let plogs:any=false;
        for(let x=0;x<this.#logs.length;x++){
            if(this.#logs[x].active && this.#logs[x].span==span){
                proc=this.#logs[x];
                break;
            }
        }
        if(proc){
            plogs = this.#active[span].purgeLogs();
            proc.group.push(...plogs)
            proc.active=false;
        }
        delete this.#active[span]
        return plogs;
    }
}