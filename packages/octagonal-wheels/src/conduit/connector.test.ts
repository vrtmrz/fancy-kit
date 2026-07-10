import { describe, it, expect } from "vitest";
import { Connector } from "./connector.ts";

describe("Connector.funcOf", () => {
    it("should connect and invoke a function", async () => {
        const conn = Connector.funcOf<[number, number], number>("add");
        conn.connect((a, b) => a + b);
        const result = await conn.invoke(2, 3);
        expect(result).toBe(5);
    });

    it("should wait for function to be connected before invoking", async () => {
        const conn = Connector.funcOf<[string], string>("echo");
        const promise = conn.invoke("hello");
        setTimeout(() => {
            conn.connect((msg) => msg + " world");
        }, 10);
        const result = await promise;
        expect(result).toBe("hello world");
    });
    it("should share the same name function", async () => {
        const conn = Connector.funcOf<[number], number>("double");
        conn.connect((n) => n * 2);
        const result = await conn.invoke(4);
        const conn2 = Connector.funcOf<[number], number>("double");
        expect(conn2).toBe(conn);
        const result2 = await conn2.invoke(4);
        expect(result2).toBe(8);
        expect(result).toBe(8);
    });
    it("should be able to invoke synchronously if connected", () => {
        const conn = Connector.funcOf<[number], number>("sync");
        conn.connect((n) => n * 2);
        const result = conn.invokeSync(4);
        expect(result).toBe(8);
    });
    it("should throw if invoked synchronously before connected", () => {
        const conn = Connector.funcOf<[number], number>("sync2");
        expect(() => conn.invokeSync(4)).toThrowError();
        expect(conn.isConnected).toBe(false);
        conn.connect((n) => n * 2);
        const result = conn.invokeSync(4);
        expect(result).toBe(8);
        expect(conn.isConnected).toBe(true);
    });
    it("should able to disconnect and set a new function", async () => {
        const conn = Connector.funcOf<[number], number>("disconnect");
        conn.connect((n) => n * 2);
        const result = await conn.invoke(4);
        expect(result).toBe(8);
        conn.disconnect();
        conn.connect((n) => n * 3);
        const result2 = await conn.invoke(4);
        expect(result2).toBe(12);
    });
    it("should disconnect automatically if the function is set twice", async () => {
        const conn = Connector.funcOf<[number], number>("autoDisconnect");
        conn.connect((n) => n * 2);
        const result = await conn.invoke(4);
        expect(result).toBe(8);
        conn.connect((n) => n * 3);
        const result2 = await conn.invoke(4);
        expect(result2).toBe(12);
    });
    it("should call teardown callback when disconnected", async () => {
        const conn = Connector.funcOf<[number], number>("teardown");
        let tornDown = false;
        conn.connect(
            (n) => n * 2,
            () => {
                tornDown = true;
            }
        );
        conn.disconnect();
        expect(tornDown).toBe(true);
    });
    it("should be able to connect exact function pointing", async () => {
        const func = (n: number) => n * 2;
        const conn = Connector.funcOf(func);
        conn.connect(func);
        const result = await conn.invoke(4);
        expect(result).toBe(8);
    });
    it("should share the same function instance", async () => {
        const func = (n: number) => n * 2;
        const conn = Connector.funcOf(func);
        conn.connect(func);
        const result = await conn.invoke(4);
        expect(result).toBe(8);
        const conn2 = Connector.funcOf(func);
        expect(conn2).toBe(conn);
        const result2 = await conn2.invoke(4);
        expect(result2).toBe(8);
    });
});

describe("Connector.instanceOf", () => {
    it("should connect and retrieve an instance", async () => {
        const obj = { value: 42 };
        const conn = Connector.instanceOf<typeof obj>("obj");
        conn.connect(obj);
        const instance = await conn.connected();
        expect(instance.value).toBe(42);
    });

    it("should wait for instance to be connected", async () => {
        const conn = Connector.instanceOf<{ foo: string }>("delayed");
        const promise = conn.connected();
        setTimeout(() => {
            conn.connect({ foo: "bar" });
        }, 10);
        const instance = await promise;
        expect(instance.foo).toBe("bar");
    });
    it("should share the same name instance", async () => {
        const obj = { value: 42 };
        const conn = Connector.instanceOf<typeof obj>("shared");
        conn.connect(obj);
        const instance = await conn.connected();
        const conn2 = Connector.instanceOf<typeof obj>("shared");
        expect(conn2).toBe(conn);
        const instance2 = await conn2.connected();
        expect(instance2).toBe(instance);
        expect(instance2.value).toBe(42);
    });
    it("should be able to disconnect and set a new instance", async () => {
        const obj = { value: 42 };
        const conn = Connector.instanceOf<typeof obj>("disconnect");
        conn.connect(obj);
        const instance = await conn.connected();
        expect(instance.value).toBe(42);
        conn.disconnect();
        const newObj = { value: 100 };
        conn.connect(newObj);
        const instance2 = await conn.connected();
        expect(instance2.value).toBe(100);
    });
    it("should disconnect automatically if the instance is set twice", async () => {
        const obj = { value: 42 };
        const conn = Connector.instanceOf<typeof obj>("autoDisconnect");
        conn.connect(obj);
        const instance = await conn.connected();
        expect(instance.value).toBe(42);
        const newObj = { value: 100 };
        conn.connect(newObj);
        const instance2 = await conn.connected();
        expect(instance2.value).toBe(100);
    });
    it("should call teardown callback when disconnected", async () => {
        const obj = { value: 42 };
        let tornDown = false;
        const conn = Connector.instanceOf<typeof obj>("teardown");
        conn.connect(obj, () => {
            tornDown = true;
        });
        conn.disconnect();
        expect(tornDown).toBe(true);
    });
    it("should be able to connect exact instance pointing (w/o name)", async () => {
        const obj = { value: 42 };
        const conn = Connector.instanceOf(obj);
        conn.connect(obj);
        const instance = await conn.connected();
        expect(instance.value).toBe(42);
        const conn2 = Connector.instanceOf(obj);
        expect(conn2).toBe(conn);
        const instance2 = await conn2.connected();
        expect(instance2).toBe(instance);
        expect(instance2.value).toBe(42);
        const objB = { value: 100 };
        const connB = Connector.instanceOf(objB);
        connB.connect(objB);
        expect(connB).not.toBe(conn);
        const instanceB = await connB.connected();
        expect(instanceB.value).toBe(100);
    });
    class SharedInstance {
        constructor(
            public value: number,
            public name?: string
        ) {}
    }
    class SharedInstance2 {
        constructor(
            public value: number,
            public name?: string
        ) {}
    }

    it("should be able to connect exact class instance pointing (w/ name)", async () => {
        const obj = new SharedInstance(42, "sharedInstance");
        const conn = Connector.classInstanceOf(SharedInstance);
        conn.connect(obj);
        const connectedObj = await conn.connected();
        expect(connectedObj.value).toBe(42);
        expect(connectedObj.name).toBe("sharedInstance");
        const conn2 = Connector.classInstanceOf<typeof SharedInstance>("SharedInstance");
        const connectedObj2 = await conn2.connected();
        expect(conn2).toBe(conn);
        expect(connectedObj2).toBe(connectedObj);
        expect(connectedObj2.value).toBe(42);
        const obj2 = new SharedInstance2(100, "sharedInstance");
        // They have the same name, but should be handled as different instances, because they are different classes !
        const connB = Connector.classInstanceOf(SharedInstance2);
        connB.connect(obj2);
        const instance2 = await connB.connected();
        expect(connB).not.toBe(conn);
        expect(instance2).not.toBe(connectedObj);
        expect(instance2.value).toBe(100);
        expect(instance2.name).toBe("sharedInstance");
        expect(instance2 instanceof SharedInstance2).toBe(true);
        expect(instance2 instanceof SharedInstance).toBe(false);
        const connB2 = Connector.classInstanceOf<typeof SharedInstance2>("SharedInstance2");
        expect(connB2).toBe(connB);
        const instance2B = await connB2.connected();
        expect(instance2B).toBe(instance2);
        expect(instance2B.value).toBe(100);
        expect(instance2B.name).toBe("sharedInstance");
        expect(instance2B instanceof SharedInstance2).toBe(true);
        expect(instance2B instanceof SharedInstance).toBe(false);
        expect(connB2).not.toBe(conn);
    });
    it("should throws if connected with non-class instance", () => {
        const obj = { value: 42 };
        expect(() => Connector.classInstanceOf(obj as any)).toThrow();
    });
    it("should share the same instance pointing (w/ name)", async () => {
        const obj = { value: 42, name: "sharedInstance" };
        const obj2 = { value: 100, name: "sharedInstance2" };
        const conn = Connector.instanceOf(obj);
        conn.connect(obj);
        const connectedObj = await conn.connected();
        const conn2 = Connector.instanceOf(obj);
        expect(conn2).toBe(conn);
        expect(connectedObj).toBe(obj);
        expect(connectedObj.value).toBe(42);
        const conn3 = Connector.instanceOf("sharedInstance");
        expect(conn3).toBe(conn);
        await conn2.connected(); // Ensure it resolves
        await conn3.connected(); // Ensure it resolves
        const connB = Connector.instanceOf(obj2);
        connB.connect(obj2);
        const instance2 = await connB.connected();
        expect(connB).not.toBe(conn);
        expect(instance2).not.toBe(connectedObj);
        expect(instance2.value).toBe(100);
    });

    it("should throw error if not connected yet", async () => {
        const conn = Connector.instanceOf<{ foo: string }>("notConnected");
        expect(() => conn.connectedSync()).toThrowError();
        expect(conn.isConnected).toBe(false);
        const promise = conn.connected();
        conn.connect({ foo: "bar" });
        const instance = await promise;
        expect(conn.isConnected).toBe(true);
        expect(instance.foo).toBe("bar");
        const instanceSync = conn.connectedSync();
        expect(instanceSync.foo).toBe("bar");
        expect(instanceSync).toBe(instance);

        const conn2 = Connector.classInstanceOf<typeof SharedInstance2>("notConnected2");
        expect(() => conn2.connectedSync()).toThrowError();
        const promise2 = conn2.connected();
        expect(conn2.isConnected).toBe(false);
        conn2.connect(new SharedInstance2(100));
        const instance2 = await promise2;
        expect(conn2.isConnected).toBe(true);
        expect(instance2.value).toBe(100);
        const instance2Sync = conn2.connectedSync();
        expect(instance2Sync.value).toBe(100);
        expect(instance2Sync).toBe(instance2);
    });
});
