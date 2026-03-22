import type { ModelsDevProvider } from "./models-dev";

const BLACKLISTED_PROVIDER_IDS = new Set(["gitlab"]);
const BLACKLISTED_PROVIDER_NPMS = new Set(["@gitlab/gitlab-ai-provider"]);

function firstModelNpm(source?: ModelsDevProvider) {
  if (!source) {
    return undefined;
  }

  for (const model of Object.values(source.models)) {
    const npm = model.provider?.npm;
    if (typeof npm === "string" && npm.length > 0) {
      return npm;
    }
  }

  return undefined;
}

export function isProviderBlacklisted(input: {
  providerID: string;
  source?: ModelsDevProvider;
}) {
  if (BLACKLISTED_PROVIDER_IDS.has(input.providerID)) {
    return true;
  }

  const providerNpm = input.source?.npm ?? firstModelNpm(input.source);
  if (!providerNpm) {
    return false;
  }

  return BLACKLISTED_PROVIDER_NPMS.has(providerNpm);
}
