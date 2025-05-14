
"use client";

import type {WhitespaceData, SeriesMarker, Time} from 'lightweight-charts';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesPartialOptions,
  type LineSeriesPartialOptions,
  type AreaSeriesPartialOptions,
  type BarSeriesPartialOptions,
  type BaselineSeriesPartialOptions,
  type HistogramSeriesPartialOptions,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { OHLCVData, ChartType, IndicatorType } from '@/types';


// Sample OHLCV data (replace with actual data source)
const sampleData: OHLCVData[] = [
  { time: '2023-10-01', open: 160.5, high: 162.3, low: 159.0, close: 161.8, volume: 10000 },
  { time: '2023-10-02', open: 161.5, high: 163.0, low: 160.0, close: 162.5, volume: 12000 },
  { time: '2023-10-03', open: 162.7, high: 164.5, low: 161.8, close: 163.2, volume: 11000 },
  { time: '2023-10-04', open: 163.0, high: 163.8, low: 160.5, close: 161.0, volume: 13000 },
  { time: '2023-10-05', open: 161.2, high: 162.0, low: 158.5, close: 159.3, volume: 15000 },
  { time: '2023-10-06', open: 159.5, high: 161.3, low: 159.0, close: 160.8, volume: 10500 },
  { time: '2023-10-07', open: 160.9, high: 162.8, low: 160.1, close: 162.2, volume: 11500 },
  { time: '2023-10-08', open: 162.0, high: 165.0, low: 161.5, close: 164.5, volume: 14000 },
  { time: '2023-10-09', open: 164.8, high: 166.2, low: 163.7, close: 165.0, volume: 12500 },
  { time: '2023-10-10', open: 165.3, high: 165.8, low: 162.5, close: 163.1, volume: 16000 },
  { time: '2023-10-11', open: 163.5, high: 164.3, low: 162.0, close: 163.8, volume: 10000 },
  { time: '2023-10-12', open: 163.6, high: 166.0, low: 163.2, close: 165.5, volume: 12000 },
  { time: '2023-10-13', open: 165.7, high: 167.5, low: 164.8, close: 166.2, volume: 11000 },
  { time: '2023-10-14', open: 166.0, high: 166.8, low: 163.5, close: 164.0, volume: 13000 },
  { time: '2023-10-15', open: 164.2, high: 165.0, low: 161.5, close: 162.3, volume: 15000 },
];


const TradingViewChartInternal: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<ChartType> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const { theme } = useTheme();
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('candlestick');
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('none');
  const [maPeriod, setMaPeriod] = useState<number>(20); // Default Moving Average period

  const getChartColors = useCallback(() => {
    const isDark = theme === 'dark';
    return {
      background: isDark ? '#1E222D' : '#FFFFFF', // Dark slate blue / White
      textColor: isDark ? '#D1D4DC' : '#333333', // Light Gray-Blue / Dark Gray
      gridColor: isDark ? '#2A2E39' : '#E0E0E0', // Darker border / Light Gray border
      borderColor: isDark ? '#383E4A' : '#C0C0C0', // Slightly lighter border
      wickUpColor: isDark ? '#26A69A' : '#26A69A', // Teal
      wickDownColor: isDark ? '#EF5350' : '#EF5350', // Red
      barUpColor: isDark ? '#26A69A' : '#26A69A',
      barDownColor: isDark ? '#EF5350' : '#EF5350',
      lineColor: isDark ? '#2196F3' : '#2196F3', // Blue
      areaTopColor: isDark ? 'rgba(33, 150, 243, 0.4)' : 'rgba(33, 150, 243, 0.4)',
      areaBottomColor: isDark ? 'rgba(33, 150, 243, 0.01)' : 'rgba(33, 150, 243, 0.01)',
      baselineTopFillColor1: isDark ? 'rgba(38, 166, 154, 0.28)' : 'rgba(38, 166, 154, 0.28)',
      baselineTopFillColor2: isDark ? 'rgba(38, 166, 154, 0.05)' : 'rgba(38, 166, 154, 0.05)',
      baselineTopLineColor: isDark ? 'rgba(38, 166, 154, 1)' : 'rgba(38, 166, 154, 1)',
      baselineBottomFillColor1: isDark ? 'rgba(239, 83, 80, 0.05)' : 'rgba(239, 83, 80, 0.05)',
      baselineBottomFillColor2: isDark ? 'rgba(239, 83, 80, 0.28)' : 'rgba(239, 83, 80, 0.28)',
      baselineBottomLineColor: isDark ? 'rgba(239, 83, 80, 1)' : 'rgba(239, 83, 80, 1)',
      maColor: isDark ? '#FFCA28' : '#FFA000', // Amber / Orange
    };
  }, [theme]);

  const calculateMA = (data: OHLCVData[], period: number): { time: string; value: number }[] => {
    if (period <= 0 || data.length < period) return [];
    const result: { time: string; value: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({ time: data[i].time, value: sum / period });
    }
    return result;
  };
  
  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const colors = getChartColors();
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450, // Fixed height for the chart content area
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textColor,
      },
      grid: {
        vertLines: { color: colors.gridColor, style: LineStyle.Dotted },
        horzLines: { color: colors.gridColor, style: LineStyle.Dotted },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: colors.borderColor },
      timeScale: { borderColor: colors.borderColor, timeVisible: true, secondsVisible: false },
    });
    chartApiRef.current = chart;

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) { return; }
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height: 450 }); // keep height fixed
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartApiRef.current = null;
    };
  }, [getChartColors]);

  // Update chart series based on type and data
  useEffect(() => {
    if (!chartApiRef.current) return;

    // Remove existing series before adding a new one
    if (seriesRef.current) {
      chartApiRef.current.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    if (maSeriesRef.current) {
      chartApiRef.current.removeSeries(maSeriesRef.current);
      maSeriesRef.current = null;
    }
    
    const colors = getChartColors();
    let newSeries: ISeriesApi<ChartType> | null = null;

    const chartData = sampleData.map(d => ({
        ...d,
        time: d.time as UTCTimestamp // Assuming YYYY-MM-DD is fine for time
    }));

    switch (selectedChartType) {
      case 'candlestick':
        newSeries = chartApiRef.current.addCandlestickSeries({
          upColor: colors.barUpColor,
          downColor: colors.barDownColor,
          wickUpColor: colors.wickUpColor,
          wickDownColor: colors.wickDownColor,
          borderVisible: false,
        } as CandlestickSeriesPartialOptions);
        (newSeries as ISeriesApi<'Candlestick'>).setData(chartData);
        break;
      case 'line':
        newSeries = chartApiRef.current.addLineSeries({ color: colors.lineColor, lineWidth: 2 } as LineSeriesPartialOptions);
        (newSeries as ISeriesApi<'Line'>).setData(chartData.map(d => ({ time: d.time, value: d.close })));
        break;
      case 'area':
        newSeries = chartApiRef.current.addAreaSeries({
          lineColor: colors.lineColor,
          topColor: colors.areaTopColor,
          bottomColor: colors.areaBottomColor,
          lineWidth: 2,
        } as AreaSeriesPartialOptions);
        (newSeries as ISeriesApi<'Area'>).setData(chartData.map(d => ({ time: d.time, value: d.close })));
        break;
      case 'bar':
        newSeries = chartApiRef.current.addBarSeries({
            upColor: colors.barUpColor,
            downColor: colors.barDownColor,
        } as BarSeriesPartialOptions);
        (newSeries as ISeriesApi<'Bar'>).setData(chartData);
        break;
      case 'heikin-ashi':
         newSeries = chartApiRef.current.addCandlestickSeries({ // Heikin Ashi uses CandlestickSeries with specific data transformation
            upColor: colors.barUpColor,
            downColor: colors.barDownColor,
            wickUpColor: colors.wickUpColor,
            wickDownColor: colors.wickDownColor,
            borderVisible: false,
        } as CandlestickSeriesPartialOptions); // Cast to specific options
        // Heikin Ashi data calculation is complex and would typically be done server-side or in a dedicated utility
        // For this example, we'll just use regular candlestick data. A true Heikin Ashi requires transformed OHLC.
        console.warn("Heikin Ashi chart type selected, but using standard OHLC data. True Heikin Ashi data transformation is required.");
        (newSeries as ISeriesApi<'Candlestick'>).setData(chartData); 
        break;
       case 'baseline':
        newSeries = chartApiRef.current.addBaselineSeries({
            baseValue: { type: 'price', price: (sampleData[0].open + sampleData[0].close) / 2 }, // Example baseline
            topFillColor1: colors.baselineTopFillColor1,
            topFillColor2: colors.baselineTopFillColor2,
            topLineColor: colors.baselineTopLineColor,
            bottomFillColor1: colors.baselineBottomFillColor1,
            bottomFillColor2: colors.baselineBottomFillColor2,
            bottomLineColor: colors.baselineBottomLineColor,
            lineWidth: 2,
        } as BaselineSeriesPartialOptions);
        (newSeries as ISeriesApi<'Baseline'>).setData(chartData.map(d => ({ time: d.time, value: d.close })));
        break;
    }
    seriesRef.current = newSeries;

    if (selectedIndicator === 'moving-average' && newSeries) {
      const maData = calculateMA(sampleData, maPeriod);
      if (maData.length > 0) {
        const newMaSeries = chartApiRef.current.addLineSeries({
          color: colors.maColor,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        newMaSeries.setData(maData.map(d => ({time: d.time as UTCTimestamp, value: d.value})));
        maSeriesRef.current = newMaSeries;
      }
    }
    chartApiRef.current.timeScale().fitContent();

  }, [selectedChartType, selectedIndicator, maPeriod, getChartColors]);


  // Update chart theme colors
  useEffect(() => {
    if (!chartApiRef.current) return;
    const colors = getChartColors();
    chartApiRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textColor,
      },
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      rightPriceScale: { borderColor: colors.borderColor },
      timeScale: { borderColor: colors.borderColor },
    });

    // Re-apply series colors if they depend on theme
    if (seriesRef.current) {
        switch (selectedChartType) {
            case 'candlestick':
            case 'heikin-ashi': // Assuming it uses candlestick series under the hood
                seriesRef.current.applyOptions({
                    upColor: colors.barUpColor,
                    downColor: colors.barDownColor,
                    wickUpColor: colors.wickUpColor,
                    wickDownColor: colors.wickDownColor,
                } as CandlestickSeriesPartialOptions);
                break;
            case 'line':
                seriesRef.current.applyOptions({ color: colors.lineColor } as LineSeriesPartialOptions);
                break;
            case 'area':
                seriesRef.current.applyOptions({
                    lineColor: colors.lineColor,
                    topColor: colors.areaTopColor,
                    bottomColor: colors.areaBottomColor,
                } as AreaSeriesPartialOptions);
                break;
            case 'bar':
                 seriesRef.current.applyOptions({
                    upColor: colors.barUpColor,
                    downColor: colors.barDownColor,
                } as BarSeriesPartialOptions);
                break;
            case 'baseline':
                seriesRef.current.applyOptions({
                    topFillColor1: colors.baselineTopFillColor1,
                    topFillColor2: colors.baselineTopFillColor2,
                    topLineColor: colors.baselineTopLineColor,
                    bottomFillColor1: colors.baselineBottomFillColor1,
                    bottomFillColor2: colors.baselineBottomFillColor2,
                    bottomLineColor: colors.baselineBottomLineColor,
                } as BaselineSeriesPartialOptions);
                break;
        }
    }
    if (maSeriesRef.current) {
        maSeriesRef.current.applyOptions({ color: colors.maColor });
    }

  }, [theme, getChartColors, selectedChartType]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-4 p-2 md:p-4 border-b border-[hsl(var(--border))]">
        <div>
          <Label htmlFor="chartTypeSelect" className="text-xs">Chart Type</Label>
          <Select value={selectedChartType} onValueChange={(value) => setSelectedChartType(value as ChartType)}>
            <SelectTrigger id="chartTypeSelect" className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="candlestick">Candlestick</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="heikin-ashi">Heikin Ashi</SelectItem>
              <SelectItem value="baseline">Baseline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="indicatorSelect" className="text-xs">Indicator</Label>
          <Select value={selectedIndicator} onValueChange={(value) => setSelectedIndicator(value as IndicatorType)}>
            <SelectTrigger id="indicatorSelect" className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Select indicator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="moving-average">Moving Average (20)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[450px]" />
      <p className="text-xs text-muted-foreground p-2 md:p-4 text-center">
        Note: Chart data is sample data for demonstration. A real data feed is required for live trading information and accurate indicators.
        The current WebSocket only provides L2 order book data, not OHLCV data suitable for these chart types.
      </p>
    </div>
  );
};

export default TradingViewChartInternal;

