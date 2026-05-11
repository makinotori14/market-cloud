import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
let sdk = null;
export function initTelemetry() {
    if (sdk) {
        return;
    }
    sdk = new NodeSDK({
        serviceName: "cloud-recommender-backend",
        instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();
}
//# sourceMappingURL=otel.js.map