import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MAX_ATTACHMENT_SIZE, MAX_TOTAL_ATTACHMENTS_SIZE, ALLOWED_ATTACHMENT_TYPES } from "@/app/constants";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const files = formData.getAll('files') as File[];

        // Validate total size
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        if (totalSize > MAX_TOTAL_ATTACHMENTS_SIZE) {
            return NextResponse.json({
                error: "Total attachments size exceeds limit",
                limit: MAX_TOTAL_ATTACHMENTS_SIZE
            }, { status: 400 });
        }

        // Validate individual files
        const validationErrors = [];
        for (const file of files) {
            // Check file size
            if (file.size > MAX_ATTACHMENT_SIZE) {
                validationErrors.push(`${file.name} exceeds maximum file size`);
                continue;
            }

            // Check file type
            const isAllowedType = ALLOWED_ATTACHMENT_TYPES.some(type => {
                if (type.endsWith('/*')) {
                    const baseType = type.split('/')[0];
                    return file.type.startsWith(baseType + '/');
                }
                return file.type === type;
            });

            if (!isAllowedType) {
                validationErrors.push(`${file.name} has unsupported file type`);
            }
        }

        if (validationErrors.length > 0) {
            return NextResponse.json({ errors: validationErrors }, { status: 400 });
        }

        // Process files for email attachment
        const attachments = await Promise.all(
            files.map(async (file) => {
                const arrayBuffer = await file.arrayBuffer();
                const base64Content = Buffer.from(arrayBuffer).toString('base64');
                
                return {
                    fileName: file.name,
                    contentType: file.type,
                    size: file.size,
                    content: base64Content,
                    inline: false
                };
            })
        );

        // Return the processed attachments to be used when sending email via Aurinko
        return NextResponse.json({ 
            attachments,
            totalSize,
            fileCount: files.length
        });
    } catch (error) {
        console.error('Error handling file upload:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
} 