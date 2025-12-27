import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || "");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_GENAI_API_KEY || "",
});

// Data points to extract about the SENDER
const DATA_POINTS = [
  "recipient name",
  "sender name",
  "sender vibe/personality",
  "sender visual aesthetic/style",
  "sender color preferences",
  "sender interests/hobbies",
  "inside jokes shared with recipient",
  "card environment theme",
  "avatar rendering style",
  "status message for recipient",
];

const COMPLETION_CHECK_PROMPT = `Based on the conversation, have we gathered enough information to create a personalized digital action figure? 

We need: ${DATA_POINTS.join(", ")}.

Respond with JSON only:
{
  "hasEnoughInfo": true/false,
  "missingPoints": ["list of missing data points if any"]
}`;

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
    const { messages, systemInstruction } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const systemPrompt =
      systemInstruction || "You are Cupid, a witty and charming AI agent.";
    let responseText: string = "";

    if (provider === "OPEN_AI") {
      const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; parts: { text: string }[] }) => ({
            role: (m.role === "model" ? "assistant" : m.role) as
              | "user"
              | "assistant"
              | "system",
            content: m.parts[0].text,
          })),
        ];

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: openaiMessages,
      });

      responseText = completion.choices[0].message.content || "";
    } else {
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash",
        systemInstruction: systemPrompt,
      });

      const userMessage = messages[messages.length - 1];
      const historyMessages = messages.slice(0, -1);

      let filteredHistory = historyMessages;
      while (
        filteredHistory.length > 0 &&
        filteredHistory[0].role === "model"
      ) {
        filteredHistory = filteredHistory.slice(1);
      }

      if (filteredHistory.length > 0 && filteredHistory[0].role === "user") {
        const chat = model.startChat({
          history: filteredHistory.map(
            (msg: { role: string; parts: { text: string }[] }) => ({
              role: msg.role,
              parts: msg.parts,
            })
          ),
        });

        const result = await chat.sendMessage(userMessage.parts[0].text);
        const response = await result.response;
        responseText = response.text();
      } else {
        const prompt = userMessage.parts[0].text;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        responseText = response.text();
      }
    }

    // Check if we have enough info
    const checkPrompt = `${COMPLETION_CHECK_PROMPT}\n\nConversation:\n${messages
      .map(
        (m: { role: string; parts: { text: string }[] }) =>
          `${m.role === "user" ? "User" : "Cupid"}: ${m.parts[0].text}`
      )
      .join("\n")}\n\nCupid: ${responseText}`;

    let checkText: string = "";

    if (provider === "OPEN_AI") {
      const checkCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: checkPrompt }],
        response_format: { type: "json_object" },
      });
      checkText = checkCompletion.choices[0].message.content || "";
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });
      const checkResult = await model.generateContent(checkPrompt);
      const checkResponse = await checkResult.response;
      checkText = checkResponse.text().trim();
    }

    checkText = checkText.trim();

    // Robust cleaning: remove triple backtick blocks with any language label
    const jsonBlockRegex = /^```(?:json)?\n?([\s\S]*?)\n?```$/i;
    const match = checkText.match(jsonBlockRegex);
    if (match) {
      checkText = match[1];
    } else {
      // If it doesn't match the full block regex, try to just strip the start and end ticks
      checkText = checkText.replace(/^```(?:json)?\n?/i, "");
      checkText = checkText.replace(/\n?```$/i, "");
    }

    checkText = checkText.trim();

    let completionCheck;
    try {
      completionCheck = JSON.parse(checkText);
    } catch {
      completionCheck = { hasEnoughInfo: false, missingPoints: [] };
    }

    return NextResponse.json({
      response: responseText,
      isComplete: completionCheck.hasEnoughInfo || false,
    });
  } catch (error) {
    console.error("Error in cupid-chat route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
