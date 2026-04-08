import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Image as ImageIcon, Send, Bot, User, CheckCircle2, XCircle, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { genAI } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  imageUrl?: string;
  isGrading?: boolean;
  score?: number;
}

export default function Practice() {
  const { subjects, user, addToast } = useAppStore(useShallow(state => ({
    subjects: state.subjects,
    user: state.user,
    addToast: state.addToast
  })));

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('Image size must be less than 5MB', 'error');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert File to base64 for Gemini API
  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageFile) return;
    if (!selectedSubject) {
      addToast('Please select a subject first', 'error');
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubject);
    const topic = subject?.topics.find(t => t.id === selectedTopic);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      imageUrl: imagePreview || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setImageFile(null);
    setImagePreview(null);
    setIsProcessing(true);

    try {
      const prompt = `
        You are an expert AI tutor and grader for Advanced Level (A/L) students.
        The student is practicing for the subject: ${subject?.name || 'General'}
        ${topic ? `Specifically focusing on the topic: ${topic.title}` : ''}
        
        The student has provided an answer or a question (possibly with an image).
        Your task:
        1. If it's a question, explain how to solve it step-by-step.
        2. If it's an answer to a question, grade it out of 100.
        3. Identify any mistakes or misconceptions.
        4. Provide constructive feedback and the correct approach.
        
        Format your response clearly using Markdown.
        If you are grading an answer, start your response with "SCORE: X/100" on the first line.
      `;

      const contents: any[] = [prompt, input];
      if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        contents.push(imagePart);
      }

      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });
      const responseText = result.text || '';
      
      let score: number | undefined;
      let content = responseText;
      
      const scoreMatch = responseText.match(/^SCORE:\s*(\d+)\/100/i);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1], 10);
        content = responseText.replace(/^SCORE:\s*\d+\/100/i, '').trim();
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: content,
        isGrading: score !== undefined,
        score: score,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      addToast('Failed to process your request. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#1DB954]" />
            AI Practice & Auto-Correction
          </h1>
          <p className="text-gray-400 mt-1">Upload questions or type your answers for instant AI feedback and grading.</p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedTopic('');
            }}
            className="bg-[#181818] border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#1DB954] outline-none"
          >
            <option value="">Select Subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          
          {selectedSubject && (
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-[#181818] border border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#1DB954] outline-none max-w-[200px]"
            >
              <option value="">All Topics</option>
              {subjects.find(s => s.id === selectedSubject)?.topics.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex-1 bg-[#181818] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8 text-[#1DB954]" />
              </div>
              <div>
                <p className="font-bold text-lg text-white">Ready to practice?</p>
                <p className="text-sm max-w-md mt-2">Select a subject, then type a question or upload an image of your work. I'll grade it and explain any mistakes.</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === 'user' ? "bg-white/10" : "bg-[#1DB954]/20 text-[#1DB954]"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={cn(
                  "rounded-2xl p-4 space-y-3",
                  msg.role === 'user' 
                    ? "bg-[#1DB954] text-black rounded-tr-sm" 
                    : "bg-white/5 border border-white/10 rounded-tl-sm"
                )}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Uploaded content" className="max-w-full rounded-lg border border-black/10" />
                  )}
                  
                  {msg.isGrading && msg.score !== undefined && (
                    <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/10 mb-4">
                      {msg.score >= 80 ? <CheckCircle2 className="w-6 h-6 text-[#1DB954]" /> : 
                       msg.score >= 50 ? <AlertCircle className="w-6 h-6 text-yellow-500" /> : 
                       <XCircle className="w-6 h-6 text-red-500" />}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Grade</p>
                        <p className="text-xl font-black">{msg.score}/100</p>
                      </div>
                    </div>
                  )}
                  
                  {msg.content && (
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      msg.role === 'user' ? "prose-invert text-black" : "prose-invert"
                    )}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#1DB954]" />
                <span className="text-sm text-gray-400">Analyzing your work...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/40 border-t border-white/5">
          <AnimatePresence>
            {imagePreview && (
              <motion.div 
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mb-3 relative inline-block"
              >
                <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-white/20" />
                <button 
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl focus-within:border-[#1DB954]/50 focus-within:bg-white/10 transition-all p-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
                title="Upload Image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer or question here..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] py-2 text-sm outline-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            
            <button
              type="submit"
              disabled={isProcessing || (!input.trim() && !imageFile)}
              className="h-[56px] px-6 bg-[#1DB954] text-black rounded-2xl font-bold hover:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
