import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { code, jsonSchema } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    // Generate a unique ID for the shareable link (though Supabase can do this too)
    const shareId = uuidv4();

    // Insert into Supabase
    const { data, error } = await supabase
      .from('experiences')
      .insert([
        { 
          id: shareId, 
          code: code, 
          json_schema: jsonSchema 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(`Failed to save experience: ${error.message}`);
    }

    console.log(`Deployed experience with ID: ${shareId}`);

    return NextResponse.json({ 
      success: true, 
      id: shareId,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/share/${shareId}`
    });
  } catch (error) {
    console.error("Error in deploy route:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

