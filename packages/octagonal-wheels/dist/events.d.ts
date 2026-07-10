declare global {
    interface LSEvents {
        hello: string;
        world: undefined;
    }
}
declare global {
    interface AnyHubEvents {
        [key: string]: any;
    }
}
export * from "./events/EventHub.ts";
export * from "./events/CustomEventTargets.ts";
