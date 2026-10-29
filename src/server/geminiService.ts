var __defProp=Object.defineProperty;var __name=(target,value)=>__defProp(target,"name",{value,configurable:true});import { GoogleGenAI, Type }from"@google/genai";let aiInstance=null;function getAIClient(){const apiKey=process.env.GEMINI_API_KEY;if(!apiKey||apiKey==="MY_GEMINI_API_KEY"||apiKey.trim()===""){return null}if(!aiInstance){aiInstance=new GoogleGenAI({apiKey,httpOptions:{headers:{"User-Agent":"aistudio-build"}}})}return aiInstance}__name(getAIClient,"getAIClient");async function askGemini(prompt,context){try{const ai=getAIClient();if(!ai){return{text:"\u26A0\uFE0F YASHI HALLS AI Engine key is not configured on the server. Please add GEMINI_API_KEY in the Secrets / Environment panel to enable AI responses.",success:false}}const systemInstruction=context?`You are YASHI HALLS, a smart and friendly WhatsApp Assistant powered by YASHI HALLS. Keep responses concise, clear, and easy to read on mobile. Context: ${context}`:"You are YASHI HALLS, an advanced WhatsApp bot assistant powered by YASHI HALLS. Keep responses helpful, well-formatted, and concise for chat.";let response;try{response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:prompt,config:{systemInstruction,temperature:.7}})}catch(primaryErr){response=await ai.models.generateContent({model:"gemini-flash-latest",contents:prompt,config:{systemInstruction,temperature:.7}})}const output=response.text?.trim()||"No response generated from YASHI HALLS AI.";return{text:output,success:true}}catch(error){console.error("AI Engine Error:",error?.message||error);const errMsg=error?.message||String(error);if(errMsg.includes("503")||errMsg.includes("high demand")||errMsg.includes("UNAVAILABLE")){return{text:"\u23F3 YASHI HALLS AI is currently experiencing high traffic. Please try your question again in a moment.",success:false}}if(errMsg.includes("API_KEY_INVALID")||errMsg.includes("403")){return{text:"\u26A0\uFE0F Invalid AI Engine key. Please check your GEMINI_API_KEY environment variable.",success:false}}return{text:`\u274C YASHI HALLS AI Notice: Unable to generate response (${errMsg.slice(0,100)})`,success:false}}}__name(askGemini,"askGemini");async function analyzeAudioWithGemini(audioBuffer,mimeType="audio/ogg",caption){try{const ai=getAIClient();if(!ai){return{text:"\u{1F399}\uFE0F *\u0DC4\u0DAC \u0DB4\u0DAB\u0DD2\u0DC0\u0DD2\u0DA9\u0DBA \u0DBD\u0DD0\u0DB6\u0DD4\u0DAB\u0DCF!* (Voice note received)\n_AI Voice Analysis \u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8\u0DA7 \u0DC3\u0DDA\u0DC0\u0DCF\u0DAF\u0DCF\u0DBA\u0D9A\u0DBA\u0DDA GEMINI_API_KEY \u0DC3\u0D9A\u0DC3\u0DB1\u0DCA\u0DB1._",success:false}}const base64Data=audioBuffer.toString("base64");const promptText=caption?.trim()?`User sent this audio note with note/caption: "${caption}". Listen carefully, understand what the user said in Sinhala or English, and reply helpfully and warmly in the appropriate language (Sinhala or English).`:"Listen to this voice message carefully. Transcribe or understand the user speech in Sinhala or English, and give an accurate, friendly, natural reply in the same language.";const response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:[{inlineData:{data:base64Data,mimeType:mimeType||"audio/ogg"}},{text:promptText}],config:{systemInstruction:"You are YASHI HALLS, an advanced WhatsApp bot assistant with voice listening capabilities. Understand voice messages in Sinhala, Singlish, and English. Keep responses friendly, helpful, and formatted for WhatsApp chats.",temperature:.7}});const output=response.text?.trim()||"\u0DC4\u0DAC \u0DB4\u0DAB\u0DD2\u0DC0\u0DD2\u0DA9\u0DBA \u0DC3\u0DCF\u0DBB\u0DCA\u0DAE\u0D9A\u0DC0 \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA \u0DC0\u0DD2\u0DBA.";return{text:output,success:true}}catch(error){console.error("Audio AI Error:",error?.message||error);return{text:"\u{1F399}\uFE0F *\u0DC4\u0DAC \u0DB4\u0DAB\u0DD2\u0DC0\u0DD2\u0DA9\u0DBA \u0DAD\u0DDA\u0DBB\u0DD4\u0DB8\u0DCA \u0D9C\u0DD0\u0DB1\u0DD3\u0DB8\u0DDA \u0DAF\u0DDD\u0DC2\u0DBA\u0D9A\u0DCA \u0DC3\u0DD2\u0DAF\u0DD4\u0DC0\u0DD2\u0DBA.* \u0D9A\u0DBB\u0DD4\u0DAB\u0DCF\u0D9A\u0DBB \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.",success:false}}}__name(analyzeAudioWithGemini,"analyzeAudioWithGemini");async function analyzeVideoWithGemini(videoBuffer,mimeType="video/mp4",caption){try{const ai=getAIClient();if(!ai){return{text:"\u{1F4F9} *\u0DC0\u0DD3\u0DA9\u0DD2\u0DBA\u0DDD\u0DC0 \u0DBD\u0DD0\u0DB6\u0DD4\u0DAB\u0DCF!* (Video received)\n_AI Video Analysis \u0DC3\u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8\u0DA7 \u0DC3\u0DDA\u0DC0\u0DCF\u0DAF\u0DCF\u0DBA\u0D9A\u0DBA\u0DDA GEMINI_API_KEY \u0DC3\u0D9A\u0DC3\u0DB1\u0DCA\u0DB1._",success:false}}const base64Data=videoBuffer.toString("base64");const promptText=caption?.trim()?`User sent this video with caption/question: "${caption}". Watch the video scenes, understand the content, and answer the question in Sinhala or English.`:"Watch this video carefully. Describe what is happening in the video, highlight key moments, and explain it clearly in friendly Sinhala with English terms.";const response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:[{inlineData:{data:base64Data,mimeType:mimeType||"video/mp4"}},{text:promptText}],config:{systemInstruction:"You are YASHI HALLS, an advanced WhatsApp bot assistant with video vision analysis. Describe video content clearly in friendly Sinhala/English.",temperature:.7}});const output=response.text?.trim()||"\u0DC0\u0DD3\u0DA9\u0DD2\u0DBA\u0DDD\u0DC0 \u0DC3\u0DCF\u0DBB\u0DCA\u0DAE\u0D9A\u0DC0 \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA \u0DC0\u0DD2\u0DBA.";return{text:output,success:true}}catch(error){console.error("Video AI Error:",error?.message||error);return{text:"\u{1F4F9} *\u0DC0\u0DD3\u0DA9\u0DD2\u0DBA\u0DDD\u0DC0 \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8\u0DDA \u0DAF\u0DDD\u0DC2\u0DBA\u0D9A\u0DCA \u0DC3\u0DD2\u0DAF\u0DD4\u0DC0\u0DD2\u0DBA.* \u0D9A\u0DBB\u0DD4\u0DAB\u0DCF\u0D9A\u0DBB \u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1.",success:false}}}__name(analyzeVideoWithGemini,"analyzeVideoWithGemini");async function transcribeAudioWithGemini(audioBuffer,mimeType="audio/ogg"){try{const ai=getAIClient();if(!ai){return{text:"\u{1F399}\uFE0F *AUDIO TRANSCRIBER Notice:* GEMINI_API_KEY is missing on server.",success:false}}const base64Data=audioBuffer.toString("base64");const response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:[{inlineData:{data:base64Data,mimeType:mimeType||"audio/ogg"}},{text:"Transcribe this audio message word-for-word accurately. If spoken in Sinhala, output clean Sinhala text. If English, output English text. Do not add conversational commentary, only output the transcription."}],config:{systemInstruction:"You are an accurate audio transcriber. Transcribe the audio word-for-word clearly.",temperature:.2}});const output=response.text?.trim()||"No clear speech detected in audio.";return{text:output,success:true}}catch(error){return{text:"\u274C Transcription error: "+(error?.message||String(error)),success:false}}}__name(transcribeAudioWithGemini,"transcribeAudioWithGemini");async function analyzeImageWithGemini(imageBuffer,mimeType="image/jpeg",prompt){try{const ai=getAIClient();if(!ai){return{text:"\u{1F5BC}\uFE0F *IMAGE AI Notice:* GEMINI_API_KEY is missing on server.",success:false}}const base64Data=imageBuffer.toString("base64");const response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:[{inlineData:{data:base64Data,mimeType:mimeType||"image/jpeg"}},{text:prompt}],config:{systemInstruction:"You are YASHI HALLS AI Vision Engine. Analyze the image, solve math/physics problems, split bills, or analyze food calories as requested in clear Sinhala and English.",temperature:.4}});const output=response.text?.trim()||"Image processed successfully.";return{text:output,success:true}}catch(error){return{text:"\u274C Image Analysis error: "+(error?.message||String(error)),success:false}}}__name(analyzeImageWithGemini,"analyzeImageWithGemini");async function generateCVWithGemini(promptText){try{const ai=getAIClient();if(!ai){return{text:"\u{1F4C4} *CV GENERATOR Notice:* GEMINI_API_KEY is missing on server.",success:false}}const response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:`Create a professional, highly structured Curriculum Vitae (CV) / Resume based on these details: "${promptText}". Format it beautifully with sections: CONTACT INFORMATION, EXECUTIVE SUMMARY, WORK EXPERIENCE, EDUCATION, SKILLS & CERTIFICATIONS, and REFERENCES. Use clean text formatting with emojis and bullet points for mobile reading on WhatsApp.`,config:{systemInstruction:"You are YASHI HALLS AI Resume Builder. Create professional, elegant CVs.",temperature:.5}});const output=response.text?.trim()||"CV generated successfully.";return{text:output,success:true}}catch(error){return{text:"\u274C CV generation error: "+(error?.message||String(error)),success:false}}}__name(generateCVWithGemini,"generateCVWithGemini");export{
  analyzeAudioWithGemini,analyzeImageWithGemini,analyzeVideoWithGemini,askGemini,generateCVWithGemini,transcribeAudioWithGemini};


export interface ChatMemoryItem {
  senderName: string;
  senderJid: string;
  text: string;
  timestamp: number;
  hasLink?: string;
  isBot?: boolean;
}

export async function chatAsYashiHallsAI(params: {
  userText: string;
  senderName: string;
  recentMessages?: ChatMemoryItem[];
  imageBuffer?: Buffer;
  imageMime?: string;
}): Promise<{
  replyText: string;
  action?: 'send_mp3' | 'send_video' | 'send_sticker' | 'none';
  targetQuery?: string;
  success: boolean;
}> {
  try {
    const ai = getAIClient();
    if (!ai) {
      return {
        replyText: `හායි ${params.senderName}! YASHI HALLS AI Engine එක සූදානම් කරමින් පවතී.`,
        action: 'none',
        success: false
      };
    }

    const contextFormatted = (params.recentMessages || [])
      .slice(-6)
      .map(m => `${m.isBot ? 'YASHI HALLS (You)' : m.senderName}: ${m.text}${m.hasLink ? ` [Link: ${m.hasLink}]` : ''}`)
      .join('\n');

    const systemInstruction = `You are YASHI HALLS (යශී හෝල්ස්), the absolute smartest, friendliest, funniest, and most empathetic Sri Lankan WhatsApp AI bot companion.
You are chatting with Sri Lankan friends on WhatsApp.

CRITICAL PERSONALITY & LANGUAGE GUIDELINES:
1. Speak in natural, colloquial everyday Sri Lankan Sinhala (මිත්‍රශීලී කතාබහ කරන සිංහල).
   - Use warm, authentic Sri Lankan friend words where appropriate: "බං", "මචං", "යාලුවා", "පට්ට", "සුපිරි", "ආනේ", "සිරාවටම", "අඩෝ", "හරිම කියුට්", "නියමයිනේ", "මම මේ දැන්ම එවන්නම්".
   - You MUST sound like a real, beloved friend texting on WhatsApp, NEVER like a robot or formal translation!
2. Address the user directly by their name: "${params.senderName || 'යාලුවා'}" with genuine warmth and peer energy!
3. Use lively, natural emojis (😍, ❤️, 😎, 🎵, 🎬, ✨, 🔥, 😂, 🙌, 🥳, 💡).
4. KEEP REPLIES CONCISE AND NATURAL (1 to 2 short sentences max, exactly like human WhatsApp texting!).
5. IF THE USER SENDS AN IMAGE (like baby photos, pets, selfies, memes, food):
   - Notice the visual details with emotional intelligence and give a sweet, funny, or admiring reaction in Sinhala (e.g. for cute babies: "ආනේ හරිම කියුට් දෙන්නෙක්නේ මේ! 😍").
6. IF THE USER SENDS A VIDEO OR YOUTUBE LINK:
   - React excitedly like a buddy (e.g. "පට්ට ලින්ක් එකක්නේ ${params.senderName}! මම බැලුවා ඕක ❤️ ඕනෙ නම් මම මේකෙ mp3 එක හරි video එක හරි එවන්නද?").
7. ACTION DETECTION:
   - If the user asks for the MP3/audio/song of a previous link or current conversation (e.g. "මට ඒකෙ mp3 එක දියන්", "ඕකෙ සින්දුව එවපන්", "audio eka diyan", "send mp3", "mp3 eka ewapan"):
     Set action to "send_mp3", find the previous link or song name from chat history, and set targetQuery to that link/song!
     In replyText, say with excitement: "අන්න මම ඒකෙ mp3 එක එවන්නම් ${params.senderName}! 🎵"
   - If the user asks for the video (e.g. "video එක දියන්", "video eka ewapan", "send video"):
     Set action to "send_video" and targetQuery to that video link!
     In replyText, say: "අන්න මම ඒකෙ video එක එවන්නම් ${params.senderName}! 🎬"
   - If user asks for sticker from image:
     Set action to "send_sticker".
   - Otherwise action is "none".

Always output clean JSON matching the requested schema.`;

    const contents: any[] = [];
    if (params.imageBuffer) {
      contents.push({
        inlineData: {
          data: params.imageBuffer.toString('base64'),
          mimeType: params.imageMime || 'image/jpeg',
        }
      });
    }

    const userPrompt = `Chat History Context:
${contextFormatted || '(No previous messages)'}

New message from ${params.senderName}: "${params.userText || '(Sent an image)'}"`;

    contents.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction,
        temperature: 0.85,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description: 'The natural conversational Sinhala response.'
            },
            action: {
              type: Type.STRING,
              description: 'send_mp3, send_video, send_sticker, or none'
            },
            targetQuery: {
              type: Type.STRING,
              description: 'Link or song title for mp3 or video download if requested.'
            }
          },
          required: ['replyText', 'action']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      replyText: parsed.replyText || `පට්ට නේ ${params.senderName}! 😎❤️`,
      action: parsed.action || 'none',
      targetQuery: parsed.targetQuery || '',
      success: true
    };
  } catch (error: any) {
    console.error('YASHI HALLS Smart AI Error:', error?.message || error);
    return {
      replyText: `පට්ට නේ ${params.senderName}! මම ඔයාට උදව් කරන්න ලෑස්තියි ❤️`,
      action: 'none',
      success: false
    };
  }
}
