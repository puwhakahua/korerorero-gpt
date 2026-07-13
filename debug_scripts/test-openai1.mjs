import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import OpenAI from "openai";

console.log("API key present:", !!process.env.OPENAI_API_KEY);


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,

});

//const file = fs.createReadStream("/greenstone/korerorero-gpt/audio-tmp/spoken-audio---1725897-x2WQRIYy3x0S-.ogg");
const bytes = fs.readFileSync("/greenstone/korerorero-gpt/audio-tmp/fake-spoken-audio.ogg");

const file = new File(
  [bytes],
  "audio.ogg",
  { type: "audio/ogg" }
);

console.log("read the file");
try {
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });
  
  console.log(result);
} catch (e) {
  console.error(e);
}
