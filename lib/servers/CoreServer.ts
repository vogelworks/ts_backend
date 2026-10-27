import URL from "url";
import {
    serverConfig,
    serverRequest,
    serverLog,
    routerfn,
    authenticatefn,
    serverConnection,
} from "../structures";

/** Core Server
 *
 * This is the base API servers, extending types of tcp and http.
 *
 * - start a type of server
 * - listen on an host:port
 * - parse/prepare incoming data
 * - attempt restart
 * - log errors
 *
 */
export class CoreServer {
    name: string;
    type: string | "tcp" | "http" | "ws";
    host: string;
    port: number | string | any;

    server: any; // Node Server HTTP | NET(TCP)
    router: routerfn | boolean; //the main process to run after data is recieved
    ready = false;
    error = false; //flag anything bad
    listening: boolean;

    requests: serverRequest[] = [];
    connections: serverConnection[] = [];
    logs: serverLog[] = []; //hold logs for

    ridline = "\r\r\t";
    mesline = "\r\r\n";

    constructor(config: serverConfig) {
        if (config) {
            this.name = config.name || ((this.error = true) && "Not Provided");
            this.port = config.port || ((this.error = true) && "");
            this.type = config.type || ((this.error = true) && "");
            this.host = config.host || "";
        } else {
            this.error = true;
        }
        if (this.error) {
            //config error
            this.slog("ServerConfigBad", {
                msg: "Error with config",
                error: true,
            });
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////
    // START/LISTEN /////////////////////////////////////////////////////////////////////////////

    /**
     * called by the caller to start the server listening. It is currently the sole way to start a server. The reason
     * it is not handled in the constructor was because
     */
    start_listening = (
        router: routerfn,
        onconnect: authenticatefn,
    ): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            let incoming = async (socket: any, res: any) => {
                //init server
                let canconnect = true;
                if (onconnect) {
                    try {
                        canconnect = await onconnect(socket);
                    } catch (e) {
                        //attemp custom authentication
                        console.error("Error Custom Auth ", e);
                        canconnect = false;
                    }
                }
                canconnect && this.#listener(router, socket, res);
            };
            this.server = this.start_server(incoming);
            this.type == "ws" && this.server.on("connection", incoming);

            let response = {
                server: this.name,
                ready: false,
            };

            if (this.server) {
                if (this.type == "ws") {
                    this.server.on("connection", incoming);
                } else {
                    this.server.listen(this.port, this.host, () => {
                        //start the server listening
                        console.log(
                            `Started ${this.name} - ${this.type} server on ${this.port}`,
                        );
                        if (!this.error) {
                            this.listening = true;
                            response.ready = true;
                        }
                        return resolve(true);
                    });
                }

                this.server.on("close", (server) => {
                    console.log("Closing Server");
                    //check this.requests, try to wait for finish
                    //check/notify?/close connections
                    //log
                    //trigger CoreManager. Should core manager just listen to <server>.server.on('close') as well?
                });
                this.server.on("clientErrors", this.clientErrorHandler);
                this.server.on("error", this.serverLogHandler);
                this.server.keepAliveTimeout = 3000000;
            } else {
                return resolve(false);
            } //NOSERVER
        });
    };

    //needs to be extended per child class
    start_server = (listenerEvent?): any => {
        return false;
    };

    /**
     * The default listener for the class if you run the start_listening function. It is kept private
     */
    #listener = (router: routerfn, socket: any, res?) => {
        if (res && this.type == "http") {
            //move this to nginx
            try {
                res.setHeader(
                    "Access-Control-Allow-Headers",
                    "Accept,Authentication,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With,Cookie",
                );
                res.setHeader("Access-Control-Max-Age", 17280);
                res.setHeader("Keep-Alive", "timeout=60000");
                res.setHeader("Access-Control-Allow-Credentials", "true");
                res.setHeader(
                    "Access-Control-Allow-Methods",
                    "POST, GET, OPTIONS",
                );
                res.setHeader(
                    "Access-Control-Allow-Origin",
                    "http://localhost:3000",
                );
            } catch (e) {
                console.error("Reading the Headers", e);
            }
        }
        let conn = this.accept_connection(socket, res);
        conn && this.connections.push(conn); //attach cid and push to server.connections

        let data = "";

        socket.on(this.type == "ws" ? "message" : "data", (chnk) => {
            data += chnk;
            let [send, persist, messages] = this.parse_data(data); //prepares incoming data
            data = persist; //pass
            //purge data at max size
            if (send) {
                for (let m in messages) {
                    try {
                        let [message, rid] = messages[m].split(this.ridline); //get a rid if exist
                        let request = this.#intake_request(
                            message,
                            socket.cid,
                            rid,
                        );
                        if (request.pack) {
                            router(request)
                                .then((answer) => {
                                    //request available routes
                                    this.#end_request(
                                        this.request_response(answer, conn),
                                    );
                                })
                                .catch((e) => {
                                    if (!e.msg) {
                                        e.msg = "Error in Router";
                                    }
                                    if (!e.request) {
                                        e.request = request;
                                    } //likely "old" request data
                                    this.#end_request(
                                        this.request_response(e.request, conn),
                                        e,
                                    );
                                });
                        } else {
                            throw {
                                badpack: true,
                                request: request,
                                msg: "Error Accepting Pack",
                            };
                        }
                    } catch (e) {
                        if (!e.msg) {
                            e.msg = "Error Intaking Request";
                        }
                        this.#end_request(
                            this.request_response(e.request || false, conn),
                            e,
                        );
                    }
                }
            }
        });
        socket.on("end", () => {
            //is no longer readable
        });
        socket.on("close", (hadError: boolean) => {
            this.#end_connection(socket.cid);
        });
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // CONNECTION /////////////////////////////////////////////////////////////////////////////////

    /**
     * Intakes a connection to the server. Is called in the initial start of the server.
     * returns the created connection in case a child class needs to "extend" the function in
     * order to further setup the connection dependant on the type. This is where any other
     * communication with the connection can take place.
     *
     */
    accept_connection(socket, res?): serverConnection {
        //socket.setTimeout(1000);
        this.type != "ws" && socket.setEncoding("utf8");
        socket.cid = Date.now(); //so that the socket carries it as well. Could remove so long as the user uses the connection object
        return {
            //queue handler
            server: this.name,
            cid: socket.cid, //Date.now() //connection id
            socket: socket, //remove
            res: res || undefined,
            errors: [],
        };
        // return this.connections[this.connections.length-1]
    }

    get_connection = (cid: number): serverConnection | false => {
        for (let c in this.connections) {
            if (this.connections[c].cid == cid) {
                return this.connections[c];
            }
        }
        return false;
    };

    #end_connection(cid: number): boolean {
        let outstanding: serverRequest[] = [];
        for (let r = 0; r < this.requests.length; r++) {
            if (cid == this.requests[r].cid) {
                outstanding.push(this.requests[r]);
            }
        }
        console.log(
            "Closing Connection ",
            cid,
            " >> Outstanding requests ",
            outstanding.length,
        );

        //async flush logs for cid

        for (let c = 0; c < this.connections.length; c++) {
            if (this.connections[c].cid == cid) {
                this.connections.splice(c, 1);
                return true;
            }
        }
        return false;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // REQUESTS ///////////////////////////////////////////////////////////////////////////////////

    /**
     * Handles the answer from the router. Takes in the provided request/answer and ensures that everything
     * can be found before it is sent back to the client. The function must be extended in the child class
     * so it can handle the actual sending of the response.
     */

    request_response(
        request: serverRequest | false,
        connection: serverConnection | false,
    ):
        | [string, serverRequest | false, serverConnection | false]
        | serverRequest
        | any {
        if (!request) {
            return [
                JSON.stringify({
                    success: false,
                    msg: "No attached request, no message",
                    result: false,
                }),
                false,
                false,
            ];
        }
        if (connection == false) {
            this.slog("RequestResponse", {
                msg: "Error Finding Connection",
                error: true,
                context: { rid: request.rid, cid: request.cid },
            });
        }
        let message = "";
        try {
            message = JSON.stringify(request.message);
        } catch {
            //try to get the pack to JSON
            request.message = {
                success: false,
                msg: "Pack Could not be prepared by Server",
                result: false,
            };
            message = JSON.stringify(request.message);
        }
        return [message, request];
    }

    /**
     * Takes in a message and a connection id to create a request.
     */
    #intake_request(
        pack: string | false,
        cid: number,
        rid?: number,
    ): serverRequest {
        let reqpack: any;
        try {
            reqpack = pack != false && JSON.parse(pack);
            let connection = this.get_connection(cid);
            if (connection && connection.info && connection.info.route) {
                reqpack.route = connection.info.route;
            }
        } catch {
            reqpack = false;
        }
        this.requests.push({
            server: this.name,
            cid: cid,
            rid: rid || Date.now(),
            status: "PENDING",
            pack: reqpack || {
                route: "NONE",
                success: false,
                msg: "Issue Parsing Request",
                result: false,
            },
            errors: reqpack ? [] : [{ msg: "Issue parsing request data" }],
            success: pack ? true : false,
        }); //queue request

        return this.requests[this.requests.length - 1]; //does this cause a race case?
    }

    get_request(rid: number) {
        for (let r in this.requests) {
            if (this.requests[r].rid == rid) {
                return this.requests[r];
            }
        }
        return false;
    }

    #end_request(response: serverRequest | false, error: any | false = false) {
        if (response) {
            if (error) {
                delete error.request;
                this.slog("EndRequest", { msg: "", error });
                if (response.status != "SENT") {
                    //if not sent, try to send
                }
            }
            if (response.errors.length > 0) {
                //transfer logs to main logs
                for (let e in response.errors) {
                    this.slog(response.errors[e].type || "Route Error", {
                        msg: response.errors[e].msg || "",
                        context: { rid: response.rid, cid: response.cid },
                        error: response.errors[e].info || true,
                    });
                }
            }
            for (let r = 0; r < this.requests.length; r++) {
                //clean the the request
                if (this.requests[r].rid == response.rid) {
                    this.requests.splice(r, 1);
                    break;
                }
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // PARSE //////////////////////////////////////////////////////////////////////////////////////

    //abstract - needs to be extended in each child class to parse
    parse_data(data: any): [boolean, string, any[]] {
        return [true, data, []];
    }
    parse_cookies(cookies: string) {
        console.log("Cookies", cookies);
        let all = {};
        if (cookies) {
            let intovars: any[] = cookies.split(" ");
            for (let c in intovars) {
                let varr = "";
                let toggle = false;
                for (let p in intovars[c]) {
                    if (!toggle && intovars[c][p] == "=") {
                        all[varr] = "";
                        toggle = true;
                    } else if (!toggle) {
                        varr += intovars[c][p];
                    } else {
                        all[varr] += intovars[c][p];
                    }
                }
            }
        }
        return all;
    }
    parse_header(res) {
        // console.log('Authentication ',res.headers['authentication'])
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // ERRORS /////////////////////////////////////////////////////////////////////////////////////

    clientErrorHandler = (error, socket) => {
        //flag on clients
        this.slog("ClientError", {
            msg: "Error Event Client Connection",
            error,
            context: { cid: socket.cid },
        });
    };

    serverLogHandler = (error) => {
        //flag on server
        this.slog("ServerLog", { msg: "Event Error", error });
        switch (error.code) {
            case "EADDRINUSE": {
                //try again, 10ms stale?
                //then start iterating this.port++ until one works, server limit is reached (if limit),
                break;
            }
            case "ERR_SERVER_ALREADY_LISTEN": {
                break;
            }
            case "EACCES": {
                //permission denied
                break;
            }
            //handle more errors
        }
        console.error(`${this.name} - ${this.type} hade and error `, error);
    };

    /**
     * a way to accept and store server errors. Can either be:
     * - request errors
     * - response errors
     * -
     */
    slog(
        type: string,
        {
            msg = "",
            error = false,
            info,
            context,
            tags,
        }: {
            msg: string;
            error?: boolean | any;
            info?: any;
            tags?: string[];
            context?: { cid?: number; rid?: number };
        },
    ) {
        let errorPack: serverLog = {
            server: this.name || "Not Provided",
            protocol: this.type,
            rid: context && context.rid ? context.rid : 0,
            cid: context && context.cid ? context.cid : 0,
            tags: tags || [],
            info: info || error || "",
            error: error ? true : false,
            type: type,
            msg: msg,
        };
        switch (type) {
            case "ServerNoType": {
                errorPack.msg =
                    "Must Pass a valid protocol: server did not start";
                this.error = true;
                break;
            }
            case "ServerStart": {
                errorPack.msg =
                    "Failed to establish CoreConnections: Server did not start";
                this.error = true;
                break;
            }
            case "ServerLog": {
                this.error = true;
                break;
            }
            case "ServerConfigBad": {
                errorPack.msg = "Something in Config was bad, or not provided";
            }
        }
        this.logs.push(errorPack);
        return errorPack;
    }
}
