import { CoreManager } from "./CoreManager";
import AppLogger from "./logging/AppLogger";

type routeMessage = {
    success: boolean;
    msg: string;
    result: any;
};
/** Core Controller
 *
 * This is used to enstend all custom controllers for the API. After constructing the custom
 * controller you can call SETUPcontrols to 'release' the routes in the controller.
 *
 * Once set up, each controller will have access to
 * - other api routes
 * - upstream connections connect to the server
 * - access to the controller's logging
 *
 */
export class CoreController {
    name: string;
    core: CoreManager;
    connect: { [name: string]: any }; //upstream connections
    logger: AppLogger;
    /**
     * @param { string } name - The name of the controller being setup
     */
    constructor(name: string) {
        this.name = name; //Controller name

        let { connect, get_server, servers } = new CoreManager();
        if (connect) {
            this.connect = connect;
        }
        if (get_server) {
            this.get_server = get_server;
        }
        //this.logger = new AppLogger(name) //setup logging for controller
    }

    route = async (
        name: string,
        pack,
        request?: any,
    ): Promise<routeMessage> => {
        return { success: true, msg: "routes not setup", result: false };
    };

    //will be passed from the CoreManager.
    get_server = (name: string, cid: number): any => {};
}
