async function updateDownloads() {
  const status = document.querySelector("#sync-status");

  try {
    const response = await fetch("/api/latest-release", { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Release unavailable");
    const { release, checkedAt } = await response.json();

    const version = document.querySelector(".version");
    const releaseDate = Date.parse(release.publishedAt);
    const displayedDate = Date.parse(version.dataset.releasePublishedAt);
    if (!Number.isFinite(releaseDate)) throw new Error("Invalid release date");
    if (Number.isFinite(displayedDate) && releaseDate < displayedDate) {
      status.textContent = "同步缓存尚未更新，保留已核实的新版本 · 可查看 GitHub 最新版本";
      return;
    }

    version.textContent = `V ${release.tag.replace(/^v/i, "")}`;
    version.dataset.releasePublishedAt = release.publishedAt;

    const descriptions = {
      "arm64-v8a": "arm64-v8a",
      "armeabi-v7a": "旧款 32 位设备",
      "x86_64": "64 位模拟器",
      "x86": "32 位模拟器",
    };

    for (const [architecture, description] of Object.entries(descriptions)) {
      const link = document.querySelector(`[data-architecture="${architecture}"]`);
      const asset = release.assets[architecture];
      const size = architecture === "arm64-v8a"
        ? document.querySelector(".size")
        : link.querySelector("small");

      if (asset) {
        link.href = asset.url;
        link.removeAttribute("aria-disabled");
        link.removeAttribute("tabindex");
        size.textContent = `${description} · ${(asset.size / 1024 / 1024).toFixed(1)} MB${architecture === "arm64-v8a" ? " · APK" : ""}`;
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("tabindex", "-1");
        size.textContent = `${description} · 此版本暂无安装包`;
      }
    }

    const checkedDate = new Date(checkedAt);
    const timestamp = checkedDate.toLocaleString("zh-CN", { hour12: false });
    status.textContent = Date.now() - checkedDate.getTime() > 3 * 60 * 60 * 1000
      ? `同步暂有延迟，保留上次版本 · 上次检查 ${timestamp}`
      : `每 2 小时自动检查 · 上次检查 ${timestamp}`;
  } catch {
    status.textContent = "同步信息暂不可用，保留当前下载链接 · 可查看 GitHub 最新版本";
  }
}

updateDownloads();
