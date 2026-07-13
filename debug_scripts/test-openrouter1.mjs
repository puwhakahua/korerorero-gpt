import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import OpenAI from "openai";

console.log("API Key present: ", !!process.env.OPENROUTER_API_KEY);
console.log(OpenAI.VERSION);

const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',	
      apiKey: process.env.OPENROUTER_API_KEY,

});


try {
    // First API call with reasoning
    const apiResponse = await openai.chat.completions.create({
    	  model: 'openrouter/free',
  	  messages: [
    	  {
		role: "user",
      		content: "Kia ora, Kei te pehea koe?",
   	   },
   	   ],
});

const returnedTopMessage = apiResponse.choices[0].message;
console.log ("*** top message=", returnedTopMessage.content);
 
console.log("*** full response=", JSON.stringify(apiResponse, null, 2));

} catch (e) {
  console.error(e);
}

