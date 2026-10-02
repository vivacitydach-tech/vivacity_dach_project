'use client';

import { use, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProjectNav } from '@/components/project-nav';
import { PageHeader } from '@/components/page-header';
import { apiGet } from '@/lib/api';
import type { Project } from '@/lib/types';

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  channel: string;
  content: string;
  timestamp: string;
  attachment?: {
    type: 'image' | 'defect' | 'drawing';
    title: string;
    url?: string;
  };
  isMe?: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm-1',
    senderName: 'Marcus Vance',
    senderRole: 'Site Engineer',
    channel: '#all-site',
    content: 'Good morning team. Concrete pour for Level 2 slab Grid C4-D6 is scheduled for 10:30 AM. Ready-mix trucks are on route.',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'm-2',
    senderName: 'Sarah Jenkins',
    senderRole: 'Project Manager',
    channel: '#all-site',
    content: 'Understood Marcus. Please ensure the slump test results and cube samples are documented in the daily diary before pouring.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'm-3',
    senderName: 'David Chen',
    senderRole: 'MEP Subcontractor',
    channel: '#mep-coordination',
    content: 'Riser duct clash identified at Level 2 ceiling void with structural beam B-12. Marked in BCF Topic #4.',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    attachment: {
      type: 'defect',
      title: 'BCF #4: HVAC Duct vs Structural Beam Collision',
    },
  },
  {
    id: 'm-4',
    senderName: 'Elena Rostova',
    senderRole: 'Quantity Surveyor',
    channel: '#change-orders',
    content: 'Change Order #2 for facade thermal insulation upgrade has been reviewed and submitted for client sign-off.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
];

export default function ProjectChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [activeChannel, setActiveChannel] = useState<string>('#all-site');
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<'none' | 'defect' | 'photo' | 'urgent'>('none');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiGet<Project>(`/projects/${projectId}`),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChannel]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    let attachment: ChatMessage['attachment'] = undefined;
    if (selectedTag === 'defect') {
      attachment = {
        type: 'defect',
        title: 'Tagged Defect / Inspection Item',
      };
    } else if (selectedTag === 'photo') {
      attachment = {
        type: 'image',
        title: 'Site Progress Photo (Attached)',
      };
    }

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      senderName: 'You (Project Manager)',
      senderRole: 'Lead PM',
      channel: activeChannel,
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      attachment,
      isMe: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setSelectedTag('none');
  };

  const filteredMessages = messages.filter(
    (m) => activeChannel === '#all-site' || m.channel === activeChannel
  );

  const channels = [
    { id: '#all-site', name: 'General Site Feed', icon: '📢' },
    { id: '#mep-coordination', name: 'MEP & Structural', icon: '⚡' },
    { id: '#safety-snags', name: 'Safety & Snagging', icon: '🦺' },
    { id: '#change-orders', name: 'Commercial & Variations', icon: '📝' },
  ];

  return (
    <div>
      <ProjectNav projectId={projectId} />

      <PageHeader
        title={`${projectQuery.data?.name ?? 'Project'} — Site Chat`}
        subtitle="Real-time site-to-office communication, field alerts, and coordination feed"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 te-panel p-0 overflow-hidden border border-slate-800 shadow-2xl">
        {/* Left Sidebar: Channels & On-Site Personnel */}
        <div className="border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/60 p-4 space-y-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Site Channels
            </h4>
            <div className="space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    activeChannel === ch.id
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <span>{ch.icon}</span>
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>On-Site Personnel</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-medium">Marcus Vance</span>
                <span className="text-[10px] text-slate-500">(Site Eng)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-medium">David Chen</span>
                <span className="text-[10px] text-slate-500">(MEP Lead)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-medium">Klaus Schmidt</span>
                <span className="text-[10px] text-slate-500">(Safety)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span>Elena Rostova</span>
                <span className="text-[10px] text-slate-500">(Office QS)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3 flex flex-col h-[560px] bg-slate-900/30">
          {/* Chat Header */}
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 text-sm">
                {channels.find((c) => c.id === activeChannel)?.name}
              </span>
              <span className="text-xs font-mono text-slate-500">{activeChannel}</span>
            </div>
            <span className="text-xs text-emerald-400 font-mono">● Real-Time Sync Active</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-300">{msg.senderName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                    {msg.senderRole}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-xl rounded-xl p-3.5 text-sm shadow-md ${
                    msg.isMe
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {msg.attachment && (
                    <div className="mt-2.5 rounded-lg bg-black/20 p-2.5 border border-white/10 flex items-center gap-2.5">
                      <span className="text-lg">
                        {msg.attachment.type === 'defect' ? '⚠️' : '📷'}
                      </span>
                      <div className="text-xs">
                        <p className="font-bold">{msg.attachment.title}</p>
                        <p className="opacity-80 text-[10px]">Click to view linked object</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Tag Pills & Chat Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Tag to message:</span>
              <button
                type="button"
                onClick={() => setSelectedTag(selectedTag === 'defect' ? 'none' : 'defect')}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  selectedTag === 'defect'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                ⚠️ Tag BCF Defect
              </button>
              <button
                type="button"
                onClick={() => setSelectedTag(selectedTag === 'photo' ? 'none' : 'photo')}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  selectedTag === 'photo'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                📷 Attach Site Photo
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${activeChannel}...`}
                className="te-input flex-1 text-sm bg-slate-900/90"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="te-btn-primary px-5"
              >
                Send ✈️
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
