import { Metadata } from "next";
import PreviewWrapper from "@/app/components/PreviewWrapper";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Toy Boy Experience | ${id}`,
    description: "A personalized digital action figure experience just for you.",
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  // Fetch the experience from Supabase
  const { data: experience, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !experience) {
    console.error("Error fetching experience:", error);
    return notFound();
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <PreviewWrapper code={experience.code} />
    </main>
  );
}

