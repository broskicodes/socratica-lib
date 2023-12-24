import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createReadStream, readFileSync, unlinkSync, write, writeFileSync } from "fs";
import path from "path";

const assistant_id = "asst_LKgMgwb92JKYwTdhYpVOIMIA";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_API_KEY as string
);

export async function POST(req: Request) {
  const { query } = await req.json();

  const embed = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });

  const { data } = await supabase.rpc('match_documents', {
    query_embedding: embed.data[0].embedding, // Pass the embedding you want to compare
    match_count: 5, // Choose the number of matches
  })

  return new Response(JSON.stringify(data), { status: 200 });
}