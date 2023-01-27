export class ResponseModel<T> {
    success: boolean = false;
    data?: T;
    errorCode?: JoinErrorEnum | string;
}

export enum JoinErrorEnum {
    Generic = 'GENERIC'
}
