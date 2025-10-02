"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Mic, MicOff, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRealtime } from "@/hooks/useRealtime"
import { toast } from "sonner"
import { useQuickOptionsStore } from "@/store/useQuickOptionsStore"
import { dataLanguage } from "@/languajes/data";
import { useLanguageStore, LanguageCode } from "@/store/useLanguageStore"
import './styles/swiper-quickQuestion.css'
import RealtimeService from "./services/RealtimeService"
import { AutoSlider } from "./auto-slider"
import { useRefElementsStore } from "@/store/RefElements"

// Helper to ensure only supported languages are used for inputMessage
function getSupportedLang(lang: LanguageCode): 'es' | 'en' {
  return lang === 'es' || lang === 'en' ? lang : 'en';
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
};

export function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  // Local state for UI
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [statusCall , setStatusCall] = useState<boolean>(false)
  const { languageCurrent } = useLanguageStore()
  const buttonMuted = useRef<HTMLDivElement>(null)
  const buttonCall = useRef<HTMLDivElement>(null)

  // Global state for quick options
  const { viewQuickOptions, setViewQuicOptions, toggleViewQuickOptions } = useQuickOptionsStore();
  const setStopCall = useRefElementsStore.getState().setStopCall
  const setMutedStorage = useRefElementsStore.getState().setMutedStorage

  // Touch states for swipe detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Realtime hook for OpenAI integration
  const {
    isConnected: isRealtimeConnected,
    isConnecting: isRealtimeConnecting,
    connectionError,
    startRealtime,
    stopRealtime,
    sendMessage: sendRealtimeMessage,
    messages: realtimeMessages,
    clearMessages: clearRealtimeMessages,
    audioData
  } = useRealtime();

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      toast.error(`Realtime Error: ${connectionError}`);
      // setIsRealtimeActive(false);
    }
  }, [connectionError]);

  // Handle realtime messages
  useEffect(() => {
    if (realtimeMessages.length > 0) {
      const latestMessage = realtimeMessages[realtimeMessages.length - 1];

      if (latestMessage.type === 'response') {
        toast.success("🤖 AI Response received");
      } else if (latestMessage.type === 'error') {
        toast.error(`Error: ${latestMessage.content}`);
      }
    }
  }, [realtimeMessages]);

  // Handle audio data
  useEffect(() => {
    if (audioData.length > 0) {
      toast.success(`🔊 Audio received: ${audioData.length} chunks`);
    }
  }, [audioData]);


  /**
   * Handles starting/stopping the realtime session
   */
  const handleRealtimeToggle = async ({from}:{from:string}) => {
    
    switch(from){
      case "call":
        // Si la llamada está activa, la finalizamos y muteamos
        if (statusCall) {
          RealtimeService.muteInput(true); // Siempre mutear al finalizar
          setStatusCall(false); // Finalizar llamada
          setIsMuted(true); // Mutear micrófono
        } else {
          // Si la llamada está finalizada, la reactivamos y desmuteamos
          RealtimeService.muteInput(false); // Siempre desmutear al reactivar
          setStatusCall(true); // Activar llamada
          setIsMuted(false); // Desmutear micrófono
        }
        break;

      case "muted":
        const currentStatusCall2 = RealtimeService.getAudioInputMuted()
        console.log(currentStatusCall2)
        RealtimeService.muteInput(!currentStatusCall2);
        setIsMuted(!currentStatusCall2)
      break
    }


  };

  /**
   * Sends a message through realtime when connected
   */
  const handleRealtimeMessage = async () => {
    if (!value.trim()) {
      toast.warning("Please enter a message first");
      return;
    }

    if (!isRealtimeConnected) {
      toast.error("Not connected to realtime. Start session first.");
      return;
    }

    try {
      await sendRealtimeMessage(value);
      onChange(""); // Clear input after sending
      toast.success("📤 Message sent via realtime");
    } catch (error) {
      console.error("Error sending realtime message:", error);
      toast.error("Failed to send message via realtime");
    }
  };

  /**
   * Enhanced send function that can use realtime or regular chat
   */
  const handleEnhancedSend = () => {
    if (isRealtimeConnected && value.trim()) {
      handleRealtimeMessage();
    } else {
      onSend();
    }
  };

  const hasText = value.trim().length > 0;
  const isLoading = isRealtimeConnecting;
  const [showRealtimeIndicator, setShowRealtimeIndicator] = useState<boolean>(false)
  const [counter, setCounter] = useState<number>(0)

  useEffect(() => {
    
    if (counter > 0) {
      value == '' && (setViewQuicOptions(false))
      value !== '' && (setViewQuicOptions(true))
    }

  }, [value])

  useEffect(() => {

    if (hasText && counter == 0) {
      setCounter(1)
    }
  }, [hasText])

  // Touch handlers for swipe detection ( quickQuestions )
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientY);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;

    if (isUpSwipe) {
      if (!viewQuickOptions) {
        toggleViewQuickOptions();
      }
    }
  };

  useEffect(() => {
    
    setStopCall(buttonCall.current)
    setMutedStorage(buttonMuted.current)

  },[])
    

  return (
    <div className="px-[10px] py-[2px] rounded-[10px] shadow-[0_0_3px_#c41230] w-[95%] mx-auto mb-[10px] relative z-10">

      {/* Auto Slider */}
      <div className="row-span-1  pb-[13px] absolute top-[-200%]" id="quickQuestionSliders">
        {/* <AutoSlider /> */}
      </div>

      <div
        className="flex gap-2 items-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={e => e.preventDefault()}
            placeholder={
              isMuted ? 
                dataLanguage.muted[getSupportedLang(languageCurrent)][0]
              :!statusCall
                ? dataLanguage.inputMessage[getSupportedLang(languageCurrent)][0]
                : dataLanguage.inputMessage[getSupportedLang(languageCurrent)][1]
            }
            className="bg-[transparent] border-[transparent] text-gray-800 placeholder:text-gray-500 inputUser focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-0 w-[100%] text-[16px]"
            onKeyPress={(e) => e.key === "Enter" && handleEnhancedSend()}
          />
          <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 w-[max-content] overflow-auto ${hasText ? '' : 'w-[0px]'}`}>
            <Button
              onClick={handleEnhancedSend}
              size="icon"
              className={`h-8 w-8 rounded-full ${hasText ? "flex" : "hidden"} ${isRealtimeConnected ? "bg-green-600 hover:bg-green-700" : "bg-[#c41230] hover:bg-[#c41230]"
                }`}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {!hasText && (
          <>
            {
              !statusCall &&
              <Button
                size="icon"
                
                disabled={isLoading}
                className={`
                  h-8 w-8 transition-all duration-200 rounded-full text-[#c41230] shadow-[none]  hover:bg-white
                  ${showRealtimeIndicator ? "bg-green-100 border-green-500 text-green-600" : "bg-[transparent] border-[1px]"}
                  ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
                  ${isMuted && 'bg-red-100 hover:bg-red-100'}
                `}
                // onClick={ }
                title={isRealtimeConnected ? "Stop Realtime Session" : "Start Realtime Session"}
              >
                {
                  isMuted 
                  ? <div className={`w-4 h-4`} onClick={() => { RealtimeService.muteInput(false); setIsMuted(false) }}>
                  <MicOff className={`w-4 h-4`} />
                </div>
                  : <div className={`w-4 h-4`} onClick={() => { RealtimeService.muteInput(true); setIsMuted(true) }} ref={buttonMuted}>
                  <Mic className={`w-4 h-4`} />
                </div>
                }
              </Button>
            }


            <Button
              size="sm"
              disabled={isLoading}
              className={`transition-all duration-200 rounded-full text-white px-[12px] flex  items-center justify-center
              ${showRealtimeIndicator ? "h-8 w-[auto] bg-green-600 hover:bg-green-700" : "h-8 w-8 bg-[#c41230] hover:bg-[#c41230]"}
              ${isLoading ? "opacity-50 cursor-not-allowed" : ""} ${!statusCall ? "w-[auto] " : "w-8 h-8"}`}
              onClick={()=>handleRealtimeToggle({from:"call"})}
              title={isRealtimeConnected ? "End Realtime Session" : "Start Realtime Session"}
              
            >
              <div className={`flex items-center justify-center ${!statusCall ? "gap-1" : ""}`} ref={buttonCall}>
                <div className="flex gap-0.5 items-center justify-center">
                  <div className={`w-[3px] h-2 bg-white rounded ${showRealtimeIndicator ? "animate-pulse" : ""}`}></div>

                  <div className={`w-[3px] h-4 bg-white rounded ${showRealtimeIndicator ? "animate-pulse delay-150" : ""}`}></div>
                  <div className={`w-[3px] h-2 bg-white rounded ${showRealtimeIndicator ? "animate-pulse delay-75" : ""}`}></div>
                </div>
                <span className={`text-xs font-medium`}>
                  {statusCall ? "" : "End"}
                </span>
              </div>

            </Button>
          </>
        )}
      </div>

      {/* Realtime Status Indicator */}
      {showRealtimeIndicator && (
        <div className="mt-2 text-xs text-center">
          <span className={`px-2 py-1 rounded-full text-white ${isRealtimeConnected ? "bg-green-500" : "bg-yellow-500"
            }`}>
            {isRealtimeConnected ? "🎤 Realtime Active" : "🔄 Connecting..."}
          </span>
        </div>
      )}

      {/* Messages count indicator */}
      {realtimeMessages.length > 0 && (
        <div className="mt-1 text-xs text-gray-500 text-center">
          {realtimeMessages.length} realtime message{realtimeMessages.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
