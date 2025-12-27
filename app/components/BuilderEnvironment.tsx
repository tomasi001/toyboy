"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Code, Loader2, Rocket, Check, Copy, ExternalLink } from "lucide-react";
import PreviewWrapper from "./PreviewWrapper";

interface BuilderEnvironmentProps {
  generatedCode: string;
  onIterate: (message: string) => Promise<void>;
  isGenerating: boolean;
}

export default function BuilderEnvironment({
  generatedCode,
  onIterate,
  isGenerating,
}: BuilderEnvironmentProps) {
  const [iterationInput, setIterationInput] = useState("");
  const [isIterating, setIsIterating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleIterate = async () => {
    if (!iterationInput.trim() || isIterating) return;

    setIsIterating(true);
    try {
      await onIterate(iterationInput.trim());
      setIterationInput("");
    } catch (error) {
      console.error("Error iterating:", error);
    } finally {
      setIsIterating(false);
    }
  };

  const handleDeploy = async () => {
    if (isDeploying || !generatedCode) return;

    setIsDeploying(true);
    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: generatedCode }),
      });

      if (!response.ok) throw new Error("Failed to deploy");

      const data = await response.json();
      setShareUrl(data.url);
    } catch (error) {
      console.error("Error deploying:", error);
      alert("Failed to create share link. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleIterate();
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left: Iteration Chat */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-80 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Refine Your Experience
            </h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Ask for changes and watch it update live
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium mb-1">💡 Try saying:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>&quot;Make it more pink&quot;</li>
              <li>&quot;Add more sparkles&quot;</li>
              <li>&quot;Make the avatar bigger&quot;</li>
              <li>&quot;Change the theme to cyberpunk&quot;</li>
            </ul>
          </div>

          {!shareUrl ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeploy}
              disabled={isDeploying || isGenerating}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-3 px-4 text-sm font-semibold shadow-lg disabled:opacity-50"
            >
              {isDeploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isDeploying ? "Preparing link..." : "Deploy & Get Share Link"}
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border-2 border-green-500 bg-green-500/10 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-bold text-sm">Experience Live!</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Your Toy Boy is ready to be shared with your loved one.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-zinc-900 text-white py-2 px-3 text-xs font-medium"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 p-2"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <button
                onClick={() => setShareUrl(null)}
                className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                Continue editing
              </button>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
          <div className="flex gap-2">
            <input
              type="text"
              value={iterationInput}
              onChange={(e) => setIterationInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Make it more pink..."
              disabled={isIterating || isGenerating}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleIterate}
              disabled={!iterationInput.trim() || isIterating || isGenerating}
              className="flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIterating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Code className="h-4 w-4" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Right: Preview */}
      <div className="flex-1 relative h-full overflow-hidden">
        {isGenerating ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-zinc-400 text-sm">
                Generating your experience...
              </p>
            </motion.div>
          </div>
        ) : generatedCode ? (
          <div className="h-full w-full">
            <PreviewWrapper code={generatedCode} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-zinc-900 text-zinc-400">
            <p>No code generated yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
