export default {
    routes:[
        {name:'GETuser'},
        {name:'QUERYusers'},
        {name:'CREATEuser'},
        {name:'UPDATEuser'},
        {name:'REMOVEuser'},
        {name:'GETusersettings'},
        {name:'UPDATEusersettings'},
        {name:'GETuserprofile'},
        {name:'QUERYuserprofiles'},
        {name:'CREATEuserprofile'},
        {name:'UPDATEuserprofile'},
        {name:'REMOVEuserprofile'}
    ],
    request_schemes:{
        CREATEuser:{
            newuser:{
                required:true,
                desc:'The user object to create from',
                object:{
                    user:{
                        required:true,
                        type:'string',
                        desc:'The user name'
                    },
                    pswrd:{
                        required:true,
                        type:'string',
                        desc:'The user password'
                    }
                }
            },
            settings:{
                type:'object',
                desc:'Settings to initialize with the user'
            }
        },
        GETuser:{
            user:{
                required:true,
                type:'string',
                desc:'The user name'
            }
        },
        QUERYusers:{
            query:{
                required:true,
                type:'object',
                desc:'open query for users'
            },
            projection:{
                type:'array',
                desc:'optional to return back select properties'
            }
        },
        UPDATEuser:{
            user:{
                required:true,
                type:'string',
                desc:'User id'
            },
            update:{
                required:true,
                type:'object',
                desc:'Values of user to update'
            }
        },
        REMOVEuser:{
            user:{
                required:true,
                type:'string',
                desc:'User name'
            }
        },
        GETusersettings:{
            user:{
                required:true,
                type:'string',
                desc:'The user name'
            }
        },
        UPDATEusersettings:{
            user:{
                required:true,
                type:'string',
                desc:'The user name'
            },
            update:{
                required:true,
                type:'object',
                desc:'Part or all of the settings to be updated. Follow mongo update structure'
            }
        },
        GETuserprofile:{
            type:{
                required:true,
                type:'string',
                desc:'The type used to identify the profile'
            }
        },
        QUERYuserprofile:{
            query:{
                required:true,
                type:'object',
                desc:'Query used to search for profiles'
            },
            projection:{
                type:'array',
                desc:'Option fields to include in query'
            }
        },
        CREATEuserprofile:{
            profile:{
                required:true,
                type:'object',
                desc:'The intial profile object to create from'
            }
        },
        UPDATEuserprofile:{
            type:{
                required:true,
                type:'string',
                desc:'The type to identify the profile to update'
            },
            update:{
                required:true,
                type:'object',
                desc:'Part or all of the profile to be updated. Follow mongo update structure'
            }
        },
        REMOVEuserprofile:{
            type:{
                required:true,
                type:'string',
                desc:'The type to identify which profile to remove'
            }
        }
    }
}