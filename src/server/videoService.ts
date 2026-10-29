import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { extractYoutubeId, searchYoutubeVideo } from "./audioService";

const execFileAsync = promisify(execFile);

export interface VideoDownloadResult {
  success: boolean;
  videoUrl?: string;
  buffer?: Buffer;
  localPath?: string;
  title: string;
  sizeBytes?: number;
  fileSizeStr?: string;
  duration?: string;
  quality?: string;
  sourceUrl?: string;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export async function resolveVideo(query: string): Promise<VideoDownloadResult> {
  const clean = (query || "").trim();
  if (!clean) {
    return { success: false, title: "", error: "No video query or link provided." };
  }

  // 1. Direct MP4 or video stream URL
  if (/^https?:\/\/.+\.(mp4|mkv|mov|webm|avi)(\?.*)?$/i.test(clean)) {
    try {
      const headResp = await fetch(clean, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(4000),
      });
      const cl = headResp.headers.get("content-length");
      const sizeBytes = cl ? parseInt(cl, 10) : 0;
      const sizeMB = sizeBytes > 0 ? (sizeBytes / (1024 * 1024)).toFixed(1) + " MB" : "Direct Video Stream";
      const fileName = clean.split("/").pop()?.split("?")[0] || "video.mp4";

      // If <= 40MB, fetch directly into buffer for instant WhatsApp delivery
      if (sizeBytes > 0 && sizeBytes <= 40 * 1024 * 1024) {
        const fileResp = await fetch(clean, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10000) });
        if (fileResp.ok) {
          const buf = Buffer.from(await fileResp.arrayBuffer());
          return {
            success: true,
            videoUrl: clean,
            buffer: buf,
            title: fileName,
            sizeBytes,
            fileSizeStr: sizeMB,
            quality: "HD Direct",
            sourceUrl: clean,
          };
        }
      }

      return {
        success: true,
        videoUrl: clean,
        title: fileName,
        sizeBytes,
        fileSizeStr: sizeMB,
        quality: "HD Direct",
        sourceUrl: clean,
      };
    } catch {
      return {
        success: true,
        videoUrl: clean,
        title: "Direct Video",
        fileSizeStr: "Online Stream",
        quality: "HD Direct",
        sourceUrl: clean,
      };
    }
  }

  // 2. TikTok URL
  if (clean.includes("tiktok.com")) {
    try {
      const apiRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(clean)}`, {
        signal: AbortSignal.timeout(6000),
      });
      const json = await apiRes.json();
      if (json && json.code === 0 && json.data?.play) {
        const directPlay = json.data.play;
        const vidTitle = json.data.title || "TikTok Video";
        const duration = `${json.data.duration || 0}s`;

        // Fetch buffer for instant delivery
        try {
          const vidRes = await fetch(directPlay, { signal: AbortSignal.timeout(10000) });
          if (vidRes.ok) {
            const buf = Buffer.from(await vidRes.arrayBuffer());
            return {
              success: true,
              videoUrl: directPlay,
              buffer: buf,
              title: vidTitle,
              duration,
              quality: "1080p HD (No Watermark)",
              sourceUrl: clean,
              fileSizeStr: `${(buf.length / (1024 * 1024)).toFixed(1)} MB`,
            };
          }
        } catch {}

        return {
          success: true,
          videoUrl: directPlay,
          title: vidTitle,
          duration,
          quality: "1080p HD (No Watermark)",
          sourceUrl: clean,
          fileSizeStr: json.data.size ? (json.data.size / (1024 * 1024)).toFixed(1) + " MB" : "HD Video",
        };
      }
    } catch (err: any) {
      console.warn("[VideoService] TikTok extraction error:", err?.message);
    }
  }

  // 3. Facebook URL
  if (clean.includes("facebook.com") || clean.includes("fb.watch") || clean.includes("fb.com")) {
    try {
      // Provider 1: ruhend-scraper fbdl
      // @ts-ignore
      const { fbdl } = await import("ruhend-scraper");
      const fbRes = await fbdl(clean);
      const vidUrl = Array.isArray(fbRes) ? fbRes[0] : fbRes;
      if (vidUrl && typeof vidUrl === "string" && vidUrl.startsWith("http")) {
        try {
          const res = await fetch(vidUrl, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(12000),
          });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            return {
              success: true,
              videoUrl: vidUrl,
              buffer: buf,
              title: "Facebook Video",
              quality: "HD Stream",
              sourceUrl: clean,
              fileSizeStr: `${(buf.length / (1024 * 1024)).toFixed(1)} MB`,
            };
          }
        } catch {}

        return {
          success: true,
          videoUrl: vidUrl,
          title: "Facebook Video",
          quality: "HD Stream",
          sourceUrl: clean,
        };
      }
    } catch {}

    // Provider 2: yt-dlp fast download for Facebook
    const tempFb = path.join("/tmp", `fb_${Date.now()}.mp4`);
    try {
      await execFileAsync("yt-dlp", ["--max-filesize", "60M", "-o", tempFb, clean], { timeout: 15000 });
      if (fs.existsSync(tempFb)) {
        const buf = fs.readFileSync(tempFb);
        fs.unlinkSync(tempFb);
        return {
          success: true,
          buffer: buf,
          title: "Facebook Video",
          quality: "HD Video",
          sourceUrl: clean,
          fileSizeStr: `${(buf.length / (1024 * 1024)).toFixed(1)} MB`,
        };
      }
    } catch (e: any) {
      if (fs.existsSync(tempFb)) try { fs.unlinkSync(tempFb); } catch {}
    }
  }

  // 4. Twitter / X URL
  if (clean.includes("twitter.com") || clean.includes("x.com")) {
    // Provider 1: savetwitter.net
    try {
      const form = new URLSearchParams({ q: clean, lang: "en", cftoken: "" });
      const res = await fetch("https://savetwitter.net/api/ajaxSearch", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://savetwitter.net",
          referer: "https://savetwitter.net/en4",
          "user-agent": USER_AGENT,
        },
        body: form.toString(),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === "ok" && json.data) {
          const match = json.data.match(/href="([^"]*(?:dl\.snapcdn\.app|twimg\.com)[^"]*)"/i);
          if (match && match[1]) {
            const vidUrl = match[1];
            try {
              const dlRes = await fetch(vidUrl, { signal: AbortSignal.timeout(10000) });
              if (dlRes.ok) {
                const buf = Buffer.from(await dlRes.arrayBuffer());
                return {
                  success: true,
                  videoUrl: vidUrl,
                  buffer: buf,
                  title: "Twitter / X Video",
                  quality: "720p HD",
                  sourceUrl: clean,
                  fileSizeStr: `${(buf.length / (1024 * 1024)).toFixed(1)} MB`,
                };
              }
            } catch {}
          }
        }
      }
    } catch {}

    // Provider 2: yt-dlp native download for Twitter/X
    const tempTw = path.join("/tmp", `tw_${Date.now()}.mp4`);
    try {
      await execFileAsync("yt-dlp", ["--max-filesize", "60M", "-o", tempTw, clean], { timeout: 15000 });
      if (fs.existsSync(tempTw)) {
        const buf = fs.readFileSync(tempTw);
        fs.unlinkSync(tempTw);
        return {
          success: true,
          buffer: buf,
          title: "Twitter / X Video",
          quality: "HD Video",
          sourceUrl: clean,
          fileSizeStr: `${(buf.length / (1024 * 1024)).toFixed(1)} MB`,
        };
      }
    } catch (e: any) {
      if (fs.existsSync(tempTw)) try { fs.unlinkSync(tempTw); } catch {}
    }
  }

  // 5. Instagram URL
  if (clean.includes("instagram.com")) {
    // Provider 1: SnapVideo scraper
    try {
      const snapRes = await fetch("https://snapvideo.app/en", { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(4000) });
      const snapHtml = await snapRes.text();
      const expMatch = snapHtml.match(/k_exp="([^"]+)"/);
      const tokenMatch = snapHtml.match(/k_token="([^"]+)"/);

      if (expMatch && tokenMatch) {
        const form = new URLSearchParams({
          k_exp: expMatch[1],
          k_token: tokenMatch[1],
          q: clean,
          t: "media",
          lang: "en",
          v: "v2",
        });

        const apiRes = await fetch("https://snapvideo.app/api/ajaxSearch", {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            origin: "https://snapvideo.app",
            referer: "https://snapvideo.app/en",
            "user-agent": USER_AGENT,
          },
          body: form.toString(),
          signal: AbortSignal.timeout(6000),
        });

        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson.status === "ok" && apiJson.data) {
            const dlMatch = apiJson.data.match(/href="([^"]*(?:dl\.snapcdn\.app|cdninstagram\.com)[^"]*)"/i);
            if (dlMatch && dlMatch[1]) {
              const dlUrl = dlMatch[1];
              try {
                const vidRes = await fetch(dlUrl, { signal: AbortSignal.timeout(10000) });
                if (vidRes.ok) {
                  const buf = Buffer.from(await vidRes.arrayBuffer());
                  return {
                    success: true,
                    videoUrl: dlUrl,
                    buffer: buf,
                    title: "Instagram Video",
                    quality: "HD Reel",
                    sourceUrl: clean,
                    fileSizeStr: `${(buf.length / (1024 * 1024)).toFixed(1)} MB`,
                  };
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }

  // 6. YouTube or General Search Query
  try {
    const ytVideo = await searchYoutubeVideo(clean);
    if (!ytVideo || !ytVideo.videoId) {
      return {
        success: false,
        title: clean,
        error: `Could not find a video matching "${clean}".`,
      };
    }

    const videoId = ytVideo.videoId;
    const title = ytVideo.title || clean;

    // Fast Loader.to for MP4 stream
    try {
      const initUrl = `https://loader.to/ajax/download.php?format=360&url=https://www.youtube.com/watch?v=${videoId}`;
      const initRes = await fetch(initUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        if (initData && initData.id) {
          const progressUrl = initData.progress_url || `https://lto2.affadaffa.com/api/progress?id=${initData.id}`;
          for (let i = 0; i < 6; i++) {
            await new Promise((r) => setTimeout(r, 800));
            try {
              const progRes = await fetch(progressUrl, {
                headers: { "User-Agent": USER_AGENT },
                signal: AbortSignal.timeout(3000),
              });
              if (progRes.ok) {
                const progData = await progRes.json();
                if (progData.success === 1 && progData.download_url) {
                  // Pre-fetch buffer for smooth delivery
                  try {
                    const vidRes = await fetch(progData.download_url, { signal: AbortSignal.timeout(12000) });
                    if (vidRes.ok) {
                      const buf = Buffer.from(await vidRes.arrayBuffer());
                      return {
                        success: true,
                        videoUrl: progData.download_url,
                        buffer: buf,
                        title,
                        quality: "360p / 720p HD",
                        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
                        fileSizeStr: `${(buf.length / (1024 * 1024)).toFixed(1)} MB`,
                      };
                    }
                  } catch {}

                  return {
                    success: true,
                    videoUrl: progData.download_url,
                    title,
                    quality: "360p / 720p HD",
                    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    fileSizeStr: "~15-35 MB",
                  };
                }
                if (progData.success === -1) break;
              }
            } catch {}
          }
        }
      }
    } catch (loaderErr: any) {
      console.warn("[VideoService] Loader.to video error:", loaderErr?.message);
    }

    return {
      success: true,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      quality: "720p HD",
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      fileSizeStr: "Full HD Video",
    };
  } catch (err: any) {
    return {
      success: false,
      title: clean,
      error: `Failed to process video: ${err?.message || err}`,
    };
  }
}
