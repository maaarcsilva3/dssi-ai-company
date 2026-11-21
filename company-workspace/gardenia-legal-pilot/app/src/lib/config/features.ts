export function getFeatures() {
  return {
    digitalRoutingSlipEnabled:
      process.env.FEATURE_DIGITAL_ROUTING === "true" ||
      process.env.NEXT_PUBLIC_FEATURE_DIGITAL_ROUTING === "true",
    aiEnabled: process.env.AI_ENABLED !== "false",
  };
}