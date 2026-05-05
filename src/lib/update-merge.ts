export type MergeStrategy = 'full' | 'partial';

/**
 * Strip null and undefined values from a patch.
 * Per spec §3.3, null is treated the same as undefined ("leave the
 * existing value alone"). Stripping up-front keeps both the empty-patch
 * short-circuit and the merge loop honest.
 */
function stripNullish<TBody extends object>(patch: Partial<TBody>): Partial<TBody> {
  const cleaned: Partial<TBody> = {};
  for (const key of Object.keys(patch) as Array<keyof TBody>) {
    const value = patch[key];
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function applyUpdate<TResource extends object, TBody extends object>(
  strategy: MergeStrategy,
  patch: Partial<TBody>,
  fetchCurrent: () => Promise<TResource>,
  put: (body: Partial<TBody>) => Promise<TResource>,
  whitelist: ReadonlyArray<keyof TBody & keyof TResource>,
): Promise<TResource> {
  const effective = stripNullish(patch);

  if (Object.keys(effective).length === 0) {
    return fetchCurrent();
  }

  if (strategy === 'partial') {
    return put(effective);
  }

  const existing = await fetchCurrent();
  const body: Partial<TBody> = {};
  for (const key of whitelist) {
    const fromPatch = effective[key];
    if (fromPatch !== undefined) {
      body[key] = fromPatch;
    } else {
      body[key] = (existing as unknown as TBody)[key];
    }
  }
  return put(body);
}
