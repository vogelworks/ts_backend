
# Contents

- [Quick Start](#quick_start)
- [Brief](#brief)
- [CoreServer](coreserver)
- [AppServer](#appserver)
- [CoreController](#corecontroller)
- [Handlers](#handlers)
- [Middle-ware](#midwares)
- [Controllers](#controllers)
- [Request Schemes](#request_schemes)
- [Models](#models)
- [Logging](#logging)

Requirements:
- server that needs to listen on HTTP/S and TCP connections
- servers/services on network need to communicate with each other
- connection to a mongo database
- logging for services on network


# Quick Start

```
npm install vhp-core-server
```

# CoreServer
```
let {CoreServer}=require('vhp-core-server')
```
<b>PASS</b>
```
{
    type:<String> - 'http' | 'tcp
    controllers:<Object>
    config:<Object>
    midwares:<Object> - {}
}
```

- [Type] - The type of Server to start
- [Controllers](#coreserver-controllers)
- [Config](#coreserver-config)
- [MidWares](coreserver-midwares)

<b>CONFIG</b>

- name - The name of the server
- port - The port on which the server will listen
- dev - whether or not the server is being tested
- [auth](#coreserver-auth) - authentication properties if necessary?
- [logging](#coreserver-logging) - logging configuration for the server.
- [upstreams](#coreserver-upstreams) - object list of configuration to connect with other servers.
- [midwares](#CoreServer-midwares) - object with midware functions

- <b>example config</b> -
```
{
    name:<String>
    port:<Number>
    dev:<Boolean>
    logging:{
        storage: 'server' //used to decided where the logs eventually get saved to
        connection: {
            name: <String>, // name of server to connect to
            group: <String>,
            type: "server",
            options:{
                hostname: <String>, //IP / Domain of host
                path: <String>, //Starting path of URL
                port: <String>, //port number
                method: <String>, //default method of request
                header:{ //ability to add an headers included in every request
                    Content-Type:"application/json"
                }
            }
        } //used if storage = 'server'. Holds connection to external server (setup like upstreams).
    } || false || undefined
    upstreams:{
		"STORE":{"name":"STORE","group":"MART","type":"server",
		"options":{
			"http":{
				"hostname":"127.0.0.1",
				"port":"8080",
				"method":"POST",
				"path":"/api",
				"headers":{
					"Content-Type":"application/json"
				}
			}
		}}
    }
}
```

## CoreServer Auth
Authentication has not been decided on. What would be nice is a module to help authenticate api keys for the servers to have a basic level of security. The validation key for the server would be placed in config.auth object.

## CoreServer Logging
Logging comes built in to CoreServer via a ManageLogs and AppLogger(s). AppLoggers are used throughout the server as a way to collect logging and funnel it to a central location, ManageLogs. On construction CoreServer gives the declared logging config to ManageLogs. With this ManageLogs will know how to store the logs. The expected setup is to provide a connection to the VHP Logging server. If there is no connection, logs will be stored in the server, accessible by the GETserverlogs ROUTE (inherent in every CoreServer).

AppLogger is available to the AppServer and all of the other controllers installed onto the server. You can use this logger to get logs from the controllers into the ManageLog, and then to the place of storage. To actually log something you will use logger.channels(). Everytime you use this it will automatically attach the name of the Controller you are calling from, and place it in the log's "module" field. The function can be passed a string or an object. If you are just passing a string it will store that in the logs "msg" field. If you choose to pass an object, the available fields are:

- process - used to identify what program the log is related to
- error - object to hold the error information (discussed later)
- msg - used to hold the actuall message of the log

If error is passed, the log is treated differently. The error object can take:

- name - the name of the error. There are some built in errors that are handle in special ways. Most of these are inherent to the system, and will not apply in the controllers / routes
- msg - A place to attach an error to the message.

## CoreServer Upstreams
Upstreams are a way to connect other servers to the created server. Servers are organized in a dictionary. These connections can have different types (using different handlers). For more information go to [Upstreams](#upstreams)

## CoreServer Midwares
In the Core server, midwares are added via exported functions. The only important note is that any default midware will be overwritten by a passed function that matches. For more information go to [Midwares](#Midwares).


# CoreManager

singleton
setup upstreams (tcp)
setup controllers
setup servers (http)
manage listening servers
log server(s) activity


# CoreControllers

This is the class at the base of all controllers, custom or otherwise. It is responsible for regester the controller with the CoreManager allowing for access to other Controllers AND Servers. Besides access, it will ensure consistent message / logging formats.

# AppServer
```
let {AppServer}=require('vhp-core-server')
```
<b>PASS</b>
```
{
    controllers:<Object>
    models:<Object>
    config:<Object>
    type:<String> - 'http'
    midwares:<Object> - {}
}
```
<b>CONFIG</b>

Configuration for the application will provide identification, behavior, and connections to the server. The following are items you will be able to control.

- name - The name of the server
- port - The port on which the server will listen
- dev - whether or not the server is being tested (is in the dev environment)
- [auth](#coreserver-auth) - authentication properties if necessary?
- [dbcred](#appserver-models) - 
- [logging](#coreserver-logging) - logging configuration for the server.
- [upstreams](#coreserver-upstreams) - object list of configurations to connect with other servers.
- [midwares](#CoreServer-midwares) - object with midware functions

- <b>example config</b> -
```
{
    name:<String>
    port:<Number>
    dev:<Boolean>
    auth:{} || false
    dbreds:{
        user:<String> - Mongo User Name
        pswrd:<String> - Mongo Password
        db:<String> - Optional Database Name
        cluster:<String> - Mongo Cluster Name
        clusterid:<String> - Mongo Cluster Id
    } || false,
    logging:{
        storage: 'server' //used to decided where the logs eventually get saved to
        connection: {
            name: <String>, // name of server to connect to
            group: <String>,
            type: "server",
            options:{
                hostname: <String>, //IP / Domain of host
                path: <String>, //Starting path of URL
                port: <String>, //port number
                method: <String>, //default method of request
                header:{ //ability to add an headers included in every request
                    Content-Type:"application/json"
                }
            }
        } //used if storage = 'server'. Holds connection to external server (setup like upstreams).
    } || false || undefined
    upstreams:{
		"STORE":{"name":"STORE","group":"MART","type":"server",
		"options":{
			"http":{
				"hostname":"127.0.0.1",
				"port":"8080",
				"method":"POST",
				"path":"/api",
				"headers":{
					"Content-Type":"application/json"
				}
			}
		}}
    }
}
```
Configuration for the application will provide identification, behavior, and connections to the server. The following are items you will be able to control.


# Handlers

Handlers are built into the server and are unmodifiable. They act as a wrapper for the request and a constant for that request throughout the connection. Attached it has abilities to:
- communicate with other servers
- forward request to up-streams
- log request activity
- res and req object access (nodeJS http module)

```
constructor({
    req,
    res,
    info,
    pack,
    connection
})

```
- req- is the request from a server
- res - is the response from a server
- info - object that highlights important request(er) information (created in midware, requester info)
- pack - the requester request (pack later on)
- connection - an up-stream configuration

if the above exists, the are attached to the handler and made available. In addition, the following are created and made available.

- logs - array for all logged activity for the handler. can be added to from custom routes.
- ready - a confirmation the handler is properly setup.

After setting up the above configuration, the handler should fall into one of the following 'modes'.
1) handle request to upstream
2) handle request to internal routes

In the first, the server will create a special handler in middle-ware if the route passed matches any upstream. This allows request who do not need this server to skip further setup. During handler setup pass a connection to notify the handler it will be routing this request upstream. it will reduce the amount of over head in the handler. The only functions used in this 'mode' are:
- forward
- request

A handler who is not routing upstream will be setup at the end of successful middle-ware, and provide communication to outside servers (via type's base module. i.e. http node module) as well as easier access to req and res objects. In our case, a route handler will rarely need to access to other servers as that is what the models are for, and you would just setup and upstream. In cases where function is needed, the following can be used:
- request

All types are built on the base class of CoreHandler(). As server needs grow we can add more types. For ease of use, the available function names are the same across handlers. This means in an https or http handler you would call request to reach a server only the arguments required to make them work.

## HTTP Handler
This handler is built using the http module native to node. Much of the inner workings are better explained there.

- request -
```
({
    url = null,
    body = '',
    addoptions = null,
    addheaders = {},
    method = 'POST'
})
```

- forward -
```
(req, res, options)=>{}
```

# MidWares
Midwares (in the context of this library) are functions that run on most every request. Most of the functions are already built in like:

- RequesetInfo - Parses the response and organize all the needed information for the Handler (except of the body)
- Services - Decides if the request needs to be directed to an upstream
- ParseData - Parses the body of the request.
- Validation - Looks at the request and ensures the contents align with a declared route's request_scheme.

All of these functions need to return successful results in order for the request to make it to the router. The only time ALL functions do not need to be run is when the Services function re-directs the request to another server. The response for the server will come back to the function, and then sent directly to the requesting server without hitting the router.

It may be that you want to add a function to the chain. With the exception of an "Auth" function, this is possible and will attach the function to the very end of the chain (Auth gets put to the front of the chain). Setup is done through a custom controller's constructor as follows.

```
this.corecontrols.midman.addMidware(
    <name>, //name of the function
    <function>, //the function
    <admin> //boolean if is Auth function
);
```

The function is required to be in a specific format in order to work properly

```
midwarefunction = (handler,server) =>{
    return new Promise((resolve,reject)=>{
        if(true){
            handler.success = true
        }else{
            handler.success = false
        }
        return resolve(handler)
    })
}
```
The handler is used to commuincate with the midware's "chain manager" function. The most important part is the success property. If false, the request will fail, if true, the request will be given to the route, or the next midware function in the chain. It is also possible to attach errors to the handler. These errors will be logged by the chain manager before failing the request.

The handler also carries all of the information accumulated so far by the other midware functions. Some highlights are:
```
{
    pack:Object //holding the request body. This will not be there unless the ParseData function has run.
    info:{
        program:String //holds the requested server name (based on info.path[1])
        route:String //holds the requested route name (based on info.path[2])
        url:Object //return of require('url'). Complete url information
        path:Array //holds the ending path of the url (after IP / Domain)
    }
}
```


# Controllers

Controllers are a way to house related routes together to create endpoints for users. Setup is as follows:

1. create a controller file in controllers/< Controller Name >/controller-file.js
2. create a config file for the controller next to it
3. import CoreController
4. create a controller class that extends CoreController
5. install the controller in the class constructor
6. add to an index file at the root of the controllers folder
7. import index file as argument to AppServer

- <b>Custom Controller File</b> -
```
let {CoreController}=require('vhp-core-server')

module.exports = class CustomerController extends CoreController{
    constructor(){
        super('CustomerController);
        this.SETUPcontrols(require('./customconfig.js))
    }
}
```
- <b>Custom Controller Config File</b> -
```
module.exports = {
    routes:[
        {name:'ROUTE1'}
        {name:'ROUTE2'}
    ],
    request_schemes:{
        ROUTE1:{
            arg1:{
                required:true,
                type: 'object' | 'string' | 'number' | 'array',
                desc: 'Argument for route1'
            }
        },
        ROUTE2:{
            arg1:{
                required:true,
                object:{
                    prop1:{
                        required:false,
                        type:'string'
                        desc:'Nested argument prop'
                    }
                }
            }
        }
    }
}
```
- <b>Controller Index File</b> -
```
let CustomController = require('./CustomController/CustomController.js)
module.exports = () =>{
    new CustomController()
}

```

There are some things above that you may have recognized from the midware functions, request_schemes. These are validated (against the matching route) in the Validation function of the midware chain. This is an easy way to pre-screen request packs. You are not required to setup a request_scheme if you do not want / need them. If failed, the requester will get back a response explaining what what wrong with their request pack. 

- <b>PASS</b> -
```
{

}
```
- <b>PROPERTIES</b> -
```
    this.corecontrols; // for CoreControls
    this.connect = null; //to hold and share all upstreams
```
- <b>METHODS</b> -
SETUPcontrols - 
GETroute - 

# Request Schemes

```
    TESTroute:{
        one:{
            required:false,
            object:{
                age:{
                    required:true,
                    type:'number',
                    desc:'Number for the name'
                },
                person:{
                    required:true,
                    object:{
                        first:{
                            required:true,
                            type:'string',
                            desc:'The frist name of person'
                        },
                        last:{
                            required:true,
                            type:'string',
                            desc:'The last name of person'
                        }
                    }
                }
            }
        }
    }
```

# Models
Models are tightly connected to the Mongoose library. They will be passed the the Mart Controllers and help with communications to the Mongo DB server. The config.dbcreds are used to establish connections to the desired / declared databases. These database can be declared and exported from a "models" folder like so:

1. create "models" folder
2. import the desired Schemes from "vhp-mongo-models"
3. export the imported Schemes by their name

- <b>example setup</b>
```
const {System} = require('vhp-mongo-models')
module.exports = {
    System:System
}
```
This file is then exported into your main server file, and passed as an argument to the AppServer. With this done you can now access the collections of all the declared database(s) by requesting < Server >/ROUTEmart (along with the collection information). The database will only be accessible through the servers it is declared on. Be mindful of redundant declaration across servers as it will make more connections than neccessary. Instead organize the servers so each database is declared on at least one of the servers on the network. Then just use that server to access the data.


