import OpenAI from 'openai';
import { streamText } from 'ai';
import { createStreamableValue } from 'ai/rsc';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
    // extract the prompt from the body
    const { prompt } = await req.json();

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
            {
                role: "system",
                content: `You are a helpful AI embedded in a notion text editor app that is used to autocomplete sentences
            The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
        AI is a well-behaved and well-mannered individual.
        AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.`,
            },
            {
                role: "user",
                content: `
        I am writing a piece of text in a notion text editor app.
        Help me complete my train of thought here: ##${prompt}##
        keep the tone of the text consistent with the rest of the text.
        keep the response short and sweet.
        `,
            },
        ],
        stream: true,
    });

    // Convert the response to a proper stream
    return new StreamingTextResponse(OpenAIStream(response as any));
}
