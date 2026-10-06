export type Architecture = "arm64-v8a" | "armeabi-v7a" | "x86_64" | "x86";

export type Release = {
  id: number;
  tag: string;
  publishedAt: string;
  assets: Partial<Record<Architecture, { name: string; url: string; size: number }>>;
};

export function repository() {
  return "yilu-shengfa/lu-yin-box";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRelease(value: unknown): Release {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.tag_name !== "string" ||
    !value.tag_name.trim() ||
    typeof value.published_at !== "string" ||
    !Number.isFinite(Date.parse(value.published_at)) ||
    value.draft !== false ||
    value.prerelease !== false ||
    !Array.isArray(value.assets)
  ) {
    throw new Error("Invalid published release");
  }

  const architectures: Architecture[] = ["arm64-v8a", "armeabi-v7a", "x86_64", "x86"];
  const assets: Release["assets"] = {};

  for (const asset of value.assets) {
    if (
      !isRecord(asset) ||
      typeof asset.name !== "string" ||
      !asset.name.toLowerCase().endsWith(".apk") ||
      asset.state !== "uploaded" ||
      typeof asset.browser_download_url !== "string" ||
      typeof asset.size !== "number" ||
      !Number.isSafeInteger(asset.size) ||
      asset.size <= 0
    ) {
      continue;
    }

    const assetName = asset.name;
    const architecture = architectures.find((candidate) =>
      new RegExp(`(?:^|[-_.])${candidate}\\.apk$`, "i").test(assetName),
    );
    if (!architecture) continue;

    const url = new URL(asset.browser_download_url);
    if (
      url.origin !== "https://github.com" ||
      url.username ||
      url.password ||
      !url.pathname.startsWith(`/${repository()}/releases/download/`) ||
      url.pathname.split("/").at(-2) !== encodeURIComponent(value.tag_name) ||
      url.pathname.split("/").at(-1) !== encodeURIComponent(asset.name)
    ) {
      throw new Error("Invalid release download URL");
    }

    if (assets[architecture]) throw new Error("Ambiguous architecture assets");
    assets[architecture] = { name: asset.name, url: url.href, size: asset.size };
  }

  if (Object.keys(assets).length === 0) throw new Error("Release has no supported APK assets");

  return {
    id: value.id,
    tag: value.tag_name,
    publishedAt: new Date(value.published_at).toISOString(),
    assets: Object.fromEntries(architectures.filter((architecture) => assets[architecture]).map(
      (architecture) => [architecture, assets[architecture]],
    )),
  };
}

export async function fetchLatestRelease(etag?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "luyinbox-release-sync",
  };
  if (etag) headers["If-None-Match"] = etag;

  const response = await fetch(`https://api.github.com/repos/${repository()}/releases/latest`, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });

  if (response.status === 304) return { unchanged: true as const };
  if (!response.ok) throw new Error(`GitHub release request failed (${response.status})`);

  return {
    unchanged: false as const,
    release: parseRelease(await response.json()),
    etag: response.headers.get("etag"),
  };
}
