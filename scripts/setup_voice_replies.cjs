const fs = require('fs');
const path = require('path');

const DB_FILE = path.resolve(__dirname, '..', 'data', 'admin_system_db.json');
const ASSETS_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'aistudio');
const VOICE_DIR = path.resolve(__dirname, '..', 'data', 'voice_replies');

// Ensure dirs
if (!fs.existsSync(VOICE_DIR)) {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
}

// Copy all mp3 files to VOICE_DIR if not already there
const assetFiles = fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.mp3'));
for (const f of assetFiles) {
  const src = path.join(ASSETS_DIR, f);
  const dest = path.join(VOICE_DIR, f);
  if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(src).size) {
    fs.copyFileSync(src, dest);
  }
}

// Define sound catalog
const voiceDefinitions = [
  // Greetings
  {
    name: "Hi & Hey Greeting (හායි / Hey)",
    pattern: /^(hi_|hey_|hy_)/i,
    triggers: ["hi", "hey", "hy", "heyy", "hii", "හායි", "හායී"],
    language: "Both"
  },
  {
    name: "Hello Greeting (හෙලෝ / Hello)",
    pattern: /^(hello_|helo_)/i,
    triggers: ["hello", "helo", "helloo", "හෙලෝ", "හලෝ"],
    language: "Both"
  },
  {
    name: "Good Morning (සුබ උදෑසනක්)",
    pattern: /^(gm_|good_morning_)/i,
    triggers: ["gm", "good morning", "goodmorning", "g.m", "සුබ උදෑසනක්", "suba udasanak"],
    language: "Both"
  },
  {
    name: "Good Night (සුබ රාත්‍රියක්)",
    pattern: /^(gn_|good_night_)/i,
    triggers: ["gn", "good night", "goodnight", "g.n", "සුබ රාත්‍රියක්", "suba rathriyak", "sweet dreams"],
    language: "Both"
  },
  {
    name: "Kohomada / How Are You (කොහොමද)",
    pattern: /^(kohomada_|kohomd_)/i,
    triggers: ["kohomada", "kohomd", "කොහොමද", "how are you", "how r u", "sapa da", "sapada"],
    language: "Sinhala"
  },
  {
    name: "Adarei / Love Voice (ආදරෙයි)",
    pattern: /^(adarei_|adarey_|love_)/i,
    triggers: ["adarei", "adarey", "ආදරෙයි", "love", "love u", "love you", "ආදරේ"],
    language: "Both"
  },
  {
    name: "I Love You Voice (I Love You)",
    pattern: /^i_love_you_/i,
    triggers: ["i love you", "iloveyou", "i love u", "man adarei", "මම ආදරෙයි"],
    language: "English"
  },
  {
    name: "Umma / Kiss Voice (උම්මා)",
    pattern: /^umm/i,
    triggers: ["umma", "ummah", "ummma", "උම්මා", "kiss"],
    language: "Sinhala"
  },
  {
    name: "Bye / Farewell Voice (බායි)",
    pattern: /^bye_/i,
    triggers: ["bye", "goodbye", "බායි", "tata", "tc", "take care"],
    language: "Both"
  },
  {
    name: "Baba Voice (බබා)",
    pattern: /^(baba_|bb_)/i,
    triggers: ["baba", "baba eka", "bb", "bb ek", "bb eka", "බබා"],
    language: "Sinhala"
  },
  {
    name: "Akke Voice (අක්කේ)",
    pattern: /^akke_/i,
    triggers: ["akke", "akka", "අක්කේ", "අක්කා"],
    language: "Sinhala"
  },
  {
    name: "Nangi Voice (නංගි)",
    pattern: /^namgi_/i,
    triggers: ["namgi", "nangi", "නංගි", "නංගී"],
    language: "Sinhala"
  },
  {
    name: "Kellekda / Are You a Girl Voice (කෙල්ලෙක්ද)",
    pattern: /^(kellekda_|u_girl_|you_girl_)/i,
    triggers: ["kellekda", "u girl", "you girl", "are you a girl", "කෙල්ලෙක්ද", "kellek da"],
    language: "Both"
  },
  {
    name: "Denawada Voice (දෙනවද)",
    pattern: /^denawada_/i,
    triggers: ["denawada", "දෙනවද", "denawad"],
    language: "Sinhala"
  },
  {
    name: "Ha Ha & Hako Voice (හා හා / හාකො)",
    pattern: /^(ha_ha_|hako_)/i,
    triggers: ["ha ha", "haha", "hako", "හා හා", "හාකො", "හහා"],
    language: "Sinhala"
  },
  {
    name: "Hmm Voice (හ්ම්ම්)",
    pattern: /^(hmm_|hum_)/i,
    triggers: ["hmm", "hmmm", "hum", "හ්ම්ම්", "හ්ම්"],
    language: "Sinhala"
  },
  {
    name: "Na Na / Nah Voice (නෑ නෑ)",
    pattern: /^(na_na_|nah_)/i,
    triggers: ["na na", "nana", "nah", "නෑ නෑ", "නෑ", "නෑනැ"],
    language: "Sinhala"
  },
  {
    name: "Namasthe & Namaskaram Voice (නමස්තේ)",
    pattern: /^(namasthe_|namaskaram_)/i,
    triggers: ["namasthe", "namaste", "namaskaram", "නමස්තේ", "නමස්කාරම්"],
    language: "Both"
  },
  {
    name: "Alive & Marilada Check (මැරිලද / Alive)",
    pattern: /^(alive_|marilada_)/i,
    triggers: ["alive", "marilada", "මැරිලද", "bot wada da", "wada da"],
    language: "Sinhala"
  },
  {
    name: "Why Ban Voice (ඇයි බන්)",
    pattern: /^(Why_ban_|Y_ban_|Y_bn_)/i,
    triggers: ["why ban", "y ban", "y bn", "ඇයි බන්", "ඇයි බං", "why bn"],
    language: "Sinhala"
  },
  {
    name: "Enne Nane Voice (එන්නේ නෑනේ)",
    pattern: /^(en_nane_|Enne_nane_)/i,
    triggers: ["en nane", "enne nane", "ennane", "එන්නෑනේ", "එන්නේ නෑනේ"],
    language: "Sinhala"
  },
  {
    name: "Epa Wela Voice (එපා වෙලා)",
    pattern: /^(ep_wel_|epa_wela_)/i,
    triggers: ["epa wela", "ep wel", "epawela", "එපා වෙලා"],
    language: "Sinhala"
  },
  {
    name: "Natahan / Natanna Voice (නටන්න)",
    pattern: /^(natahan_|natanna_)/i,
    triggers: ["natahan", "natanna", "නටන්න", "නටහන්"],
    language: "Sinhala"
  },
  {
    name: "Gahanawa & Gahano Voice (ගහනවා)",
    pattern: /^(gahanawa_|gahano_)/i,
    triggers: ["gahanawa", "gahano", "ගහනවා", "ගහනෝ"],
    language: "Sinhala"
  },
  {
    name: "Guti Voice (ගුටි)",
    pattern: /^guti_/i,
    triggers: ["guti", "ගුටි", "guti kanawa"],
    language: "Sinhala"
  },
  {
    name: "Pala Voice (පල)",
    pattern: /^pala_/i,
    triggers: ["pala", "පල", "palayan", "පලයන්"],
    language: "Sinhala"
  },
  {
    name: "Bot & Robo Call Voice (බොට් / රොබෝ)",
    pattern: /^(bot_|robo_)/i,
    triggers: ["bot", "robo", "බොට්", "රොබෝ", "robot"],
    language: "Both"
  },
  {
    name: "Mk & Mokek Voice (මොකෝ)",
    pattern: /^(mk_|mokek_)/i,
    triggers: ["mk", "moko", "mokek", "මොකෝ", "මොකෙක්ද"],
    language: "Sinhala"
  },
  {
    name: "Seen Eka Voice (සීන් එක)",
    pattern: /^seen_/i,
    triggers: ["seen", "seen eka", "සීන්", "සීන් එක"],
    language: "Sinhala"
  },
  {
    name: "Raviya & Notes Voice",
    pattern: /^(raviya_|sewmaker_|notes_)/i,
    triggers: ["raviya", "රවියා", "sewmaker", "notes"],
    language: "Both"
  },
  {
    name: "Balaganin & Balagena Voice (බලාගනින්)",
    pattern: /^bala/i,
    triggers: ["balaganin", "balagena", "බලාගනින්", "බලාගෙන"],
    language: "Sinhala"
  },
  // Slang & Cursing Thug reactions
  {
    name: "Pakaya Reaction Voice",
    pattern: /^pakaya_/i,
    triggers: ["pakaya", "පකයා", "paka", "pakayo"],
    language: "Sinhala"
  },
  {
    name: "Kariya Reaction Voice",
    pattern: /^kariya_/i,
    triggers: ["kariya", "කාරියා", "kariy"],
    language: "Sinhala"
  },
  {
    name: "Huththa Reaction Voice",
    pattern: /^huththa_/i,
    triggers: ["huththa", "හුත්ත", "hutta", "hutto"],
    language: "Sinhala"
  },
  {
    name: "Ponnaya Reaction Voice",
    pattern: /^ponnaya_/i,
    triggers: ["ponnaya", "පොන්නයා", "ponna", "ponnayo"],
    language: "Sinhala"
  },
  {
    name: "Hukanna Reaction Voice",
    pattern: /^hukanna_/i,
    triggers: ["hukanna", "හුකන්න"],
    language: "Sinhala"
  },
  {
    name: "Huththi Reaction Voice",
    pattern: /^huththi_/i,
    triggers: ["huththi", "හුත්ති", "hutti"],
    language: "Sinhala"
  },
  {
    name: "Balli Reaction Voice",
    pattern: /^balli_/i,
    triggers: ["balli", "බැල්ලි"],
    language: "Sinhala"
  },
  {
    name: "Baduwa Reaction Voice",
    pattern: /^baduwa_/i,
    triggers: ["baduwa", "බඩුව", "baduwak"],
    language: "Sinhala"
  },
  {
    name: "Wesi & Vesavi Reaction Voice",
    pattern: /^(vesi_|wesi_|vesavi_|vesawi_)/i,
    triggers: ["vesi", "wesi", "වෙසි", "වැසි", "vesavi", "vesawi"],
    language: "Sinhala"
  },
  {
    name: "Ponni Reaction Voice",
    pattern: /^ponni_/i,
    triggers: ["ponni", "පොන්නි"],
    language: "Sinhala"
  },
  {
    name: "Hukanni Reaction Voice",
    pattern: /^hukanni_/i,
    triggers: ["hukanni", "හුකන්නි"],
    language: "Sinhala"
  },
  {
    name: "Bitch Reaction Voice",
    pattern: /^(bich_|bitch_)/i,
    triggers: ["bitch", "bich"],
    language: "English"
  },
  {
    name: "Fuck Reaction Voice",
    pattern: /^fuck_/i,
    triggers: ["fuck", "fuk"],
    language: "English"
  },
  {
    name: "Gothaya Reaction Voice",
    pattern: /^gothaya_/i,
    triggers: ["gothaya", "ගෝතයා"],
    language: "Sinhala"
  },
  {
    name: "Paraya Reaction Voice",
    pattern: /^paraya_/i,
    triggers: ["paraya", "පරයා"],
    language: "Sinhala"
  },
  {
    name: "Pinnaya Reaction Voice",
    pattern: /^pinnaya_/i,
    triggers: ["pinnaya", "පින්නයා"],
    language: "Sinhala"
  },
  {
    name: "Esawa Reaction Voice",
    pattern: /^esawa_/i,
    triggers: ["esawa", "එසව"],
    language: "Sinhala"
  },
  {
    name: "Sapak Reaction Voice",
    pattern: /^Sapak_/i,
    triggers: ["sapak", "සැපක්"],
    language: "Sinhala"
  },
  {
    name: "Uddika Reaction Voice",
    pattern: /^Uddika_/i,
    triggers: ["uddika", "උද්දික"],
    language: "Sinhala"
  },
  // Custom Special Voices zzaaa-zzaam
  { name: "Special Mood 1", pattern: /^zzaaa_/i, triggers: ["zzaaa", "chuu", "sudu", "sudu manika"], language: "Both" },
  { name: "Special Mood 2", pattern: /^zzaab_/i, triggers: ["zzaab", "pana", "panamage", "raththaran"], language: "Both" },
  { name: "Special Mood 3", pattern: /^zzaac_/i, triggers: ["zzaac", "manika", "menika"], language: "Both" },
  { name: "Special Mood 4", pattern: /^zzaad_/i, triggers: ["zzaad", "doni", "donii"], language: "Both" },
  { name: "Special Mood 5", pattern: /^zzaae_/i, triggers: ["zzaae", "ammi", "ammie"], language: "Both" },
  { name: "Special Mood 6", pattern: /^zzaaf_/i, triggers: ["zzaaf", "thaththi", "babaa"], language: "Both" },
  { name: "Special Mood 7", pattern: /^zzaag_/i, triggers: ["zzaag", "kelle", "kella"], language: "Both" },
  { name: "Special Mood 8", pattern: /^zzaah_/i, triggers: ["zzaah", "kollo", "kolla"], language: "Both" },
  { name: "Special Mood 9", pattern: /^zzaai_/i, triggers: ["zzaai", "patto", "patta"], language: "Both" },
  { name: "Special Mood 10", pattern: /^zzaaj_/i, triggers: ["zzaaj", "wada", "wadak"], language: "Both" },
  { name: "Special Mood 11", pattern: /^zzaak_/i, triggers: ["zzaak", "ammo", "ammoo"], language: "Both" },
  { name: "Special Mood 12", pattern: /^zzaal_/i, triggers: ["zzaal", "yako", "yakoo"], language: "Both" },
  { name: "Special Mood 13", pattern: /^zzaam_/i, triggers: ["zzaam", "hutto", "ado"], language: "Both" }
];

// Now build the voiceReplies list
const newVoiceReplies = [];
const usedFiles = new Set();

for (const def of voiceDefinitions) {
  // Find matching file in assetFiles
  const matchedFile = assetFiles.find(f => def.pattern.test(f));
  if (matchedFile) {
    usedFiles.add(matchedFile);
    const filePath = path.join(VOICE_DIR, matchedFile);
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 15000 };
    const id = "voice-" + matchedFile.replace(/\.mp3$/i, '').toLowerCase();

    newVoiceReplies.push({
      id,
      name: def.name,
      triggers: def.triggers,
      audioFileName: matchedFile,
      audioPath: filePath,
      audioUrl: `/api/voice-replies/audio/${id}`,
      mimeType: "audio/mpeg",
      fileSizeBytes: stat.size,
      fileSizeFormatted: (stat.size / 1024).toFixed(1) + " KB",
      durationSeconds: 2,
      language: def.language,
      enabled: true,
      scope: "GLOBAL",
      createdAt: new Date().toISOString(),
      playCount: 0
    });
  }
}

// Add remaining files that might have different suffixes
for (const f of assetFiles) {
  if (!usedFiles.has(f)) {
    const baseName = f.replace(/_[a-f0-9]+\.mp3$/i, '').toLowerCase();
    const filePath = path.join(VOICE_DIR, f);
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 15000 };
    const id = "voice-" + f.replace(/\.mp3$/i, '').toLowerCase();

    newVoiceReplies.push({
      id,
      name: `Voice: ${baseName}`,
      triggers: [baseName, baseName.replace(/_/g, ' ')],
      audioFileName: f,
      audioPath: filePath,
      audioUrl: `/api/voice-replies/audio/${id}`,
      mimeType: "audio/mpeg",
      fileSizeBytes: stat.size,
      fileSizeFormatted: (stat.size / 1024).toFixed(1) + " KB",
      durationSeconds: 2,
      language: "Both",
      enabled: true,
      scope: "GLOBAL",
      createdAt: new Date().toISOString(),
      playCount: 0
    });
  }
}

console.log(`Generated ${newVoiceReplies.length} new voice replies!`);

// Load existing DB
let db = {};
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

// Completely replace old voiceReplies
db.voiceReplies = newVoiceReplies;

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log("Successfully updated admin_system_db.json with new voices!");
