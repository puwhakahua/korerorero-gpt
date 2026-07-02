"use client";

import { useEffect, useState, useRef } from "react";
import { blobToBase64 } from "@/utils/blobToBase64"; // **** remove util file ??
import { getPeakLevel } from "@/utils/createMediaStream";

export const useRecordVoice = (props) => {
    const [text, setText]  = useState("");
    
    const [audioMimeType, setAudioMimeType] = useState("");

    const [micLevel, setMicLevel] = useState("0%");
    const [micLevelCapped, setMicLevelCapped] = useState("0%");
    const [micLevelCliprect, setMicLevelCliprect] = useState("rect(95% 100% 100% 0%)");
    
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recording, setRecording] = useState(false);

    const isRecording = useRef(false);
    const stream = useRef(null);
    const chunks = useRef([]);
    const audioContext = useRef(null);
    const sourceNode   = useRef(null);
    const analyzerNode = useRef(null);

    // OpenAI supported audio formats (as of 28 April 2024):
    //   ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']"
    //
    const getOpenAISupportedMimeType = () => {
	// For web browser supported Mime type, based on details in:
	//    https://stackoverflow.com/questions/41739837/all-mime-types-supported-by-mediarecorder-in-firefox-and-chrome

	// Intersection of OpenAI transcript and web browser Mime types
	const supported_formats = [
	    "audio/ogg;codecs=opus",  // Firefox friendly
	    "audio/webm;codecs=opus", // Chrome  friendly
	    "audio/mp4;codecs=mp4a",  // Safari  friendly
	    // and then some less specific versions
	    "audio/ogg",
	    "audio/webm",
	    "audio/mp4"
	];

	let return_format = "";
	
	for (const format of supported_formats) {
	    if (MediaRecorder.isTypeSupported(format)) {
		return_format = format;
		break;
	    }
	}

	if (return_format === "") {
	    console.error("Failed to find browser supported audio MIME-type that is compatible with OpenAI's transcribe service");
	}

	return return_format;
    }
    
    const startRecording = () => {
	if (mediaRecorder) {
	    if (isRecording.current) {
		// Can end up in this situtation if the user has dragged the cursor out of the microphone area
		// and then let go.  Needs a further click on the micronphone icon to stop recording
		console.log("Already recording.  Interpretting this click event as a request to stop recording");
		stopRecording();
	    }
	    else {
		//props.updateStatusCallback("Recording ...");
		props.updateStatusCallback("_statusRecording_");
		
		isRecording.current = true;




		mediaRecorder.onstart = () => {
		    console.log("mediaRecorder.onstart()");
		    audioContext.current = new AudioContext();
		    sourceNode.current = audioContext.current.createMediaStreamSource(stream.current);
		    analyzerNode.current = audioContext.current.createAnalyser();
		    sourceNode.current.connect(analyzerNode.current);
		    
		    const tick = () => {
			
			if (isRecording.current) {
			    const peak = getPeakLevel(analyzerNode.current);
			    const peak_boosted = Math.min(peak * 130,100); // give it a bit of a visual boost!
			    
			    const peak_perc = peak_boosted;
			    const peak_str = peak_perc.toFixed(0).toString();		  
			    setMicLevel(peak_str + "%");
			    
			    const peak_capped_perc = Math.min(peak_boosted,50); 
			    const peak_capped_str = peak_capped_perc.toFixed(0).toString();		  
			    setMicLevelCapped(peak_capped_str + "%");
			    
			    const peak_cliprect_top = 100 - peak_boosted;
			    const peak_cliprect_str = `rect(${peak_cliprect_top}% 100% 100% 0%)`;
			    setMicLevelCliprect(peak_cliprect_str)
			    
			    requestAnimationFrame(tick);
			}
			else {
			    sourceNode.current.disconnect();
			    audioContext.current.close();
			    setMicLevel("0%");
			    setMicLevelCapped("0%");
			    setMicLevelCliprect("rect(95% 100% 100% 0%)");
			}
		    };
		    tick();
		    
		    chunks.current = [];
		};
		
		mediaRecorder.ondataavailable = (ev) => {
		    chunks.current.push(ev.data);
		};
		
		mediaRecorder.onstop = () => {
		    console.log("mediaRecorder.onstop()");
		    const audioMimeType = mediaRecorder.mimeType;
		    console.log("audioMimeType = " + audioMimeType);
		    setAudioMimeType(audioMimeType);      
		    
		    const audioBlob = new Blob(chunks.current, { type: audioMimeType });
		    console.log("Converting chunks to blob:");
		    console.log(audioBlob);
		    blobToBase64(audioBlob, getText);

		    // ****
		    /*
		    const processAudioBlob = async () => {
			const audioBlobBase64 = await blobToBase64Promise(audioBlob);
			await getText(audioBlob,audioBlobBase64,audioMimeType);
			
		    };
		    processAudioBlob();
		    */
		    
		    /*
		    blobToBase64Promise(audioBlob).then(audioBlobBase64 => {
			getText(audioBlob,audioBlobBase64,audioMimeType);
		    })
		    */
	      
		};
		
		
		// Controlling the timeslice to .start() to be 1000, based on OpenAI Whisper <=> Safari issue
		//   https://community.openai.com/t/whisper-problem-with-audio-mp4-blobs-from-safari/322252
		mediaRecorder.start(1000);
		setRecording(true);
	    }
	}
    };

    
    const stopRecording = () => {
	if (mediaRecorder) {
	    props.updateStatusCallback("_statusMicrophoneRecordingStopped_");
	    isRecording.current = false;
	    mediaRecorder.stop();
            setRecording(false);
	}
    };

    // StackOverflow posting on how to interrupt a fetch()    
    //   https://stackoverflow.com/questions/31061838/how-do-i-cancel-an-http-fetch-request
    /*


 // Create an instance.
    const controller = new AbortController()
    const signal = controller.signal

    //
    // // Register a listenr.
    // signal.addEventListener("abort", () => {
    //     console.log("aborted!")
    // })
    


    function beginFetching() {
        console.log('Now fetching');
        var urlToFetch = "https://httpbin.org/delay/3";

        fetch(urlToFetch, {
                method: 'get',
                signal: signal,
            })
            .then(function(response) {
                console.log(`Fetch complete. (Not aborted)`);
            }).catch(function(err) {
                console.error(` Err: ${err}`);
            });
    }


    function abortFetching() {
        console.log('Now aborting');
        // Abort.
        controller.abort()
    }
    */
    

    const getSynthesizedSpeech = async (text) => {
	//props.updateStatusCallback(props.configOptionsRef.current.chatLLM + "'s response being synthesized as audio ...");
	props.updateStatusCallback("_statusTextToSpeechProcessing_");
	
	try {
	    const response = await fetch("/api/textToSpeech", {
		method: "POST",
		headers: {
		    "Content-Type": "application/json",
		},
		body: JSON.stringify({
		    text: text,
		    configOptions: props.configOptionsRef.current
		}),
	    }).then((res) => {
		let json_str = null;
		if (res.status == 200) {
		    json_str = res.json();
		}
		return json_str;
	    });

	    
	    if (response != null) {
		// The following could be more streamlined if the server returned the blob
		// for the audio directly.  As the returned response is in JSON, this in
		// turn would need the blob to be encoded in something like base64
		
		const synthesizedAudioFilename = response.synthesizedAudioFilename;
		const synthesizedAudioMimeType = response.synthesizedAudioMimeType;
	    
		//console.log("synthesizedAudioFilename: " + synthesizedAudioFilename);

		// const synthesizedAudioURL = synthesizedAudioFilename.replace(/public/,"")

		const synthesizedAudioURL = synthesizedAudioFilename.startsWith("/tmp/")
			? synthesizedAudioFilename
			: synthesizedAudioFilename.replace(/public/, "");

		
		const synthesizedAudioBlob = await fetch(synthesizedAudioURL)
		      .then(response => response.blob());

		props.updateStatusCallback("_statusPlayingSynthesizedResult_");		    
		props.playAudioBlobCallback(synthesizedAudioBlob);

	    }
	}
	catch (error) {
	    console.log(error);
	}
    };

    
    const getPromptResponse = async (promptText) => {
	//props.updateStatusCallback("Recognised text being processed by " + props.configOptionsRef.current.chatLLM);
	props.updateStatusCallback("_statusChatLLMProcessing_");
		    
	//console.log("**** getPromptResponse");
	//console.log("     " + props.messagesRef.current);
	
	try {
	    const response = await fetch("/api/chatLLM", {
		method: "POST",
		headers: {
		    "Content-Type": "application/json",
		},
		body: JSON.stringify({
		    configOptions: props.configOptionsRef.current,
		    //messages: JSON.parse(props.messages),
		    messages: props.messagesRef.current,
		    // //messages: messages,
		    promptText: promptText
		}),
	    }).then((res) => {
		let json_str = null;
		if (res.status == 200) {
		    json_str = res.json();
		}
		return json_str;
	    });

	    
	    if (response != null) {
		// The returned top message from ChatLMM
		const result_message_pair = response.result;
		console.log(result_message_pair);
		const chatResponseText = result_message_pair.returnedTopMessage.content;	    
		//props.updateStatusCallback(props.configOptionsRef.current.chatLLM + "'s response received");
		props.updateStatusCallback("_statusChatLLMResponseReceived_");
		props.updateMessagesCallback(result_message_pair);
		
		//setText(props.configOptionsRef.current.chatLLM + " says: " + chatResponseText); // ****
		const lang = props.configOptionsRef.current.lang;
		const lang_llm_says = props.configOptionsRef.current.interfaceText["_LLMSays_"][lang];
		//setText(lang_llm_says + ": " + chatResponseText); // ****
		setText(lang_llm_says + "" + chatResponseText); // ****
		
		getSynthesizedSpeech(chatResponseText);		
	    }
	    else {		
		//setText("No response received from " + props.configOptionsRef.current.chatLLM);
		//props.updateStatusCallback("No response received from " + props.configOptionsRef.current.chatLLM);

		const lang = props.configOptionsRef.current.lang;
		const lang_llm_no_response = props.configOptionsRef.current.interfaceText["_statusChatLLMNoResponseReceived_"][lang];
		setText(lang_llm_no_response);
		props.updateStatusCallback("_statusChatLLMNoResponseReceived_");		
	    }
	    
	}
	catch (error) {
	    const lang = props.configOptionsRef.current.lang;
	    const lang_ti_network_error = props.configOptionsRef.current.interfaceText["_textInfoNetworkError_"][lang];
	    setText(lang_ti_network_error);
	    props.updateStatusCallback("_statusNetworkError_");
	    
	    console.error(error);
	}
    };
    
    
    const getText = async (blob, base64data, mimeType) => {
	props.updateStatusCallback("_statusSpeechToTextProcessing_");
	
	try {
	  const response = await fetch("/api/speechToText", {
              method: "POST",
              headers: {
		  "Content-Type": "application/json",
              },
              body: JSON.stringify({
		  audio: base64data,
		  mimeType: mimeType,
		  configOptions: props.configOptionsRef.current
              }),
	  }).then((res) => {
	      let json_str = null;
	      if (res.status == 200) {
		  json_str = res.json();
	      }
	      return json_str;
	  });

	  if (response != null) {
	      const { text } = response.recognizedTextData;
	      //const audioFilename  = response.recordedAudioFilename;

	      const lang = props.configOptionsRef.current.lang;
	      const lang_ti_recognised = props.configOptionsRef.current.interfaceText["_textInfoRecognisedTextSpoken_"][lang];	      
	      setText(lang_ti_recognised+": " + text);
	      
	      props.updateStatusCallback("_statusSpeechToTextCompleted_");
	      
	      //setAudioFilename(audioFilename);
	      // Do the following line if you want the audio to be played
	      //props.pageAudioFilenameCallback(audioFilename,blob,mimeType);
	      //props.playAudioBlobCallback(blob);
	     

		//  TEMP: ignore STT result and send a fixed prompt to Claude
     		//  const testPrompt =
	        // "whakahoki kupu poto";
    		//  getPromptResponse(testPrompt);
 
	      // Now ask ChatLLM to respond to the recognised text
	      getPromptResponse(text);
	  }
      }
      catch (error) {
	  console.error(error);
      }
  };

/*
  const blobToBase64Async = (blob, callback) => {
      const reader = new FileReader();
      reader.onload = function () {
	  const type = blob.type;
	  const base64data = reader?.result?.split(",")[1];
	  callback(blob,base64data,type);
      };
      reader.readAsDataURL(blob);
  };
*/

    // https://stackoverflow.com/questions/18650168/convert-blob-to-base64
    /*
  function blobToBase64(blob) {
	return new Promise((resolve, _) => {
	    const reader = new FileReader();
	    reader.onloadend = () => resolve(reader.result);
	    reader.readAsDataURL(blob);
	});
    }
    */

  const blobToBase64Promise = blob => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      return new Promise(resolve => {
	  reader.onloadend = () => {
	      resolve(reader.result);
	  };
      });
  };
    
    
  const initializeMediaRecorder = (initStream) => {

      if (mediaRecorder === null) {
	  // This does get called twice, on page load
	  // The second stream is the one that ultimately gets stored in stream.current
	  // and subsequently used in startRecording()
	  
	  const audioMimeType = getOpenAISupportedMimeType();
	  
	  const thisMediaRecorder = new MediaRecorder(initStream, { mimeType: audioMimeType });

	  stream.current = initStream;

	  
	  //const sampleRate = stream.getAudioTracks()[0].getSettings().sampleRate;
	  //console.log("Creating mediaRecorder() from stream with sampleRate = " + sampleRate);
/*
	  thisMediaRecorder.onstart = () => {
	      console.log("mediaRecorder.onstart()");
	      audioContext.current = new AudioContext();
	      sourceNode.current = audioContext.current.createMediaStreamSource(stream);
	      analyzerNode.current = audioContext.current.createAnalyser();
	      sourceNode.current.connect(analyzerNode.current);
	      
	      const tick = () => {
		  
		  if (isRecording.current) {
		      const peak = getPeakLevel(analyzerNode.current);
		      const peak_boosted = Math.min(peak * 130,100); // give it a bit of a visual boost!
		      
		      const peak_perc = peak_boosted;
		      const peak_str = peak_perc.toFixed(0).toString();		  
		      setMicLevel(peak_str + "%");
		      
		      const peak_capped_perc = Math.min(peak_boosted,50); 
		      const peak_capped_str = peak_capped_perc.toFixed(0).toString();		  
		      setMicLevelCapped(peak_capped_str + "%");
		      
		      const peak_cliprect_top = 100 - peak_boosted;
		      const peak_cliprect_str = `rect(${peak_cliprect_top}% 100% 100% 0%)`;
		      setMicLevelCliprect(peak_cliprect_str)
		      
		      requestAnimationFrame(tick);
		  }
		  else {
		      sourceNode.current.disconnect();
		      audioContext.current.close();
		      setMicLevel("0%");
		      setMicLevelCapped("0%");
		      setMicLevelCliprect("rect(95% 100% 100% 0%)");
		  }
	      };
	      tick();
	      
	      chunks.current = [];
	  };
      
	  thisMediaRecorder.ondataavailable = (ev) => {
	      chunks.current.push(ev.data);
	  };
	  
	  thisMediaRecorder.onstop = () => {
	      console.log("mediaRecorder.onstop()");
	      const audioMimeType = thisMediaRecorder.mimeType;
	      console.log("audioMimeType = " + audioMimeType);
	      setAudioMimeType(audioMimeType);      
	      
	      const audioBlob = new Blob(chunks.current, { type: audioMimeType });
	      console.log("Converting chunks to blob:");
	      console.log(audioBlob);
	      //blobToBase64(audioBlob, getText);



	      const processAudioBlob = async () => {
		  const audioBlobBase64 = await blobToBase64Promise(audioBlob);
		  console.log("**** #### useRecordVoice.js, thisMediaRecorder.onstop():  props.lang = " + props.lang);
		  await getText(audioBlob,audioBlobBase64,audioMimeType);

	      };
	      processAudioBlob();

	      //
	      //blobToBase64Promise(audioBlob).then(audioBlobBase64 => {
	      //	  await getText(audioBlob,audioBlobBase64,audioMimeType);
	      //})
	      //
	      
	  };
*/
	  
	  setMediaRecorder(thisMediaRecorder);      
	  
      }
      
  };
    
    
  useEffect(() => {
      if (typeof window !== "undefined") {
	  navigator.mediaDevices
              .getUserMedia({ audio: true })
              .then(initializeMediaRecorder);
      }
  }, []);
    
    return { recording, startRecording, stopRecording, micLevel, micLevelCapped, micLevelCliprect, text };
};
