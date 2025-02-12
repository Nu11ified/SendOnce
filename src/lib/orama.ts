import { create, insert, search, save, load, type AnyOrama } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { db } from "@/server/db";
import { getEmbeddings } from "@/lib/embeddings";

export class OramaManager {
    private orama!: AnyOrama;
    private accountId: string;

    constructor(accountId: string) {
        this.accountId = accountId;
    }

    async initialize() {
        try {
            const account = await db.account.findUnique({
                where: { id: this.accountId },
                select: { binaryIndex: true }
            });

            if (!account) throw new Error('Account not found');

            if (account.binaryIndex) {
                console.log('Restoring existing search index');
                this.orama = await restore('json', account.binaryIndex as any);
            } else {
                console.log('Creating new search index');
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
                await this.saveIndex();
            }
        } catch (error) {
            console.error('Failed to initialize search index:', error);
            throw error;
        }
    }

    async insert(document: any) {
        try {
            await insert(this.orama, document);
            await this.saveIndex();
        } catch (error) {
            console.error('Failed to insert document:', error);
            throw error;
        }
    }

    async search({ term }: { term: string }) {
        try {
            console.log('Searching for term:', term);
            const results = await search(this.orama, {
                term,
                properties: ['title', 'body', 'from', 'to'],
                limit: 20,
                tolerance: 2 // More lenient fuzzy matching
            });
            console.log(`Found ${results.hits.length} results`);
            return results;
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }

    async vectorSearch({ prompt, numResults = 10 }: { prompt: string, numResults?: number }) {
        try {
            console.log('Performing vector search for:', prompt);
            const embeddings = await getEmbeddings(prompt);
            const results = await search(this.orama, {
                mode: 'hybrid',
                term: prompt,
                vector: {
                    value: embeddings,
                    property: 'embeddings'
                },
                similarity: 0.70, // More lenient similarity threshold
                limit: numResults,
                hybridWeights: {
                    text: 0.3,
                    vector: 0.7,
                }
            });
            console.log(`Found ${results.hits.length} vector search results`);
            return results;
        } catch (error) {
            console.error('Vector search failed:', error);
            throw error;
        }
    }

    async saveIndex() {
        try {
            console.log('Saving search index');
            const index = await persist(this.orama, 'json');
            await db.account.update({
                where: { id: this.accountId },
                data: { binaryIndex: index as any }
            });
            console.log('Search index saved successfully');
        } catch (error) {
            console.error('Failed to save search index:', error);
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
