import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { sendChat } from "../api";
import type { ChatMessage, AnalyzeResponse } from "../types";

interface Props {
  analysisContext?: AnalyzeResponse & { offer_price?: number };
  userId?: string;
}

export default function ChatWidget({ analysisContext, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Realease assistant. Ask me anything about home buying, your report, or what these numbers mean.",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (allMessages: ChatMessage[]) =>
      sendChat({
        messages: allMessages,
        analysis_context: analysisContext
          ? (analysisContext as unknown as Record<string, unknown>)
          : undefined,
        user_id: userId,
      }),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble responding. Please try again." },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || mutation.isPending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");

    // Only send the last 10 messages to keep context window manageable
    const historySlice = updated.filter((m) => m.role !== "assistant" || updated.indexOf(m) > 0);
    mutation.mutate(historySlice.slice(-10));
  }

  return (
    <>
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-tertiary shadow-lg flex items-center justify-center hover:brightness-110 transition"
        >
          <MessageCircle size={24} className="text-base" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] bg-base rounded-2xl border border-base-2 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-base-2 border-b border-base">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-primary text-sm font-semibold">Realease Chat</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-secondary hover:text-primary transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-tertiary/20 text-primary rounded-br-sm"
                      : "bg-base-2 text-secondary rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-base-2 text-secondary px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-base-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your report..."
                className="flex-1 bg-base-2 rounded-xl px-4 py-2.5 text-sm text-primary outline-none placeholder:text-secondary/40 focus:ring-1 focus:ring-tertiary/30"
              />
              <button
                type="submit"
                disabled={!input.trim() || mutation.isPending}
                className="w-9 h-9 rounded-xl bg-tertiary flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition"
              >
                <Send size={16} className="text-base" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
