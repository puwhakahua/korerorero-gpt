"use client"

import React, { useState, useEffect, useRef  } from 'react';

import { useRecordVoice } from "@/hooks/useRecordVoice";

import { MicrophoneModeEnum,  Microphone  } from "@/app/components/Microphone";
import { AudioPlayerModeEnum, AudioPlayer } from "@/app/components/AudioPlayer";

import { MediaPlayer, AudioSpectrumVisualizer } from "@/app/components/AudioSpectrumVisualizer";

      
const InterfaceText = {

    _howCanIHelp_: {
	"en": "How can I help?",
	"mi": "Kōrero mai ..."
    },
    _microphoneInstructions_: {
	"en": "Press and hold the microphone button to record.",
	"mi": "Pātene hopu reo."
    },

    _showtext_: {
	"en": "Show Text",
	"mi": "Whakaatu Kupu"
    },
    _hidetext_: {
	"en": "Hide Text",
	"mi": "Huna Kupu"
    },
    
    _statusLabel_: {
	"en": "Status",
	"mi": "Tūnga" // Translated via Google, then checked against some te reo dictionary resources
    },
    _statusWaiting_: {
	"en": "Waiting for audio input ...",
	"mi": "E whanga ana ki tō reo ..."
    },
    _statusRecording_: {
	"en": "Recording ...",
	"mi": "E hopu ana ..."
    },
    _statusSpeechToTextProcessing_: {
	"en": "Text recognition of recorded audio ...",
	"mi": "E whakarite ana te kupu kōrero ki te kupu tuhi..."
    },
    _statusSpeechToTextCompleted_: {
	"en": "Spoken text recognised",
	"mi": "Kua hopu kōrero"
    },
    _textInfoRecognisedTextSpoken_: {
	"en": "Recognised spoken text",
	"mi": "Ko ngā kōrero kua hopu"
    },
    
    _statusChatLLMProcessing_: {
	"en": "Recognised text being processed by Claude ...",
	"mi": "E hanga whakaaro ana a Claude ...",
    },
    _statusTextToSpeechProcessing_: {
	"en": "Claude's response being synthesized as audio ...",
	"mi": "E whakarite ana te kupu tuhi ki te kupu kōrero ..."
    },
    _statusPlayingSynthesizedResult_: {
	"en": "Playing the synthesized audio response ...",
	"mi": "E kōrero ana ..."
    },

    _statusChatLLMResponseReceived_: {
	"en": "Claude's response received",
	"mi": "Kua whakahoki kōrero mai a Claude"
    },
    _statusChatLLMNoResponseReceived_: {
	"en": "No response received from Claude",
	"mi": "Kāore a Claude i whakahoki kōrero mai"
    },

    _statusNetworkError_: {
	"en": "A network error occured",
	"mi": "Kua whati te tūhononga rorohiko"
    },
    _textInfoNetworkError_: {
	"en": "A network error occured when trying to process the recognised text",
	"mi": "Kua whati te tūhononga rorohiko i a Claude e whakaaro ana"
    },

        
    _statusAudioPlayerPaused_: {
	"en": "Paused",
	"mi": "E tū ana"
    },
    _statusAudioPlayerPlaying_: {
	"en": "Playing",
	"mi": "E kōrero ana",
    },
    _statusAudioPlayerStopped_: {
	"en": "Stopped playing",
	"mi": "Kua mutu te kōrero",
    },
    _statusMicrophoneRecordingStopped_: {
	"en": "Stopped recording",
	"mi": "Kua mutu te hopu"
    },
    
    
    // _LLMSays_: {
	// "en": "ChatGPT says",
	// "mi": "ki tā ChatGPT"
	// //"en": "Claude says",
	// //"mi": "ki tā Claude"
    // }

    _LLMSays_: {
        "en": "",
        "mi": ""
      }
};

const DefaultLang = "mi";
//const DefaultLang = "en";


const DefaultConfigOptions = {
    //speechToText : "OpenAI",
    //chatLLM      : "OpenAI",
    //textToSpeech : "OpenAI",
    speechToText : "PapaReo",
    chatLLM      : "Claude",
    //textToSpeech : "PapaReo",
    textToSpeech : "MaoriTTSW",

    lang: DefaultLang,
    interfaceText: InterfaceText
};


const InterfaceModeEnum = Object.freeze({"inactive":1, "recording": 2, "playing":3, "paused":4 });

export default function Home()
{
    //const [ConfigOptions, setConfigOptions] = useState(DefaultConfigOptions);
    const [Lang,          setLang         ] = useState(DefaultLang);

    // test for swapping voices
    const [selectedVoice, setSelectedVoice] = useState(DefaultConfigOptions.textToSpeech);
    
    const [interfaceMode,   setInterfaceMode]   = useState(InterfaceModeEnum.inactive);
    const [microphoneMode,  setMicrophoneMode]  = useState(MicrophoneModeEnum.inactive);
    const [audioPlayerMode, setAudioPlayerMode] = useState(AudioPlayerModeEnum.inactive);

    //const defaultStatusText = "Waiting for audio input";
    //const defaultStatusText = ConfigOptions.interfaceText["_statusWaiting_"][Lang];
    const defaultStatusText = DefaultConfigOptions.interfaceText["_statusWaiting_"][Lang];
    // //const [statusText, setStatusText]     = useState(ConfigOptions.interfaceText["_statusLabel_"][DefaultLang] + ": " + defaultStatusText);
    const [statusText, setStatusText]     = useState(defaultStatusText);

    const [blob, setBlob]                 = useState(null); // <Blob>
    const [apBlob, setAudioPlayerBlob]    = useState(null); // <Blob> for AudioPlayer
    const [audioContext, setAudioContext] = useState(null); // <AudioContext>

    const [messages, setMessages] = useState([
        { role: "system",    content: "You are a helpful assistant" },
        { role: "assistant", content: "How can I you today?" }
    ]);

    const configOptionsRef = useRef(DefaultConfigOptions); // Currently, a generic object/hashmap
    const messagesRef      = useRef(null);    
    const mediaPlayer      = useRef(null); // <MediaPlayer>
    
    const mediaPlayerWidth     = 400;
    const mediaPlayerHeight    = 132;
    const audioControllerWidth = 46;

    const interfaceWidth = mediaPlayerWidth + audioControllerWidth;
    
    
    useEffect(() => {
	if (mediaPlayer.current === null) {
	    
	    mediaPlayer.current = new MediaPlayer(function() {
		// callback function, when audio stops playing
		console.log("mediaPlayer.onstopplaying() callback called!");
		updateStatus(defaultStatusText);
                setBlob(null);
	    });

	}
    }, []);


    useEffect(() => {
	const queryParams = new URLSearchParams(window.location.search);
	const lang_param = queryParams.get('lang'); 

	if (lang_param) {
	    
	    if (lang_param != Lang) {
		//const NewConfigOptions = {...ConfigOptions, "lang": lang_param}

		// //NewConfigOptions["lang"] = lang_param;
		setLang(lang_param);
		//setConfigOptions(NewConfigOptions);
	    }
	}
    }, []);
    

    useEffect(() => {
	//const NewConfigOptions = {...DefaultConfigOptions, "lang": Lang}
	//configOptionsRef.current = NewConfigOptions
	//setConfigOptions(NewConfigOptions);

	configOptionsRef.current.lang = Lang;
	updateStatus(defaultStatusText);
	
    }, [Lang]);
    

    useEffect(() => {
	if (blob !== null) {
	    console.log(`[page.js] useEffect() [blob] non-null blob => setting mediaPlayer.state to "playing"`);
            setInterfaceMode(InterfaceModeEnum.playing);
	    mediaPlayer.current.state = "playing";

            // Take a copy of the blob so the audio player can start/stop playing it
	    console.log("**** !!!! setting apBlob to copy of 'blob'")
	    console.log(blob)
            setAudioPlayerBlob(blob);
	}
	else {
	    console.log(`[page.js] useEffect() [blob] blob is null  => setting mediaPlayer.state to "inactive"`);
            setInterfaceMode(InterfaceModeEnum.inactive);            
	    mediaPlayer.current.state = "inactive";
	}
    }, [blob]);

    useEffect(() => {
        if (interfaceMode === InterfaceModeEnum.inactive) {
            setMicrophoneMode(MicrophoneModeEnum.inactive);
            setAudioPlayerMode(AudioPlayerModeEnum.inactive);
        }
        else if (interfaceMode === InterfaceModeEnum.recording) {
            setMicrophoneMode(MicrophoneModeEnum.recording);
            setAudioPlayerMode(AudioPlayerModeEnum.inactive);
        }            
        else if (interfaceMode === InterfaceModeEnum.playing) {
            setMicrophoneMode(MicrophoneModeEnum.inactive);            
            setAudioPlayerMode(AudioPlayerModeEnum.playing);
        }
        else if (interfaceMode === InterfaceModeEnum.paused) {
            setMicrophoneMode(MicrophoneModeEnum.inactive);            
            setAudioPlayerMode(AudioPlayerModeEnum.paused);
        }        
    }, [interfaceMode]);


    useEffect(() => {
	messagesRef.current = messages;
    }, [messages]);
    
    const updateStatus = (text_marker) => {
	console.log("*** updateStatus(), Lang = " + Lang + ", text_marker = " + text_marker);
	let lang_text = text_marker;
	
	if (text_marker in configOptionsRef.current.interfaceText) {
	    
	    lang_text = configOptionsRef.current.interfaceText[text_marker][Lang];
	}

	const status_label = configOptionsRef.current.interfaceText["_statusLabel_"][Lang];

	// Te Taka requested that there be no 'status: ' text
	//setStatusText(status_label+ ": " + lang_text)
	setStatusText(lang_text)
    };

    const handleAudioPauseToggle = () => {
        console.log("handleAudioPauseToggle()");
        if (mediaPlayer.current.state === "playing") {
            mediaPlayer.current.state = "paused";
	    updateStatus("_statusAudioPlayerPaused_");
        }
        else {
            mediaPlayer.current.state = "playing";
	    updateStatus("_statusAudioPlayerPlaying_");
        }
    };

    const handleAudioPlay = () => {
        console.log("handleAudioPlay()");
        if (mediaPlayer.current.state !== "playing") {
            mediaPlayer.current.state = "playing";
	    updateStatus("_statusAudioPlayerPlaying_");
            
	    console.log("Initializing a new AudioContext");
	    setAudioContext(new AudioContext());
	    console.log("**** page::handleAudioPlay(), away to setBlob()")	    
            setBlob(apBlob);
        }
    };

    const handleAudioStop = () => {
        console.log("handleAudioStop()");
        if ((mediaPlayer.current.state === "playing") || (mediaPlayer.current.state === "paused")) {
            mediaPlayer.current.state = "inactive";
	    updateStatus("_statusAudioPlayerStopped_");
            
	    setBlob(null);
        }
    };

   
    const audioFilenameCallbackDeprecated = (callbackAudioFilename, callbackBlob, callbackMimeType) => {
	console.log("[page.js] callbackAudioFilename = " + callbackAudioFilename)
	
	const callbackAudioURL = callbackAudioFilename.replace(/public/, "");
	
	setAudioFilename(callbackAudioFilename);
	//mediaPlayer.current.state = "start-playing";
	//mediaPlayer.current.state = "init-to-silence";

        if (audioContext === null) {
            console.log("Initializing AudioContext");
            setAudioContext(new AudioContext());
        }
	console.log("**** page::playAudioBlobCallbackDEPRECATED!!!(), away to setBlob()")
	setBlob(callbackBlob);
    };


    const playAudioBlobCallback = (callbackBlob) => {
	console.log("[page.js] playAudioBlobCallback()");
	
	//const callbackAudioURL = callbackAudioFilename.replace(/public/, "");
	
	//setAudioFilename(callbackAudioFilename);

        if (audioContext === null) {
            console.log("Initializing AudioContext");
            setAudioContext(new AudioContext());
        }
	console.log("**** page::playAudioBlobCallback(), away to setBlob()")	
	setBlob(callbackBlob);

    };

{/*
// temp to determine if STT API not working
const playAudioBlobCallback = (callbackBlob) => {
  console.log("[page.js] playAudioBlobCallback()");

  // 🔊 TEMP TEST: play via a plain <audio> element
  try {
    const testUrl = URL.createObjectURL(callbackBlob);
    const audio = new Audio(testUrl);
    audio.play().then(() => {
      console.log("✅ Raw Audio() play() started successfully");
    }).catch(err => {
      console.error("❌ Raw Audio() play() failed:", err);
    });
  } catch (e) {
    console.error("Error creating Audio() from blob:", e);
  }

  // Existing MediaPlayer path
  if (audioContext === null) {
    console.log("Initializing AudioContext");
    setAudioContext(new AudioContext());
  }
  console.log("**** page::playAudioBlobCallback(), away to setBlob()");
  setBlob(callbackBlob);
};
*/}




    const updateMessagesCallback = (returnedMessagePair) => {
        console.log("returnedMessagePair = " + JSON.stringify(returnedMessagePair));
        const userMessage        = returnedMessagePair.userMessage;
        const returnedTopMessage = returnedMessagePair.returnedTopMessage;

        const updatedMessages = [...messages, userMessage, returnedTopMessage];
        setMessages(updatedMessages);	        
    }
;
    const lang_HowCanIHelp = configOptionsRef.current.interfaceText["_howCanIHelp_"][Lang];
    
    return (
	    <main className="flex min-h-screen flex-col items-center justify-center">
	      <div style={{width: "90%", maxWidth: "900px", backgroundColor: 'white'}}>

	        <div className="flex flex-col justify-center items-center">
	          <div className="textmessage pb-2" style={{width: interfaceWidth+'px'}} >                  
	            {lang_HowCanIHelp}
	          </div>	    	    

                  <div style={{backgroundColor: '#f4f4f4', padding: '0.5rem 0.5rem 0 0.5rem'}}>
                    <div style={{width: audioControllerWidth+'px', float: 'left'}} >
                      <div style={{margin: '0.2rem'}}>
	                <AudioPlayer
                          mediaPlayer={mediaPlayer}
	                  autoAudioPlayerMode={audioPlayerMode}
	                  handlePauseToggle={handleAudioPauseToggle}
	                  handlePlay={handleAudioPlay}
	                  handleStop={handleAudioStop}
        		  updateStatusCallback={updateStatus}
                        />
                      </div>
                    </div>
	            <div className="border border-solid"
	                 style={{width: mediaPlayerWidth+'px', height: mediaPlayerHeight+'px',
                                 backgroundColor: 'white', borderColorXX: 'black', float: 'right'}}>
		      <AudioSpectrumVisualizer
		        mediaPlayer={mediaPlayer}
	                blob={blob}
	                audioContext={audioContext}
                        fftSize={256}
		        width={mediaPlayerWidth}
		        height={mediaPlayerHeight}
		        barWidth={3}
		        gap={2}
		        barColor={'lightblue'}
        		updateStatusCallback={updateStatus}                        
		      />
	            </div>
                    
                  </div>
                  <div style={{backgroundColor: '#f4f4f4', padding: '0 0.5rem 0 0.5rem'}}>
	            <div className="textmessage text-sm p-2 mt-0 italic"
                         style={{width: interfaceWidth+'px', color: 'black', borderColorXX: '#176593'}} >
	              {statusText}
	            </div>
	          </div> 


 	    {/* language selector  */}
            <div
                style={{
                    margin: "1rem 0",
                    width: interfaceWidth + "px",
                    textAlign: "center",
                }}
                >
                <label htmlFor="langSelect">Reo atanga / Interface language:&nbsp;</label>
                <select
                    id="langSelect"
                    value={Lang}
                    onChange={(e) => {
                    const newLang = e.target.value;
                    setLang(newLang);
                    console.log("✅ Interface language changed to:", newLang);
                    }}
                >
                    <option value="mi">Māori</option>
                    <option value="en">English</option>
                </select>
            </div> 

            {/* TTS Selector*/}
            <div style={{ margin: "1rem 0" }}>
                <label htmlFor="voiceSelect">TTS Voice:&nbsp;</label>
                <select
                    id="voiceSelect"
                    value={selectedVoice}
                    onChange={(e) => {
                    const newVoice = e.target.value;
                    setSelectedVoice(newVoice); // ✅ updates UI
                    configOptionsRef.current.textToSpeech = newVoice; // ✅ used in API request
                    console.log("✅ TTS voice changed to:", newVoice);
                    }}
                >
                    <option value="PapaReo">PapaReo</option>
            <option value="MaoriTTSK">WM-TTS (KingsleyEng)</option>
	    <option value="MaoriTTSW">WM-TTS (WMAI Research)</option>
	    <option value="fake">Fake</option>
	    <option value="Piper">Piper</option>
	    <option value="Puwhakahua">Puwhakahua</option>
                </select>
            </div>

              

	          <Microphone
	            lang={Lang}
	            configOptionsRef={configOptionsRef}
                    messagesRef={messagesRef}
		    updateStatusCallback={updateStatus}
	            playAudioBlobCallback={playAudioBlobCallback}
                    updateMessagesCallback={updateMessagesCallback}
	          />
                </div>
	      </div>
	    </main>
  );
}


