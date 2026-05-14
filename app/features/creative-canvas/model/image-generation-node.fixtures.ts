import {
  getImageGenerationModelCapability,
  type ImageGenerationCapabilityAspectRatio,
  type ImageGenerationInputControlKind,
  type ImageGenerationModelCapability,
} from "./image-generation-node.ts";

type ImageGenerationModelCapabilityFixtureCase = {
  id: string;
  capability: ImageGenerationModelCapability;
  expectations: {
    defaultAspectRatio: ImageGenerationCapabilityAspectRatio;
    supportedAspectRatiosInclude: readonly ImageGenerationCapabilityAspectRatio[];
    unsupportedAspectRatios: readonly ImageGenerationCapabilityAspectRatio[];
    unsupportedControlKinds: readonly ImageGenerationInputControlKind[];
    unsupportedRatioBehavior:
      ImageGenerationModelCapability["schemaAdapter"]["unsupportedRatioBehavior"];
    maxReferenceImages: number;
  };
};

function requireImageGenerationModelCapability(input: {
  providerId: "replicate";
  modelSlug: string;
}): ImageGenerationModelCapability {
  const capability = getImageGenerationModelCapability(input);

  if (!capability) {
    throw new Error(
      `Missing image generation model capability fixture: ${input.providerId}:${input.modelSlug}`,
    );
  }

  return capability;
}

export const verticalDefaultImageModelCapabilityFixture =
  requireImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
  });

export const restrictedImageModelCapabilityFixture =
  requireImageGenerationModelCapability({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
  });

export const restrictedUnsupportedOptionsImageModelCapabilityFixture =
  restrictedImageModelCapabilityFixture;

export const imageGenerationModelCapabilityFixtures = [
  verticalDefaultImageModelCapabilityFixture,
  restrictedImageModelCapabilityFixture,
] as const satisfies readonly ImageGenerationModelCapability[];

export const imageGenerationModelCapabilityFixtureCases = [
  {
    id: "replicate-nano-banana-vertical-default",
    capability: verticalDefaultImageModelCapabilityFixture,
    expectations: {
      defaultAspectRatio: "9:16",
      supportedAspectRatiosInclude: ["9:16"],
      unsupportedAspectRatios: [],
      unsupportedControlKinds: ["seed", "guidance", "quality", "size"],
      unsupportedRatioBehavior: "disable",
      maxReferenceImages: 8,
    },
  },
  {
    id: "replicate-gpt-image-restricted-options",
    capability: restrictedUnsupportedOptionsImageModelCapabilityFixture,
    expectations: {
      defaultAspectRatio: "2:3",
      supportedAspectRatiosInclude: ["1:1", "2:3", "3:2"],
      unsupportedAspectRatios: ["9:16", "16:9"],
      unsupportedControlKinds: ["seed", "guidance", "size"],
      unsupportedRatioBehavior: "map_nearest",
      maxReferenceImages: 1,
    },
  },
] as const satisfies readonly ImageGenerationModelCapabilityFixtureCase[];
