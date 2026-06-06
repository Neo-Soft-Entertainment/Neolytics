export async function buildUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>
) {
  const initial = baseSlug || "workspace";

  if (!(await exists(initial))) {
    return initial;
  }

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${initial}-${index}`;

    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  return `${initial}-${Date.now()}`;
}
