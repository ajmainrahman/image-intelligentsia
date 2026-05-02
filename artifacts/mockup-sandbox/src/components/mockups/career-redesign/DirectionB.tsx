import React from 'react';
import {
  Bell,
  LogOut,
  Target,
  BookOpen,
  Briefcase,
  Map as MapIcon,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  MoreVertical,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function DirectionB() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <div className="min-h-screen bg-white font-jakarta text-slate-700 pb-12">
        {/* Top Navigation */}
        <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                  I
                </div>
                <span className="font-bold text-slate-800 text-lg tracking-tight">Image Intelligentsia</span>
              </div>
              
              <div className="hidden md:flex items-center space-x-1">
                {['Home', 'Goals', 'Learning', 'Research', 'Jobs', 'Roadmap'].map((item) => (
                  <button
                    key={item}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                      item === 'Home'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              <Avatar className="h-9 w-9 border-2 border-slate-100 ring-2 ring-transparent hover:ring-teal-100 transition-all cursor-pointer">
                <AvatarFallback className="bg-violet-100 text-violet-700 font-bold">AS</AvatarFallback>
              </Avatar>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
          {/* Header & KPIs */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Your Career Dashboard</h1>
              <p className="text-slate-500 font-medium mt-1">Thursday, October 24th &middot; You're making great progress.</p>
            </div>
            
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-6 px-6 md:mx-0 md:px-0">
              {[
                { label: 'Goals Active', value: '3', trend: 'up', color: 'teal' },
                { label: 'Learning (24h)', value: '2.5h', trend: 'up', color: 'violet' },
                { label: 'Research', value: '12', trend: 'neutral', color: 'blue' },
                { label: 'Applied', value: '5', trend: 'up', color: 'amber' },
                { label: 'Streak', value: '7 days', trend: 'up', color: 'emerald' },
              ].map((kpi, i) => (
                <div key={i} className="min-w-[160px] flex-shrink-0 bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-slate-500 text-sm font-semibold mb-2">{kpi.label}</div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-extrabold text-slate-800">{kpi.value}</div>
                    <div className="w-12 h-6 flex items-end gap-1">
                      {/* CSS Sparkline */}
                      <div className={`w-full bg-${kpi.color}-200 rounded-t-sm`} style={{ height: '30%' }}></div>
                      <div className={`w-full bg-${kpi.color}-300 rounded-t-sm`} style={{ height: '50%' }}></div>
                      <div className={`w-full bg-${kpi.color}-400 rounded-t-sm`} style={{ height: '80%' }}></div>
                      <div className={`w-full bg-${kpi.color}-500 rounded-t-sm`} style={{ height: '100%' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Three Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Goals Column */}
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Target className="w-5 h-5 text-teal-600" />
                  Active Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { title: "Master System Design", progress: 65, color: "teal", target: "Q4 2024" },
                  { title: "Publish 2 Papers", progress: 40, color: "violet", target: "2025" },
                  { title: "Transition to Staff", progress: 15, color: "blue", target: "Q2 2025" }
                ].map((goal, i) => (
                  <div key={i} className="relative pl-4 py-3 bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden group hover:border-slate-200 transition-colors">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-${goal.color}-500`}></div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-slate-800">{goal.title}</div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-semibold">{goal.target}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* CSS Progress Ring */}
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className={`text-${goal.color}-500`} strokeWidth="4" strokeDasharray={`${goal.progress}, 100`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-slate-600">{goal.progress}%</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">In progress</div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-slate-500 hover:text-teal-600 font-semibold">View All Goals</Button>
              </CardContent>
            </Card>

            {/* Learning Column */}
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <BookOpen className="w-5 h-5 text-violet-500" />
                  Learning Log
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { title: "Advanced React Patterns", type: "Course", color: "blue", time: "1.5h", date: "Today" },
                  { title: "Distributed DBs", type: "Project", color: "green", time: "3h", date: "Yesterday" },
                  { title: "AWS Solutions Arch", type: "Cert", color: "amber", time: "1h", date: "Oct 22" }
                ].map((log, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-${log.color}-100 flex items-center justify-center text-${log.color}-600 shrink-0`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{log.title}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                        <span className={`text-${log.color}-600 bg-${log.color}-50 px-1.5 py-0.5 rounded`}>{log.type}</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {log.time}</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-400">{log.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-slate-500 hover:text-violet-600 font-semibold">Log Activity</Button>
              </CardContent>
            </Card>

            {/* Research Column */}
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Search className="w-5 h-5 text-blue-500" />
                    Research Queue
                  </CardTitle>
                </div>
                {/* Status flow indicator */}
                <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <span>To Explore</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-teal-600">Reading</span>
                  <ChevronRight className="w-3 h-3" />
                  <span>Done</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-slate-200 w-1/3"></div>
                  <div className="h-full bg-teal-500 w-1/3 shadow-[0_0_8px_rgba(20,184,166,0.6)] relative z-10 rounded-full"></div>
                  <div className="h-full bg-slate-100 w-1/3"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 mt-4">
                {[
                  { title: "Attention is All You Need", status: "Reading", tag: "AI/ML" },
                  { title: "Raft Consensus Algorithm", status: "To Explore", tag: "Systems" },
                  { title: "Dynamo: Amazon's Key-value Store", status: "Done", tag: "Database" }
                ].map((item, i) => (
                  <div key={i} className="group flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                    <div className="mt-1">
                      {item.status === "Done" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : item.status === "Reading" ? (
                        <div className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                      )}
                    </div>
                    <div>
                      <div className={`font-semibold ${item.status === "Done" ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"}`}>
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">{item.tag}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>

          {/* Job Pipeline */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-slate-800" />
                Job Pipeline
              </h2>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full shadow-sm">
                Add Opportunity
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  title: "Saved",
                  count: 2,
                  color: "slate",
                  jobs: [
                    { company: "Stripe", role: "Frontend Engineer", location: "Remote" },
                    { company: "Linear", role: "Product Engineer", location: "SF / Remote" }
                  ]
                },
                {
                  title: "Applied",
                  count: 1,
                  color: "blue",
                  jobs: [
                    { company: "Vercel", role: "Senior Design Engineer", location: "Remote", age: "2d ago" }
                  ]
                },
                {
                  title: "Interview",
                  count: 1,
                  color: "violet",
                  jobs: [
                    { company: "Anthropic", role: "UX Engineer", location: "SF", age: "Next: Onsite" }
                  ]
                },
                {
                  title: "Offer",
                  count: 0,
                  color: "emerald",
                  jobs: []
                }
              ].map((col, i) => (
                <div key={i} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">{col.title}</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs font-extrabold px-2 py-0.5 rounded-full">{col.count}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {col.jobs.map((job, j) => (
                      <div key={j} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{job.role}</div>
                        <div className="text-sm text-slate-500 font-medium mb-3">{job.company}</div>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-400 flex items-center gap-1"><MapIcon className="w-3 h-3" /> {job.location}</span>
                          {job.age && <span className={`px-2 py-0.5 rounded-md ${col.color === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>{job.age}</span>}
                        </div>
                      </div>
                    ))}
                    
                    {col.jobs.length === 0 && (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <Sparkles className="w-6 h-6 text-slate-300 mb-2" />
                        <div className="text-sm font-semibold text-slate-400">No jobs yet</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
