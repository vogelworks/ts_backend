import {connectionConfig} from './connections'

export type loggingConfig = {
    storage:'server'|'local';
    connection?:connectionConfig
}