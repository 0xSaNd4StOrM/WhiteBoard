
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Bot, MessageCircle, Send } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import type { WindowItem } from '@/lib/types';
import { generateScriptFromContext } from '@/ai/flows/generate-script-from-context';

type Message = {
  role: 'user' | 'ai';
  content: string;
};

interface AiChatWindowProps {
    item: WindowItem;
    items: WindowItem[];
}

export function AiChatWindow({ item, items }: AiChatWindowProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newUserMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, newUserMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
        const connectedWindowIds = item.connections.map(conn => conn.to);
        const connectedItems = items.filter(i => connectedWindowIds.includes(i.id));
        
        const context = connectedItems.map(i => {
            let content = '';
            if (i.type === 'doc') {
                try {
                    const parsedDocs = JSON.parse(i.content);
                    if (Array.isArray(parsedDocs)) {
                        content = parsedDocs.map((doc: {name: string, content: string}) => `Document: ${doc.name}\n${doc.content}`).join('\n\n');
                    }
                } catch {
                    content = i.content;
                }
            } else {
               content = i.content;
            }
            return `## ${i.title} (${i.type})\n${content}`;
        }).join('\n\n---\n\n');
        
        const result = await generateScriptFromContext({
            prompt: currentInput,
            context: context
        });

        const aiResponse: Message = { role: 'ai', content: result.script };
        setMessages((prev) => [...prev, aiResponse]);

    } catch (error) {
        console.error('Error generating script:', error);
        toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: 'Failed to get a response from the AI. Please try again.',
        });
        const aiErrorResponse: Message = { role: 'ai', content: "Sorry, I couldn't process that request." };
        setMessages((prev) => [...prev, aiErrorResponse]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
       <ScrollArea className="flex-grow" viewportRef={scrollViewportRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 gap-4">
                    <MessageCircle className="h-10 w-10" />
                    <p>Start a conversation with the AI assistant.</p>
                </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 items-start ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'ai' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-body">{message.content}</pre>
                </div>
              </div>
            ))}
             {isLoading && (
              <div className="flex justify-start gap-3 items-start">
                <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t bg-background p-2">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow resize-none border-0 shadow-none focus-visible:ring-0"
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                        }
                    }}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    </div>
  );
}
