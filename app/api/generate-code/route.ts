import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_GENAI_API_KEY || "",
});

// Skeleton Prompt: Generates a production-ready React component
const SKELETON_PROMPT = `You are an expert React developer creating a high-end, premium "Toy Boy" digital action figure experience.
Generate a single, production-ready App.tsx file that implements the "Orbital Designer Toy" aesthetic.

=== DESIGN SYSTEM (The Gemini Style) ===
- Theme: "Designer Toy / Premium Collectible" (high-gloss, vinyl textures, cinematic lighting).
- Background: Use PRIMARY_BG_HEX (default to dark #0A0A0A) with a radial-gradient(circle at 50% 50%, accent-color-alpha 0%, transparent 70%).
- Background Schematic: Include an absolute inset-0 pointer-events-none div with an <svg> grid pattern (100x100 grid with small circles at intersections, opacity-10).
- Accents: Use ACCENT_1_HEX (default neon yellow #FFEB3B) for borders and glows.
- Typography: Headers should be italic, uppercase, font-black, with tracking-tighter and a text-shadow glow.

=== ARCHITECTURE ===
- SCHEMA_DATA: Define a constant at the top containing all values from the provided JSON.
- Modal Component: 
  - AnimatePresence with backdrop-blur-xl and bg-black/80.
  - Inner Container: bg-[#1a3329] or similar dark tone, border-2 (ACCENT_1), rounded-2xl, with a holographic glowing line at the top.
- OrbitButton Component:
  - Absolute positioning in an orbital pattern around the center.
  - Circular (w-28 h-28 to w-36 h-36), border-2, bg-black/40 backdrop-blur-md.
  - Hover: scale 1.1, border color brightness increase, and a glow shadow.
  - Include a decorative pulsing ring behind the icon.

=== PAGE LAYOUT ===
1. Header: Centered at the top, big italicized title, small tracking-heavy theme description below it.
2. Status Bar: Centered glassmorphism pill (bg-black/30 border-white/10) with pulsing status text.
3. Central Hub:
   - A large Squircle/Rounded-Square frame (rounded-[40px], border-4, intense glow).
   - Content: A large emoji avatar with a drop-shadow glow.
   - Effect: An absolute "Scanning Line" that moves top-to-bottom repeatedly.
   - The 4 OrbitButtons positioned at -top-12, -bottom-12, -left-16, and -right-16 relative to this hub.
4. Footer: Tiny tracking-heavy text (e.g., "WORKSHOP V.2.5 // HANDCRAFTED BY [CREATOR_NAME]").

=== UX & LOGIC ===
- handleAction:
  - Trigger "TRANSMITTING..." state with a spinner.
  - POST to '/api/webhook-proxy' using the provided fetch pattern.
  - On success: Close modal and show a full-screen AnimatePresence overlay.
  - Success Overlay: bg matching theme, a large emoji (🚀), "COMMAND ENGAGED" text, and a massive background pulsing ring.
- Range Input: Custom styled webkit-slider-thumb with a neon glow.

=== CRITICAL RULES ===
- Use Tailwind CSS 4 and Framer Motion.
- DO NOT import any external CSS files (e.g., no 'import "./App.css"'). All styling must be via Tailwind classes.
- NEVER use inline SVG data URLs in style objects. Use inline <svg> components for patterns.
- Webhook Integration:
    const apiUrl = typeof window !== 'undefined' ? \`\${window.location.origin}/api/webhook-proxy\` : '/api/webhook-proxy';
    fetch(apiUrl, { ... });
- Generate ONLY the code, no markdown, no explanations.

JSON Schema for customization:
`;

export async function POST(request: NextRequest) {
  try {
    const provider = process.env.MODEL_PROVIDER || "GOOGLE";

    if (provider === "GOOGLE" && !process.env.GOOGLE_GENAI_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_GENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    if (provider === "OPEN_AI" && !process.env.OPENAI_GENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_GENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { jsonSchema } = body;

    if (!jsonSchema || typeof jsonSchema !== "object") {
      return NextResponse.json(
        { error: "JSON schema is required and must be an object" },
        { status: 400 }
      );
    }

    const fullPrompt = `${SKELETON_PROMPT}\n\n${JSON.stringify(
      jsonSchema,
      null,
      2
    )}\n\nGenerate the complete App.tsx code. Return ONLY the code, no markdown, no explanations, no code blocks. Start directly with "import" or "export".`;

    let code: string = "";

    if (provider === "OPEN_AI") {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content:
              "You are an expert React developer. Respond with code only.",
          },
          { role: "user", content: fullPrompt },
        ],
      });
      code = completion.choices[0].message.content || "";
    } else {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      code = response.text();
    }

    code = code.trim();
    
    // Robust cleaning: remove triple backtick blocks with any language label
    const codeBlockRegex = /^```(?:tsx|ts|typescript|javascript|js)?\n?([\s\S]*?)\n?```$/i;
    const match = code.match(codeBlockRegex);
    if (match) {
      code = match[1];
    } else {
      // If it doesn't match the full block regex, try to just strip the start and end ticks
      code = code.replace(/^```(?:tsx|ts|typescript|javascript|js)?\n?/i, "");
      code = code.replace(/\n?```$/i, "");
    }

    // Sometimes models prepend a label even without backticks or with spaces
    code = code.trim();
    const leadingLabels = /^(?:typescript|tsx|javascript|js|ts)\s+/i;
    code = code.replace(leadingLabels, "");

    code = code.trim();

    code = code.replace(
      /https:\/\/connorjoejoseph\.app\.n8n\.cloud\/webhook-test\/[^\s"']+/g,
      "/api/webhook-proxy"
    );

    if (!code.includes("/api/webhook-proxy")) {
      code = code.replace(
        /fetch\(['"](https?:\/\/[^'"]+)['"]/g,
        (match, url) => {
          if (url.includes("connorjoejoseph.app.n8n.cloud")) {
            return `fetch('/api/webhook-proxy'`;
          }
          return match;
        }
      );
    }

    code = code.replace(
      /backgroundImage:\s*`url\(["']data:image\/svg\+xml[^`]+["']\)`/g,
      "backgroundImage: 'none'"
    );

    code = code.replace(
      /backgroundImage:\s*["']url\(["']data:image\/svg\+xml[^"']+["']\)["']/g,
      "backgroundImage: 'none'"
    );

    code = code.replace(/,\s*['"]\s*$/gm, "");

    code = code.replace(/style=\{\{([^}]+)\}\}/g, (match, content) => {
      const singleQuotes = (content.match(/'/g) || []).length;
      const doubleQuotes = (content.match(/"/g) || []).length;
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        return `style={{${content.replace(
          /backgroundImage:\s*[^,}]+/g,
          "backgroundImage: 'none'"
        )}}}`;
      }
      return match;
    });

    // Remove any hallucinated CSS imports that Sandpack can't find
    code = code.replace(/import\s+['"]\.\/App\.css['"];?\n?/g, "");
    code = code.replace(/import\s+['"]\.\/styles\.css['"];?\n?/g, "");
    code = code.replace(/import\s+['"]globals\.css['"];?\n?/g, "");

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error in generate-code route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
