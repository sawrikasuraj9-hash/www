import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface AudioDownloadResult {
  success: boolean;
  title: string;
  artist?: string;
  duration?: string;
  bitrate?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  buffer?: Buffer;
  mimeType?: string;
  fileName?: string;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export function extractYoutubeId(input: string): string | null {
  const ytRegex =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = input.match(ytRegex);
  return match ? match[1] : null;
}

export async function searchYoutubeVideo(query: string): Promise<{ videoId: string; title: string; thumbnailUrl: string } | null> {
  const directId = extractYoutubeId(query);
  if (directId) {
    try {
      const oRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directId}&format=json`,
        { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(3000) }
      );
      if (oRes.ok) {
        const oData = await oRes.json();
        return {
          videoId: directId,
          title: oData.title || "YouTube Audio Track",
          thumbnailUrl: oData.thumbnail_url || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
        };
      }
    } catch {}

    const cleanTitle = query.replace(/(https?:\/\/[^\s]+)/g, "").trim() || "YouTube Track";
    return {
      videoId: directId,
      title: cleanTitle,
      thumbnailUrl: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
    };
  }

  // Fast scrape search
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const html = await res.text();
      const idMatches = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g);
      if (idMatches && idMatches.length > 0) {
        let foundId = null;
        for (const m of idMatches) {
          const id = m.replace("/watch?v=", "");
          if (id.length === 11) {
            foundId = id;
            break;
          }
        }

        if (foundId) {
          let extractedTitle = query;
          const titleRegex = /"title":\{"runs":\[\{"text":"([^"]+)"\}\]/;
          const titleMatch = html.match(titleRegex);
          if (titleMatch && titleMatch[1]) {
            extractedTitle = titleMatch[1];
          }
          return {
            videoId: foundId,
            title: extractedTitle,
            thumbnailUrl: `https://i.ytimg.com/vi/${foundId}/hqdefault.jpg`,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[AudioService] YouTube search notice:", err?.message);
  }

  return null;
}

export function getYtDlpBinary(): string {
  const localBin = path.resolve(process.cwd(), "bin", "yt-dlp");
  if (fs.existsSync(localBin)) {
    try { fs.chmodSync(localBin, 0o755); } catch {}
    return localBin;
  }
  const usrBin = "/usr/local/bin/yt-dlp";
  if (fs.existsSync(usrBin)) return usrBin;
  return "yt-dlp";
}

export async function ensureYtDlpBinary(): Promise<void> {
  const binDir = path.resolve(process.cwd(), "bin");
  const localBin = path.join(binDir, "yt-dlp");
  if (fs.existsSync(localBin)) {
    try { fs.chmodSync(localBin, 0o755); return; } catch {}
  }
  const usrBin = "/usr/local/bin/yt-dlp";
  if (fs.existsSync(usrBin)) return;

  try {
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
    console.log("[AudioService] Provisioning yt-dlp standalone engine...");
    const res = await fetch("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp", {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const arrBuf = await res.arrayBuffer();
      fs.writeFileSync(localBin, Buffer.from(arrBuf));
      fs.chmodSync(localBin, 0o755);
      console.log("[AudioService] yt-dlp binary provisioned successfully.");
    }
  } catch (err: any) {
    console.warn("[AudioService] Warning provisioning yt-dlp:", err?.message);
  }
}

export function cleanStaleTempFiles(): void {
  try {
    const tmpDir = "/tmp";
    if (!fs.existsSync(tmpDir)) return;
    const files = fs.readdirSync(tmpDir);
    const now = Date.now();
    for (const file of files) {
      if (file.startsWith("song_") || file.startsWith("vid_") || file.endsWith(".m4a") || file.endsWith(".part")) {
        const fullPath = path.join(tmpDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > 3 * 60 * 1000) {
            fs.unlinkSync(fullPath);
          }
        } catch {}
      }
    }
  } catch {}
}

const tmpCleanInterval = setInterval(cleanStaleTempFiles, 5 * 60 * 1000);
if (tmpCleanInterval.unref) tmpCleanInterval.unref();

async function resolveViaSoundCloudAudio(
  searchQuery: string,
  targetTitle?: string,
  thumbnailUrl?: string,
  sourceUrl?: string
): Promise<AudioDownloadResult | null> {
  const ytDlp = getYtDlpBinary();
  const filePrefix = `song_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const outPattern = path.join("/tmp", `${filePrefix}.%(ext)s`);

  const findAndReadResult = (): AudioDownloadResult | null => {
    try {
      if (!fs.existsSync("/tmp")) return null;
      const allFiles = fs.readdirSync("/tmp");
      const matched = allFiles.find(
        (f) => f.startsWith(filePrefix) && !f.endsWith(".part") && !f.endsWith(".ytdl")
      );
      if (matched) {
        const fullPath = path.join("/tmp", matched);
        const stats = fs.statSync(fullPath);
        if (stats.size > 10000) {
          const buffer = fs.readFileSync(fullPath);
          try { fs.unlinkSync(fullPath); } catch {}
          const ext = path.extname(matched).replace(".", "").toLowerCase() || "m4a";
          const finalTitle = targetTitle || searchQuery;
          const safeTitle = finalTitle.replace(/[/\\?%*:|"<>]/g, "").trim() || "song";
          return {
            success: true,
            title: finalTitle,
            duration: "HQ Audio",
            bitrate: ext === "mp3" ? "320kbps MP3" : "HQ AAC / M4A (Ultra Fast)",
            sourceUrl: sourceUrl || `https://soundcloud.com/search?q=${encodeURIComponent(searchQuery)}`,
            thumbnailUrl,
            buffer,
            mimeType: ext === "mp3" ? "audio/mpeg" : "audio/mp4",
            fileName: `${safeTitle}.${ext === "mp3" ? "mp3" : "m4a"}`,
          };
        }
      }
    } catch (err: any) {
      console.warn("[AudioService] Read error:", err?.message);
    }
    return null;
  };

  // Attempt 1: Ultra-Fast direct bestaudio with 8 concurrent fragments (1-3 seconds)
  try {
    await execFileAsync(
      ytDlp,
      [
        "-f", "bestaudio/best",
        "--concurrent-fragments", "8",
        "--no-playlist",
        "--max-downloads", "1",
        "-o", outPattern,
        `scsearch1:${searchQuery}`,
      ],
      { timeout: 30000 }
    );
  } catch (err: any) {
    console.warn("[AudioService] Attempt 1 notice:", err?.message);
  }

  const res1 = findAndReadResult();
  if (res1) return res1;

  // Attempt 2: Clean query without brackets or noise (e.g. "Song (Official Video)" -> "Song")
  const simplified = searchQuery
    .replace(/[([][^)]*[)\]]/g, "")
    .replace(/\b(official|video|music|audio|lyrics|hd|4k|remix|dj|prod|ft|feat)\b/gi, "")
    .replace(/[-_~]/g, " ")
    .trim();

  if (simplified && simplified.length >= 3 && simplified.toLowerCase() !== searchQuery.toLowerCase()) {
    try {
      await execFileAsync(
        ytDlp,
        [
          "-f", "bestaudio/best",
          "--concurrent-fragments", "8",
          "--no-playlist",
          "--max-downloads", "1",
          "-o", outPattern,
          `scsearch1:${simplified}`,
        ],
        { timeout: 25000 }
      );
    } catch {}

    const res2 = findAndReadResult();
    if (res2) return res2;
  }

  // Attempt 3: Try scsearch2
  try {
    await execFileAsync(
      ytDlp,
      [
        "-f", "bestaudio/best",
        "--concurrent-fragments", "8",
        "--no-playlist",
        "--max-downloads", "1",
        "-o", outPattern,
        `scsearch2:${searchQuery}`,
      ],
      { timeout: 25000 }
    );
  } catch {}

  const res3 = findAndReadResult();
  if (res3) return res3;

  return null;
}

export async function resolveSongAudio(query: string): Promise<AudioDownloadResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return {
      success: false,
      title: "",
      error: "Query is empty. Please specify song title or YouTube link.",
    };
  }

  let finalSearchQuery = cleanQuery;
  let targetTitle = cleanQuery;
  let thumbUrl: string | undefined;
  let sourceUrl: string | undefined;

  // Check if it's a YouTube link
  const ytId = extractYoutubeId(cleanQuery);
  if (ytId) {
    sourceUrl = `https://www.youtube.com/watch?v=${ytId}`;
    thumbUrl = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    try {
      const oRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`,
        { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(3000) }
      );
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.title) {
          targetTitle = oData.title;
          finalSearchQuery = oData.title;
        }
        if (oData.thumbnail_url) {
          thumbUrl = oData.thumbnail_url;
        }
      }
    } catch {}
  } else {
    // If not a link, fetch thumbnail & title from YouTube in background for card info
    searchYoutubeVideo(cleanQuery).then((yt) => {
      if (yt) {
        thumbUrl = yt.thumbnailUrl;
        sourceUrl = `https://www.youtube.com/watch?v=${yt.videoId}`;
      }
    }).catch(() => {});
  }

  // 1. Ultra-fast direct audio extraction (2-4 seconds)
  const scResult = await resolveViaSoundCloudAudio(finalSearchQuery, targetTitle, thumbUrl, sourceUrl);
  if (scResult && scResult.buffer) {
    return scResult;
  }

  // 2. Direct MP3 URL handling
  if (cleanQuery.startsWith("http") && (cleanQuery.endsWith(".mp3") || cleanQuery.includes(".mp3?"))) {
    try {
      const resp = await fetch(cleanQuery, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const arr = await resp.arrayBuffer();
        const buffer = Buffer.from(arr);
        if (buffer.length > 5000) {
          return {
            success: true,
            title: "Direct Audio Stream",
            duration: "HQ Stream",
            bitrate: "320kbps",
            sourceUrl: cleanQuery,
            buffer,
            mimeType: "audio/mp4",
            fileName: "audio_track.mp3",
          };
        }
      }
    } catch {}
  }

  return {
    success: false,
    title: targetTitle,
    sourceUrl,
    thumbnailUrl: thumbUrl,
    error: `Unable to download audio stream for "${targetTitle}". Source may be unavailable or restricted.`,
  };
}
