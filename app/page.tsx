"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CupidChat from "./components/CupidChat";
import BuilderEnvironment from "./components/BuilderEnvironment";

type AppState = "chatting" | "generating" | "editing";

export default function Home() {
  const [state, setState] = useState<AppState>("chatting");
  const [transcript, setTranscript] = useState<string>("");
  const [jsonSchema, setJsonSchema] = useState<Record<string, unknown> | null>(
    null
  );
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedState = localStorage.getItem("toy-boy-state");
    const savedJsonSchema = localStorage.getItem("toy-boy-json-schema");
    const savedCode = localStorage.getItem("toy-boy-generated-code");
    const savedTranscript = localStorage.getItem("toy-boy-transcript");

    if (savedState && (savedCode || savedJsonSchema)) {
      // Restore state if we have saved data
      if (savedJsonSchema) {
        try {
          setJsonSchema(JSON.parse(savedJsonSchema));
        } catch (e) {
          console.error("Failed to parse saved JSON schema:", e);
        }
      }
      if (savedCode) {
        setGeneratedCode(savedCode);
      }
      if (savedTranscript) {
        setTranscript(savedTranscript);
      }
      // Only restore to editing if we have code
      if (savedCode) {
        setState("editing");
      } else if (savedJsonSchema) {
        // If we have schema but no code, generate it
        generateCodeFromSchema(JSON.parse(savedJsonSchema));
      }
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state === "editing") {
        // Optional: handle escape to exit full screen or something
      }
    });
    return () => {};
  }, [state]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("toy-boy-state", state);
    localStorage.setItem("toy-boy-transcript", transcript || "");
    localStorage.setItem("toy-boy-generated-code", generatedCode || "");

    if (jsonSchema) {
      localStorage.setItem("toy-boy-json-schema", JSON.stringify(jsonSchema));
    } else {
      localStorage.removeItem("toy-boy-json-schema");
    }
  }, [jsonSchema, generatedCode, transcript, state]);

  const generateCodeFromSchema = async (schema: Record<string, unknown>) => {
    setState("generating");
    setIsGenerating(true);

    try {
      const generateResponse = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonSchema: schema }),
      });

      if (!generateResponse.ok) {
        throw new Error("Failed to generate code");
      }

      const { code } = await generateResponse.json();
      setGeneratedCode(code);
      setState("editing");
    } catch (error) {
      console.error("Error generating code:", error);
      alert("Failed to generate code. Check console for details.");
      setState("chatting");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatComplete = async (chatTranscript: string) => {
    setTranscript(chatTranscript);
    setState("generating");
    setIsGenerating(true);

    try {
      // Step 1: Translate transcript to JSON schema
      const translateResponse = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: chatTranscript }),
      });

      if (!translateResponse.ok) {
        throw new Error("Failed to translate transcript");
      }

      const schema = await translateResponse.json();
      setJsonSchema(schema);

      // Step 2: Generate code from JSON schema
      await generateCodeFromSchema(schema);
    } catch (error) {
      console.error("Error generating experience:", error);
      // Reset to chatting on error
      setState("chatting");
      alert("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleIterate = async (message: string) => {
    if (!jsonSchema) return;

    setIsGenerating(true);

    try {
      // Update the JSON schema based on the iteration request
      // For simplicity, we'll append the iteration to the original transcript
      // and regenerate, or we could create a dedicated iteration endpoint
      const updatedTranscript = `${transcript}\n\nIteration request: ${message}`;

      const translateResponse = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: updatedTranscript }),
      });

      if (!translateResponse.ok) throw new Error("Failed to update schema");

      const updatedSchema = await translateResponse.json();
      setJsonSchema(updatedSchema);

      await generateCodeFromSchema(updatedSchema);
    } catch (error) {
      console.error("Error iterating:", error);
      alert("Failed to apply changes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearSavedState = () => {
    localStorage.removeItem("toy-boy-state");
    localStorage.removeItem("toy-boy-json-schema");
    localStorage.removeItem("toy-boy-generated-code");
    localStorage.removeItem("toy-boy-transcript");
    setState("chatting");
    setTranscript("");
    setJsonSchema(null);
    setGeneratedCode("");
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* App Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {(state === "editing" || state === "generating" || generatedCode) && (
          <button
            onClick={clearSavedState}
            className="px-4 py-2 text-sm bg-zinc-900/80 backdrop-blur-md text-white border border-white/10 rounded-full hover:bg-zinc-800 transition-all font-medium flex items-center gap-2"
            title="Start a new creation"
          >
            <span className="text-xs">↺</span> Start New
          </button>
        )}
      </div>
      <AnimatePresence mode="wait">
        {state === "chatting" && (
          <motion.div
            key="chatting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            <CupidChat onComplete={handleChatComplete} />
          </motion.div>
        )}

        {state === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full w-full flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6"
              />
              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white mb-2"
              >
                Creating Your Magic ✨
              </motion.h2>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-lg"
              >
                This will just take a moment...
              </motion.p>
            </div>
          </motion.div>
        )}

        {state === "editing" && (
          <motion.div
            key="editing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            <BuilderEnvironment
              generatedCode={generatedCode}
              onIterate={handleIterate}
              isGenerating={isGenerating}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
