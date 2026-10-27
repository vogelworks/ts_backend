
export default {
    routes:[
        //{name:'GETsettings'},
        {name:'GETappsettings'},
        {name:'QUERYapps'},
        {name:'REMOVEapp'},
        {name:'UPDATEapp'},
        {name:'CREATEapp'}
    ],
    request_schemes:{
        GETappsettings:{
            title:{
                required:true,
                type:'string',
                desc:'The title of the application to return'
            }
        },
        QUERYapps:{
            query:{
                required:true,
                type:'object',
                desc:'A query object used by mongo to find the documents'
            },
            projection:{
                type:'array',
                desc:'Optional to return parts of the document'
            }
        },
        REMOVEapp:{
            title:{
                required:true,
                type:'string',
                desc:'The app title that you want to delete'
            }
        },
        UPDATEapp:{
            title:{
                required:true,
                type:'string',
                desc:'The app title to update'
            },
            update:{
                required:true,
                type:'object',
                desc:'The object or app properties you want to update. Can follow mongo update structure'
            }
        },
        CREATEapp:{
            app:{
                required:true,
                type:'object',
                desc:'The app data you want to create with'
            }
        }
    }
}