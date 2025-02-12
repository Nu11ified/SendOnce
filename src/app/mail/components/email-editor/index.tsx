"use client";
import GhostExtension from "./extension";
import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import TipTapMenuBar from "./menu-bar";
import Text from "@tiptap/extension-text";
import { Button } from "@/components/ui/button";
import { Paperclip, X, ExternalLink } from "lucide-react";

import { generate } from './action';
import { readStreamableValue } from 'ai/rsc';
import { Separator } from "@/components/ui/separator";
import { useThread } from "../../use-thread";
import useThreads from "../../use-threads";
import { api } from "@/trpc/react";
import { Input } from "@/components/ui/input";
import TagInput from "./tag-input";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useLocalStorage } from "usehooks-ts";
import { Bot } from "lucide-react";
import AIComposeButton from "./ai-compose-button";
import { MAX_ATTACHMENT_SIZE, MAX_TOTAL_ATTACHMENTS_SIZE } from "@/app/constants";

interface Attachment {
    file: File;
    previewUrl?: string;
}

type Option = {
    label: React.ReactNode;
    value: string;
};

type EmailEditorProps = {
    toValues: Option[];
    ccValues: Option[];

    subject: string;
    setSubject: (subject: string) => void;
    to: string[]
    handleSend: (value: string, attachments?: File[]) => void;
    isSending: boolean;

    onToChange: (values: Option[]) => void;
    onCcChange: (values: Option[]) => void;

    defaultToolbarExpand?: boolean;
}

const EmailEditor = ({ toValues, ccValues, subject, setSubject, to, handleSend, isSending, onToChange, onCcChange, defaultToolbarExpand }: EmailEditorProps) => {
    const [ref] = useAutoAnimate();
    const [accountId] = useLocalStorage('accountId', '');
    const { data: suggestions = [] } = api.mail.getEmailSuggestions.useQuery({ accountId: accountId, query: '' }, { enabled: !!accountId });
    const [expanded, setExpanded] = React.useState(defaultToolbarExpand ?? false);
    const [generation, setGeneration] = React.useState('');
    const [attachments, setAttachments] = React.useState<Attachment[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [value, setValue] = React.useState('');

    const customText = Text.extend({
        addKeyboardShortcuts() {
            return {
                "Meta-j": () => {
                    aiGenerate(this.editor.getText());
                    return true;
                },
            };
        },
    });

    const editor = useEditor({
        autofocus: false,
        extensions: [StarterKit, customText, GhostExtension],
        editorProps: {
            attributes: {
                placeholder: "Write your email here...",
                class: 'prose max-w-none p-4 focus:outline-none min-h-[200px]'
            }
        },
        onUpdate: ({ editor }) => {
            setValue(editor.getHTML())
        }
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const newAttachments: Attachment[] = [];
        let totalSize = attachments.reduce((acc, att) => acc + att.file.size, 0);

        files.forEach(file => {
            totalSize += file.size;
            if (totalSize > MAX_TOTAL_ATTACHMENTS_SIZE) {
                alert('Total attachments size exceeds limit');
                return;
            }
            if (file.size > MAX_ATTACHMENT_SIZE) {
                alert(`File ${file.name} exceeds maximum size limit`);
                return;
            }

            const attachment: Attachment = { file };
            if (file.type.startsWith('image/')) {
                attachment.previewUrl = URL.createObjectURL(file);
            }
            newAttachments.push(attachment);
        });

        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => {
            const newAttachments = [...prev];
            const attachment = newAttachments[index];
            if (attachment?.previewUrl) {
                URL.revokeObjectURL(attachment.previewUrl);
            }
            newAttachments.splice(index, 1);
            return newAttachments;
        });
    };

    const previewAttachment = (attachment: Attachment) => {
        if (attachment.previewUrl) {
            window.open(attachment.previewUrl, '_blank');
        } else {
            // For non-image files, create a temporary URL for preview
            const url = URL.createObjectURL(attachment.file);
            window.open(url, '_blank');
            // Clean up the temporary URL after opening
            URL.revokeObjectURL(url);
        }
    };

    const aiGenerate = async (prompt: string) => {
        const { output } = await generate(prompt)

        for await (const delta of readStreamableValue(output)) {
            if (delta) {
                setGeneration(delta);
            }
        }

    }

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && editor && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
                editor.commands.focus();
            }
            if (event.key === 'Escape' && editor) {
                editor.commands.blur();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [editor]);

    React.useEffect(() => {
        if (!generation || !editor) return;
        editor.commands.insertContent(generation)
    }, [generation, editor]);

    return (
        <div>
            <div className="flex p-4 py-2 border-b">
                {editor && <TipTapMenuBar editor={editor} />}
            </div>

            <div ref={ref} className="p-4 pb-0 space-y-2">
                {expanded && (
                    <>
                        <TagInput 
                            suggestions={suggestions.map(s => s.address)} 
                            value={toValues} 
                            placeholder="Add tags" 
                            label="To" 
                            onChange={onToChange} 
                        />
                        <TagInput 
                            suggestions={suggestions.map(s => s.address)} 
                            value={ccValues} 
                            placeholder="Add tags" 
                            label="Cc" 
                            onChange={onCcChange} 
                        />
                        <Input 
                            id="subject" 
                            className="w-full" 
                            placeholder="Subject" 
                            value={subject} 
                            onChange={e => setSubject(e.target.value)} 
                        />
                    </>
                )}
                <div className="flex items-center gap-2">
                    <div className="cursor-pointer" onClick={() => setExpanded(e => !e)}>
                        <span className="text-green-600 font-medium">
                            Draft{' '}
                        </span>
                        <span>
                            to {to.join(', ')}
                        </span>
                    </div>
                    <AIComposeButton
                        isComposing={defaultToolbarExpand}
                        onGenerate={setGeneration}
                    />
                </div>

                {/* File Attachment Section */}
                <div className="flex flex-col gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach Files
                    </Button>

                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
                            {attachments.map((attachment, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 p-2 bg-white rounded border group hover:border-blue-500"
                                >
                                    <span className="text-sm truncate max-w-[200px]">
                                        {attachment.file.name}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => previewAttachment(attachment)}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => removeAttachment(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="prose w-full px-4">
                <EditorContent editor={editor} placeholder="Write your email here..." />
            </div>

            <Separator />
            <div className="py-3 px-4 flex items-center justify-between">
                <span className="text-sm">
                    Tip: Press{" "}
                    <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                        Cmd + J
                    </kbd>{" "}
                    for AI autocomplete
                </span>
                <Button 
                    onClick={async () => { 
                        if (editor) {
                            const content = editor.getHTML();
                            editor.commands.clearContent();
                            await handleSend(content, attachments.map(a => a.file));
                        }
                    }} 
                    disabled={isSending || !to.length}
                >
                    {isSending ? "Sending..." : "Send"}
                </Button>
            </div>
        </div>
    );
};

export default EmailEditor;
