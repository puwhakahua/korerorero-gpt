import { NextResponse } from "next/server";

import fs   from "fs";
import path from "path";
import process from "process";
import tmp from "tmp";

import * as dotenv from "dotenv";
import { env } from "../../config/env";

import OpenAI from "openai";

import { sleep, postPapaReoSynthesize, downloadURL } from "../utils";


// test?
import { spawn } from "child_process";

// test for key
import { Readable } from "stream";
import { finished } from "stream/promises";

// test
// Force Node runtime for fs/path/tmp/etc.
export const runtime = "nodejs";
// (Optional but helpful in dev)
export const dynamic = "force-dynamic";
// Give long jobs (Space queue) more time if you deploy to serverless
export const maxDuration = 60; // seconds


dotenv.config();

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});


// the hugging face urls
const kingsleyeng_url = "https://kingsleyeng-maori-tts.hf.space/";
const wmai_research_url = "https://wmai-research-wm-tts.hf.space/";
const puwhakahua_url = "https://api.puwhakahua.nz/synthesize";

async function POST_FAKE(body) {

    const response_data = {
	synthesizedAudioFilename: path.join("public","tmp","fake-synthesized-audio.mp3"),
	synthesizedAudioBlob: null
    };

    // Small delay so it feels like some work has been done!
    await sleep(1000);
    
    return NextResponse.json(response_data);
}

async function POST_PUWHAKAHUA(body) {

   const text = (body.text ?? "").trim();
    
    if (!text) {
      return NextResponse.json({ error: "empty_text" }, { status: 400 });
    }
    console.log(`text = ${text}`);
    // Puwhakahua API key from env
    const apiKey = env.PUWHAKAHUA_API_KEY;
    if (!apiKey) {
	console.error("[puwhakahua] PUWHAKAHUA_API_KEY is missing from env");
	return NextResponse.json({ error: `missing_puwhakahua_api_key ${apiKey}` }, { status: 500 });
    }

    const audioFileType = "wav";
    const audioMimeType = "audio/wav";
  
    // Make sure we write inside public/tmp so the browser can GET /tmp/...
    const tmpDirAbs = path.join(process.cwd(), "public", "tmp");
    if (!fs.existsSync(tmpDirAbs)) {
      fs.mkdirSync(tmpDirAbs, { recursive: true });
    }
  
    // Absolute file path for saving + corresponding web path we return to the client
    const audioFilePathAbs = tmp.tmpNameSync({
      tmpdir: tmpDirAbs,
      prefix: "synthesized-audio--",
      postfix: "." + audioFileType,
      keep: true,
    });
    const audioWebPath = "/tmp/" + path.basename(audioFilePathAbs);

    console.log (`audiowebpath ${audioWebPath}, ${puwhakahua_url}`);
    const response = await fetch(puwhakahua_url, {
	method: "POST",
	headers: {
	    "x-api-key": apiKey,
	    "Content-Type": "application/json",
	},
	body: JSON.stringify({
	    voice: "waikato-maniapoto",
	    text: text,
	}),
	redirect: "follow",
    });

    if (!response.ok) {
        console.error(`[Puwhakahua] HTTP Error ${response.status} for url ${puwhakahua_url}`);
	return NextResponse.json({ error: "puwhakahua_synthesis_failed" }, { status: 502 });
    }

    const arrayBuffer = await response.arrayBuffer();

    await fs.promises.writeFile(
	audioFilePathAbs,
	Buffer.from(arrayBuffer)
    );
    
    // Return the web path (NOT the absolute filesystem path)
    return NextResponse.json({
        synthesizedAudioFilename: audioWebPath,
        synthesizedAudioMimeType: audioMimeType,
    });
}

async function POST_PAPAREO(body) {
    const text = body.text;
  
    const audioFileType = "mp3";
    const audioFileExt  = "." + audioFileType;
    const audioMimeType = "audio/mpeg";
  
    // 1) Absolute filesystem dir to write into (served by Next.js as /tmp/*)
    const tmpDirAbs = path.join(process.cwd(), "public", "tmp");
  
    // 2) Ensure directory exists
    if (!fs.existsSync(tmpDirAbs)) {
      console.log("Creating temporary directory for audio recording:", tmpDirAbs);
      fs.mkdirSync(tmpDirAbs, { recursive: true });
    }
  
    // 3) Build absolute output filename and the corresponding web path
    const audioFilePathAbs = tmp.tmpNameSync({
      tmpdir: tmpDirAbs,
      prefix: "synthesized-audio--",
      postfix: audioFileExt,
      keep: true,
    });
    const audioWebPath = "/tmp/" + path.basename(audioFilePathAbs);
  
    console.log("POST_PAPAREO() -> audioFilePathAbs:", audioFilePathAbs);
    console.log("POST_PAPAREO() -> audioWebPath    :", audioWebPath);
  
    try {
      // 4) Call PapaReo to synthesize and get a short-lived URL
      const audio_url = await postPapaReoSynthesize(text);
      console.log("PapaReo returned audio_url:", audio_url);
  
      // 5) Download to our absolute path in public/tmp
      const ok = await downloadURL(audio_url, audioFilePathAbs);
      if (!ok) {
        console.error("Failed to download synthesized audio from PapaReo URL");
        return NextResponse.json({ error: "papareo_tts_download_failed" }, { status: 502 });
      }
  
      // 6) Return the web path for the browser to fetch
      return NextResponse.json({
        synthesizedAudioFilename: audioWebPath,   // e.g. "/tmp/synthesized-audio--abc123.mp3"
        synthesizedAudioMimeType: audioMimeType,
      });
    } catch (error) {
      console.error("Error synthesizing audio from text (PapaReo):", error);
      return NextResponse.json({ error: "papareo_tts_failed" }, { status: 502 });
    }
  }
  


async function POST_OPENAI(body) {
    const text = body.text;
    
    const audioFileType = "mp3";
    const audioFileExt  = "."+audioFileType
    const audioMimeType = "audio/mpeg";
    
    const tmpDir        = path.join("public","tmp");
    //const pid           = process.pid;

    const tmpOptions = {
	tmpdir: tmpDir,
	//prefix: `synthesized-audio-${pid}--`,
	prefix: `synthesized-audio--`,
	postfix: audioFileExt,
	keep: true
    };
        
    const audioFilePathOLD = path.join(tmpDir,"synthesized-audio"+audioFileExt);
    const audioFilePath = tmp.tmpNameSync(tmpOptions).replace(process.cwd()+"/","");
    
    console.log(`audioFilePathOLD = ${audioFilePathOLD}`);
    console.log(`audioFilePath    = ${audioFilePath}`);
    
    try {
	if (!fs.existsSync(tmpDir)) {
	    console.log("Creating temporary directory for audio recording: " + tmpDir);
	    fs.mkdirSync(tmpDir);
	}
	
	// Based on:
	//    https://platform.openai.com/docs/guides/text-to-speech?lang=node
	
	// Voices:
	//   alloy, echo, fable, onyx, nova, and shimmer

	// Response format:
	//  mp3, opus, aac, flac, wav, and pcm	

	const audio = await openai.audio.speech.create({
	    model: "tts-1",      // optimized for speed
	    //model: "tts-1-hd", // optimized for quality
	    voice: "fable",	    
	    input: text,
	    response_format: audioFileType
	});

	//console.log("OpenAI returned audio:");
	//console.log(audio);
	
	const buffer = Buffer.from(await audio.arrayBuffer());
	console.log(`Saving synthesized audio as: ${audioFilePath}`);
	await fs.promises.writeFile(audioFilePath, buffer);

	const audioBlob = new Blob([buffer], { type: "audio/mpeg"});
	//const audioBlob = audio.blob;
	//const audioBlob = new Blob([audio],{ type: "audio/mpeg"});
	//const audioBlob = audio;
	console.log("textToSpeech.POST()");
	console.log(audioBlob);
		    
	const response_data = {
	    synthesizedAudioFilename: audioFilePath,
	    //synthesizedAudioBlob:     audioBlob,
	    synthesizedAudioMimeType: audioMimeType
	};

	return NextResponse.json(response_data);
    }
    catch (error) {
	console.error("Error synthesizing audio from text:", error);
	return NextResponse.error();
    }
}


// helper to download with auth header (for private Space files)
const downloadWithAuth = async (url, ofilename,hftoken) => {

    const resp = await fetch(url, {
      headers: hftoken ? {
        Authorization: `Bearer ${hftoken}`,
      } : undefined ,
    });

    if (resp.ok && resp.body) {
      console.log("[MaoriTTS] Writing audio to file:", ofilename);
      const writer = fs.createWriteStream(ofilename);
      await finished(Readable.fromWeb(resp.body).pipe(writer));
      return true;
    } else {
      console.error(
        "[MaoriTTS] Failed to download audio:",
        resp.status,
        await resp.text().catch(() => "")
      );
      return false;
    }
  };


// generic method to handle hugging face urls, with or without a hfFToken
async function MAORI_TTS_HUGGING_FACE(body, hfUrl, hfToken) {
    
    // Import here to avoid ESM quirks in Next API routes
    const { client: gradioClient } = await import("@gradio/client");
  
    const text = (body.text ?? "").trim();

    if (!text) {
      return NextResponse.json({ error: "empty_text" }, { status: 400 });
    }
  
    const audioFileType = "wav";
    const audioMimeType = "audio/wav";
  
    // Make sure we write inside public/tmp so the browser can GET /tmp/...
    const tmpDirAbs = path.join(process.cwd(), "public", "tmp");
    if (!fs.existsSync(tmpDirAbs)) {
      fs.mkdirSync(tmpDirAbs, { recursive: true });
    }
  
    // Absolute file path for saving + corresponding web path we return to the client
    const audioFilePathAbs = tmp.tmpNameSync({
      tmpdir: tmpDirAbs,
      prefix: "synthesized-audio--",
      postfix: "." + audioFileType,
      keep: true,
    });
    const audioWebPath = "/tmp/" + path.basename(audioFilePathAbs);
  
    try {
      // Connect to your Space
	const app = await gradioClient(hfUrl,
				       hfToken ? { hf_token: hfToken } : undefined
				      );
  
      // Your Space exposes a named endpoint "/tts_fn" with parameters { text, speed, pitch, energy }
      // Using predict() (queue-aware under the hood)
      const result = await app.predict("/tts_fn", {
        text,
        speed: 1.0,
        pitch: 0.33,
        energy: 0.33,
      });
  
      // Expect structure: { type:'data', data:[ { url, path, ... } ], endpoint:'/tts_fn', fn_index:0 }
      const field = result?.data?.[0];
      if (!field || typeof field !== "object") {
        console.error("[MaoriTTS] Unexpected response shape:", result);
        return NextResponse.json({ error: "maori_tts_bad_response" }, { status: 502 });
      }
  
      // Prefer fully-qualified URL; fall back to constructing from path
      const audioUrl = field.url
        ? field.url
        : `${hfUrl}gradio_api/file=${field.path}`;
  
      // Download into public/tmp so the client can fetch /tmp/...
	//const ok = await downloadURL(audioUrl, audioFilePathAbs);
	const ok = await downloadWithAuth(audioUrl, audioFilePathAbs, hfToken);
      if (!ok) {
        console.error("[MaoriTTS] Download failed from:", audioUrl);
        return NextResponse.json({ error: "maori_tts_download_failed" }, { status: 502 });
      }
  
      // Return the web path (NOT the absolute filesystem path)
      return NextResponse.json({
        synthesizedAudioFilename: audioWebPath,
        synthesizedAudioMimeType: audioMimeType,
      });
    } catch (err) {
      console.error("[MaoriTTS] Error during synth:", err);
      return NextResponse.json({ error: `maori_tts_failed ${err}` }, { status: 502 });
    }
}

async function POST_MAORI_TTS_WMAI_RESEARCH(body) {

    // 🔑 Hugging Face token from env
    const hfToken = env.HF_TOKEN_WMAI_RESEARCH;
    if (!hfToken) {
	console.error("[MaoriTTS] HF_TOKEN_WMMAI_RESEARCH is missing from env");
	return NextResponse.json({ error: "missing_hf_token wmai_research" }, { status: 500 });
    }

    return MAORI_TTS_HUGGING_FACE(body, wmai_research_url, hfToken);

}

async function POST_MAORI_TTS_KINGSLEYENG(body) {

    // 🔑 Hugging Face token from env
    const hfToken = env.HF_TOKEN_KINGSLEYENG;
    if (!hfToken) {
	console.error("[MaoriTTS] HF_TOKEN_KINGSLEYENG is missing from env");
	return NextResponse.json({ error: "missing_hf_token kingsleyeng" }, { status: 500 });
    }

    return MAORI_TTS_HUGGING_FACE(body, kingsleyeng_url, hfToken);

}

// LOCAL version here
async function POST_PIPER(body) {
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "empty_text" }, { status: 400 });
  }

  const audioFileType = "wav";
  const audioMimeType = "audio/wav";

  
  // >1.0 = slower, <1.0 = faster. For ~80% speed (slower), use 1.25.
  const speechSpeed = 1.2;

  // Ensure tmp directory exists
  const tmpDirAbs = path.join(process.cwd(), "public", "tmp");
  if (!fs.existsSync(tmpDirAbs)) {
    fs.mkdirSync(tmpDirAbs, { recursive: true });
  }

  const audioFilePathAbs = tmp.tmpNameSync({
    tmpdir: tmpDirAbs,
    prefix: "synthesized-local--",
    postfix: "." + audioFileType,
    keep: true,
  });
  const audioWebPath = "/tmp/" + path.basename(audioFilePathAbs);

  try {
    const isWindows = process.platform === "win32";

    const piperPath = path.join(process.cwd(), "piper", isWindows ? "piper.exe" : "piper");
    const modelPath = path.join(process.cwd(), "models", "model.onnx");
    const configPath = path.join(process.cwd(), "models", "model.onnx.json");

    // 🏃 Spawn Piper process with speed control
    const piper = spawn(piperPath, [
      "--model", modelPath,
      "--config", configPath,
      "--output_file", audioFilePathAbs,
      "--length_scale", String(speechSpeed) // 👈 speed control here
    ]);

    piper.stdin.write(text + "\n");
    piper.stdin.end();

    await new Promise((resolve, reject) => {
      piper.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`piper exited with code ${code}`));
      });
    });

    return NextResponse.json({
      synthesizedAudioFilename: audioWebPath,
      synthesizedAudioMimeType: audioMimeType,
    });

  } catch (err) {
    console.error("[MaoriTTS-Local] Error during synthesis:", err);
    return NextResponse.json({ error: "maori_tts_local_failed" }, { status: 502 });
  }
}

// why?
//export default POST_MAORI_TTS_WMAI_RESEARCH;

const PostLookup = {
    "fake"    : POST_FAKE,
    "PapaReo" : POST_PAPAREO,
    "OpenAI"  : POST_OPENAI,
    "MaoriTTSK" : POST_MAORI_TTS_KINGSLEYENG,
    "MaoriTTSW" : POST_MAORI_TTS_WMAI_RESEARCH,
    "Piper" : POST_PIPER,
    "Puwhakahua" : POST_PUWHAKAHUA,
};


export async function POST(req)
{    
    const body = await req.json();

    console.log("**** textToSpeech:POST(), body.text = " + body.text)
    
    const configOptions = body.configOptions;

    const post_lookup_fn = PostLookup[configOptions.textToSpeech];

    const returned_response = await post_lookup_fn(body);
    return returned_response;
    
}

// The following config setting resolves an issue that was causing
// a 502 (Bad Gateway) error when the Next.js server is run through
// a proxy server, and a longer audio recording is posted
//
// For more details, see:
//   https://stackoverflow.com/questions/63968953/why-do-i-get-a-502-gateway-error-from-nextjs-app-hosted-on-firebase-for-post-r

// Also:
//   https://nextjs.org/docs/pages/building-your-application/routing/api-routes#custom-config

// This is not used for the current App Router style
// we no longer have double parsing issue.
// but what about the bad gateway error? may need to do something different?
//export const config = {
//  api: {
//      // Disables call to body parsing module, to prevent the
//      // double-parsing issue that causes one to get stuck
//      bodyParser: false
//      
//      // Or for a version that is on for 'npm run dev' but not production mode:
//      // bodyParser: process.env.NODE_ENV !== 'production'      
//  }
//};
