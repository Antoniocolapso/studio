"use client";

import type { ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InputParameters } from '@/types';

interface TradeInputPanelProps {
  inputParams: InputParameters;
  onInputChange: (newParams: InputParameters) => void;
}

export default function TradeInputPanel({ inputParams, onInputChange }: TradeInputPanelProps) {
  const handleGenericChange = (field: keyof InputParameters, value: string | number) => {
    onInputChange({ ...inputParams, [field]: value });
  };
  
  const handleQuantityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input for user to clear, parse to number if not empty
    onInputChange({ ...inputParams, quantity: value === '' ? 0 : parseFloat(value) });
  };

  const handleVolatilityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onInputChange({ ...inputParams, volatility: value === '' ? undefined : parseFloat(value) });
  };


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Trade Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="exchange">Exchange</Label>
          <Input id="exchange" value={inputParams.exchange} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="spotAsset">Spot Asset</Label>
          <Input id="spotAsset" value={inputParams.spotAsset} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderType">Order Type</Label>
          <Input id="orderType" value={inputParams.orderType} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity (BTC)</Label>
          <Input
            id="quantity"
            type="number"
            value={inputParams.quantity === 0 && inputParams.volatility === undefined ? '' : inputParams.quantity} // Show empty if 0 and volatility also not set (initial state)
            onChange={handleQuantityChange}
            placeholder="e.g., 0.00167"
            step="any"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="volatility">Volatility</Label>
          <Input
            id="volatility"
            type="number"
            value={inputParams.volatility === undefined ? '' : inputParams.volatility}
            onChange={handleVolatilityChange}
            placeholder="Market Parameter (e.g., 0.5)"
            step="any"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feeTier">Fee Tier</Label>
          <Input
            id="feeTier"
            value={inputParams.feeTier}
            onChange={(e) => handleGenericChange('feeTier', e.target.value)}
            placeholder="e.g., 0.1% or VIP1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
