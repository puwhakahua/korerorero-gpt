import { URLs } from "@/utils/createURLs";

export async function getTextFromAudio(props, blob, base64data, mimeType) {
	props.updateStatusCallback("_statusSpeechToTextProcessing_");

	try {
	    const res = await fetch(URLs.api("speechToText"), {
              method: "POST",
              headers: {
		  "Content-Type": "application/json",
              },
              body: JSON.stringify({
		  audio: base64data,
		  mimeType: mimeType,
		  configOptions: props.configOptionsRef.current
              }),
	    }); /*.then((res) => {
	      let json_str = null;
	      if (res.status == 200) {
		  json_str = res.json();
	      }
	      return json_str;
	      });*/
	    if (!res.ok) {
		console.log("getTextFroAudio response not ok");
		throw new Error(`HTTP error ${res.status}`);
	    }

	    const response = await res.json();
	    
	    if (response != null) {
		const { text } = response.recognizedTextData;
		
		const lang = props.configOptionsRef.current.lang;
		const lang_ti_recognised = props.configOptionsRef.current.interfaceText["_textInfoRecognisedTextSpoken_"][lang];	      
		props.setText(lang_ti_recognised+": " + text);
		
		props.updateStatusCallback("_statusSpeechToTextCompleted_");
	      	return text;
	  }
      }
      catch (error) {
	  console.error(error);
      }
}



export async function getChatResponse (props, promptText) {
	props.updateStatusCallback("_statusChatLLMProcessing_");
		    
	try {
	    const res = await fetch(URLs.api("chatLLM"), {
		method: "POST",
		headers: {
		    "Content-Type": "application/json",
		},
		body: JSON.stringify({
		    configOptions: props.configOptionsRef.current,
		    messages: props.messagesRef.current,
		    promptText: promptText
		}),
	    }); /*.then((res) => {
		let json_str = null;
		if (res.status == 200) {
		    json_str = res.json();
		}
		return json_str;
	    });*/

	    if (!res.ok) {
		throw new Error(`HTTP error ${res.status}`);
	    }
	    const response = await res.json();
	    if (response != null) {
		// The returned top message from ChatLMM
		const result_message_pair = response.result;
		console.log(result_message_pair);
		const chatResponseText = result_message_pair.returnedTopMessage.content;	    
		props.updateStatusCallback("_statusChatLLMResponseReceived_");
		props.updateMessagesCallback(result_message_pair);
		
		const lang = props.configOptionsRef.current.lang;
		const lang_llm_says = props.configOptionsRef.current.interfaceText["_LLMSays_"][lang];
		props.setText(lang_llm_says + "" + chatResponseText); // ****
		
		return chatResponseText;
	    }
	    else {		

		const lang = props.configOptionsRef.current.lang;
		const lang_llm_no_response = props.configOptionsRef.current.interfaceText["_statusChatLLMNoResponseReceived_"][lang];
		props.setText(lang_llm_no_response);
		props.updateStatusCallback("_statusChatLLMNoResponseReceived_");		
	    }
	    
	}
	catch (error) {
	    const lang = props.configOptionsRef.current.lang;
	    const lang_ti_network_error = props.configOptionsRef.current.interfaceText["_textInfoNetworkError_"][lang];
	    props.setText(lang_ti_network_error);
	    props.updateStatusCallback("_statusNetworkError_");
	    
	    console.error(error);
	}
}
    

export async function getSynthesizedSpeech(props,text){
	props.updateStatusCallback("_statusTextToSpeechProcessing_");
	
	try {
	    const res = await fetch(URLs.api("textToSpeech"), {
		method: "POST",
		headers: {
		    "Content-Type": "application/json",
		},
		body: JSON.stringify({
		    text: text,
		    configOptions: props.configOptionsRef.current
		}),
	    }) /*.then((res) => {
		let json_str = null;
		if (res.status == 200) {
		    json_str = res.json();
		}
		return json_str;
	    });*/

	    if (!res.ok) {
		throw new Error(`HTTP error ${res.status}`);
	    }
	    const response = await res.json();

	    if (response != null) {
		// The following could be more streamlined if the server returned the blob
		// for the audio directly.  As the returned response is in JSON, this in
		// turn would need the blob to be encoded in something like base64
		
		const synthesizedAudioURL = response.synthesizedAudioURL;
		const synthesizedAudioMimeType = response.synthesizedAudioMimeType;
	    
		console.log("synthesizedAudioURL: " + synthesizedAudioURL);
		const audio_res = await fetch(synthesizedAudioURL);

		//console.log("Response URL:", audio_res.url);
		//console.log("Status:", audio_res.status);
		//console.log("Status text:", audio_res.statusText);
		//console.log("OK:", audio_res.ok);
		//console.log("Content-Type:", audio_res.headers.get("content-type"));

		const synthesizedAudioBlob = await audio_res.blob();
		
		//console.log("Blob:", synthesizedAudioBlob);
		//console.log("Blob type:", synthesizedAudioBlob.type);
		//console.log("Blob size:", synthesizedAudioBlob.size);
		
		if (!audio_res.ok) {
		    console.log("Response body:");
		    console.log(await synthesizedAudioBlob.text());
		}
		props.updateStatusCallback("_statusPlayingSynthesizedResult_");
		return synthesizedAudioBlob;
		
	    }
	}
	catch (error) {
	    console.log(error);
	}
}


