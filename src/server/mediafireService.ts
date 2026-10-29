/**
 * High-Speed Resilient MediaFire Direct Download Link Resolver
 * Extracts direct cloud storage CDN links from MediaFire URLs.
 */

export interface MediaFireResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: string;
  sizeBytes?: number;
  mimeType?: string;
  error?: string;
}

export async function resolveMediaFire(url: string): Promise<MediaFireResult> {
  try {
    if (!url || !url.toLowerCase().includes('mediafire.com')) {
      return {
        success: false,
        error: 'Invalid MediaFire URL. Must contain mediafire.com',
      };
    }

    // Clean URL
    let cleanUrl = url.trim();
    const urlMatch = cleanUrl.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) cleanUrl = urlMatch[0];

    // Ensure https protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const browserHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    const response = await fetch(cleanUrl, {
      headers: browserHeaders,
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `MediaFire responded with HTTP status ${response.status}`,
      };
    }

    const html = await response.text();

    // 1. Direct CDN link extraction strategies
    let downloadUrl = '';

    // Pattern A: id="downloadButton"
    const btnMatch = html.match(/id=["']downloadButton["'][^>]*href=["']([^"']+)["']/i);
    if (btnMatch && btnMatch[1]) {
      downloadUrl = btnMatch[1];
    }

    // Pattern B: aria-label="Download file"
    if (!downloadUrl) {
      const ariaMatch = html.match(/aria-label=["']Download file["'][^>]*href=["']([^"']+)["']/i);
      if (ariaMatch && ariaMatch[1]) {
        downloadUrl = ariaMatch[1];
      }
    }

    // Pattern C: direct download domain regex (download*.mediafire.com)
    if (!downloadUrl) {
      const directRegex = /href=["'](https?:\/\/(?:download\d*|[a-z0-9]+)\.mediafire\.com\/(?:[a-zA-Z0-9_\-\/.]+))["']/i;
      const directMatch = html.match(directRegex);
      if (directMatch && directMatch[1]) {
        downloadUrl = directMatch[1];
      }
    }

    // Pattern D: class="input popsok" or class="popsok"
    if (!downloadUrl) {
      const popsokMatch = html.match(/class=["'][^"']*popsok[^"']*["'][^>]*href=["']([^"']+)["']/i);
      if (popsokMatch && popsokMatch[1]) {
        downloadUrl = popsokMatch[1];
      }
    }

    // Pattern E: JS window.location.href or kNO variable
    if (!downloadUrl) {
      const knoMatch = html.match(/kNO\s*=\s*["'](https?:\/\/[^"']+)["']/i);
      if (knoMatch && knoMatch[1]) {
        downloadUrl = knoMatch[1];
      }
    }

    // Pattern F: any link with /download/ in href
    if (!downloadUrl) {
      const genericMatch = html.match(/href=["'](https?:\/\/[^"']*(?:mediafire\.com\/download\/|\.mediafire\.com\/file\/)[^"']+)["']/i);
      if (genericMatch && genericMatch[1]) {
        downloadUrl = genericMatch[1];
      }
    }

    if (!downloadUrl) {
      return {
        success: false,
        error: 'Could not extract direct download link from MediaFire. The file may be password protected or deleted.',
      };
    }

    // 2. File Name extraction
    let fileName = 'mediafire_file';
    const nameMatch = html.match(/<div[^>]*class=["']filename["'][^>]*>(.*?)<\/div>/i);
    if (nameMatch && nameMatch[1]) {
      fileName = nameMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title>(.*?)(?: - MediaFire)?<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        fileName = titleMatch[1].trim();
      }
    }
    fileName = fileName.replace(/<\/?[^>]+(>|$)/g, '').trim();

    // 3. File Size extraction from HTML
    let fileSize = 'Unknown Size';
    const sizeMatch =
      html.match(/<span>\(([0-9.]+\s*(?:KB|MB|GB|TB|B))\)<\/span>/i) ||
      html.match(/<li>Size:\s*<span>(.*?)<\/span>/i) ||
      html.match(/class=["']details["'][^>]*>.*?<span>\(([0-9.]+\s*(?:KB|MB|GB|TB|B))\)<\/span>/is) ||
      html.match(/([0-9.]+\s*(?:KB|MB|GB))\s*•/i);

    if (sizeMatch && sizeMatch[1]) {
      fileSize = sizeMatch[1].trim();
    }

    // 4. Validate Direct Download with HEAD Request to get exact Content-Length & Name
    let sizeBytes = 0;
    try {
      const headResp = await fetch(downloadUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': browserHeaders['User-Agent'],
          Referer: cleanUrl,
        },
        signal: AbortSignal.timeout(3500),
      });

      if (headResp.ok) {
        const cl = headResp.headers.get('content-length');
        if (cl) {
          sizeBytes = parseInt(cl, 10);
          if (sizeBytes > 0) {
            if (sizeBytes >= 1024 * 1024 * 1024) {
              fileSize = (sizeBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
            } else if (sizeBytes >= 1024 * 1024) {
              fileSize = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
            } else if (sizeBytes >= 1024) {
              fileSize = (sizeBytes / 1024).toFixed(2) + ' KB';
            } else {
              fileSize = sizeBytes + ' Bytes';
            }
          }
        }

        // Try extracting filename from Content-Disposition header
        const cd = headResp.headers.get('content-disposition');
        if (cd) {
          const fnMatch = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
          if (fnMatch && fnMatch[1]) {
            fileName = decodeURIComponent(fnMatch[1].trim());
          }
        }
      }
    } catch (headErr) {
      // Silently proceed with parsed HTML metadata if HEAD fails
    }

    // 5. Accurate MIME type resolution
    let mimeType = 'application/octet-stream';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      apk: 'application/vnd.android.package-archive',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      mkv: 'video/x-matroska',
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    if (ext && mimeMap[ext]) {
      mimeType = mimeMap[ext];
    }

    return {
      success: true,
      downloadUrl,
      fileName,
      fileSize,
      sizeBytes,
      mimeType,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to resolve MediaFire link',
    };
  }
}
