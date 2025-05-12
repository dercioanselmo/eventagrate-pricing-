'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Slate, Editable, withReact, withHistory } from 'slate-react';
import { createEditor, Descendant, Editor, Transforms, Element as SlateElement } from 'slate';
import { withHistory as withSlateHistory } from 'slate-history';

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

// Convert HTML to Slate JSON
const htmlToSlate = (html: string): Descendant[] => {
  if (!html || html === '<p></p>' || html === '') {
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    const parseNode = (node: Node): Descendant[] => {
      if (node.nodeType === Node.TEXT_NODE) {
        return [{ text: node.textContent || '' }];
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return [];

      const element = node as HTMLElement;
      const children = Array.from(element.childNodes).flatMap(parseNode);

      switch (element.tagName.toLowerCase()) {
        case 'p':
          return [{ type: 'paragraph', children: children.length ? children : [{ text: '' }] }];
        case 'ul':
          return [{ type: 'bulleted-list', children: children.filter((c) => (c as any).type === 'list-item') }];
        case 'ol':
          return [{ type: 'numbered-list', children: children.filter((c) => (c as any).type === 'list-item') }];
        case 'li':
          return [{ type: 'list-item', children: children.length ? children : [{ text: '' }] }];
        case 'strong':
          return children.map((child) => ({ ...child, bold: true }));
        case 'em':
          return children.map((child) => ({ ...child, italic: true }));
        default:
          return children;
      }
    };

    const nodes = Array.from(body.childNodes).flatMap(parseNode);
    return nodes.length ? nodes : [{ type: 'paragraph', children: [{ text: '' }] }];
  } catch (err) {
    console.error('Error parsing HTML to Slate:', err);
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }
};

// Slate.js Editor Component
const SlateEditor = ({ value, onChange, index }: { value: string; onChange: (value: string) => void; index: number }) => {
  const editor = useMemo(() => withSlateHistory(withReact(createEditor())), []);
  const initialValue: Descendant[] = htmlToSlate(value);

  const renderElement = useCallback(({ attributes, children, element }: any) => {
    switch (element.type) {
      case 'bulleted-list':
        return <ul {...attributes}>{children}</ul>;
      case 'numbered-list':
        return <ol {...attributes}>{children}</ol>;
      case 'list-item':
        return <li {...attributes}>{children}</li>;
      case 'paragraph':
        return <p {...attributes}>{children}</p>;
      default:
        return <div {...attributes}>{children}</div>;
    }
  }, []);

  const renderLeaf = useCallback(({ attributes, children, leaf }: any) => {
    let el = children;
    if (leaf.bold) {
      el = <strong>{el}</strong>;
    }
    if (leaf.italic) {
      el = <em>{el}</em>;
    }
    return <span {...attributes}>{el}</span>;
  }, []);

  const toggleMark = (editor: Editor, format: string) => {
    const isActive = isMarkActive(editor, format);
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  };

  const toggleBlock = (editor: Editor, format: string) => {
    const isActive = isBlockActive(editor, format);
    const isList = ['bulleted-list', 'numbered-list'].includes(format);

    Transforms.unwrapNodes(editor, {
      match: (n) => ['bulleted-list', 'numbered-list'].includes((n as SlateElement).type),
      split: true,
    });

    const newProperties: Partial<SlateElement> = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    };
    Transforms.setNodes(editor, newProperties);

    if (!isActive && isList) {
      const block = { type: format, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  };

  const isMarkActive = (editor: Editor, format: string) => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  };

  const isBlockActive = (editor: Editor, format: string) => {
    const [match] = Editor.nodes(editor, {
      match: (n) => (n as SlateElement).type === format,
    });
    return !!match;
  };

  const serializeToHtml = (nodes: Descendant[]): string => {
    const html = nodes
      .map((node) => {
        if ('text' in node) {
          let text = node.text || '';
          if (node.bold) text = `<strong>${text}</strong>`;
          if (node.italic) text = `<em>${text}</em>`;
          return text;
        }
        const children = serializeToHtml(node.children);
        switch (node.type) {
          case 'paragraph':
            return `<p>${children}</p>`;
          case 'bulleted-list':
            return `<ul>${children}</ul>`;
          case 'numbered-list':
            return `<ol>${children}</ol>`;
          case 'list-item':
            return `<li>${children}</li>`;
          default:
            return children;
        }
      })
      .join('');
    return html || '';
  };

  return (
    <div className="border rounded">
      <div className="toolbar flex gap-2 p-1 bg-gray-100 rounded mb-2">
        <button
          onClick={() => toggleMark(editor, 'bold')}
          className={`px-2 py-1 rounded ${isMarkActive(editor, 'bold') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          title="Bold"
        >
          B
        </button>
        <button
          onClick={() => toggleMark(editor, 'italic')}
          className={`px-2 py-1 rounded ${isMarkActive(editor, 'italic') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          title="Italic"
        >
          I
        </button>
        <button
          onClick={() => toggleBlock(editor, 'bulleted-list')}
          className={`px-2 py-1 rounded ${isBlockActive(editor, 'bulleted-list') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          title="Bullet List"
        >
          •
        </button>
        <button
          onClick={() => toggleBlock(editor, 'numbered-list')}
          className={`px-2 py-1 rounded ${isBlockActive(editor, 'numbered-list') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          title="Numbered List"
        >
          1.
        </button>
      </div>
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={(value) => {
          const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');
          if (isAstChange) {
            const html = serializeToHtml(value);
            onChange(html);
          }
        }}
      >
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          className="p-2 min-h-[100px] prose"
          placeholder="Enter description..."
        />
      </Slate>
    </div>
  );
};

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [newProvider, setNewProvider] = useState({
    name: '',
    inputs: [{ name: '', type: 'number', defaultValue: '', description: '' }],
  });
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
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

  const handleAddInputField = () => {
    if (newProvider.inputs.length < 200) {
      setNewProvider({
        ...newProvider,
        inputs: [...newProvider.inputs, { name: '', type: 'number', defaultValue: '', description: '' }],
      });
    } else {
      setError('Maximum 5 input fields allowed.');
    }
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const updatedInputs = [...newProvider.inputs];
    updatedInputs[index] = { ...updatedInputs[index], [field]: value };
    setNewProvider({ ...newProvider, inputs: updatedInputs });
  };

  const handleRemoveInputField = (index: number) => {
    const updatedInputs = newProvider.inputs.filter((_, i) => i !== index);
    setNewProvider({ ...newProvider, inputs: updatedInputs });
  };

  const handleCreateProvider = async () => {
    if (!newProvider.name || newProvider.inputs.some((input) => !input.name)) {
      setError('Please fill in all field names and provider name.');
      return;
    }

    try {
      await axios.post('/api/providers', newProvider);
      const response = await axios.get('/api/providers');
      setProviders(response.data.providers);
      setNewProvider({ name: '', inputs: [{ name: '', type: 'number', defaultValue: '', description: '' }] });
      setError('');
    } catch (err) {
      setError('Error creating provider. Please try again.');
    }
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider || editingProvider.inputs.some((input) => !input.name)) {
      setError('Please fill in all field names.');
      return;
    }

    try {
      await axios.put('/api/providers', editingProvider);
      const response = await axios.get('/api/providers');
      setProviders(response.data.providers);
      setEditingProvider(null);
      setError('');
    } catch (err) {
      setError('Error updating provider. Please try again.');
    }
  };

  const handleDeleteProvider = async (name: string) => {
    try {
      await axios.delete('/api/providers', { data: { name } });
      const response = await axios.get('/api/providers');
      setProviders(response.data.providers);
      setError('');
    } catch (err) {
      setError('Error deleting provider. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto">Loading providers...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Manage Providers</h1>

      <div className="mb-4">
        <Link href="/" className="text-blue-500 hover:underline">
          Back to Pricing Tool
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {/* Create New Provider */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Add New Provider</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium">Provider Name</label>
          <input
            type="text"
            className="mt-1 p-2 border rounded w-full"
            value={newProvider.name}
            onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
          />
        </div>
        {newProvider.inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-end gap-4 mb-2">
              <div>
                <label className="block text-sm font-medium">Field Name</label>
                <input
                  type="text"
                  className="mt-1 p-2 border rounded w-full"
                  value={input.name}
                  onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Field Type</label>
                <select
                  className="mt-1 p-2 border rounded w-full"
                  value={input.type}
                  onChange={(e) => handleInputChange(index, 'type', e.target.value)}
                >
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Default Value</label>
                <input
                  type="text"
                  className="mt-1 p-2 border rounded w-full"
                  value={input.defaultValue}
                  onChange={(e) => handleInputChange(index, 'defaultValue', e.target.value)}
                />
              </div>
              <button
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                onClick={() => handleRemoveInputField(index)}
              >
                Remove
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <SlateEditor
                value={input.description}
                onChange={(value) => handleInputChange(index, 'description', value)}
                index={index}
              />
            </div>
          </div>
        ))}
        <button
          className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
          onClick={handleAddInputField}
        >
          Add Input Field
        </button>
        <button
          className="ml-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          onClick={handleCreateProvider}
        >
          Create Provider
        </button>
      </div>

      {/* Edit Provider */}
      {editingProvider && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Edit Provider: {editingProvider.name}</h2>
          {editingProvider.inputs.map((input, index) => (
            <div key={index} className="mb-4">
              <div className="flex items-end gap-4 mb-2">
                <div>
                  <label className="block text-sm font-medium">Field Name</label>
                  <input
                    type="text"
                    className="mt-1 p-2 border rounded w-full"
                    value={input.name}
                    onChange={(e) => {
                      const updatedInputs = [...editingProvider.inputs];
                      updatedInputs[index].name = e.target.value;
                      setEditingProvider({ ...editingProvider, inputs: updatedInputs });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Field Type</label>
                  <select
                    className="mt-1 p-2 border rounded w-full"
                    value={input.type}
                    onChange={(e) => {
                      const updatedInputs = [...editingProvider.inputs];
                      updatedInputs[index].type = e.target.value;
                      setEditingProvider({ ...editingProvider, inputs: updatedInputs });
                    }}
                  >
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Default Value</label>
                  <input
                    type="text"
                    className="mt-1 p-2 border rounded w-full"
                    value={input.defaultValue}
                    onChange={(e) => {
                      const updatedInputs = [...editingProvider.inputs];
                      updatedInputs[index].defaultValue = e.target.value;
                      setEditingProvider({ ...editingProvider, inputs: updatedInputs });
                    }}
                  />
                </div>
                <button
                  className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                  onClick={() => {
                    const updatedInputs = editingProvider.inputs.filter((_, i) => i !== index);
                    setEditingProvider({ ...editingProvider, inputs: updatedInputs });
                  }}
                >
                  Remove
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <SlateEditor
                  value={input.description}
                  onChange={(value) => {
                    const updatedInputs = [...editingProvider.inputs];
                    updatedInputs[index].description = value;
                    setEditingProvider({ ...editingProvider, inputs: updatedInputs });
                  }}
                  index={index}
                />
              </div>
            </div>
          ))}
          <button
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
            onClick={() => {
              if (editingProvider.inputs.length < 5) {
                setEditingProvider({
                  ...editingProvider,
                  inputs: [...editingProvider.inputs, { name: '', type: 'number', defaultValue: '', description: '' }],
                });
              } else {
                setError('Maximum 5 input fields allowed.');
              }
            }}
          >
            Add Input Field
          </button>
          <button
            className="ml-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            onClick={handleUpdateProvider}
          >
            Update Provider
          </button>
          <button
            className="ml-4 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
            onClick={() => setEditingProvider(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* List Providers */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Existing Providers</h2>
        {providers.length === 0 ? (
          <p>No providers added yet.</p>
        ) : (
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Provider Name</th>
                <th className="border p-2">Input Fields</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.name}>
                  <td className="border p-2">{provider.name}</td>
                  <td className="border p-2">
                    {provider.inputs.map((input) => input.name).join(', ')}
                  </td>
                  <td className="border p-2">
                    <button
                      className="bg-yellow-500 text-white p-1 rounded hover:bg-yellow-600 mr-2"
                      onClick={() => handleEditProvider(provider)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                      onClick={() => handleDeleteProvider(provider.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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