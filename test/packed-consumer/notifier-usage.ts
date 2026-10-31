import { Notifier as LegacyNotifierV1 } from "octagonal-wheels/concurrency/processor_v1";
import { Notifier as LegacyNotifierV2 } from "octagonal-wheels/concurrency/processor_v2";

const legacyV1 = new LegacyNotifierV1();
void legacyV1.nextNotify;
legacyV1.notify();
const legacyV2 = new LegacyNotifierV2();
void legacyV2.nextNotify;
legacyV2.notify();
