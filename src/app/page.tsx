'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import DOMPurify from 'dompurify';

interface ProviderInput {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

interface Provider {
  name: string;
  inputs: ProviderInput[];
}

interface Calculation {
  provider: string;
  inputs: Record<string, string>;
  results: Record<string, number>;
  totalCost: number;
}

export default function Home() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await axios.get('/api/providers');
        setProviders(response.data.providers);
        setLoading(false);
      } catch (err) {
        setError('Error fetching providers. Please try again.');
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  const handleProviderChange = (name: string) => {
    const provider = providers.find((p) => p.name === name) || null;
    setSelectedProvider(provider);
    if (provider) {
      const initialInputs = provider.inputs.reduce((acc, input) => {
        acc[input.name] = input.defaultValue;
        return acc;
      }, {} as Record<string, string>);
      setInputValues(initialInputs);
    } else {
      setInputValues({});
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProvider = async () => {
    console.log('handleAddProvider called:', { selectedProvider, inputValues });
    if (!selectedProvider) {
      setError('Please select a provider.');
      console.log('Error: No provider selected');
      return;
    }
    if (!inputValues || Object.keys(inputValues).length === 0) {
      setError('Please provide input values.');
      console.log('Error: No input values provided');
      return;
    }

    try {
      console.log('Sending to /api/calculate:', { provider: selectedProvider, inputs: inputValues });
      const response = await axios.post('/api/calculate', {
        provider: selectedProvider,
        inputs: inputValues,
      });
      setCalculations((prev) => [...prev, response.data]);
      setError('');
    } catch (err: any) {
      setError('Error calculating cost: ' + (err.response?.data?.error || 'Unknown error'));
      console.error('handleAddProvider error:', err.response?.data || err);
    }
  };

  const handleRemoveCalculation = (index: number) => {
    setCalculations((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto">Loading providers...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pricing Tool</h1>

      <div className="mb-4">
        <Link href="/providers" className="text-blue-500 hover:underline">
          Manage Providers
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {/* Provider Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Select Provider</label>
        <select
          className="mt-1 p-2 border rounded w-full"
          onChange={(e) => handleProviderChange(e.target.value)}
          value={selectedProvider?.name || ''}
        >
          <option value="">Select a provider</option>
          {providers.map((provider) => (
            <option key={provider.name} value={provider.name}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      {/* Input Fields */}
      {selectedProvider && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">{selectedProvider.name} Inputs</h2>
          {selectedProvider.inputs.map((input) => (
            <div key={input.name} className="mb-4">
              <label className="block text-sm font-medium">{input.name}</label>
              <input
                type={input.type === 'number' ? 'number' : 'text'}
                className="mt-1 p-2 border rounded w-full"
                value={inputValues[input.name] || ''}
                onChange={(e) => handleInputChange(input.name, e.target.value)}
              />
              {input.description && (
                <div
                  className="mt-2 prose"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(input.description) }}
                />
              )}
            </div>
          ))}
          <button
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            onClick={handleAddProvider}
          >
            Add Provider
          </button>
        </div>
      )}

      {/* Calculations Table */}
      {calculations.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Calculations</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Provider</th>
                <th className="border p-2">Inputs</th>
                <th className="border p-2">Results</th>
                <th className="border p-2">Total Cost</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calculations.map((calc, index) => (
                <tr key={index}>
                  <td className="border p-2">{calc.provider}</td>
                  <td className="border p-2">
                    {Object.entries(calc.inputs)
                      .map(([name, value]) => `${name}: ${value}`)
                      .join(', ')}
                  </td>
                  <td className="border p-2">
                    {Object.entries(calc.results)
                      .map(([name, value]) => `${name}: $${value.toFixed(2)}`)
                      .join(', ')}
                  </td>
                  <td className="border p-2">${calc.totalCost.toFixed(2)}</td>
                  <td className="border p-2">
                    <button
                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                      onClick={() => handleRemoveCalculation(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .prose {
          max-width: none;
        }
        .prose p {
          margin: 0 0 8px 0;
        }
        .prose ul,
        .prose ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        .prose li {
          margin: 4px 0;
        }
      `}</style>
    </div>
  );
}