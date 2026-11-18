import { RpcRoom } from "../src/p2p.js";
import { RpcRoom as LegacyRoom } from "./fixtures/commonlib-0.5.0/reference.mjs";
import { legacyContractSuite } from "./compatibility/legacyContractSuite.js";
import type { LegacyRoomFactory } from "./compatibility/legacyTypes.js";

const candidate: LegacyRoomFactory = (options) =>
  new RpcRoom({
    ...options,
    createAbortController: () => new AbortController(),
  });
const legacy: LegacyRoomFactory = (options) => new LegacyRoom(options);
legacyContractSuite("Pinned legacy ↔ Fancy Kit P2P", legacy, candidate);
legacyContractSuite("Fancy Kit P2P ↔ Fancy Kit P2P", candidate, candidate);
