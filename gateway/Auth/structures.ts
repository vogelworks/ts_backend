/**
 * To track the users currently on the system. A user is added every time they login.
 * On login a session is returned. Sessions will remain open with the idea that if the user
 * refreshes the page, the session will not have to be re authenticated (some timeout required).
 * Once a user as no active sessions, all sessions are closed, and the user is removed from active.
 * Also if the user
 */
export type sessionConnection={
    bind:any;
    listeners:number;//number of "listeners" to the connection
    service:string;//name of upstream service
    socket:any; //the ws socket for that session
}
export type userSession={
    user:string;//code
    checkin:number;
    main:any;//main socket to session
    connections:{[cid:string]:sessionConnection;}//all user sessions
}
export type user = {
    login:number;//user last login
    authorization:string;
    sessions:{[session:string]:userSession};
}
