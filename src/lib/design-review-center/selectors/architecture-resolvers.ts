import { ARCHITECTURE_ROLE_LABELS } from '@/config/design-review-center/labels';
import type { ArchitectureCountItem, ProductArchitectureInput } from '@/lib/design-review-center/types';

export interface ArchitectureResolverContext {
  matchedInputs: ProductArchitectureInput[];
}

export type ArchitectureDimensionResolver = (context: ArchitectureResolverContext) => ArchitectureCountItem[];

export const ARCHITECTURE_DIMENSION_RESOLVERS: Record<string, ArchitectureDimensionResolver> = {
  quantity: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.quantityItems),
  styleRole: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.styleRoleItems),
  structureType: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.structureTypes),
  soleType: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.soleTypes),
  heelType: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.heelTypes),
  lastType: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.lastTypes),
  craftDetail: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.craftDetails),
  warmStructure: ({ matchedInputs }) => matchedInputs.flatMap((input) => input.warmStructures),
  developmentAndPlatform: ({ matchedInputs }) => matchedInputs.flatMap((input) => [...input.developmentAttributes, ...(input.platformStrategies ?? [])]),
};

export function getArchitectureDimensionResolver(resolverKey: string) {
  return ARCHITECTURE_DIMENSION_RESOLVERS[resolverKey];
}

export function getArchitectureRoleLabel(roleKey: keyof typeof ARCHITECTURE_ROLE_LABELS) {
  return ARCHITECTURE_ROLE_LABELS[roleKey];
}
