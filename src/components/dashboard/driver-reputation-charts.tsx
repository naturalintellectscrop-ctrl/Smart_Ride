'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface TierChartData {
  name: string;
  value: number;
  color: string;
}

interface MetricsChartData {
  name: string;
  value: number;
}

interface DriverReputationChartsProps {
  tierChartData: TierChartData[];
  metricsChartData: MetricsChartData[];
}

export default function DriverReputationCharts({ tierChartData, metricsChartData }: DriverReputationChartsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Trust Tier Distribution</CardTitle>
          <CardDescription>Drivers by trust tier status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {tierChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Average Metrics</CardTitle>
          <CardDescription>Platform-wide driver performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="#7CDA28" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
