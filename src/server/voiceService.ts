import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);
const VOICE_DIR = path.resolve(process.cwd(), "data", "voice_replies");

function ensureVoiceDir() {
  try {
    if (!fs.existsSync(VOICE_DIR)) {
      fs.mkdirSync(VOICE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("Failed to create voice replies directory:", err);
  }
  return VOICE_DIR;
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function validateAudioBuffer(buffer: Buffer, filename: string) {
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = [".mp3", ".m4a", ".wav", ".ogg", ".opus", ".aac"];
  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      mimeType: "",
      error: `Unsupported audio extension '${ext}'. Please upload an MP3, M4A, WAV, or OGG file.`
    };
  }
  const MAX_SIZE = 25 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    return {
      valid: false,
      mimeType: "",
      error: `File is too large (${formatBytes(buffer.length)}). Maximum allowed size is 25 MB.`
    };
  }
  let mimeType = "audio/mpeg";
  if (ext === ".wav") mimeType = "audio/wav";
  else if (ext === ".ogg" || ext === ".opus") mimeType = "audio/ogg";
  else if (ext === ".m4a" || ext === ".aac") mimeType = "audio/mp4";
  return { valid: true, mimeType };
}

async function saveAudioFile(buffer: Buffer, originalFilename: string, prefixId: string) {
  ensureVoiceDir();
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${prefixId}_${sanitized}`;
  const filePath = path.resolve(VOICE_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  const ext = path.extname(originalFilename).toLowerCase();
  let mimeType = "audio/mpeg";
  if (ext === ".wav") mimeType = "audio/wav";
  else if (ext === ".ogg" || ext === ".opus") mimeType = "audio/ogg";
  else if (ext === ".m4a") mimeType = "audio/mp4";
  const opusPath = filePath.replace(ext, ".opus");
  try {
    await execAsync(`ffmpeg -y -i "${filePath}" -c:a libopus -b:a 32k -vbr on "${opusPath}"`);
  } catch {}
  return { filePath, fileName, mimeType, size: buffer.length, durationSeconds: undefined };
}

function deleteAudioFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const ext = path.extname(filePath);
    const opusPath = filePath.replace(ext, ".opus");
    if (fs.existsSync(opusPath)) {
      fs.unlinkSync(opusPath);
    }
    return true;
  } catch (err) {
    console.error("Failed to delete audio file:", err);
    return false;
  }
}

function getAudioFileStream(filePathOrName: string) {
  ensureVoiceDir();
  let resolvedPath = filePathOrName;
  if (!path.isAbsolute(resolvedPath) || !fs.existsSync(resolvedPath)) {
    const fileName = path.basename(filePathOrName);
    const candidate = path.resolve(VOICE_DIR, fileName);
    if (fs.existsSync(candidate)) {
      resolvedPath = candidate;
    }
  }
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }
  const stat = fs.statSync(resolvedPath);
  const ext = path.extname(resolvedPath).toLowerCase();
  let mimeType = "audio/mpeg";
  if (ext === ".wav") mimeType = "audio/wav";
  else if (ext === ".ogg" || ext === ".opus") mimeType = "audio/ogg";
  else if (ext === ".m4a") mimeType = "audio/mp4";
  return { filePath: resolvedPath, mimeType, size: stat.size };
}

async function getWhatsAppVoiceBuffer(filePathOrName: string) {
  ensureVoiceDir();
  let resolvedPath = filePathOrName;
  if (!path.isAbsolute(resolvedPath) || !fs.existsSync(resolvedPath)) {
    const fileName = path.basename(filePathOrName);
    const candidate = path.resolve(VOICE_DIR, fileName);
    if (fs.existsSync(candidate)) {
      resolvedPath = candidate;
    }
  }
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }
  const ext = path.extname(resolvedPath).toLowerCase();
  const opusPath = resolvedPath.replace(ext, ".opus");

  if (fs.existsSync(opusPath)) {
    try {
      const opusBuf = fs.readFileSync(opusPath);
      return { buffer: opusBuf, mimeType: "audio/ogg; codecs=opus" };
    } catch {}
  }

  try {
    await execAsync(`ffmpeg -y -i "${resolvedPath}" -c:a libopus -b:a 32k -vbr on "${opusPath}"`);
    if (fs.existsSync(opusPath)) {
      const opusBuf = fs.readFileSync(opusPath);
      return { buffer: opusBuf, mimeType: "audio/ogg; codecs=opus" };
    }
  } catch {}

  const rawBuf = fs.readFileSync(resolvedPath);
  let mimeType = "audio/mp4";
  if (ext === ".mp3") mimeType = "audio/mpeg";
  else if (ext === ".wav") mimeType = "audio/wav";
  else if (ext === ".ogg") mimeType = "audio/ogg";
  return { buffer: rawBuf, mimeType };
}

async function seedDefaultVoiceFiles() {
  ensureVoiceDir();
  const hiPath = path.resolve(VOICE_DIR, "seed_hi.mp3");
  const morningPath = path.resolve(VOICE_DIR, "seed_good_morning.mp3");
  const nightPath = path.resolve(VOICE_DIR, "seed_good_night.mp3");
  const howAreYouPath = path.resolve(VOICE_DIR, "seed_how_are_you.mp3");
  try {
    if (!fs.existsSync(hiPath)) {
      await execAsync(`ffmpeg -y -f lavfi -i "sine=frequency=523.25:duration=1.2" -c:a libmp3lame -b:a 64k "${hiPath}"`);
      await execAsync(`ffmpeg -y -i "${hiPath}" -c:a libopus -b:a 32k "${hiPath.replace(".mp3", ".opus")}"`);
    }
    if (!fs.existsSync(morningPath)) {
      await execAsync(`ffmpeg -y -f lavfi -i "sine=frequency=659.25:duration=1.5" -c:a libmp3lame -b:a 64k "${morningPath}"`);
      await execAsync(`ffmpeg -y -i "${morningPath}" -c:a libopus -b:a 32k "${morningPath.replace(".mp3", ".opus")}"`);
    }
    if (!fs.existsSync(nightPath)) {
      await execAsync(`ffmpeg -y -f lavfi -i "sine=frequency=440.00:duration=1.4" -c:a libmp3lame -b:a 64k "${nightPath}"`);
      await execAsync(`ffmpeg -y -i "${nightPath}" -c:a libopus -b:a 32k "${nightPath.replace(".mp3", ".opus")}"`);
    }
    if (!fs.existsSync(howAreYouPath)) {
      await execAsync(`ffmpeg -y -f lavfi -i "sine=frequency=587.33:duration=1.3" -c:a libmp3lame -b:a 64k "${howAreYouPath}"`);
      await execAsync(`ffmpeg -y -i "${howAreYouPath}" -c:a libopus -b:a 32k "${howAreYouPath.replace(".mp3", ".opus")}"`);
    }
  } catch (err) {
    console.error("Failed to generate sample voice files:", err);
  }
  return { hi: hiPath, morning: morningPath, night: nightPath, howAreYou: howAreYouPath };
}

export {
  deleteAudioFile,
  ensureVoiceDir,
  formatBytes,
  getAudioFileStream,
  getWhatsAppVoiceBuffer,
  saveAudioFile,
  seedDefaultVoiceFiles,
  validateAudioBuffer
};
