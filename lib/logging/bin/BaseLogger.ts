export default class BaseLogger{
    #active=false; //is the logger still active?
    #firstMsg; //the  message since first active
    #logs:any = [] //array for nested logs
    purge
    constructor(msg){
        this.purge = false;//to say if the "final" msg has been sent
        if(msg){
            if(typeof msg =='string'){
                return this.log({msg:msg});
            }
            //is an object
            if(msg && msg.start){
                msg.timecheck=Date.now(),
                this.#firstMsg=msg;
                this.#active=true;
                return this
            }
            return this.log(msg);
        }else{
            console.log('Bad Log Pack')
        }
    }

    /** Log
     *  Used only if msg is not string
     * 
     * @param {Object} pack - described below
     * 
     * @param {String} msg - text for the log
     * @param {Boolean} error - to say if is error
     * @param {String} code - the associated with log
     * @param {Boolean} start - marks the beginning of a log string
     * @param {Boolean} end - marks the end of a log string
     */
    log(pack){
        let logitem = {
            ...pack,
            timecheck:Date.now(),
            timelapse:this.#active?(Date.now()-this.#firstMsg.timecheck):0
        }
        if(this.#active && logitem.final){
            this.purge=true;
        }
        this.#logs.push(logitem);
        return logitem;
    }

    /** Purge Logs
     * 
     *  Returns the available logs
     * 
     * @returns logs
     */
    purgeLogs(){return this.#logs}
}