import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { File } from "node:buffer";

console.log("API key present:", !!process.env.OPENAI_API_KEY);

const audio_filename = "/greenstone/korerorero-gpt/audio-tmp/fake-spoken-audio.ogg";
const audio_mimetype = "audio/ogg";
const bytes = fs.readFileSync(audio_filename);
const key = process.env.OPENAI_API_KEY;
const form = new FormData();


form.append(
  "file",
  new File([bytes], "audio.ogg", { type: audio_mimetype })
);
form.append("model", "whisper-1");


const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
  },
  body: form,
});

console.log("status: ", res.status);
console.log("result text: ", await res.text());

