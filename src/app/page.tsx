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
  _id: string;
  name: string;
  inputs: ProviderInput[];
}

interface SelectedProvider {
  provider: Provider;
  inputs: { [key: string]: string };
}

export default function Home() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});
  const [selectedProviders, setSelectedProviders] = useState<SelectedProvider[]>([]);
  const [report, setReport] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false); // New state for progress bar

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

  const handleProviderChange = (providerName: string) => {
    const provider = providers.find((p) => p.name === providerName) || null;
    setSelectedProvider(provider);
    if (provider) {
      const initialInputs = provider.inputs.reduce((acc, input) => {
        acc[input.name] = input.defaultValue || '';
        return acc;
      }, {} as { [key: string]: string });
      setInputs(initialInputs);
    } else {
      setInputs({});
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProvider = async () => {
    if (!selectedProvider) {
      setError('Please select a provider.');
      return;
    }

    const missingInputs = selectedProvider.inputs.filter(
      (input) => !inputs[input.name] && input.defaultValue === ''
    );
    if (missingInputs.length > 0) {
      setError(`Please provide values for: ${missingInputs.map((i) => i.name).join(', ')}`);
      return;
    }

    try {
      const response = await axios.post('/api/calculate', {
        provider: selectedProvider,
        inputs,
      });

      setSelectedProviders((prev) => [
        ...prev,
        { provider: selectedProvider, inputs: { ...inputs } },
      ]);
      setSelectedProvider(null);
      setInputs({});
      setReport('');
      setError('');
    } catch (err: any) {
      console.error('handleAddProvider error:', err);
      const errorMessage =
        err.response?.data?.error || err.message || 'Error adding provider. Please try again.';
      setError(errorMessage);
    }
  };

  const handleRemoveProvider = (index: number) => {
    setSelectedProviders((prev) => prev.filter((_, i) => i !== index));
    setReport('');
  };

  const handleGenerateReport = async () => {
    if (selectedProviders.length === 0) {
      setError('Please add at least one provider.');
      return;
    }

    setIsGeneratingReport(true); // Show progress bar
    try {
      const response = await axios.post('/api/report', { providers: selectedProviders });
      const reportContent = response.data.report || JSON.stringify(response.data);
      setReport(DOMPurify.sanitize(reportContent));
      setError('');
    } catch (err: any) {
      console.error('handleGenerateReport error:', err);
      setError(
        err.response?.data?.error || err.message || 'Error generating report. Please try again.'
      );
    } finally {
      setIsGeneratingReport(false); // Hide progress bar
    }
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
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Select Provider</h2>
        <select
          className="p-2 border rounded w-full mb-4"
          value={selectedProvider?.name || ''}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          <option value="">Select a provider</option>
          {providers.map((provider) => (
            <option key={provider._id} value={provider.name}>
              {provider.name}
            </option>
          ))}
        </select>

        {selectedProvider && (
          <div>
            <h3 className="text-lg font-medium mb-2">Inputs for {selectedProvider.name}</h3>
            {selectedProvider.inputs.map((input) => (
              <div key={input.name} className="mb-4">
                <label className="block text-sm font-medium">{input.name}</label>
                {input.description && (
                  <div
                    className="text-sm text-gray-600 mb-1 prose"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(input.description),
                    }}
                  />
                )}
                <input
                  type={input.type === 'number' ? 'number' : 'text'}
                  className="p-2 border rounded w-full"
                  value={inputs[input.name] || ''}
                  onChange={(e) => handleInputChange(input.name, e.target.value)}
                  placeholder={input.defaultValue || ''}
                />
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
      </div>

      {/* Selected Providers Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Selected Providers</h2>
        {selectedProviders.length === 0 ? (
          <p>No providers selected.</p>
        ) : (
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Provider Name</th>
                <th className="border p-2">Inputs</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedProviders.map((sp, index) => (
                <tr key={index}>
                  <td className="border p-2">{sp.provider.name}</td>
                  <td className="border p-2">
                    {Object.entries(sp.inputs)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ')}
                  </td>
                  <td className="border p-2">
                    <button
                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                      onClick={() => handleRemoveProvider(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Report Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Cost Report</h2>
        {isGeneratingReport && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-500 h-2.5 rounded-full animate-progress"
                style={{ width: '100%' }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Generating report...</p>
          </div>
        )}
        {report ? (
          <div
            className="border rounded p-4 prose"
            dangerouslySetInnerHTML={{ __html: report }}
          />
        ) : (
          <p>No report generated yet.</p>
        )}
      </div>

      {/* Generate Report */}
      <button
        className="bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-green-300"
        onClick={handleGenerateReport}
        disabled={isGeneratingReport}
      >
        Generate Report
      </button>

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
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-progress {
          animation: progress 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}