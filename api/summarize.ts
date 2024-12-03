import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

type RequestBody = {
  interests: string;
  notInterests: string;
  stringifiedPosts: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const body = <RequestBody>JSON.parse(req.body!);
  if (!body || !body.stringifiedPosts) {
    return res.status(400).json({
      error: "Invalid request body",
    });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You will be provided a list of posts. Filter out not relevant posts. List ALL relevant posts. Each post item should have a brief 5-8 words description mentioning its author in the begining and list of related post ids.
        User preferences:
        \nInterests: ${body.interests}
        \nNot interests: ${body.notInterests}
        `,
      },
      { role: "user", content: body.stringifiedPosts },
    ],
    response_format: zodResponseFormat(
      z.object({
        items: z.array(
          z.object({
            description: z.string(),
            relatedPostsIds: z.array(z.string()),
          })
        ),
      }),
      "summary_from_posts"
    ),
  });

  const response = completion.choices[0].message.parsed;

  return res.status(200).json({ response });
}
