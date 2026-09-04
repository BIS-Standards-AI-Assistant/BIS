import { STTProvider, STTProviderType } from "./stt-types";
import { BharatSTTProvider } from "./bharatstt-provider";
import { MockSTTProvider } from "./mock-stt-provider";

class NoneSTTProvider implements STTProvider {
  readonly name = "none" as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async transcribe(): Promise<never> {
    throw new Error("STT_PROVIDER_DISABLED");
  }
}

let activeProviderInstance: STTProvider | null = null;

export function getSTTProvider(overrideType?: STTProviderType): STTProvider {
  if (activeProviderInstance && !overrideType) {
    return activeProviderInstance;
  }

  const providerType: STTProviderType =
    overrideType ||
    (process.env.STT_PROVIDER as STTProviderType) ||
    "none";

  if (activeProviderInstance && activeProviderInstance.name === providerType) {
    return activeProviderInstance;
  }

  switch (providerType) {
    case "bharatstt":
      activeProviderInstance = new BharatSTTProvider();
      break;
    case "mock":
      activeProviderInstance = new MockSTTProvider();
      break;
    case "none":
    default:
      activeProviderInstance = new NoneSTTProvider();
      break;
  }

  return activeProviderInstance;
}

export function setCustomSTTProvider(provider: STTProvider | null): void {
  activeProviderInstance = provider;
}
