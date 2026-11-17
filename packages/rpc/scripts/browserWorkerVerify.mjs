#!/usr/bin/env node
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium, firefox, webkit } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");

const workerSource = `
import {
  call,
  createRpcEndpoint,
  defineContract,
  withTransfer,
} from "./src/index.js";
import {
  createIdentityCodec,
  createMessagePortTransport,
} from "./src/worker.js";

const workerContract = defineContract({
  echoCopy: call<[blob: Blob], number>(),
  reverseTransfer: call<[bytes: Uint8Array], Uint8Array>().transfer({
    input: "required",
    result: "required",
  }),
  bounceObject: call<[bytes: Uint8Array, tag: string], { readonly tag: string; readonly bytes: Uint8Array }>().transfer({
    input: "optional",
    result: "required",
  }),
  acceptPort: call<[port: { postMessage(msg: unknown): void; start(): void; close(): void }], string>().transfer({
    input: "required",
  }),
});

const params = new URL(self.location.href).searchParams;
const profile = params.get("profile") === "binary-data-and-ports"
  ? "binary-data-and-ports"
  : "binary-data";

const hostPeer = { peerId: "host", instanceId: "h-1" };
const workerPeer = { peerId: "worker", instanceId: "w-1" };

// Keep a raw non-RPC probe listener for owned/borrowed shutdown verification.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (typeof data === "object" && data !== null && data.__rawProbe === true) {
    self.postMessage({ __rawProbeAck: true });
  }
});

const transport = profile === "binary-data-and-ports"
  ? createMessagePortTransport({
      port: self,
      remotePeer: hostPeer,
      transferProfile: "binary-data-and-ports",
    })
  : createMessagePortTransport({
      port: self,
      remotePeer: hostPeer,
    });

const endpoint = createRpcEndpoint({
  contract: workerContract,
  codec: createIdentityCodec(),
  transport,
  localPeer: workerPeer,
});

endpoint.handle("echoCopy", async (_ctx, blob) => {
  const buf = await blob.arrayBuffer();
  return buf.byteLength;
});

endpoint.handle("reverseTransfer", (_ctx, bytes) => {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[i] = bytes[bytes.length - 1 - i];
  }
  return withTransfer(out, [out.buffer]);
});

endpoint.handle("bounceObject", (_ctx, bytes, tag) => {
  const out = new Uint8Array(bytes);
  return withTransfer({ tag, bytes: out }, [out.buffer]);
});

endpoint.handle("acceptPort", (_ctx, transferredPort) => {
  transferredPort.postMessage("from-worker-port");
  transferredPort.close();
  return "port-received";
});

self.postMessage({ __workerReady: true });
`;

const pageSource = `
import {
  call,
  createRpcEndpoint,
  defineContract,
  withTransfer,
} from "./src/index.js";
import {
  assertReachableTransferables,
  createIdentityCodec,
  createMessagePortTransport,
} from "./src/worker.js";

const workerContract = defineContract({
  echoCopy: call<[blob: Blob], number>(),
  reverseTransfer: call<[bytes: Uint8Array], Uint8Array>().transfer({
    input: "required",
    result: "required",
  }),
  bounceObject: call<[bytes: Uint8Array, tag: string], { readonly tag: string; readonly bytes: Uint8Array }>().transfer({
    input: "optional",
    result: "required",
  }),
  acceptPort: call<[port: MessagePort], string>().transfer({
    input: "required",
  }),
});

function spawnReadyWorker(profile) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/worker.js?profile=" + encodeURIComponent(profile), {
      type: "module",
    });
    const onError = (err) => reject(new Error(err.message || "Worker load error"));
    const onReady = (ev) => {
      if (ev.data && ev.data.__workerReady === true) {
        worker.removeEventListener("message", onReady);
        worker.removeEventListener("error", onError);
        resolve(worker);
      }
    };
    worker.addEventListener("error", onError);
    worker.addEventListener("message", onReady);
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

window.__runRpcBrowserSuite = async () => {
  const cases = {};
  const hostPeer = { peerId: "host", instanceId: "h-1" };
  const workerPeer = { peerId: "worker", instanceId: "w-1" };

  // 1. Dedicated Worker bidirectional transfer, detachment, copy Blob, and received-data re-sending.
  {
    const worker = await spawnReadyWorker("binary-data");
    try {
      const ep = createRpcEndpoint({
        contract: workerContract,
        codec: createIdentityCodec(),
        transport: createMessagePortTransport({
          port: worker,
          remotePeer: workerPeer,
          portOwnership: "owned",
        }),
        localPeer: hostPeer,
        transportOwnership: "owned",
      });
      const client = ep.bindPeer(workerPeer);

      const input = new Uint8Array([10, 20, 30, 40]);
      const reversed = await client.call.reverseTransfer([withTransfer(input, [input.buffer])]);
      assert(input.byteLength === 0, "input buffer not detached on main thread");
      assert(
        JSON.stringify([...reversed]) === JSON.stringify([40, 30, 20, 10]),
        "reversed result mismatch",
      );

      // Copy-only Blob on the same Worker endpoint.
      const blobSize = await client.call.echoCopy([new Blob(["hello-browser"])]);
      assert(blobSize === 13, "blob size mismatch");

      // Re-send received structured-deserialised bytes back through a transfer call.
      const bounced = await client.call.bounceObject([new Uint8Array([1, 2, 3]), "from-worker"]);
      assert(bounced.tag === "from-worker", "bounced tag mismatch");
      const resent = await client.call.reverseTransfer([
        withTransfer(bounced.bytes, [bounced.bytes.buffer]),
      ]);
      assert(bounced.bytes.byteLength === 0, "re-sent received buffer did not detach");
      assert(
        JSON.stringify([...resent]) === JSON.stringify([3, 2, 1]),
        "re-sent result mismatch",
      );

      await ep.closeAsync();
      cases.dedicatedWorkerTransfer = "passed";
    } catch (err) {
      worker.terminate();
      throw err;
    }
  }

  // 2. MessageChannel bidirectional transfer, default MessagePort refusal, and explicit port forwarding.
  {
    const ch = new MessageChannel();
    const ep1 = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport: createMessagePortTransport({
        port: ch.port1,
        remotePeer: workerPeer,
        portOwnership: "owned",
      }),
      localPeer: hostPeer,
      transportOwnership: "owned",
    });
    const ep2 = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport: createMessagePortTransport({
        port: ch.port2,
        remotePeer: hostPeer,
        portOwnership: "owned",
      }),
      localPeer: workerPeer,
      transportOwnership: "owned",
    });
    ep2.handle("reverseTransfer", (_ctx, bytes) => {
      const out = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i += 1) out[i] = bytes[i] + 1;
      return withTransfer(out, [out.buffer]);
    });
    const c = ep1.bindPeer(workerPeer);
    const mcIn = new Uint8Array([5, 6]);
    const mcOut = await c.call.reverseTransfer([withTransfer(mcIn, [mcIn.buffer])]);
    assert(mcIn.byteLength === 0, "MessageChannel sender not detached");
    assert(JSON.stringify([...mcOut]) === JSON.stringify([6, 7]), "MessageChannel output mismatch");

    // Default profile rejects MessagePort forwarding before postMessage.
    const fwdDefault = new MessageChannel();
    let defaultFailedCode = "";
    try {
      await c.call.acceptPort([withTransfer(fwdDefault.port2, [fwdDefault.port2])]);
    } catch (err) {
      defaultFailedCode = err && err.code;
    }
    assert(defaultFailedCode === "transfer-failed", "expected transfer-failed under default profile");
    // Un-transferred port still works locally.
    const stillAlive = await new Promise((resolve) => {
      fwdDefault.port1.onmessage = (ev) => resolve(ev.data);
      fwdDefault.port2.postMessage("still-open");
    });
    assert(stillAlive === "still-open", "rejected MessagePort should remain usable");
    fwdDefault.port1.close();
    fwdDefault.port2.close();

    await ep1.closeAsync();
    await ep2.closeAsync();
    let closedErrCode = "";
    try {
      await c.call.echoCopy([new Blob(["x"])]);
    } catch (err) {
      closedErrCode = err && err.code;
    }
    assert(closedErrCode === "disconnected", "closed endpoint must reject new calls with disconnected");
    cases.messageChannelAndDefaultPortRefusal = "passed";
  }

  // 3. Explicit binary-data-and-ports forwarding to Dedicated Worker.
  {
    const worker = await spawnReadyWorker("binary-data-and-ports");
    const fwd = new MessageChannel();
    try {
      const ep = createRpcEndpoint({
        contract: workerContract,
        codec: createIdentityCodec(),
        transport: createMessagePortTransport({
          port: worker,
          remotePeer: workerPeer,
          portOwnership: "owned",
          transferProfile: "binary-data-and-ports",
        }),
        localPeer: hostPeer,
        transportOwnership: "owned",
      });
      const portMsgPromise = new Promise((resolve) => {
        fwd.port1.onmessage = (ev) => resolve(ev.data);
      });
      const client = ep.bindPeer(workerPeer);
      const reply = await client.call.acceptPort([withTransfer(fwd.port2, [fwd.port2])]);
      assert(reply === "port-received", "port forward reply mismatch");
      assert((await portMsgPromise) === "from-worker-port", "forwarded port message mismatch");
      await ep.closeAsync();
      cases.explicitPortForwarding = "passed";
    } finally {
      fwd.port1.close();
      fwd.port2.close();
      worker.terminate();
    }
  }

  // 4. Direct foreign-realm (iframe) container rejection vs local container acceptance.
  {
    const iframe = document.createElement("iframe");
    iframe.src = "about:blank";
    document.body.appendChild(iframe);
    try {
      const localBytes = new Uint8Array([1, 2, 3, 4]);
      const foreignObj = iframe.contentWindow.eval("({})");
      foreignObj.bytes = localBytes;
      let objErrCode = "";
      try {
        assertReachableTransferables({ payload: foreignObj }, [localBytes.buffer]);
      } catch (err) {
        objErrCode = err && err.code;
      }
      assert(objErrCode === "transfer-failed", "foreign iframe object must be rejected");
      assert(localBytes.byteLength === 4, "buffer must remain intact after iframe rejection");

      const foreignArr = new iframe.contentWindow.Array(localBytes);
      let arrErrCode = "";
      try {
        assertReachableTransferables({ arr: foreignArr }, [localBytes.buffer]);
      } catch (err) {
        arrErrCode = err && err.code;
      }
      assert(arrErrCode === "transfer-failed", "foreign iframe array must be rejected");

      const foreignUint8 = new iframe.contentWindow.Uint8Array([7, 8]);
      let viewErrCode = "";
      try {
        assertReachableTransferables({ v: foreignUint8 }, [foreignUint8.buffer]);
      } catch (err) {
        viewErrCode = err && err.code;
      }
      assert(viewErrCode === "transfer-failed", "foreign iframe Uint8Array must be rejected");
      assert(foreignUint8.byteLength === 2, "foreign Uint8Array must stay intact");

      cases.foreignRealmRejection = "passed";
    } finally {
      iframe.remove();
    }
  }

  // 5. Owned vs borrowed Worker shutdown and listener cleanup.
  {
    const probeWorker = async (worker, timeoutMs) =>
      new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            worker.removeEventListener("message", onMsg);
            resolve(false);
          }
        }, timeoutMs);
        const onMsg = (ev) => {
          if (!settled && ev.data && ev.data.__rawProbeAck === true) {
            settled = true;
            clearTimeout(timer);
            worker.removeEventListener("message", onMsg);
            resolve(true);
          }
        };
        worker.addEventListener("message", onMsg);
        worker.postMessage({ __rawProbe: true });
      });

    const borrowedWorker = await spawnReadyWorker("binary-data");
    const epBorrowed = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport: createMessagePortTransport({
        port: borrowedWorker,
        remotePeer: workerPeer,
        portOwnership: "borrowed",
      }),
      localPeer: hostPeer,
      transportOwnership: "owned",
    });
    await epBorrowed.closeAsync();
    assert((await probeWorker(borrowedWorker, 300)) === true, "borrowed worker terminated unexpectedly");
    borrowedWorker.terminate();

    const ownedWorker = await spawnReadyWorker("binary-data");
    const epOwned = createRpcEndpoint({
      contract: workerContract,
      codec: createIdentityCodec(),
      transport: createMessagePortTransport({
        port: ownedWorker,
        remotePeer: workerPeer,
        portOwnership: "owned",
      }),
      localPeer: hostPeer,
      transportOwnership: "owned",
    });
    await epOwned.closeAsync();
    assert((await probeWorker(ownedWorker, 300)) === false, "owned worker survived closeAsync");
    cases.ownedVsBorrowedShutdown = "passed";
  }

  return cases;
};
`;

async function compileBrowserBundles() {
  const [workerBuild, pageBuild] = await Promise.all([
    build({
      absWorkingDir: packageRoot,
      stdin: { contents: workerSource, resolveDir: packageRoot, loader: "ts" },
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      write: false,
    }),
    build({
      absWorkingDir: packageRoot,
      stdin: { contents: pageSource, resolveDir: packageRoot, loader: "ts" },
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      write: false,
    }),
  ]);
  return {
    workerCode: workerBuild.outputFiles[0].text,
    pageCode: pageBuild.outputFiles[0].text,
  };
}

async function runForEngine(name, launcher, url) {
  let browser;
  try {
    browser = await launcher.launch();
  } catch (error) {
    return {
      engine: name,
      version: null,
      status: "unverified",
      reason: error instanceof Error ? error.message.split("\n")[0] : String(error),
      cases: null,
    };
  }
  const version = browser.version();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.__runRpcBrowserSuite === "function");
    const cases = await page.evaluate(() => window.__runRpcBrowserSuite());
    await context.close();
    return {
      engine: name,
      version,
      status: "passed",
      reason: null,
      cases,
    };
  } catch (error) {
    return {
      engine: name,
      version,
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
      cases: null,
    };
  } finally {
    await browser.close();
  }
}

const arg = process.argv.find((a) => a.startsWith("--browser="));
const requested = arg ? arg.slice("--browser=".length) : "all";
const targets =
  requested === "all"
    ? [
        ["chromium", chromium],
        ["firefox", firefox],
        ["webkit", webkit],
      ]
    : requested === "chromium"
      ? [["chromium", chromium]]
      : requested === "firefox"
        ? [["firefox", firefox]]
        : [["webkit", webkit]];

const { workerCode, pageCode } = await compileBrowserBundles();
const htmlDoc =
  '<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/page.js"></script></body></html>';

const server = createServer((req, res) => {
  const reqPath = (req.url || "/").split("?")[0];
  if (reqPath === "/worker.js") {
    res.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
    res.end(workerCode);
    return;
  }
  if (reqPath === "/page.js") {
    res.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
    res.end(pageCode);
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(htmlDoc);
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const addr = server.address();
const baseUrl = `http://127.0.0.1:${addr.port}/`;

try {
  const results = [];
  for (const [name, launcher] of targets) {
    results.push(await runForEngine(name, launcher, baseUrl));
  }
  console.log(JSON.stringify({ results }, null, 2));
  const anyFailed = results.some((r) => r.status === "failed");
  if (anyFailed) {
    process.exitCode = 1;
  }
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
