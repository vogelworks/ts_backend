/**
 * Class to handle errors in a sub-section of code. Right now it has some simple functions
 * to translate errors from the system, and format custom errors a bit. Going forward this
 * class would be responsible for:
 * - formating
 * - flag for logging
 * - flag for retry
 * - tracking for repeat errors - could do a simple error / string compare. would need some
 *   configuration to give context to repeaters.
 * 
 * Errors will be kept track of through the 'health' property. The health property will not
 * have any formal structure, but act as layers decided by properties matching tags, and containing
 * properties matching error names. Querying will be up to the querier to navigate the levels.
 * 
 * {
 *  SalesController:{RouteError:1}
 * }
 * If i wanted to access the above 
 * 
 * @todo - want to setup simple tracker to know if the same error keeps occuring
 * @todo - setup function to check if a process is OK to be executed. Would need the above
 *         todo to be be completed before hand
 */
export default class ErrorHandler {
    health = {} //object to model health
    constructor() {
    }

    /**
     * To check against a specific item being tracked pass the item name as the property
     * and the tag to check as an optional value. If you would like to know if an item has
     * and error at all pass 'all'.
     * 
     * @param {object} check 
     * @returns 
     */
    CheckHealth(check = false) {
        if (check) {
        } else { return this.health }
    }

    /**
     * Takes in an error to translate and format. The return message will give
     * the function / program instruction on how to handle the error.
     * @param {object | string} e 
     */
    AcceptError(err) {
        let error = this.CoreErrors(this.NodeError(err))
        this.AddHealth(error)
        return error
    }

    /**
     * Accepts an error that has been determined NOT from the node system. Will
     * take the error and determine if there is any other information to attach
     * to the message.
     * 
     * @param {object | string} err
     */
    CoreErrors(err) {
        let { name = '' } = err;
        if ('string' == typeof err) { name = err }
        switch (name) {
            case 'RouteDependError': {//Tally controller @ dependency name
                break;
            }
            case 'RouteError': {//Tally controller @ route name
                break;
            }
            default: {
            }
        }
        return err
    }

    /**
     * Looks at an error and determines if the the error comes from nodejs, or
     * was sent by the developer. For now the response is trimmed to only
     * - node
     * - name
     * - msg - is changed from message to match the log format.s
     * 
     * more can be included as necessary.
     * @todo - Add SystemError
     * 
     * @param {object} e 
     * @returns 
     */
    NodeError(err:any) {
        let {
            node = true,
            name = "",
            msg = err.message || '',
            stack
        } = err;
        if (err instanceof TypeError) {
            //err.type = 'TypeError'
        } else if (err instanceof RangeError) {
            //err.type = 'RangeError'
        } else if (err instanceof ReferenceError) {
            //err.type = 'ReferenceError'
        } else if (err instanceof SyntaxError) {
            //err.type = 'SyntaxError'
        } else { node = false; }
        return {
            node,
            name,
            msg,
            stack,
            ...err
        }
    }

    /**
     * 
     * @param {string} item - item effected
     * @param {string} check - error title
     * @param {string} related - optional description to tally
     */
    AddHealth(error) {
        if (error) {
            let item = error.controller ? error.controller : error.route || 'Unnamed'; //the root place where the issue is
            let check = error.name || 'GeneralFail';
            let related = error.dependency || undefined;
            let type = error.type

            if (!this.health[item]) { this.health[item] = {} }
            if (!this.health[item][check]) { this.health[item][check] = { hits: 0, lasthit: null, related: {}, types: {} } }
            this.health[item][check].hits++;
            this.health[item][check].lasthit = new Date().getTime();
            if (type) {
                if (!this.health[item][check].types[type]) { this.health[item][check].types[type] = { hits: 0, lasthit: null } }
                this.health[item][check].types[type].hits++
                this.health[item][check].types[type].lasthit = new Date().getTime()
            }
            if (related) {
                if (!this.health[item][check].related[related]) { this.health[item][check].related[related] = 0 }
                this.health[item][check].related[related]++;
            }
        } else { return false }
    }
    /**
     * Go through and reset anything that has not been "hit" in the last
     * x. X is set to the this.trim value.
     * 
     * Function will be recursive to ensure all items have been addressed
     */
    TrimHealth() {

    }

    TallyRouteDependError(e) {
        let { route, dependency } = e;

    }
}