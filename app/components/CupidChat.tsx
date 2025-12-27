"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "cupid";
  content: string;
  timestamp: Date;
}

interface CupidChatProps {
  onComplete: (transcript: string) => void;
}

const CUPID_SYSTEM_PROMPT = `You are Cupid, a witty and charming AI agent. You're helping a user create a "Toy Boy" experience—a personalized digital action figure version of THEMSELVES to send to their loved one. 

Your goal is to extract 10 key data points about the SENDER (the user) and their relationship to build this avatar through natural conversation:

1. The recipient's name (the lucky person receiving the card).
2. The sender's name (the user themselves).
3. The sender's vibe/personality (e.g., "cheeky explorer", "moody musician", "playful professional").
4. The sender's visual aesthetic/style (e.g., "high-gloss streetwear", "vintage tailored", "minimalist tech").
5. The sender's preferred color palette (this will theme the entire card).
6. Interests/hobbies that define the sender (to customize the avatar's props or environment).
7. Inside jokes or special references that only the sender and recipient share.
8. Theme preference for the card's environment (e.g., "Neon Space", "Luxury Lounge", "Cyberpunk Workshop").
9. How the sender wants their avatar to look (e.g., "3D Vinyl Toy", "Holographic Glitch", "Painted Portrait").
10. A playful status message for the recipient (e.g., "Awaiting your command", "Currently thinking of you").

Be conversational, flirty, and fun. Don't ask boring form questions - weave them into the conversation naturally. The focus is on capturing the SENDER'S essence so we can turn THEM into a digital toy for their partner.`;

export default function CupidChat({ onComplete }: CupidChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageIdCounter = useRef(0);

  // Initialize on client mount only to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: "initial",
        role: "cupid",
        content:
          "Hey there! 👋 I'm Cupid. I'm going to help you turn yourself into a digital action figure for someone special. Who's the lucky person receiving your 'Toy Boy' version today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (mounted) {
      scrollToBottom();
    }
  }, [messages, mounted]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isComplete || !mounted) return;

    messageIdCounter.current += 1;
    const userMessage: Message = {
      id: `user-${messageIdCounter.current}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call Gemini API directly for chat
      const response = await fetch("/api/cupid-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role === "cupid" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          systemInstruction: CUPID_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      messageIdCounter.current += 1;
      const cupidResponse: Message = {
        id: `cupid-${messageIdCounter.current}`,
        role: "cupid",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, cupidResponse]);

      // Check if Cupid thinks we have enough info
      if (data.isComplete) {
        setIsComplete(true);
        // Generate transcript and call onComplete
        const transcript = [...messages, userMessage, cupidResponse]
          .map((m) => `${m.role === "cupid" ? "Cupid" : "User"}: ${m.content}`)
          .join("\n\n");
        setTimeout(() => onComplete(transcript), 1500);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      messageIdCounter.current += 1;
      const errorMessage: Message = {
        id: `error-${messageIdCounter.current}`,
        role: "cupid",
        content: "Oops! Something went wrong. Let's try that again?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-full flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-zinc-900 dark:via-purple-900 dark:to-indigo-900 items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-zinc-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-pink-200/50 bg-white/80 backdrop-blur-sm dark:border-purple-800/50 dark:bg-zinc-900/80 px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-2xl"
          >
            💘
          </motion.div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Cupid
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {isComplete
                ? "Ready to create magic! ✨"
                : "Gathering the deets..."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white"
                    : "bg-white/90 backdrop-blur-sm text-zinc-900 shadow-lg dark:bg-zinc-800/90 dark:text-zinc-100"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="bg-white/90 backdrop-blur-sm dark:bg-zinc-800/90 rounded-2xl px-4 py-3 shadow-lg"
            >
              <div className="flex gap-1">
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="h-2 w-2 rounded-full bg-pink-500"
                />
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  className="h-2 w-2 rounded-full bg-purple-500"
                />
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  className="h-2 w-2 rounded-full bg-indigo-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t border-pink-200/50 bg-white/80 backdrop-blur-sm dark:border-purple-800/50 dark:bg-zinc-900/80 px-6 py-4"
      >
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isComplete
                ? "Creating your experience..."
                : "Type your message..."
            }
            disabled={isLoading || isComplete}
            className="flex-1 rounded-xl border border-pink-200/50 bg-white/50 px-4 py-3 text-sm placeholder:text-zinc-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/20 dark:border-purple-800/50 dark:bg-zinc-800/50 dark:placeholder:text-zinc-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isComplete}
            className="flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 px-6 py-3 text-white shadow-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
