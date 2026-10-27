import {CoreController} from  '../../lib/index'
import config from './settingsconfig';
import hpack from '../models';
/**
 * Routes to handle interactions with Settings objects and databases
 *
 * QUERYsettings
 * GETsettings
 * GETallSettings
 * SAVEsettings
 * MAKEcurrent
 *
 */
export default class SettingsController extends CoreController {
    config=config;
    constructor() {
        super('SettingsController');
    }

    /**
    * Retrieves a specific Settings object from the database
    * @requires
    * @returns { object } response.data = Settings object
    */
    GETsettings = (handler:any, pack:any) => {
        return {
            success:false,
            msg:'Still Working',
            result:false
        }
    }

    GETappsettings = (handler:any, pack:any) => {
        let { title } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.apps,
            options: {
                query: { title: title},
                one:true
            }
        })
    }

    /**
     * Querys the apps collection with a given query object. Projection can be included to only return certain properties
     * 
     * @param {object} handler 
     * @param {object} pack 
     * @param {object} pack.query
     * @param {array} pack.projection 
     * @returns 
     */
    QUERYapps = async (handler:any, pack:any) => {
        let {
            query,
            projection
        } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.apps,
            options: {
                query: query,
                projection: projection ? projection : undefined
            }
        })
    }

    /**
     * Will remove an app with a given type.
     * 
     * @param {object} handler 
     * @param {object} pack 
     * @param {string} pack.type 
     * @returns 
     */
    REMOVEapp = async (handler:any, pack:any) => {
        let { title } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.apps,
            method: 'REMOVE',
            options:{query:{title:title}}
        })
    }

    /**
     * Creates an app with a given app structure. The app must have a type
     * that is unique in the collection.
     * 
     * @param {object} handler 
     * @param {object} pack 
     * @param {object} pack.app 
     * @param {string} pack.app.title 
     * @returns 
     */
    CREATEapp = async (handler:any, pack:any) => {
        let { app } = pack;
        if (app.title) {
            let fapp = await this.connect.mart.request('ROUTEmart',{
                ...hpack.apps,
                options: {
                    query: { title: app.title },
                    projection: ['type'],
                    one: true
                }
            })
            if (!fapp.success) {return this.connect.mart.request('ROUTEmart',{
                ...hpack.apps,
                method: 'INSERT',
                options: { docs: app }
            })} else {return {
                success: false,
                msg: 'App type needs to be unique',
                result: false
            }}
        } else { return {
            success: false,
            msg: 'Need to provide a unique app.title value',
            result: false
        }}
    }

    /**
     * Updates an application with an update object.
     * @param {object} handler 
     * @param {object} pack 
     * @param {string} pack.title 
     * @param {object} pack.update 
     * @returns 
     */
    UPDATEapp = async (handler:any, pack:any)=>{
        let {title,update}=pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.apps,
            method:'UPDATE',
            options:{
                query:{title:title},
                update:update
            }
        })
    }
}
