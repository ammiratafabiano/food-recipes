export interface ResponseModel<T> {
  success: boolean;
  data?: T;
  errorCode?: JoinErrorEnum | string;
}

export enum JoinErrorEnum {
  Generic = 'GENERIC',
}
