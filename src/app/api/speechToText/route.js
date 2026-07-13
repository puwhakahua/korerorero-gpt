import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";
import tmp from "tmp";

import * as dotenv from "dotenv";
import { env } from "../../config/env";

// in case there is a proxy
import { initProxy } from "@/lib/init-proxy";
initProxy();

import OpenAI from "openai";

import { sleep, postPapaReoTranscribe, STORE_PATH } from "../utils";
import { URLs } from "@/utils/createURLs";


dotenv.config();

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

async function POST_FAKE(body) {
    const response_data = {
	//recognizedTextData: { text: 'What is the name of the river that flows through Hamilton, New Zealand?' },
	recognizedTextData: { text: 'He aha te ingoa o te awa e rere ana i Kirikiriroa, Aotearoa?' }, 
	recordedAudioFilename: URLs.tmp("spoken-audio.webm")
    };

    return NextResponse.json(response_data);
}



async function POST_PAPAREO(body) {
    const base64Audio = body.audio;
    const audioMimeType = body.mimeType;
    
    const audio = Buffer.from(base64Audio, "base64");

    // Example mime types:
    //   audio/wav
    //   audio/webm;codecs=opus    
    
    const fileExt  = audioMimeType.replace(/^\w+\/(\w+)(?:;.+)?$/,".$1");    
    //const tmpDir   = path.join("public","tmp");

    const audioFilePathAbs = tmp.tmpNameSync({
	tmpdir: STORE_PATH,
	prefix: `spoken-audio--`,
	postfix: fileExt,
	keep: true
    });
    
    //const filePathOLD = path.join(tmpDir,"spoken-audio"+fileExt);
    //const filePath = tmp.tmpNameSync(tmpOptions).replace(process.cwd()+"/","");
    
    console.log(`audioMimeType = ${audioMimeType}`);
    console.log(`fileExt = ${fileExt}`);
    
    try {

//	if (!fs.existsSync(tmpDir)) {
//	    console.log("Creating temporary directory for audio recording: " + tmpDir);
//	    fs.mkdirSync(tmpDir);
//	}
//	
	
	fs.writeFileSync(audioFilePathAbs, audio);

	const transcription_text = await postPapaReoTranscribe(audioFilePathAbs, audioMimeType);
	
	// Remove the file after use
	console.log("Supressing deletion of audio file");
	//fs.unlinkSync(audioFilePathAbs);

	const response_data = { recognizedTextData: {text: transcription_text}, recordedAudioFilename: audioFilePathAbs };
	console.log(response_data);
	return NextResponse.json(response_data);
    }
    catch (error) {
	console.error("Error processing audio:", error);
	return NextResponse.error();
    }
}

async function POST_OPENAI(body) {
    const base64Audio = body.audio;
    const audioMimeType = body.mimeType;
    
    const audio = Buffer.from(base64Audio, "base64");

    // Example mime types:
    //   audio/wav
    //   audio/webm;codecs=opus    
    
    const fileExt  = audioMimeType.replace(/^\w+\/(\w+)(?:;.+)?$/,".$1");    
    //const tmpDir   = path.join("public","tmp");

    const audioFilePathAbs = tmp.tmpNameSync ({
	tmpdir: STORE_PATH,
	prefix: `spoken-audio--`,
	postfix: fileExt,
	keep: true
    });
    
    //const filePathOLD = path.join(tmpDir,"spoken-audio"+fileExt);
    //const filePath = tmp.tmpNameSync(tmpOptions).replace(process.cwd()+"/","");
    
    console.log(`audioMimeType = ${audioMimeType}`);
    console.log(`fileExt = ${fileExt}`);
    
    try {

//	if (!fs.existsSync(tmpDir)) {
//	    console.log("Creating temporary directory for audio recording: " + tmpDir);
//	    fs.mkdirSync(tmpDir);
//	}

	console.log ("speech to text audio path ", audioFilePathAbs);
	fs.writeFileSync(audioFilePathAbs, audio);
//	const stats = fs.statSync(audioFilePathAbs);
//	console.log(stats.size);

	const readStream = fs.createReadStream(audioFilePathAbs);
	console.log("calling openai");
	const data = await openai.audio.transcriptions.create({
	    file: readStream,
	    model: "whisper-1",
	});
	
	// Remove the file after use
	console.log("Supressing deletion of audio file");
	//fs.unlinkSync(audioFilePathAbs);

	const response_data = { recognizedTextData: data, recordedAudioFilename: audioFilePathAbs };

	return NextResponse.json(response_data);
    }
    catch (error) {
	console.error("Error processing audio:", error);
	return NextResponse.error();
    }
}

const PostLookup = {
    "fake"    : POST_FAKE,
    "PapaReo" : POST_PAPAREO,
    "OpenAI"  : POST_OPENAI
};

export async function POST(req)
{
    const body = await req.json();
    const configOptions = body.configOptions;

    //console.log(configOptions);
    const post_lookup_fn = PostLookup[configOptions.speechToText];

    const returned_response = post_lookup_fn(body);
    /*
    let returned_response = null;
    if (routerOptions.fakeSpeechToText) {
	returned_response = await POST_FAKE(body);
    }
    else {
	//returned_response = await POST_OPENAI_REAL(body);
	returned_response = await POST_PAPAREO_REAL(body);
    }
    */
    
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
