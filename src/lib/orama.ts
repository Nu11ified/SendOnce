import { create, insert, search, save, load, type AnyOrama } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { db } from "@/server/db";
import { getEmbeddings } from "@/lib/embeddings";

export class OramaManager {
    private orama!: AnyOrama;
    private accountId: string;
    private isInitialized: boolean = false;

    constructor(accountId: string) {
        this.accountId = accountId;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const account = await db.account.findUnique({
                where: { id: this.accountId },
                select: { binaryIndex: true }
            });

            if (!account) throw new Error('Account not found');

            if (account.binaryIndex) {
                try {
                    this.orama = await restore('json', account.binaryIndex as any);
                } catch (error) {
                    console.error('Error restoring index, creating new one:', error);
                    await this.createNewIndex();
                }
            } else {
                await this.createNewIndex();
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing Orama:', error);
            throw error;
        }
    }

    private async createNewIndex() {
        this.orama = await create({
            schema: {
                title: "string",
                body: "string",
                rawBody: "string",
                from: 'string',
                to: 'string[]',
                sentAt: 'string',
                embeddings: 'vector[1536]',
                threadId: 'string'
            },
        });
    }

    async insert(document: any) {
        try {
            await this.initialize();
            await insert(this.orama, document);
            await this.saveIndex();
        } catch (error) {
            console.error('Error inserting document:', error);
            throw error;
        }
    }

    async vectorSearch({ prompt, numResults = 10 }: { prompt: string, numResults?: number }) {
        try {
            await this.initialize();
            const embeddings = await getEmbeddings(prompt);
            
            // First try hybrid search
            let results = await search(this.orama, {
                mode: 'hybrid',
                term: prompt,
                vector: {
                    value: embeddings,
                    property: 'embeddings'
                },
                similarity: 0.65, // Lower threshold for better recall
                limit: numResults,
                hybridWeights: {
                    text: 0.3,    // Give less weight to exact text matches
                    vector: 0.7   // Give more weight to semantic similarity
                }
            });

            // If no results, try text-only search
            if (results.hits.length === 0) {
                results = await search(this.orama, {
                    term: prompt,
                    limit: numResults,
                    properties: ['title', 'body', 'from', 'to'],
                    tolerance: 2 // Allow for some typos
                });
            }

            return results;
        } catch (error) {
            console.error('Error performing vector search:', error);
            
            // Fallback to basic text search if vector search fails
            try {
                return await this.search({ term: prompt });
            } catch (fallbackError) {
                console.error('Error in fallback search:', fallbackError);
                throw error; // Throw the original error
            }
        }
    }

    async search({ term }: { term: string }) {
        try {
            await this.initialize();
            return await search(this.orama, {
                term,
                limit: 20,
                properties: ['title', 'body', 'from', 'to'],
                tolerance: 2 // Allow for some typos
            });
        } catch (error) {
            console.error('Error performing text search:', error);
            throw error;
        }
    }

    async saveIndex() {
        try {
            await this.initialize();
            const index = await persist(this.orama, 'json');
            await db.account.update({
                where: { id: this.accountId },
                data: { binaryIndex: index as Buffer }
            });
        } catch (error) {
            console.error('Error saving index:', error);
            throw error;
        }
    }
}

// Usage example:
async function main() {
    const oramaManager = new OramaManager('67358');
    await oramaManager.initialize();

    // Insert a document
    // const emails = await db.email.findMany({
    //     where: {
    //         thread: { accountId: '67358' }
    //     },
    //     select: {
    //         subject: true,
    //         bodySnippet: true,
    //         from: { select: { address: true, name: true } },
    //         to: { select: { address: true, name: true } },
    //         sentAt: true,
    //     },
    //     take: 100
    // })
    // await Promise.all(emails.map(async email => {
    //     // const bodyEmbedding = await getEmbeddings(email.bodySnippet || '');
    //     // console.log(bodyEmbedding)
    //     await oramaManager.insert({
    //         title: email.subject,
    //         body: email.bodySnippet,
    //         from: `${email.from.name} <${email.from.address}>`,
    //         to: email.to.map(t => `${t.name} <${t.address}>`),
    //         sentAt: email.sentAt.getTime(),
    //         // bodyEmbedding: bodyEmbedding,
    //     })
    // }))


    // Search
    const searchResults = await oramaManager.search({
        term: "cascading",
    });

    console.log(searchResults.hits.map((hit) => hit.document));
}

// main().catch(console.error);
