export type MigrationComparison = {
  common: string[];
  repositoryOnly: string[];
  databaseOnly: string[];
};

/**
 * Compare migration filenames committed to the repository with the database ledger.
 * A database-only entry is unsafe drift: the source SQL needed to reproduce the
 * recorded schema is not present in the checked-out repository.
 */
export function compareMigrationNames(repositoryNames: string[], appliedNames: string[]): MigrationComparison {
  const repository = new Set(repositoryNames);
  const applied = new Set(appliedNames);
  return {
    common: [...repository].filter((name) => applied.has(name)).sort(),
    repositoryOnly: [...repository].filter((name) => !applied.has(name)).sort(),
    databaseOnly: [...applied].filter((name) => !repository.has(name)).sort(),
  };
}
