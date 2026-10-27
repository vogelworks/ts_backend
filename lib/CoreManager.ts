import { GetConnections, HandlerTypes } from "./handlers";
import { GetServer, ServerTypes } from "./servers";
import { CoreController } from "./CoreController";
import ManageLogs from "./logging/ManageLogs";
import { validateObject, checkScheme } from "./bin/request-validation";

import {
    connectionConfig,
    serverConfig,
    serverRequest,
    requestPack,
    routefn,
    request_schemaConfig,
} from "./structures";

/** Control Manager
 *
 * Manage required servers
 *  request queues
 *
 * Manage the controllers.
 * Manage the connections to other servers
 *
 * Is initialized
 * instance of the class. On initial construction it needs a type and the controls of the server.
 * After this class can be added to and shared by "new". It is possible to pass more controls
 * when / before sharing, but not possible to change the connection type.
 *
 * Holds access to:
 * - Upstreams connected to server
 * - All 'added' server logs
 * -
 * @param { object } param0
 * @param { string } param0.type - the connection type passed to CoreConnections
 * @param { } param0.controllers
 * @param { object } param0.controls - the controls to install
 *
 */
export let CoreControl: CoreManager | null = null;
export class CoreManager {
    health: any = {
        servers: {
            requested: 0,
            starting: 0,
            listening: 0,
        },
    };

    servers: any;
    connect: { [name: string]: HandlerTypes }; //GenHandlers

    #routes: { [name: string]: routefn } | {} = {}; //{[fn:string]:(handler:serverConnection,pack:reqPack)=>any};
    #request_schemes: object = {};

    logger: ManageLogs;

    constructor(config?: any, route?) {
        if (CoreControl) {
            return CoreControl;
        }

        if (config) {
            //check if there is a config at all
            CoreControl = this; //to share during setup / future
            if (route) {
                this.route = route;
            } //attach custom route

            //this.logger = this.#SETUPlogging(config.name,config.logging);
            this.servers = this.#SETUPservers(config.servers);
            setTimeout(() => {
                //start looking into issues
                console.log("Health ", this.health);
            }, 3000);
            if (this.servers) {
                this.connect = this.#SETUPconnections(config.upstreams);
                config.controllers &&
                    this.#SETUPcontrollers(config.controllers);
            }
            return this;
        }
    }

    get routes() {
        return Object.freeze(this.#routes);
    }
    get request_schemes() {
        return Object.freeze(this.#request_schemes);
    }

    ////////////////////////////////////////////////////////////////////////////////
    // ROUTING /////////////////////////////////////////////////////////////////////

    auth = async (socket) => {
        return true;
    };

    router = (request: serverRequest | any): Promise<any> => {
        return new Promise((resolve, reject) => {
            console.log(
                `Route Name ${request.pack ? request.pack.route : "NONE"} >> ${request.cid}-{request.rid}`,
            );
            if (
                request.pack &&
                typeof request.pack != "boolean" &&
                typeof request.pack != "string"
            ) {
                this.route(request.pack.route, request.pack, request)
                    .then((message) => {
                        request.message = message;
                        return resolve(request);
                    })
                    .catch((e) => {
                        //catch any route errors. Do more to clean up after it
                        console.error(
                            `Returned By Route ${request.pack.route}`,
                            e,
                        );
                        request.message = {
                            success: false,
                            msg: "There was an error in upstream route",
                            result: {
                                route: request.pack,
                            },
                        };
                        e.request = request;
                        return reject(e);
                    });
            } else {
                //worst case, bad pack
                request.message = {
                    success: false,
                    msg: "Bad Request Pack",
                    result: false,
                };
                return resolve(request);
            }
        });
    };

    /**
     * The default is to us the installed controllers to route the request. This route function
     * can be overrided by passing a 'route' function into the constructor of CoreManager. If using
     * a custom route, remember that it will run within the router function and will not catch all
     * of the possible errors from your route. Please ensure appropriate error handling is done and
     * passed as a response
     */
    route = (
        name: any | string | [],
        pack: requestPack,
        handler: serverRequest,
    ) => {
        return new Promise((resolve, reject) => {
            name = name.toUpperCase();
            let runner: routefn | null = null;
            if (this.#routes[name]) {
                runner = this.#routes[name];
            } //if there is only one route name
            else {
                //otherwise try the first part of the path
                let path = name.split("/")[0];
                if (this.#routes[path]) {
                    runner = this.#routes[path];
                    //reform the route to exclude the path being routed
                    name = name.split("/");
                    name.splice(0, 1);
                    pack.route = "";
                    if (name.length == 1) {
                        pack.route = name[0];
                    } else {
                        for (let n = 0; n < name.length; n++) {
                            if (n > 0 && name[n]) {
                                pack.route += "/";
                            }
                            if (name[n] != "") {
                                pack.route += name[n];
                            }
                        }
                    }
                }
            }
            if (runner) {
                if (this.#request_schemes[name]) {
                    //if there is a request_scheme to match route
                    let validate = validateObject(
                        checkScheme(pack, this.#request_schemes[name]),
                    );
                    if (!validate.success) {
                        return resolve(validate);
                    } //return invalid pack
                }
                return resolve(runner(handler, pack));
            } else {
                return resolve({
                    success: false,
                    msg: "Not A Route",
                    result: false,
                });
            }
        });
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Server Stuff ////////////////////////////////////////////////////////////////

    /**
     * a way to get either the whole sever, or a connection from the server. If you include
     * name and cid it will try to find the connection. On fail it will not return the server,
     * and return false.
     */
    get_server = (name: string, cid?: number) => {
        for (let n in this.servers) {
            if (this.servers[n].name == name) {
                let server: any = this.servers[n];
                if (cid) {
                    server = this.servers[n].get_connection(cid);
                }
                return server;
            }
        }
        return false;
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Manager Setups //////////////////////////////////////////////////////////////

    /**
     * @todo can we assign a server processes to their own thread?
     */
    #SETUPservers = (configs: serverConfig[]) => {
        let servers: ServerTypes[] = [];
        let startCount = -1;
        let nostarts: any[] = []; //ServerTypes

        for (let c = 0; c < configs.length; c++) {
            //loop through configs
            servers.push(GetServer(configs[c]));
            startCount++;
            if (!servers[startCount] || servers[startCount].error) {
                nostarts.push(servers.pop());
                startCount--;
            } //no wait justkidding
        }
        //try and restart nostarts on different ports, notify reverse proxy of any new ports
        this.health.servers.requested = servers.length;
        this.health.servers.starting = servers.length;
        for (let s = 0; s < servers.length; s++) {
            servers[s]
                .start_listening(this.router, this.auth)
                .then((listening, index = s) => {
                    let indexs = s;
                    console.log("in function ", indexs, "through arg", index);
                    if (listening) {
                        this.health.servers.listening++;
                        this.health.servers.starting--; //count the listening servers
                    } else {
                        //look into why, then log
                        //try to start another based on error
                        //if port busy try another
                    }
                });
        }
        //log nostarts
        return servers;
    };

    /**
     * Goes through all the provided controller classes and installs them on to
     * the Core Manager. Once installed they expose the configed routes in the
     * class to the router / route function (assuming you are using the default
     * route function).
     *
     * @param {object} controllers
     */
    #SETUPcontrollers = (controllers: any) => {
        for (let c in controllers) {
            let control = new controllers[c]();
            control.route = this.route; //attach to expose other local controller routes
            let routes = control.config.routes;
            let schemes = control.config.request_schemes;
            for (let r in routes) {
                for (let cr in control) {
                    if (cr == routes[r].name) {
                        this.#routes[cr] = {};
                        this.#routes[cr.toUpperCase()] = control[cr];
                        if (schemes[cr]) {
                            this.#request_schemes[cr.toUpperCase()] =
                                schemes[cr];
                        }
                    }
                }
            }
        }
    };

    /**
     * Goes through the config.upstreams array to setup any required upstream services for
     * this server cluster.
     *
     *
     */
    #SETUPconnections(upstreams: connectionConfig[]): {
        [name: string]: HandlerTypes;
    } {
        //maybe want to do something with connections
        return GetConnections(upstreams);
    }

    #SETUPlogging(name, logging) {
        return new ManageLogs(name, logging || {}); //Initialize Manage Logs
    }

    ////////////////////////////////////////////////////////////////////////////////
    //
}
