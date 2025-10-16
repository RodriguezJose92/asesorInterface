import { ChatWidget } from "@/components/chat-widget";

const style = {
  backgroundImage: "url('/img/backgroundMobile.png')",
  backgroundPosition: "center",
  backgroundRepeat: "none",
};

export default function Home() {
  return (
    <div className="h-[100dvh]" style={style}>
      <ChatWidget />
    </div>
  );
}
