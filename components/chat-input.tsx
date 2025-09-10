"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Mic, MicOff } from "lucide-react"
import { useState } from "react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
};

export function ChatInput({ value, onChange, onSend }: ChatInputProps) {

  const [statusCall, setStatusCall] = useState<boolean>(false);
  const [statusMic, setStatusMic] = useState<boolean>(false);

  /** Status call Fn */
  const statusCallFn = () => {
    setStatusCall(!statusCall)
    statusCall ? alert('Finalizando llamada') : alert('Llamada activa')
  };

  /** Status Mic fn*/
  const statusMicFn = () => {
    setStatusMic(!statusMic)
    statusMic ? alert('Mic activa') : alert('Mic Muteado')
  };

  /** Transcript fn*/
  const transcribe = () => {
    setStatusMic(false)
    alert('transcribiendo y escuchando')
  };

  const hasText = value.trim().length > 0

  return (
    <div className="px-[10px] py-[2px] rounded-[10px] shadow-[0_0_3px_#c41230] w-[95%] mx-auto mb-[10px]">
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${statusCall ? "Escuchando ..." : "Escribe tu pregunta"}`}
            className="bg-[transparent] border-[transparent] text-gray-800 placeholder:text-gray-500 inputUser focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
            onKeyPress={(e) => e.key === "Enter" && onSend()}
          />
          <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 w-[max-content] overflow-auto ${hasText ? '' : 'w-[0px]'}`}>
            <Button
              onClick={onSend}
              size="icon"
              className={`h-8 w-8 bg-[#c41230] rounded-full ${hasText ? "flex" : "hidden"}`}
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {!hasText && (
          <>
            <Button
              size="icon"
              variant="outline"
              className={`h-8 w-8 bg-[transparent] border-white/30 transition-all duration-200 rounded-full border-[#c41230] text-[#c41230] hover:bg-[transparente] 
              ${statusCall ? "bg-[#c4123033] border-[0px]" : "bg-[transparent] border-[1px]"}`}
              onClick={statusCall ? statusMicFn : transcribe}
            >
              {statusMic ? <MicOff className={`w-4 h-4 text-[#c41230]`} /> : <Mic className={`w-4 h-4 `} />}

            </Button>
            <Button size="sm" className={`bg-[#c41230] hover:bg-[#c41230] text-white px-[12px] transition-all duration-200 rounded-full  ${statusCall ? "h-8 w-[auto]" : "h-8 w-8"}`}
              onClick={statusCallFn}
            >
              <div className="flex items-center gap-1 ">
                <div className="flex gap-0.5 items-center justify-center">
                  <div className="w-[2px] h-3 bg-white rounded animate-pulse"></div>
                  <div className="w-[2px] h-2 bg-white rounded animate-pulse delay-75"></div>
                  <div className="w-[2px] h-4 bg-white rounded animate-pulse delay-150"></div>
                  <div className="w-[2px] h-2 bg-white rounded animate-pulse delay-75"></div>
                </div>
                <span className={`text-xs font-medium ${statusCall ? "flex" : "hidden"}`}>End</span>
              </div>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
