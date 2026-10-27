import {CoreController} from  '../../lib/index';
import config from './userconfig';
import hpack from '../models'


export default class UserController extends CoreController{
    config=config;
    #allusers=[]
    constructor(){
        super('UserController');
        //pull in all users for cache
    }
    /** Create New User
    *
    *   Will create a user and associated user settings
    *   new user is necessary, but settings is optional. Regardless if settings
    *   is passed, settings will be linked to the newuser.user
    * 
    * @todo - move settings work into settings controller
    * 
    * @param {CoreHandler} handler
    * @param {object} pack
    * @param {object} pack.newuser
    * @param {string} pack.newuser.user
    * @param {string} pack.newuser.pswrd
    * @param {object} pack.settings
    * @param {string} pack.settings.empID
    */
    CREATEuser=async(handler:any,pack:any)=>{
        let {
            newuser,
            settings
        }=pack;
        let cuser:any = {
            user:null,
            settings:null,
            employee:null
        }
        if(settings && settings.empID){//check settings for valid employee
            let emp = await this.connect.company.request({
                body:{empID:settings.empID},
                route:'GETemployee'
            })
            if(emp.success){cuser.employee = emp.result;}
            else{return {
                success:false,
                msg:'Invalid employee ID in settings',
                result:null
            }}
        }

        let adduser = await this.connect.mart.request('ROUTEmart',{//insert user
            ...hpack.user,
            method:'INSERT',
            options:{
                docs:newuser
            }
        });
        
        if(!adduser.success){return adduser}

        cuser.user = adduser.result;
        let addsetts = await this.createUserSettings(cuser.user.user,settings)
        if(addsetts){
            cuser.settings = addsetts;
        }
        return {
            success:true,
            msg:'Created New User '+cuser.user.user,
            result:cuser
        }
    }

    /** Get User
    *
    *   Get User by user. Returns the whole user
    *
    * @param {CoreHandler} handler
    * @param {object} pack
    * @param {string} pack.user
    */
    GETuser=async(handler:any,pack:any)=>{
        let{user}=pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.user,
            options:{
                query:{user:user},
                one:true
            }
        })
    }

    /**
    * Query Users through options.query. A way to customize employee Querys. Anything
    * allows through the mongomart, is allowed through options.
    *
    * @param {CoreHandler} handler
    * @param {object} pack
    * @param {object} pack.query
    * @param {array} pack.projection
    */
    QUERYusers=async(handler:any,pack:any)=>{
        let{
            query,
            projection
        }=pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.user,
            options:{
                query:query,
                projection:projection?projection:undefined
            }
        })
    }
    /** Update user
    *
    *   Update an user with a valid user. Update takes any valid property value
    *   or mongo update function ($push).
    *
    * @param {CoreHandler} handler
    * @param {object} pack
    * @param {string} pack.user
    * @param {object} pack.update
    */
    UPDATEuser=async(handler:any,pack:any)=>{
        let {
            user,
            update
        }=pack;
        //only admin can update somethings?
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.user,
            method:'UPDATE',
            options:{
                query:{user:user},
                update:update
            }
        })
    }


    /** Remove User
    *
    *   Removes a user and associated settings.
    *
    * @param {CoreHandler} handler
    * @param {object} pack
    * @param {string} pack.username
    *
    */
    REMOVEuser=async(handler:any,pack:any)=>{
        let {
            user
        }=pack;
        let remuser = await this.connect.mart.request('ROUTEmart',{
            ...hpack.user,
            method:'REMOVE',
            options:{
                query:{user:user}
            }
        })
        if(!remuser.success){return remuser}
        let didremove = await this.removeUserSettings(user);//remove the user settings
        if(!didremove){console.log('Could not remove user settings')}
        return remuser
    }
    
    // User Settings //


    /** Get User Profile
    *
    *   Takes a user and builds settings with the attached profile and app settings
    *
    * @param {CoreHandler} handler
    * @param {object} pack
    * @param {string} pack.user
    */
    GETusersettings=async(handler:any,pack:any)=>{
        let {
            user
        }=pack;
        let usetts = await this.connect.mart.request('ROUTEmart',{
            ...hpack.usersettings,
            collect:'UserSetting',
            options:{query:{user:user},one:true}
        });

        if(!usetts.success){return usetts}
        usetts = usetts.result;
        if(usetts.profile){
            //SEARCH for app profile
            let appprof = await this.GETuserprofile(handler,{
                type:usetts.profile
            })
            if(appprof.success){ //merge profile into usetts
                appprof = appprof.result;
                usetts.access = appprof.access?appprof.access:usetts.access?usetts.access:[] //share access
                usetts.apps = appprof.apps?appprof.apps:usetts.apps?usetts.apps:{} //share apps
                
                usetts.companies = appprof.companies && appprof.companies.length>0?appprof.companies:usetts.companies?usetts.companies:[]
                usetts.departments = appprof.departments && appprof.departments.length>0?appprof.departments:usetts.departments?usetts.departments:[]   
            }
        }
        return {
            success:true,
            msg:'Found User Settings',
            result:usetts
        }
    }

    /**
     * Provides a way to edit a users settings
     * @param {object} handler 
     * @param {object} pack 
     * @param {object} pack.user
     * @param {object} pack.update
     */
    UPDATEusersettings=async(handler:any,pack:any)=>{
        let {
            user,
            update
        } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.usersettings,
            method:'UPDATE',
            options:{
                query:{user:user},
                update:update
            }
        })
    }

    /**
     * When a user is removed this is the way to clean up the settings. This will not be available from the outside of the controller
     * @param {string} user 
     */
    removeUserSettings=async(user:string)=>{
        if(user){
            let remsetts = await this.connect.mart.request('ROUTEmart',{
                ...hpack.usersettings,
                method:'REMOVE',
                options:{
                    query:{user:user}
                }
            })
            if(remsetts.success){return true}
            else{return false}
        }else{return false}
    }

    /**
     * For every new user created we need to create a settings object. This will not be accessible from the outside of the controller.
     * @param {string} user
     * @param {object} settings
     */
    createUserSettings=async(user:any,settings:any)=>{
        if(user){
            if(!settings){settings={}}//initialize empty user settings if not passed
            settings.user=user;//unsure user is set
            let addsetts = await this.connect.mart.request('ROUTEmart',{
                ...hpack.usersettings,
                method:'INSERT',
                options:{
                    docs:settings
                }
            })
            if(addsetts.success){return addsetts.result}
            else{return false}
        }else{return false}
    }
    ////////////////////////////////////////////////////////////////


    // User Profiles //

    /**
     * Attempts to retrieve one user profile of a given type
     * @param {object} handler 
     * @param {object} pack 
     * @param {string} pack.type
     */
    GETuserprofile=async(handler:any,pack:any)=>{
        let {
            type
        } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.userprofiles,
            options:{query:{type:type},one:true}
        })
    }

    /**
     * A way to query the user profiles available to the system
     * @param {object} handler 
     * @param {object} pack 
     * @param {object} pack.query 
     * @param {array} pack.projection 
     */
    QUERYuserprofiles=async(handler:any,pack:any)=>{
        let {
            query,
            projection
        } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.userprofiles,
            options:{
                query:query,
                projection:projection?projection:undefined
            }
        })
    }

    /**
     * 
     * @param {object} handler 
     * @param {object} pack 
     * @param {object} pack.profile
     * @param {string} pack.profile.type
     */
    CREATEuserprofile=async(handler:any,pack:any)=>{
        let {
            profile
        } = pack;
        if(profile.type){
            let uniprof = await this.GETuserprofile(handler,profile.type);
            if(uniprof.success){return{
                success:false,
                msg:'Type already exists. Choose different type',
                result:false
            }}
            return this.connect.mart.request('ROUTEmart',{
                ...hpack.userprofiles,
                method:'INSERT',
                options:{docs:profile}
            })
        }else{return{
            success:false,
            msg:'Need to provide a type for the profile',
            result:false
        }}
    }

    /**
     * A way to make update to a user profile
     * @param {object} handler 
     * @param {object} pack 
     * @param {string} pack.type 
     * @param {object} pack.update
     */
    UPDATEuserprofile=async(handler:any,pack:any)=>{
        let {
            type,
            update
        } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.userprofiles,
            method:'UPDATE',
            options:{
                query:{type:type},
                update:update
            }
        })
    }

    /**
     * Removes a user profile from the database. IF the profile is found attached to any other users, force will have to be passed to
     * complete the removal. If it was attached to any user settings, the user profile will be removed from the settings. This will
     * remove any permissions previously assigned to that user.
     * 
     * @param {object} handler 
     * @param {object} pack 
     * @param {string} pack.type
     * @param {boolean} pack.force 
     */
    REMOVEuserprofile=async(handler:any,pack:any)=>{
        let {
            type
        } = pack;
        return this.connect.mart.request('ROUTEmart',{
            ...hpack.userprofiles,
            method:"REMOVE",
            options:{
                query:{type:type}
            }
        })
    }

    
    ////////////////////////////////////////////////////////////////
}
