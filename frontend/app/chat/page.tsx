"use client";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Send,
  MessageSquare,
  Trash2,
  Plus,
  LogOut,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  messages: Message[];
  title: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(
    null
  );
  const [firstLoad, setFirstLoad] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/"); // no session
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!webSocket) {
      initiateWebSocket();
    }

    return () => {
      if (webSocket) {
        webSocket.close(); // cleaning up the socket when it's no longer needed
      }
    };
  }, [webSocket]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`http://localhost:8000/conversations`);
      if (!response.ok) throw new Error("Failed to fetch conversations");

      const data = await response.json();
      console.log("Conversations:", data);

      if (Array.isArray(data) && data.length > 0) {
        const validConversations = data
          .map((conv) => {
            const msgList = processMessages(conv.messages);
            const title = getConversationTitle(msgList);
            return { ...conv, messages: msgList, title };
          })
          .filter((conv) => conv.messages.length > 0);

        console.log("Valid conversations:", validConversations);
        setConversations(validConversations);
      } else {
        setConversations([]); // no conversations
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]); // error, set empty conversations
    }
  };

  const processMessages = (messages: any[]): Message[] => {
    return messages
      .map((msg, index) => {
        if (typeof msg === "object" && msg !== null) {
          const key = Object.keys(msg)[0];
          if (key) {
            return {
              id: Date.now().toString() + index,
              sender: key as "user" | "ai",
              text: msg[key],
              timestamp: new Date().toISOString(),
            };
          }
        }
        return null;
      })
      .filter((msg) => msg !== null) as Message[];
  };

  const getConversationTitle = (messages: Message[]): string => {
    if (messages.length > 0) {
      return messages[0].text || "Untitled";
    }
    return "Untitled";
  };

  const initiateWebSocket = () => {
    const sessionId = Date.now().toString();
    const socket = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);

    socket.onmessage = (event) => {
      console.log("Received message:", event.data);

      setLoading(false);
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: "ai",
        text: event.data,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);

      if (currentConversation) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversation
              ? { ...conv, messages: [...conv.messages, newMessage] }
              : conv
          )
        );
      }
    };

    socket.onclose = () => {
      setTimeout(initiateWebSocket, 3000); // reconnect on socket closure
    };

    setWebSocket(socket);
  };

  const startNewConversation = (initialMessageText: string) => {
    console.log("Starting a new conversation:", initialMessageText);

    const newConversation: Conversation = {
      id: Date.now().toString(),
      messages: [
        {
          id: Date.now().toString(),
          sender: "user",
          text: initialMessageText,
          timestamp: new Date().toISOString(),
        },
      ],
      title: initialMessageText,
    };

    setConversations((prev) => [...prev, newConversation]);
    setCurrentConversation(newConversation.id);
    setMessages(newConversation.messages);
    setFirstLoad(false);
  };

  const resumeConversation = (conversation: Conversation) => {
    console.log("Resuming conversation:", conversation.id);
    setCurrentConversation(conversation.id);
    setMessages(conversation.messages);
  };

  const deleteConversation = async (id: string) => {
    console.log("Deleting conversation:", id);
    try {
      await fetch(`http://localhost:8000/conversations/${id}`, {
        method: "DELETE",
      });

      setConversations((prev) =>
        prev.filter((conversation) => conversation.id !== id)
      );

      if (currentConversation === id) {
        setMessages([]); // clear the chat if we're deleting the current one
        setCurrentConversation(null);
      }

      toast({ description: "Conversation deleted!" });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const sendMessage = async () => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN && input.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: "user",
        text: input.trim(),
        timestamp: new Date().toISOString(),
      };
      console.log("Sending message:", newMessage);

      setMessages((prev) => [...prev, newMessage]);

      if (currentConversation) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversation
              ? { ...conv, messages: [...conv.messages, newMessage] }
              : conv
          )
        );
      } else if (firstLoad) {
        startNewConversation(newMessage.text);
      }

      webSocket.send(input.trim());
      setInput("");
      setLoading(true);
    }
  };

  const signOutUser = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <div className="max-w-6xl mx-auto p-4 h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <header className="sticky top-0 w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 z-10 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center text-primary">
            <MessageSquare className="mr-3" size={32} /> AI Chat Assistant
          </h1>
          <Button
            onClick={() => startNewConversation("Start a new conversation")}
            className="gap-2"
          >
            <Plus size={18} /> New Conversation
          </Button>
          <Button onClick={signOutUser} className="gap-2">
            <LogOut size={18} /> Sign Out
          </Button>
        </div>
      </header>

      <div className="flex gap-6 h-full overflow-hidden">
        <Card className="flex-none w-[300px] p-4 overflow-hidden flex flex-col h-full">
          <h2 className="font-semibold mb-4 text-lg">Conversations</h2>

          <ScrollArea className="flex-grow h-[calc(100vh-150px)]">
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  className="flex justify-between items-center mb-2 relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    onClick={() => resumeConversation(conv)}
                    className={`block w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                      conv.id === currentConversation
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    {conv.title || "Untitled"}
                  </button>

                  <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
                    <Trash2
                      className="cursor-pointer text-muted-foreground hover:text-destructive transition-colors duration-200"
                      onClick={() => deleteConversation(conv.id)}
                      size={18}
                    />
                  </div>
                </motion.div>
              ))
            ) : (
              <p>No conversations found.</p>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex-grow p-4 overflow-hidden flex flex-col">
          <h2 className="font-semibold mb-4 text-lg">Chat</h2>

          <div className="flex-1 overflow-y-auto p-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-2 p-2 rounded-lg ${
                  message.sender === "ai"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <Button className="p-3" onClick={sendMessage} disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
