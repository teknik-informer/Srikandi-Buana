/**
 * Compare migration filenames committed to the repository with the database ledger.
 * A database-only entry is unsafe drift: the source SQL needed to reproduce the
 * recorded schema is not present in the checked-out repository.
 *
 * @param {string[]} repositoryNames
 * @param {string[]} appliedNames
 * @returns {{common: string[], repositoryOnly: string[], databaseOnly: string[]}}
 */
export function compareMigrationNames(repositoryNames, appliedNames) {
  const repository = new Set(repositoryNames);
  const applied = new Set(appliedNames);
  return {
    common: [...repository].filter((name) => applied.has(name)).sort(),
    repositoryOnly: [...repository].filter((name) => !applied.has(name)).sort(),
    databaseOnly: [...applied].filter((name) => !repository.has(name)).sort(),
  };
}
