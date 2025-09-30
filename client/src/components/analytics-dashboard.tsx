
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { 
  DollarSign, Phone, Clock, Star, TrendingUp, TrendingDown,
  Calendar, Users, MapPin, Activity
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  // Mock analytics data
  const analyticsData = {
    totalEarnings: '$3,245.50',
    totalCalls: 24,
    averageRating: 4.8,
    responseTime: '2.3 min',
    weeklyEarnings: [
      { day: 'Mon', earnings: 245 },
      { day: 'Tue', earnings: 165 },
      { day: 'Wed', earnings: 320 },
      { day: 'Thu', earnings: 180 },
      { day: 'Fri', earnings: 290 },
      { day: 'Sat', earnings: 410 },
      { day: 'Sun', earnings: 125 },
    ],
    callsByType: [
      { name: 'Emergency', value: 35, color: '#FF8042' },
      { name: 'Repair', value: 45, color: '#0088FE' },
      { name: 'Installation', value: 15, color: '#00C49F' },
      { name: 'Consultation', value: 5, color: '#FFBB28' },
    ],
    monthlyTrend: [
      { month: 'Jan', calls: 18, earnings: 2100 },
      { month: 'Feb', calls: 22, earnings: 2650 },
      { month: 'Mar', calls: 24, earnings: 3245 },
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track your performance and earnings</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={timeframe === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeframe('week')}
          >
            Week
          </Button>
          <Button 
            variant={timeframe === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeframe('month')}
          >
            Month
          </Button>
          <Button 
            variant={timeframe === 'year' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeframe('year')}
          >
            Year
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">{analyticsData.totalEarnings}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">+12.5%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{analyticsData.totalCalls}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600">+8.3%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{analyticsData.averageRating}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-muted-foreground">24 reviews</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{analyticsData.responseTime}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">-0.5 min</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Earnings Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.weeklyEarnings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Earnings']} />
                <Bar dataKey="earnings" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Call Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Call Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.callsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.callsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={analyticsData.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="right" dataKey="earnings" fill="#0088FE" name="Earnings ($)" />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="calls" 
                stroke="#00C49F" 
                strokeWidth={3}
                name="Calls"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Response Time Improved</p>
                  <p className="text-sm text-muted-foreground">30% faster than last month</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Great
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">High Customer Satisfaction</p>
                  <p className="text-sm text-muted-foreground">4.8/5 average rating</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Excellent
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium">Peak Hours</p>
                  <p className="text-sm text-muted-foreground">Most calls between 2-6 PM</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                Tip
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals & Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monthly Earnings Goal</span>
                <span className="text-sm text-muted-foreground">$3,245 / $4,000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '81%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground">81% complete - $755 to go</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Response Time Goal</span>
                <span className="text-sm text-muted-foreground">2.3 min / 3.0 min</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-green-600">Goal achieved! 🎉</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Customer Rating Goal</span>
                <span className="text-sm text-muted-foreground">4.8 / 4.5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-green-600">Goal exceeded! 🌟</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
