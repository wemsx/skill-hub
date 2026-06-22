import type { InventoryFilters, SkillResource } from "./types";

export function filterInventory(
  resources: SkillResource[],
  filters: InventoryFilters,
): SkillResource[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return resources.filter((resource) => {
    if (filters.kind !== "all" && resource.kind !== filters.kind) {
      return false;
    }
    if (filters.host !== "all" && resource.host !== filters.host) {
      return false;
    }
    if (filters.source !== "all" && !matchesSourceGroup(resource.sourceKind, filters.source)) {
      return false;
    }
    if (!query) {
      return true;
    }

    return resource.name.toLocaleLowerCase().includes(query);
  });
}

function matchesSourceGroup(sourceKind: SkillResource["sourceKind"], selectedSource: SkillResource["sourceKind"]) {
  if (selectedSource === "native") {
    return sourceKind === "native" || sourceKind === "registry";
  }
  if (selectedSource === "local") {
    return sourceKind === "local" || sourceKind === "linked";
  }
  return sourceKind === selectedSource;
}
