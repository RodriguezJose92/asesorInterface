export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] p-3 rounded-2xl bg-white/70 border border-white/30">

        <div className="flex items-center space-x-1 gap-[10px]">

          <img src="/img/AIPng.png" className="w-7 h-7 rounded-full object-cover bg-[#c41230]"></img>

          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>

          {/* <span className="text-xs text-gray-500 ml-2">Escribiendo...</span> */}

        </div>
      </div>
    </div>
  )
}
