/**
 * R2 asset discovery helpers for person-specific premium packs.
 */

export async function listPersonAssetPaths(bucket: R2Bucket, personId: string): Promise<string[]> {
  const prefix = `${personId}/`;
  const paths: string[] = [];
  let cursor: string | undefined;

  do {
    const list = await bucket.list({ prefix, cursor });
    paths.push(
      ...list.objects
        .map((object) => object.key.slice(prefix.length))
        .filter((path) => path.length > 0),
    );
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  return paths.sort((a, b) => a.localeCompare(b));
}
