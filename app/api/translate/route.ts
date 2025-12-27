import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_GENAI_API_KEY || "",
});

// Translator Prompt: Converts chat transcripts into structured JSON schema
const TRANSLATOR_PROMPT = `You are a translator that converts conversational chat transcripts into a structured JSON schema for a personalized digital action figure experience.

The key change in this version is that the avatar represents the SENDER (the user), not the recipient.

Extract the following information from the conversation and return ONLY valid JSON (no markdown, no code blocks):

{
  "APP_TITLE": "A creative title for the experience (e.g., 'Tom's Digital Toy Box')",
  "THEME_NAME": "A theme descriptor for the environment (e.g., 'Cyberpunk Workshop', 'Luxury Penthouse')",
  "PRIMARY_BG_HEX": "#hexcolor (main background color based on SENDER preference)",
  "SECONDARY_BG_HEX": "#hexcolor (accent/secondary color)",
  "TEXT_COLOR_HEX": "#hexcolor (primary text color)",
  "VISUAL_MOTIF": "A description of the visual style (e.g., 'Neon grid with floating data bits', 'Warm wood and cozy lighting')",
  "CENTRAL_COMPONENT_ARCHITECTURE": "Description of the avatar's display environment (e.g., 'Floating holographic pedestal', 'Velvet-lined display case')",
  "RECIPIENT_NAME": "The name of the person receiving the card",
  "CREATOR_NAME": "The name of the SENDER (the user who is the subject of the avatar)",
  "VIBE": "The SENDER'S vibe/personality (e.g., 'Adventurous and bold', 'Chill and musical')",
  "INSIDE_JOKES": ["Array of inside jokes or references shared by sender and recipient"],
  "PREFERENCES": {
    "colors": ["array of SENDER'S preferred colors"],
    "aesthetics": ["array of SENDER'S aesthetic preferences"],
    "interests": ["array of SENDER'S interests/hobbies"]
  },
  "STATUS_TEXT": "A playful status message FROM the sender TO the recipient",
  "ACTION_BUTTONS": [
    {
      "label": "Button label (e.g., 'Dress Me', 'Serenade Me', 'Whisper to Me')",
      "action": "action_type",
      "description": "What this button does to/with the sender's avatar"
    }
  ]
}

If any information is missing from the transcript, use creative defaults that match the sender's vibe. Be imaginative and ensure all fields are populated.

Transcript to translate:
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
    const { transcript } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required and must be a string" },
        { status: 400 }
      );
    }

    let jsonText: string = "";

    if (provider === "OPEN_AI") {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content:
              "You are a data extraction expert. Respond with valid JSON only.",
          },
          { role: "user", content: `${TRANSLATOR_PROMPT}\n\n${transcript}` },
        ],
        response_format: { type: "json_object" },
      });
      jsonText = completion.choices[0].message.content || "";
    } else {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });
      const fullPrompt = `${TRANSLATOR_PROMPT}\n\n${transcript}\n\nReturn ONLY the JSON object, no additional text.`;
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      jsonText = response.text();
    }

    jsonText = jsonText.trim();

    // Robust cleaning: remove triple backtick blocks with any language label
    const jsonBlockRegex = /^```(?:json)?\n?([\s\S]*?)\n?```$/i;
    const match = jsonText.match(jsonBlockRegex);
    if (match) {
      jsonText = match[1];
    } else {
      // If it doesn't match the full block regex, try to just strip the start and end ticks
      jsonText = jsonText.replace(/^```(?:json)?\n?/i, "");
      jsonText = jsonText.replace(/\n?```$/i, "");
    }

    jsonText = jsonText.trim();

    const jsonSchema = JSON.parse(jsonText);
    return NextResponse.json(jsonSchema);
  } catch (error) {
    console.error("Error in translate route:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Failed to parse JSON response from AI model",
          details: error.message,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
