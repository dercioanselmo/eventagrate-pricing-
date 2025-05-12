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

interface ProviderData {
  provider: string;
  inputs: { [key: string]: string | number };
}

export default function Home() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [inputs, setInputs] = useState<{ [key: string]: string | number }>({});
  const [addedProviders, setAddedProviders] = useState<ProviderData[]>([]);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch providers from MongoDB
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

  useEffect(() => {
    // Pre-fill inputs with default values when provider is selected
    if (selectedProvider) {
      const selected = providers.find((p) => p.name === selectedProvider);
      if (selected) {
        const defaultInputs = selected.inputs.reduce((acc, field) => {
          if (field.defaultValue) {
            acc[field.name] = field.type === 'number' ? Number(field.defaultValue) : field.defaultValue;
          }
          return acc;
        }, {} as { [key: string]: string | number });
        setInputs(defaultInputs);
      }
    } else {
      setInputs({});
    }
  }, [selectedProvider, providers]);

  const handleInputChange = (name: string, value: string) => {
    setInputs({ ...inputs, [name]: value });
  };

  const handleAddProvider = async () => {
    if (!selectedProvider || !Object.keys(inputs).length) {
      setError('Please select a provider and fill in all inputs.');
      return;
    }

    // Validate: ensure all fields are filled
    const selected = providers.find((p) => p.name === selectedProvider);
    if (selected) {
      const missingFields = selected.inputs.filter((field) => !inputs[field.name]);
      if (missingFields.length > 0) {
        setError(`Please fill in: ${missingFields.map((f) => f.name).join(', ')}`);
        return;
      }
    }

    try {
      await axios.post('/api/calculate', {
        provider: selectedProvider,
        inputs,
      });
      setAddedProviders([...addedProviders, { provider: selectedProvider, inputs }]);
      setInputs({});
      setSelectedProvider('');
      setError('');
    } catch (err) {
      setError('Error adding provider. Please try again.');
    }
  };

  const generateReport = async () => {
    if (!addedProviders.length) {
      setError('No providers added. Please add at least one provider.');
      return;
    }

    try {
      const response = await axios.post('/api/report', { providers: addedProviders });
      setReport(response.data.report);
      setError('');
    } catch (err) {
      setError('Error generating report. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto">Loading providers...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Eventagrate Cloud Pricing</h1>

      <div className="mb-4">
        <Link href="/providers" className="text-blue-500 hover:underline">
          Manage Providers
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium">Select Provider</label>
        <select
          className="mt-1 p-2 border rounded w-full"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
        >
          <option value="">Choose a provider</option>
          {providers.map((provider) => (
            <option key={provider.name} value={provider.name}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProvider && (
        <div className="mb-4">
          {providers
            .find((p) => p.name === selectedProvider)
            ?.inputs.map((field) => (
              <div key={field.name} className="mb-4">
                <label className="block text-sm font-medium">{field.name}</label>
                <input
                  type={field.type}
                  className="mt-1 p-2 border rounded w-full"
                  value={inputs[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required
                />
                {field.description && (
                  <div
                    className="mt-2 text-sm text-gray-600"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(field.description) }}
                  />
                )}
              </div>
            ))}
          <button
            className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            onClick={handleAddProvider}
          >
            Add Provider
          </button>
        </div>
      )}

      {addedProviders.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Added Providers</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Provider</th>
                <th className="border p-2">Inputs</th>
              </tr>
            </thead>
            <tbody>
              {addedProviders.map((item, index) => (
                <tr key={index}>
                  <td className="border p-2">{item.provider}</td>
                  <td className="border p-2">{JSON.stringify(item.inputs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="mt-4 bg-green-500 text-white p-2 rounded hover:bg-green-600"
            onClick={generateReport}
          >
            Generate Report
          </button>
        </div>
      )}

      {report && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold">Cost Report</h2>
          <p className="whitespace-pre-wrap">{report}</p>
        </div>
      )}
    </div>
  );
}