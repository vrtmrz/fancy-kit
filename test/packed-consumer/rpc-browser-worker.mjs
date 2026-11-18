import { call, defineContract, withTransfer } from "@vrtmrz/rpc";
import { serveWorkerRpc } from "@vrtmrz/rpc/worker";

const contract = defineContract({
  openPort: call().transfer({ result: "required" }),
});
const ports = new Set();

serveWorkerRpc({
  contract,
  port: self,
  register(endpoint, signal) {
    signal.addEventListener("abort", () => {
      for (const port of ports) {
        port.close();
      }
      ports.clear();
    });
    endpoint.handle("openPort", () => {
      const channel = new MessageChannel();
      ports.add(channel.port1);
      channel.port1.addEventListener("message", (event) => {
        channel.port1.postMessage(event.data);
      });
      channel.port1.addEventListener("close", () => ports.delete(channel.port1), { once: true });
      channel.port1.start();
      return withTransfer(channel.port2, [channel.port2]);
    });
  },
});
