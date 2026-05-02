import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  BookOpen, 
  Search, 
  Bell, 
  Moon, 
  Sun, 
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  Target,
  FileText,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function DirectionA() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#475569" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        
        .nav-link {
          position: relative;
          color: #64748B;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #334155;
        }
        .nav-link.active {
          color: #059669;
        }
        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -24px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #059669;
          border-radius: 2px 2px 0 0;
        }

        .stat-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
        }
      `}</style>

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Target size={18} />
              </div>
              <span className="font-bold text-lg text-slate-700 tracking-tight">Image Intelligentsia</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="nav-link active">Overview</a>
              <a href="#" className="nav-link">Goals</a>
              <a href="#" className="nav-link">Learning</a>
              <a href="#" className="nav-link">Research</a>
              <a href="#" className="nav-link">Jobs</a>
              <a href="#" className="nav-link">Roadmap</a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100">
              <Search size={18} />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 border border-white"></span>
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100">
              <Moon size={18} />
            </Button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">Alex Rivera</span>
                <span className="text-xs text-slate-500">Sr. Researcher</span>
              </div>
              <Avatar className="h-9 w-9 border border-slate-200">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Alex Rivera" />
                <AvatarFallback>AR</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 pb-20">
        
        {/* Hero Section */}
        <section className="mb-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-700 mb-1">Good morning, Alex</h1>
            <p className="text-slate-500 font-medium">You're making steady progress on your Q3 roadmap.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="stat-card border-none shadow-sm relative overflow-hidden bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Target size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Goals</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-700">7</h3>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
                      <TrendingUp size={10} className="mr-1" /> +2
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card border-none shadow-sm relative overflow-hidden bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Learning Hours</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-700">24.5</h3>
                    <span className="text-xs text-slate-400">this week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card border-none shadow-sm relative overflow-hidden bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Briefcase size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Job Applications</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-700">12</h3>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      3 pending
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card border-none shadow-sm relative overflow-hidden bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Research Papers</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-700">48</h3>
                    <span className="text-xs text-slate-400">total read</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Left Column (Wider) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-700">Recent Goals</CardTitle>
                  <CardDescription className="text-slate-500">Your current focus areas</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium">
                  View All <ChevronRight size={16} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Goal 1 */}
                <div className="group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">Master System Design Interviews</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-normal border-none">Architecture</Badge>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-normal border-none">Interviews</Badge>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2.5 py-0.5 text-xs font-medium">In Progress</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500 w-10 text-right">65%</span>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100"></div>

                {/* Goal 2 */}
                <div className="group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">Complete Advanced React Patterns</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-normal border-none">Frontend</Badge>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-normal border-none">React</Badge>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-0.5 text-xs font-medium">On Track</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out delay-150" style={{ width: '82%' }}></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500 w-10 text-right">82%</span>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100"></div>

                {/* Goal 3 */}
                <div className="group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors">Publish AI Ethics Paper</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-normal border-none">Research</Badge>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-normal border-none">Writing</Badge>
                      </div>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none px-2.5 py-0.5 text-xs font-medium">Planning</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out delay-300" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500 w-10 text-right">20%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Narrower) */}
          <div className="space-y-8">
            
            {/* Learning Streak */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-700 flex items-center justify-between">
                  Activity
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-medium">12 Day Streak</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between h-24 mt-4 gap-1">
                  {[40, 70, 45, 90, 60, 30, 85].map((height, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                      <div className="w-full bg-slate-100 rounded-t-sm flex items-end justify-center h-20 relative overflow-hidden">
                        <div 
                          className={`w-full rounded-t-sm transition-all duration-700 ease-out ${i === 6 ? 'bg-emerald-500' : 'bg-emerald-300/60 group-hover:bg-emerald-400'}`}
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${i === 6 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-700">Reminders</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                  <MoreHorizontal size={18} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">Submit Google Application</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Clock size={12} /> Today, 5:00 PM</p>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">Read "Attention is All You Need"</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Clock size={12} /> Tomorrow, 10:00 AM</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">Review weekly roadmap progress</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Clock size={12} /> Friday, 4:30 PM</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-5">
                <Button variant="outline" className="w-full text-sm font-medium border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700">
                  Add Reminder
                </Button>
              </CardFooter>
            </Card>

          </div>
        </div>

        {/* Bottom Row - Research Library */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
              <FileText size={20} className="text-emerald-600" /> Research Library
            </h2>
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium">
              Browse All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Generative Agents: Interactive Simulacra", type: "Paper", date: "Added 2 days ago", tag: "AI/ML", color: "bg-purple-100 text-purple-700" },
              { title: "The Pragmatic Programmer - Chapter 4", type: "Book", date: "Added 5 days ago", tag: "Software Eng", color: "bg-blue-100 text-blue-700" },
              { title: "How to design a better API architecture", type: "Article", date: "Added 1 week ago", tag: "System Design", color: "bg-amber-100 text-amber-700" }
            ].map((item, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white group">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px] font-medium uppercase tracking-wider bg-slate-50">
                      {item.type}
                    </Badge>
                    <Badge className={`${item.color} border-none hover:${item.color} text-xs font-medium`}>
                      {item.tag}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2 leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">{item.date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
