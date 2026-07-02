import React, { useEffect, useState } from 'react';
import { Card, Metric, Text, AreaChart, LineChart, Grid, Col, BadgeDelta, Flex } from '@tremor/react';

interface ChartData {
  time: string;
  value: number;
}

const mockIntegrityData = [
  { time: '10:00', value: 0 },
  { time: '10:05', value: 0 },
  { time: '10:10', value: 2 },
  { time: '10:15', value: 0 },
  { time: '10:20', value: 0 },
  { time: '10:25', value: 0 },
  { time: '10:30', value: 1 },
];

const mockLatencyData = [
  { time: '10:00', value: 12.5 },
  { time: '10:05', value: 13.0 },
  { time: '10:10', value: 15.2 },
  { time: '10:15', value: 12.8 },
  { time: '10:20', value: 11.9 },
  { time: '10:25', value: 12.4 },
  { time: '10:30', value: 12.1 },
];

export default function LedgerIntegrityBoard() {
  const [integrityData, setIntegrityData] = useState<ChartData[]>([]);
  const [latencyData, setLatencyData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real environment, this would hit http://localhost:8428/api/v1/query_range
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulated VictoriaMetrics fetch
        // const res = await fetch('http://localhost:8428/api/v1/query?query=sum(rate(telemetry_integrity_compromised_total[5m]))');
        // if (!res.ok) throw new Error('VM not available');
        throw new Error('Fallback to mock');
      } catch (err) {
        // Fallback to mock data for demonstration
        setIntegrityData(mockIntegrityData);
        setLatencyData(mockLatencyData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-white animate-pulse">Initializing Telemetry Streams...</div>;
  }

  const currentLatency = latencyData[latencyData.length - 1]?.value || 0;
  const currentIntegrity = integrityData[integrityData.length - 1]?.value || 0;

  return (
    <Grid numItems={1} numItemsSm={2} numItemsLg={2} className="gap-6">
      <Col numColSpan={1} numColSpanSm={2} numColSpanLg={1}>
        <Card className="bg-slate-900 border-slate-800 ring-slate-800 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <Text className="text-slate-400">Integrity Compromised Events</Text>
          <Flex justifyContent="start" className="space-x-4 items-baseline mt-2">
            <Metric className="text-white">{currentIntegrity}</Metric>
            <BadgeDelta deltaType={currentIntegrity > 0 ? "decrease" : "unchanged"}>
              {currentIntegrity > 0 ? "Critical" : "Stable"}
            </BadgeDelta>
          </Flex>
          <AreaChart
            className="mt-6 h-72"
            data={integrityData}
            index="time"
            categories={['value']}
            colors={['red']}
            valueFormatter={(number) => Intl.NumberFormat('us').format(number).toString()}
            showLegend={false}
            yAxisWidth={40}
            curveType="monotone"
          />
        </Card>
      </Col>

      <Col numColSpan={1} numColSpanSm={2} numColSpanLg={1}>
        <Card className="bg-slate-900 border-slate-800 ring-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <Text className="text-slate-400">DPoP Signing Latency (ms)</Text>
          <Flex justifyContent="start" className="space-x-4 items-baseline mt-2">
            <Metric className="text-white">{currentLatency.toFixed(1)} ms</Metric>
            <BadgeDelta deltaType={currentLatency > 15 ? "moderateIncrease" : "unchanged"}>
              {currentLatency > 15 ? "Elevated" : "Optimal"}
            </BadgeDelta>
          </Flex>
          <LineChart
            className="mt-6 h-72"
            data={latencyData}
            index="time"
            categories={['value']}
            colors={['blue']}
            valueFormatter={(number) => `${number} ms`}
            showLegend={false}
            yAxisWidth={40}
            curveType="monotone"
          />
        </Card>
      </Col>
    </Grid>
  );
}
