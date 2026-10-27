import LogChannel from './LogChannel';
import ErrorHandler from './ErrorHandler';
import ManageLogs from './ManageLogs';
/** App Logger
 *  
 * The class can be used to collect logging from different parts of the program, and organize
 * them into channels. There is a 'main' and an 'errors' channel created automatically, but more can be added.
 * Logs are added by giving a channel name and msg to 'channels'.
 * 
 * Channels are a class of their own and will remain active and filling until they are stored,
 * cleared, or removed entirely. Channel logs can be setup independantly of each other, giving
 * flexibility for unique needs.
 * 
 * Config can be passed for setup. If using ManageLogs some of the config will be overwritten.
 * 
 * @param { string } name - name for group.
 * @param { objec } config - passed as a default config to be attached to all channels
 * @param { string } config.module - module name to help "link" logs from similar modules
 * @param { object[] } config.channels - an array holding any channels needing be setup at time of construction {name}
 */
export default class AppLogger {
    #channels:{[channel:string]:any} = {}; //dictionary of created log channels
    #channelConfig = {}; //lookup for channel
    errors = new ErrorHandler();
    name:any;
    config:any;
    constructor(name = 'application', config:any = {}) {
        this.name = name; //to distinguish one servers logs from another
        this.config = config; //config for the logger itself
        this.CreateChannel('main'); //create a 'main' channel
        this.CreateChannel('errors'); //setup 'errors' channel
        if (config) {
            if (config.channels && config.channels.length) { //setup channels from config
                for (let x = 0; x < config.channels.length; x++) {
                    this.CreateChannel(config.channels[x].name)
                    this.#channelConfig[config.channels[x].name] = config.channels[x];
                }
            }
            if(config.module){//attach server to ManageLogs
                try{
                    let AddLogger = new ManageLogs().AddLogger;
                    if(AddLogger){AddLogger(this.name)}//, { module: config.module });}
                }catch(e){console.log('failed to attach ',config.module)}
            }
        }
    }

    /** Channel Log
     * Used to log messages to a channel
     * 
     * @param { object | string } msg - msg to log in channel
     * @param { string } [name] - channel to log to (defaults to 'main')
     */
    channels(msg, name = 'main') {
        if (name && this.#channels[name]) {
            if (msg.error) {
                msg.error = this.errors.AcceptError(msg.error);
                name = 'errors'
            } //redirect to errors channel
            return this.#channels[name].log(this.#attachLogInfo(msg))
        }
        else { console.log('Cannot Access Channel', this.name) }
    }

    /** Attach Log Info
     *  
     * Takes in a msg being logged and tries to attach the needed config
     * to it. If the msg is a string nothing is attached and the string
     * is passed through.
     * 
     * @param { object | string } msg - message pack to log 
     * @returns { object | string }
     */
    #attachLogInfo(msg) {
        if ('string' == typeof msg) { return msg };
        return {
            ...msg,
            logger: this.name,
            module: this.config && this.config.module ? this.config.module : msg.module ? msg.module : ''
        }
    }


    /** Create Channel
     *  Creates a new NAMED channel and adds it to the logger 
     * 
     *  @param { string } name - the name of channel
     */
    CreateChannel(name:string|null = null) {
        if (name && typeof name == 'string') {
            this.#channels[name] = new LogChannel(name)
            return this.#channels[name];
        } else {
            console.log('Log Channel not created')
            return false;
        }
    }

    /**
     * Returns the channel names registred in this AppLogger as an array
     */
    GetChannels() {
        let chans:any = [];
        for (let c in this.#channels) {
            chans.push(c);
        }
        return chans;
    }

    /**
     * Takes a array of logs and tries to add it to a channel of the provided
     * name. If the channel exists and the logs are pushed onto the channel, TRUE
     * is return. Otherwise FALSE is returned.
     * 
     * @param {string} name - channel name
     * @param {array} logs - array to add to channel
     * @returns TRUE | FALSE
     */
    PushChannel(name, logs) {
        if (this.CheckChannel(name)) {
            return this.#channels[name].addLogs(logs)
        } else { return false }
    }

    /** Clear Channel
     * 
     * Clear the logs of a channel. Does not remove the channel
     * 
     * @todo - want to return the logs that were cleared
     * 
     * @param { string } name - channel to clear
     */
    ClearChannel(name) {
        if (name && this.#channels[name]) {
            this.#channels[name].clearLogs();
        } else { console.log('Channel does not exist', this.name) }
    }

    /** Check Channel
     * 
     * Checks if the channel exists in this logger
     * 
     * @param { string } name 
     * @returns { boolean }
     */
    CheckChannel(name) {
        if (this.#channels[name]) { return true }
        else { return false }
    }

    /** Retrieve Channel
     * 
     * A way to get the logs from the channel. Can pass 'options' object as second argument
     * to go further with retrieved data, like 'purge' and clear the channel
     * 
     * @param { string } name - of channel
     * @param { object } options
     * @param { boolean } [options.purge] - to clear the channel or not after storing (defaults to TRUE)
     */
    RetrieveChannel(name, options = { purge: true }) {
        let list = [];
        if ((name && this.#channels[name])) {
            list = this.#channels[name].viewLogs() //get channel logs
            options.purge && this.ClearChannel(name); //clear channel if purge
        } else { console.log('Specify a Channel OR all', this.name) }
        return list;
    }
}
