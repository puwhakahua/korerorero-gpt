// Use this to test a connection to claude. You need to run it from the
// korerorero-gpt directory, as node debug_scripts/test-claude.mjs
// You need to have set ANTHROPIC_API_KEY in the .env file
// it uses a proxy

import { ProxyAgent } from "undici";
import dotenv from "dotenv";
dotenv.config();

const agent = new ProxyAgent("http://proxy.waikato.ac.nz:3128");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  dispatcher: agent,
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-opus-4-6",
    max_tokens: 10,
    messages: [{ role: "user", content: "hi" }],
  }),
});

console.log("status:",res.status);
console.log(await res.text());