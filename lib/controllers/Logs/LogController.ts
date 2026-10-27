import {CoreController} from '../../CoreController';
import ManageLogs from '../../logging/ManageLogs';

/** Log Controller
 *  
 *  Will help in both viewing and 'pushing' logs within the server. Routes will be exposed to both
 *  internal controllers, as well as outside clients. The controller will work closely with the 
 */
export default class LogController extends CoreController {
    serverlogs;
    applogs
    constructor() {
        super('LogController');
        this.serverlogs = new ManageLogs(); //connect to server loggers
        //console.log('Setup Log Controls >', this.SETUPcontrols(require('./logconfig.js')));
    }

    /** Get server logs
     * 
     * Will get the channel logs from a specific logger. If channel
     * is not provided the 'main' channel is returned.
     * 
     * @param { object } handler
     * @param { object } pack
     */
    GETserverlogs = (handler, pack) => {
        return new Promise(async (resolve, reject) => {
            let {
                logger,
                channel,
                all,
                peak
            } = pack;

            let response:any = {
                success: false,
                result: false,
                msg:undefined
            }
            if (this.serverlogs.CheckLogger(logger)) {
                if (this.serverlogs.applogs[logger].CheckChannel(channel)) {
                    response.result = this.serverlogs.RetrieveLogs(logger, channel, { purge: !peak });
                    if (response.result) { response.success = true }
                }
            } else { response.msg = 'need a valid logger name'; }
            return resolve(response)
        })
    }

    #logErrors = () => {
        return new Promise(async (resolve, reject) => {
            let allerrors = this.applogs.CatchErrors();
            if (allerrors) {
                //send to upstream if there are logs
                /* //can uncomment when we have an endpoint
                this.connect.log.request({
                    body:{
                        type:'errors',
                        logs:allerrors
                    },
                    route:'ProcessErrors'
                }).then(a=>{
                    return resolve(true)
                })
                */
            } else { return resolve(true) }
        })
    }
}