export default {
    routes:[
        {name:'GETserverlogs'}
    ],
    request_schemes:{
        GETserverlogs:{
            logger:{
                required:true,
                type:'string',
                desc:'The name of the process to get logs from'
            },
            channel:{
                required:true,
                type:'string',
                default:'main',
                desc:'The channel associated with logger, default=main'
            },
            all:{
                type:'boolean',
                desc:'Option to get ALL of the loggers channels'
            },
            peak:{
                type:'boolean',
                default:true,
                desc:'Option to ONLY look at the logs, otherwise with purge logs'
            }
        }
    }
}