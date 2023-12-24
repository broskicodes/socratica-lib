import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
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
  const { url } = await req.json();

  // const data = readFileSync(path.join(process.cwd(), 'public', 'papers-links.csv')).toString('utf-8');

  // let i = 78;
  // const urls = data.split('\n').slice(i);

  // console.log(urls[0]);
  // return new Response('ok', { status: 200 });

  // for (const url of urls) {
    // console.log(i);
    // i += 1;

    const { data, error } = await supabase
      .from('urls')
      .select('url')
      .eq('url', url);

    if (error) {
      return new Response('Error accessing database', { status: 500 });
    }

    if (data && data.length > 0) {
      return new Response('Resource already listed in db', { status: 400 });
    }
    
    const res = await fetch(url, {
      method: 'GET',
    });

    const rgx = /^(application\/pdf|text\/plain|text\/markdown)$/;
    const mimeType = res.headers.get('content-type')?.split(';')[0];

    if (!mimeType || !rgx.test(mimeType)) {
      return new Response('Unsupported file type. Only pdf, markdown and plaintext are accepted', { status: 400 });
    }

    const file = await openai.files.create({
      file: res,
      purpose: 'assistants'
    });

    let run = await openai.beta.threads.createAndRun({
      assistant_id: assistant_id,
      thread: {
        messages: [
          {
            role: "user",
            content: "please index this file",
            file_ids: [file.id]
          }
        ]
      }
    });

    run = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
    while (true) {
      const status = run.status;
      // console.log(status);

      if (status === 'requires_action') {
        const tool_outputs = await Promise.all(run.required_action!.submit_tool_outputs.tool_calls.map(async (call) => {
          switch (call.function.name) {
            case 'index_file': {
              const args = JSON.parse(call.function.arguments);

              const embed = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: args.summary,
              });

              const { data, error } = await supabase
                .from('urls')
                .insert([{
                  oai_file_id: file.id,
                  url: url,
                  name: args.name,
                  authors: args.authors,
                  summary: args.summary,
                  tags: args.tags,
                  sum_embed: embed.data[0].embedding,
                }])
                .select();

              // console.log(data, error);

              return {
                tool_call_id: call.id,
                output: !error ? "file has been successfully logged in the database." : "failed"
              }
            }
            default:
              return {
                tool_call_id: call.id,
                output: "failed"
              }
          }
        }));

        run = await openai.beta.threads.runs.submitToolOutputs(run.thread_id, run.id, {
          tool_outputs: tool_outputs
        });
      } else if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'expired') {
        console.log(status);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before polling again
      run = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
    }
  // }


  return new Response('ok', { status: 200 });
}