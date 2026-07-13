import fs from "fs";
import path from "path";
import os from "os";

import { Readable } from "stream";
//const { finished } = require('stream/promises');
import { finished } from "stream/promises";

import https from "https";

import * as dotenv from "dotenv";
import { env } from "../config/env";


dotenv.config();
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve,ms));
}



// https://stackoverflow.com/questions/52951091/how-to-use-async-await-with-https-post-request
function doRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let responseBody = '';

      res.on('data', (chunk) => {
	console.log("**** Adding chunk: " + chunk);
        responseBody += chunk;
      });

      res.on('end', () => {
	console.log("**** responseBody = " + responseBody);
        resolve(JSON.parse(responseBody));
      });
    });

    req.on('error', (err) => {
	console.error(err);
	reject(err);
    });

    req.write(data)
    req.end();
  });
}

// Adpated from:
//   https://medium.com/deno-the-complete-reference/sending-form-data-using-fetch-in-node-js-8cedd0b2af85

// Also, https://stackoverflow.com/questions/74355521/upload-file-in-formdata-with-builtin-nodejs-fetch

async function postPapaReoTranscribe(audio_ifilename, mime_type)
{
    const body = new FormData();

    const blob = new Blob([fs.readFileSync(audio_ifilename)], {type: mime_type});

    body.set("audio_file", blob, audio_ifilename);
    body.set("with_metadata", "false");
    
    const resp = await fetch("https://api.papareo.io/tuhi/transcribe", {
	method: "POST",
	headers: {
	    'Accept':        "application/json",
	    'Authorization': "Token " + env.PAPAREO_API_KEY,
	},	
	body
    });

    /*
    console.log(
	"STATUS:",
	resp.status,
	"\nCONTENT TYPE:",
	resp.headers.get("content-type"),
    );
    */
    /*
    if (resp.status == 200) {
    }
    */
    
    const response_text = await resp.text();    
    console.log("RAW BODY:", response_text);

    const response_json = JSON.parse(response_text);

    let transcription = null;
    
    if (response_json.success) {
	transcription = response_json.transcription;
    }
    else {
	console.error("Failed to transcribe audio using Papa Reo API");
    }

    console.log(`*** transcribed text = ${transcription}`);
    return transcription;
}

    
async function postPapaReoSynthesize(text)
{
    // text - The text you want spoken
    // speed - Any valid number to speed up or slow the voice
    // response_type - Either 'stream' it directly or return a short-lived 'url'
    /// voice_id - Choose the voice id: pita
    console.log("in post papareo synthesis");
    const post_data = {
	"text": text,
	"speed": 1,
	"response_type": "url",
	"voice_id": "pita"
    };

    //const post_data_str = JSON.stringify(post_data);
    
/*    var options = {
	host: 'api.papareo.io',
	port: 443,
	path: '/reo/synthesize',
	method: 'POST',

	headers: {
	    'Accept':        "application/json",
	    'Authorization': "Token " + env.PAPAREO_API_KEY,
	    'Content-Type':  "application/json"
	}
    };

    const response_data = await doRequest(options, post_data_str);

    return response_data.audio_url;
*/

    const res = await fetch("https://api.papareo.io/reo/synthesize", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: "Token " + env.PAPAREO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(post_data),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Papareo error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  return data.audio_url;
}

// using fetch here instead of teh anthopic sdk means it will use
// a global dispatcher if there is one
// needed if you are behind a proxy
async function postAnthropicMessage(model,messages, max_tokens=1024) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${errText}`);
  }

  return await res.json();
}  

async function postOpenAIMessage(model, messages, temperature=0) {

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
	method: "POST",
	headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
	},
	body: JSON.stringify({
            model,
            messages,
            temperature,
	}),
    });

    
    if (!response.ok) {
	const errorText = await response.text();
	throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }
    return await response.json();
}

async function postOpenRouterMessage(model, messages, temperature=0) {

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
	method: "POST",
	headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
	},
	body: JSON.stringify({
            model,
            messages,
            temperature,
	}),
    });

    
    if (!response.ok) {
	const errorText = await response.text();
	throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }
    return await response.json();
}

async function downloadURL(url,ofilename)
{
    let download_status = true;
    
    const resp = await fetch(url);
    if (resp.ok && resp.body) {
	console.log("downloadURL(): Writing to file:", ofilename);
	let writer = fs.createWriteStream(ofilename);
	await finished(Readable.fromWeb(resp.body).pipe(writer));		
    }
    else {
	download_status = false;
    }

    return download_status;    
}


export { sleep, postPapaReoTranscribe, postPapaReoSynthesize, postAnthropicMessage, postOpenAIMessage, postOpenRouterMessage, downloadURL };

export const STORE_PATH = process.env.FS_STORE_PATH || path.join(os.tmpdir(), "korerorero-gpt-audio");

// ensure directory exists
if (!fs.existsSync(STORE_PATH)) {
  fs.mkdirSync(STORE_PATH, { recursive: true });
}
