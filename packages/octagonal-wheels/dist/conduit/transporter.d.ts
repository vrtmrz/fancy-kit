import { type TransporterBackbone } from "./transporterAdapter.ts";
export type Callee<T extends any[], U> = (...args: T) => Promise<U>;
export type Proxied<T extends any[], U> = Callee<T, U>;
export type Caller<T extends any[], U> = (callee: Callee<T, U>) => () => void;
type TransportedEventData<T extends any[]> = {
    callback: string;
    args: T;
};
type TransportedEventResultData<T> = {
    callback: string;
    result?: T;
    error?: Error;
};
export interface TransportController {
    instanceName: string;
    activate: () => void;
    deactivate: () => void;
    dispatchCommand: (type: NotificationType, instanceName: string) => void;
}
export type TransporterTuple<T extends any[], U> = [Proxied<T, U>, Caller<T, U>, TransportController];
type NotificationType = "promoting" | "demoting" | "deactivated" | "activated" | "switching" | "activate" | "deactivate";
type NotificationData = {
    type: NotificationType;
    instanceName: string;
};
type PayloadTypes<T extends any[], U> = TransportedEventData<T> | TransportedEventResultData<U> | NotificationData;
export declare function _createTransporter<T extends any[], U>(emitter: TransporterBackbone<PayloadTypes<T, U>>, name: string, forceTransportNo?: number): TransporterTuple<T, U>;
export declare const Transporters: {
    of<T extends any[], U>(name: string): TransporterTuple<T, U>;
};
export declare const GlobalTransporters: {
    of<T extends any[], U>(name: string): TransporterTuple<T, U>;
};
export {};
