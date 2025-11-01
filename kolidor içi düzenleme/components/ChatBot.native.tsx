
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { GoogleGenAI, Chat } from '@google/genai';
import type { ChatMessage } from '../types';
import { MessageSquare, X } from 'lucide-react-native'; // Using icons

const LoadingIndicator = () => (
    <View style={styles.loadingContainer}>
        <View style={[styles.loadingDot, { animationDelay: '0s' }]} />
        <View style={[styles.loadingDot, { animationDelay: '0.1s' }]} />
        <View style={[styles.loadingDot, { animationDelay: '0.2s' }]} />
    </View>
);

interface ChatBotProps {
  lineColor: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ lineColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.error("Gemini API key is missing. Ensure EXPO_PUBLIC_GEMINI_API_KEY is set in your .env file.");
      setMessages([{ role: 'model', text: 'Sorry, the chat service is not configured. API Key is missing.' }]);
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: 'You are a helpful assistant integrated into the "Corridor Pathfinder" mobile application. Keep your responses concise and relevant.' },
      });
      setMessages([{ role: 'model', text: 'Hello! How can I help you?' }]);
    } catch (error) {
        console.error("Failed to initialize Gemini:", error);
        setMessages([{ role: 'model', text: 'Sorry, the chat service is currently unavailable.' }]);
    }
  }, [apiKey]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage.text });
      const modelMessage: ChatMessage = { role: 'model', text: response.text };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Gemini API error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={[styles.fab, { backgroundColor: lineColor }]}
      >
        <MessageSquare size={28} color="#fff" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.chatContainer}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <View style={[styles.chatHeader, { borderBottomColor: lineColor }]}>
                <Text style={[styles.chatTitle, { color: lineColor }]}>Corridor Assistant</Text>
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                    <X size={24} color="#aaa" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                ref={scrollViewRef}
                style={styles.messageList}
                contentContainerStyle={{ paddingVertical: 10 }}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg, index) => (
                  <View key={index} style={[styles.messageRow, msg.role === 'user' ? styles.userMessageRow : styles.modelMessageRow]}>
                    <View style={[styles.messageBubble, msg.role === 'user' ? styles.userMessageBubble : styles.modelMessageBubble]}>
                      <Text style={styles.messageText}>{msg.text}</Text>
                    </View>
                  </View>
                ))}
                {isLoading && <LoadingIndicator />}
              </ScrollView>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask something..."
                  placeholderTextColor="#888"
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={handleSendMessage} disabled={isLoading} style={[styles.sendButton, { opacity: isLoading ? 0.5 : 1 }]}>
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
    fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
    chatContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20, 20, 20, 0.95)', flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
    chatTitle: { fontSize: 18, fontWeight: 'bold' },
    messageList: { flex: 1, paddingHorizontal: 10 },
    messageRow: { flexDirection: 'row', marginVertical: 5 },
    userMessageRow: { justifyContent: 'flex-end' },
    modelMessageRow: { justifyContent: 'flex-start' },
    messageBubble: { padding: 12, borderRadius: 18, maxWidth: '80%' },
    userMessageBubble: { backgroundColor: '#007AFF' },
    modelMessageBubble: { backgroundColor: '#333' },
    messageText: { color: '#fff', fontSize: 15 },
    inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#444' },
    textInput: { flex: 1, backgroundColor: '#2c2c2c', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, color: '#fff', marginRight: 10 },
    sendButton: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#007AFF', borderRadius: 20 },
    sendButtonText: { color: '#fff', fontWeight: 'bold' },
    loadingContainer: { padding: 12 },
    loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#888', marginHorizontal: 2 }
});

export default ChatBot;
