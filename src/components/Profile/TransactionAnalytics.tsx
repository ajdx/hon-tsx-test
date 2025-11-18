import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Sparkles, TrendingUp, Calendar, Target, Users, Eye, MessageSquare, Heart } from 'lucide-react';
import { ConversationalAIWidget } from '../common/ConversationalAIWidget';
import { comicService } from '../../services/comicService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

interface StoryAnalytics {
  totalStories: number;
  aiGenerated: number;
  traditional: number;
  performance: {
    type: string;
    stories: number;
    avgSupport: number;
    color: string;
  }[];
  topPerformers: {
    id: string;
    name: string;
    isAI: boolean;
    support: number;
    views: number;
  }[];
}

interface EngagementMetrics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalBookmarks: number;
  viewsPerDay: { date: string; count: number }[];
  likesPerDay: { date: string; count: number }[];
}

interface EarningInsight {
  currentTrend: number;
  projectedMonthly: number;
  recommendedActions: {
    publishFrequency: string;
    contentType: string;
    potentialIncrease: number;
  };
}

export const TransactionAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [storyAnalytics, setStoryAnalytics] = useState<StoryAnalytics>({
    totalStories: 0,
    aiGenerated: 0,
    traditional: 0,
    performance: [
      { type: 'AI Generated', stories: 0, avgSupport: 0, color: '#818CF8' },
      { type: 'Traditional', stories: 0, avgSupport: 0, color: '#34D399' }
    ],
    topPerformers: []
  });
  
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalBookmarks: 0,
    viewsPerDay: [],
    likesPerDay: []
  });
  
  const [transactionData, setTransactionData] = useState<any[]>([]);
  const [insights, setInsights] = useState<EarningInsight>({
    currentTrend: 0,
    projectedMonthly: 0,
    recommendedActions: {
      publishFrequency: '',
      contentType: '',
      potentialIncrease: 0
    }
  });

  useEffect(() => {
    const fetchCreatorStats = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Fetch creator stats from the backend
        const stats = await comicService.getCreatorStats(user.id);
        
        // Process the data
        if (stats) {
          // Calculate story analytics
          const aiGenerated = stats.filter(comic => comic.is_ai_generated).length;
          const traditional = stats.filter(comic => !comic.is_ai_generated).length;
          
          // Calculate support amounts
          const aiSupport = stats
            .filter(comic => comic.is_ai_generated)
            .flatMap(comic => comic.support_transactions || [])
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            
          const traditionalSupport = stats
            .filter(comic => !comic.is_ai_generated)
            .flatMap(comic => comic.support_transactions || [])
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
          
          // Calculate average support
          const avgAiSupport = aiGenerated > 0 ? aiSupport / aiGenerated : 0;
          const avgTraditionalSupport = traditional > 0 ? traditionalSupport / traditional : 0;
          
          // Get top performers
          const comicsWithSupport = stats.map(comic => ({
            id: comic.id,
            name: comic.title || 'Untitled',
            isAI: comic.is_ai_generated,
            support: (comic.support_transactions || []).reduce((sum, tx) => sum + (tx.amount || 0), 0),
            views: comic.view_count || 0
          })).sort((a, b) => b.support - a.support).slice(0, 3);
          
          // Update story analytics
          setStoryAnalytics({
            totalStories: stats.length,
            aiGenerated,
            traditional,
            performance: [
              { type: 'AI Generated', stories: aiGenerated, avgSupport: avgAiSupport, color: '#818CF8' },
              { type: 'Traditional', stories: traditional, avgSupport: avgTraditionalSupport, color: '#34D399' }
            ],
            topPerformers: comicsWithSupport
          });
          
          // Generate mock engagement data for now
          // In a real implementation, you would fetch this from your backend
          setEngagementMetrics({
            totalViews: stats.reduce((sum, comic) => sum + (comic.view_count || 0), 0),
            totalLikes: stats.reduce((sum, comic) => sum + (comic.like_count || 0), 0),
            totalComments: stats.reduce((sum, comic) => sum + (comic.comment_count || 0), 0),
            totalBookmarks: stats.reduce((sum, comic) => sum + (comic.bookmark_count || 0), 0),
            viewsPerDay: generateDailyData(30, 100),
            likesPerDay: generateDailyData(30, 20)
          });
          
          // Generate transaction data
          const transactions = stats
            .flatMap(comic => (comic.support_transactions || []).map(tx => ({
              ...tx,
              comicId: comic.id,
              comicTitle: comic.title || 'Untitled'
            })))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 7);
            
          // Group by day of week
          const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
          const groupedByDay = transactions.reduce((acc, tx) => {
            const day = dayMap[new Date(tx.created_at).getDay()];
            if (!acc[day]) acc[day] = { name: day, gifts: 0, amount: 0 };
            acc[day].gifts += 1;
            acc[day].amount += tx.amount || 0;
            return acc;
          }, {});
          
          // Convert to array and sort by day
          const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const transactionsByDay = dayOrder.map(day => groupedByDay[day] || { name: day, gifts: 0, amount: 0 });
          
          setTransactionData(transactionsByDay);
          
          // Generate insights
          const totalSupport = stats
            .flatMap(comic => comic.support_transactions || [])
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            
          const weeklyAvg = totalSupport / 4; // Assuming 4 weeks of data
          const projectedMonthly = weeklyAvg * 4;
          
          setInsights({
            currentTrend: weeklyAvg,
            projectedMonthly,
            recommendedActions: {
              publishFrequency: aiGenerated > traditional ? '3-4 AI stories per week' : '2-3 traditional stories per week',
              contentType: avgAiSupport > avgTraditionalSupport ? '70% AI-enhanced content' : '60% traditional content',
              potentialIncrease: 30
            }
          });
        }
      } catch (error) {
        console.error('Error fetching creator stats:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCreatorStats();
  }, [user?.id]);
  
  // Helper function to generate daily data for charts
  const generateDailyData = (days: number, maxValue: number) => {
    const result = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      result.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count: Math.floor(Math.random() * maxValue)
      });
    }
    
    return result;
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 transition-colors">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">Creator Analytics</h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Total Support</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {transactionData.reduce((sum, day) => sum + day.amount, 0).toFixed(1)} SOL
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Unique Supporters</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {Math.floor(transactionData.reduce((sum, day) => sum + day.gifts, 0) * 0.8)}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Stories Published</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {storyAnalytics.totalStories}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {engagementMetrics.totalViews.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-8 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Engagement Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm flex items-center transition-colors">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mr-4">
                    <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Views</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{engagementMetrics.totalViews.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm flex items-center transition-colors">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mr-4">
                    <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Likes</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{engagementMetrics.totalLikes.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm flex items-center transition-colors">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mr-4">
                    <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Comments</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{engagementMetrics.totalComments.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              {/* Views Trend Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mb-4 transition-colors">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 transition-colors">Views Trend (Last 30 Days)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementMetrics.viewsPerDay}>
                      <XAxis dataKey="date" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Weekly Support Chart */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-8 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Weekly Support</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactionData}>
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip />
                    <Bar dataKey="amount" name="SOL" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Story Performance Analytics */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-8 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Story Performance Analytics</h3>
              
              {/* Comic Type Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Content Distribution</h4>
                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 transition-colors" />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={storyAnalytics.performance}
                            dataKey="stories"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                          >
                            {storyAnalytics.performance.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">AI Generated ({storyAnalytics.aiGenerated})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">Traditional ({storyAnalytics.traditional})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Comparison */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 transition-colors">Top Performing Stories</h4>
                  <div className="space-y-3">
                    {storyAnalytics.topPerformers.length > 0 ? (
                      storyAnalytics.topPerformers.map((story, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {story.isAI && <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 transition-colors" />}
                            <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors">{story.name}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors">{story.support.toFixed(1)} SOL</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                        No support data available yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Insights */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Growth Insights</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
                  <div className="flex items-center mb-3">
                    <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Current Trend</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{insights.currentTrend.toFixed(1)} <span className="text-sm font-normal text-gray-500">SOL/week</span></p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
                  <div className="flex items-center mb-3">
                    <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Projected Monthly</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{insights.projectedMonthly.toFixed(1)} <span className="text-sm font-normal text-gray-500">SOL</span></p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
                  <div className="flex items-center mb-3">
                    <Target className="w-5 h-5 text-purple-500 mr-2" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Growth Potential</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">+{insights.recommendedActions.potentialIncrease}% <span className="text-sm font-normal text-gray-500">with optimizations</span></p>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 transition-colors">Recommendations</h4>
                <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400 transition-colors">
                  <li className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                    <span>Publish frequency: {insights.recommendedActions.publishFrequency}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                    <span>Content mix: {insights.recommendedActions.contentType}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                    <span>Engage with your audience by responding to comments</span>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Widget */}
      <ConversationalAIWidget position="bottom-left" />
    </div>
  );
}; 