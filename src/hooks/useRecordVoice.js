"use client";

import { useEffect, useState, useRef } from "react";
import { blobToBase64 } from "@/utils/blobToBase64"; // **** remove util file ??
import { getPeakLevel } from "@/utils/createMediaStream";
import { getTextFromAudio, getChatResponse, getSynthesizedSpeech } from "@/lib/conversation"; 

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

    const conversation_context = {
	configOptionsRef : props.configOptionsRef,
	updateStatusCallback : props.updateStatusCallback,
	updateMessagesCallback : props.updateMessagesCallback,
	messagesRef : props.messagesRef,
	setText,
	
    };
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
		
		mediaRecorder.onstop = async () => {
		    console.log("mediaRecorder.onstop()");
		    const audioMimeType = mediaRecorder.mimeType;
		    console.log("audioMimeType = " + audioMimeType);
		    setAudioMimeType(audioMimeType);      
		    const audioBlob = new Blob(chunks.current, { type: audioMimeType });
		    console.log("Converting chunks to blob:");
		    console.log(audioBlob);
		    // Do the following line if you want the audio to be played                                              
		    //props.pageAudioFilenameCallback(audioFilename,blob,mimeType);                                          
		    //props.playAudioBlobCallback(blob);                                                                     


		    const base64data = await blobToBase64(audioBlob);
		    const new_text = await getTextFromAudio(conversation_context,audioBlob,base64data,audioBlob.type); //blobToBase64(audioBlob, getText);

		    const text_answer = await getChatResponse(conversation_context, new_text);
		    const synthesized_audio_blob = await getSynthesizedSpeech(conversation_context, text_answer);
		    props.playAudioBlobCallback(synthesized_audio_blob);
		    
		    
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
/*
  const blobToBase64Promise = blob => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      return new Promise(resolve => {
	  reader.onloadend = () => {
	      resolve(reader.result);
	  };
      });
  };
    
  */  
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
