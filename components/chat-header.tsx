"use client"

import { Button } from "@/components/ui/button"
import { useEventBus } from "@/hooks/useEventBus"
import { EventBusService, EventTypes } from "@/lib/events"
import { registerEventListeners, unSubscribeEventListeners } from "@/utils/events/events"
import { MultimediaStore } from "@/utils/stores/zustandStore"
import { X, ChevronDown, ArrowLeft } from "lucide-react"
import { useEffect } from "react"

interface ChatHeaderProps {
  onClose: () => void
  onMinimize: () => void
  backgroundClass?: string
}

export function ChatHeader({ onClose, onMinimize, backgroundClass }: ChatHeaderProps) {

  const { multimediaStatus, setMultimediaStatus } = MultimediaStore();
  const eventBus = EventBusService.getInstance();

  const deleteMultimodalPopUp = () => {

    const element = document.getElementById("multiMediaPopUp") as HTMLDivElement;
    console.log(element)
    element.remove();
    setMultimediaStatus(false)
  };

  /** Seteamos los listeners para la adminsitración de la UI por medio de eventos  */
  useEffect(()=>{
   
    registerEventListeners();
    return () => {
      unSubscribeEventListeners();
    };
  }, [eventBus]);

  return (
    <div
      className={`flex items-center justify-between py-4 pl-[30px] pr-[10px] rounded-bl-[50px] z-10 ${backgroundClass ? backgroundClass : "bg-[#c41230]"}`} id="headerComponent"
    >

      {
        multimediaStatus &&
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={deleteMultimodalPopUp} className="text-white hover:bg-white/10 ">
            <ArrowLeft data-props="header-hidden" />
          </Button>
        </div>
      }

      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-white text-[25px]">My Kit-Ai</h2>
        <img src="/img/AIPng.png" className="w-10 h-10 rounded-full border-[2px] border-[#ffffff]"></img>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMinimize} className="text-white hover:bg-white/10 ">
          <ChevronDown data-props="header-minimized" />
        </Button>
        <Button variant="ghost" size="icon" data-props="header-closeChat" onClick={onClose} className="text-white hover:bg-white/10">
          <X />
        </Button>
      </div>
    </div>
  )
}