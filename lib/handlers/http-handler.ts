import http from 'http';
import URL from 'url';
import GenHandler from './gen-handler';
import {connectionConfig} from '../structures'
/**
 * Intakes information passed from the server and "passes" it to GenHandler
 * to be prepared.
 */
export default class HTTPhandler extends GenHandler {
	constructor(config:connectionConfig) {
		super(config);
	}

	/**
	 * Forward takes a request and streams the whole thing to the connected
	 * server. This is very similar to piper, but this sends everything to
	 * the upstream server before the data has been parsed.
	 *
	 * Usage: a connection has been established and there is an external, unparsed
	 * req and res server objects.
	 *
	 * The function is responsible for closing the passed connection and returns true
	 * OR false depending the success.
	 *
	 * @param { object } req - http.ServerRequest
	 * @param { object } res - http.ServerResponse 
	 * @param { object } options
	 * @param { object } info
	 */
	forward(req, res, options, info) {
		return new Promise((resolve, reject) => {
			let log = {
				module: 'HTTPHandler',
				process: 'forward-upstream',
				connection: this.connection,
				info: info
			}
			if (this.connection) {
				//logging for upstream
				let requester = http.request({
					//...this.connection.options,
					...options
				}, (reply) => {
					res.rawHeaders = reply.rawHeaders;
					res.setHeader('Content-Type', reply.rawHeaders[3]);

					res.on('finish', () => {//Done Recieving response from upstream
						return resolve(true)
					})
					reply.pipe(res, { end: true })
						.on('error', err => {
							this.logger && this.logger.log({
								...log,
								msg: 'Issue piping to upstream reply to server response',
								error: err
							})
						})
				})

				let recieve = false;
				let reqerror = false;
				let timeouterror = false;
				let timeout = (start, allowed) => {
					if (!recieve) {
						setTimeout(() => {
							if (Date.now() - start > allowed) {//request timeout
								if (!recieve && !reqerror) {
									timeouterror = true;
									this.logger && this.logger.log({
										...log,
										msg: 'Upstream connected, but takes to longs to read',
										error: 'Connection timeout'
									})
									requester.destroy(); //trigger req.pipe error
								}
							} else { timeout(start, allowed) }
						}, 100);
					} else { return true }
				};

				req.on('close', () => {//Done sending pipe
					timeout(Date.now(), 5000);
				})
				requester.on('finish', () => { //Done recieving pipe
					recieve = true;
				})
				req.pipe(requester, { end: true }).on('error', (e) => {
					reqerror = true;
					if (!timeouterror) {
						this.logger && this.logger.log({
							...log,
							error: e
						})
					}
					try { //try to return error
						res.write(JSON.stringify({
							success: false,
							msg: 'Could not Connect to Upstream',
							error: e
						}));
					} catch { //return without error
						res.write(JSON.stringify({
							success: false,
							msg: 'Could not connect to upstream, Could not return the error'
						}))
					}
					res.end();
					return resolve(false)
				})
			} else {
				res.write(JSON.stringify({
					success: false,
					msg: 'Connection not setup, check construction',
					result: false
				}))
				res.end();
				return resolve(false)
			}
		})
	}

	/**
	 * This request can handle a custom request to an external server and will be
	 * available to the routes as a convience.
	 * Its main responsibility is to handle requests to a connected upstream, and to
	 * ensure that the request (and connection) to that upstream is healthy. This
	 * is available to the routes but through the server parameter, by their name.
	 * ```
	 * server.<upstream>.request()
	 * ```
	 * the upstream name will match the upstream name on the apis config file but
	 * all lowercase.
	 *
	 * @todo - determine if the requested server has recieved the request. Timeout if
	 * 		   not
	 * @todo - when using standard timeout maybe setup a retry system. This would be done
	 * 		   by wrapping the actual request in a function and calling it until told not
	 * 		   to
	 * 
	 * @param { object } param0
	 * @param { string } param0.url
	 * @param { object | string } param0.body
	 * @param { object } param0.addoptions
	 * @param { object } param0.addheaders
	 * @param { string } param0.method
	 * @param { string } param0.route
	 * @param { number } param0.timeout
	 */
	request({
		url = null,
		body,
		addoptions = null,
		addheaders = {},
		method = 'GET',
		route = false,
		timeout = null
	}):Promise<any> {
		return new Promise((resolve, reject) => {
			let log = {
				module: 'HTTPHandler',
				process: 'request-upstream',
				options:undefined
			}
			let ready = this.prepRequest(url, addoptions || {}, route);
			if (ready.success) {//setup success
				let options = ready.options;
				options.headers = {//setup headers
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(JSON.stringify(body)),
					...addheaders
				}
				if (timeout) { options.timeout = timeout }
				options.method = method;
				let timeouterror = false;

				log.options = options;
				let requester = http.request(options, (resp) => {
					resp.setEncoding('utf8');
					let data:any = '';
					resp.on('data', chnk => { data += chnk })
					resp.on('end', () => {//All data recieved
						try {
							//I want to say attach a success here, but don't want to
							//conflict with an already set success value from the
							//server. For now the user can check for .error to tell
							//if the request succeeded to make it to the server and
							//back
							let response:any = JSON.parse(data);
							return resolve(response);
						} catch(e) {//Bad JSON parse from address
							return resolve({ success: false, error: 'Bad JSON parse from address', result: false })
						}
					});
				});
				requester.on('error', (err) => {//Request had error
					console.error('Requester had error ',err)
					if (!timeouterror) {
						this.logger && this.logger.log({
							...log,
							error: err,
						})
					}
					return resolve({ success: false, msg: 'Could not connect to requested resource', error: err });
				});
				//requester.on('timeout', () => {
				//	timeouterror = true
				//	requester.destroy();
				//})
				try {//attempt to write body
					body && requester.write(JSON.stringify(body));
					requester.end();//end the request to server
					//Do we need a return case here?
				} catch {requester.end('400') }
			} else { return resolve(ready) }//could not establish a connection
		});
	}

	/**
	 * 	Takes in some information to ensure the connection is set up correctly
	 * 
	 * @param { string } url 
	 * @param { object } options 
	 * @param { string } route 
	 */
	prepRequest(url, options, route) {
		if (url) {//request with url
			let purl = URL.parse(url);
			options = {
				...options,
				hostname: purl.hostname || false,
				port: purl.port || false,
				path: purl.path || false,
				method: undefined//method,
			}
			if (!options.hostname) {
				return {
					success: false,
					msg: 'If using options, must have good url'
				}
			}
		} else if (options.hostname) {//if using hostname
			//only here to prefer over connection. options are already set
		} else if (this.connection) {//use connection
			let isrouted:any = false
			if (route) {
				isrouted = ''//this.connection.options.path ? (this.connection.options.path + '/' + route + '/') : '/' + route + '/'
			}
			options = {
				...options,
				//...this.connection.options
			}
			isrouted && (options.path = isrouted)
		} else {
			return {
				success: false,
				msg: 'Could not establish a connection. Check Arguements OR setup hanlder class with connection'
			}
		}
		return {
			success: true,
			options: options,
			rid:Date.now()
		};
	}
}
