'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { createEditor, Descendant, Editor, Transforms, Text } from 'slate';
import dynamic from 'next/dynamic';

// Dynamically import DOMPurify client-side
const DOMPurify = dynamic(() => import('dompurify'), { ssr: false });

// Define types
interface ProviderInput {
  name: string;
  type: string;
  defaultValue: string;
  description: string; // HTML string
}

interface Provider {
  _id: string;
  name: string;
  inputs: ProviderInput[];
  pricing?: { [key: string]: { price: string; url: string } };
}

// Slate.js serializer for HTML
const serialize = (nodes: Descendant[]): string => {
  console.log('Serializing nodes:', JSON.stringify(nodes, null, 2));
  const html = nodes
    .map((node) => {
      if (Text.isText(node)) {
        let text = node.text || '';
        if (node.bold) text = `<strong>${text}</strong>`;
        if (node.italic) text = `<em>${text}</em>`;
        if (node.underline) text = `<u>${text}</u>`;
        return text;
      }
      const children = serialize(node.children);
      switch (node.type) {
        case 'paragraph':
          return `<p>${children}</p>`;
        case 'ul':
          return `<ul>${children}</ul>`;
        case 'li':
          return `<li>${children}</li>`;
        default:
          return children;
      }
    })
    .join('');
  const sanitized = DOMPurify.sanitize ? DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'ul', 'li'],
    ALLOWED_ATTR: [],
  }) : html;
  console.log('Serialized HTML:', sanitized);
  return sanitized;
};

const deserialize = (html: string): Descendant[] => {
  console.log('Deserializing HTML:', html);
  try {
    const sanitized = DOMPurify.sanitize ? DOMPurify.sanitize(html || '<p></p>', {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'ul', 'li'],
      ALLOWED_ATTR: [],
    }) : (html || '<p></p>');
    // Ensure document is available (client-side only)
    if (typeof document === 'undefined') {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }
    const div = document.createElement('div');
    div.innerHTML = sanitized;
    const nodes: Descendant[] = [];

    const processNode = (element: Node): Descendant | null => {
      if (element.nodeType === 3) {
        return { text: element.textContent || '' };
      }
      if (element.nodeType !== 1) return null;

      const node = element as HTMLElement;
      const children = Array.from(node.childNodes)
        .map(processNode)
        .filter((n): n is Descendant => n !== null);

      switch (node.tagName.toLowerCase()) {
        case 'p':
          return { type: 'paragraph', children: children.length ? children : [{ text: '' }] };
        case 'ul':
          return { type: 'ul', children: children.length ? children : [{ text: '' }] };
        case 'li':
          return { type: 'li', children: children.length ? children : [{ text: '' }] };
        case 'strong':
          return { text: node.textContent || '', bold: true };
        case 'em':
          return { text: node.textContent || '', italic: true };
        case 'u':
          return { text: node.textContent || '', underline: true };
        default:
          return children.length ? { type: 'paragraph', children } : null;
      }
    };

    Array.from(div.childNodes).forEach((child) => {
      const node = processNode(child);
      if (node) nodes.push(node);
    });

    const result = nodes.length ? nodes : [{ type: 'paragraph', children: [{ text: '' }] }];
    console.log('Deserialized nodes:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Deserialize error:', error);
    return [{ type: 'paragraph', children: [{ text: '' }] }];
  }
};

// Formatting helpers
const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  Transforms.setNodes(editor, {
    type: isActive ? 'paragraph' : format,
  });
};

const isBlockActive = (editor: Editor, format: string) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && 'type' in n && n.type === format,
  });
  return !!match;
};

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProvider, setNewProvider] = useState({
    name: '',
    inputs: [{ name: '', type: 'text', defaultValue: '', description: '' }],
  });
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editorStates, setEditorStates] = useState<Descendant[][]>(
    newProvider.inputs.map(() => [{ type: 'paragraph', children: [{ text: '' }] }])
  );
  // Initialize an array of Slate editors, one per input
  const editors = useMemo(
    () => newProvider.inputs.map(() => withReact(createEditor())),
    [newProvider.inputs.length]
  );

  // Initialize editorStates client-side
  useEffect(() => {
    setEditorStates(newProvider.inputs.map((input) => deserialize(input.description)));
  }, [newProvider.inputs]);

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

  const handleInputChange = (index: number, field: string, value: string) => {
    const updatedInputs = [...newProvider.inputs];
    updatedInputs[index] = { ...updatedInputs[index], [field]: value };
    setNewProvider({ ...newProvider, inputs: updatedInputs });
  };

  const handleEditorChange = (index: number, value: Descendant[]) => {
    setEditorStates((prev) => {
      const newStates = [...prev];
      newStates[index] = value;
      return newStates;
    });
    const html = serialize(value);
    handleInputChange(index, 'description', html);
  };

  const addInputField = () => {
    setNewProvider({
      ...newProvider,
      inputs: [...newProvider.inputs, { name: '', type: 'text', defaultValue: '', description: '' }],
    });
    setEditorStates([...editorStates, [{ type: 'paragraph', children: [{ text: '' }] }]]);
  };

  const removeInputField = (index: number) => {
    setNewProvider({
      ...newProvider,
      inputs: newProvider.inputs.filter((_, i) => i !== index),
    });
    setEditorStates(editorStates.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        await axios.put(`/api/providers/${editingProvider._id}`, newProvider);
        setProviders(
          providers.map((p) => (p._id === editingProvider._id ? { ...newProvider, _id: editingProvider._id } : p))
        );
        setEditingProvider(null);
      } else {
        const response = await axios.post('/api/providers', newProvider);
        setProviders([...providers, response.data.provider]);
      }
      setNewProvider({ name: '', inputs: [{ name: '', type: 'text', defaultValue: '', description: '' }] });
      setEditorStates([[{ type: 'paragraph', children: [{ text: '' }] }]]);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error saving provider');
    }
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setNewProvider({ name: provider.name, inputs: provider.inputs });
    setEditorStates(provider.inputs.map((input) => deserialize(input.description)));
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/providers/${id}`);
      setProviders(providers.filter((p) => p._id !== id));
      setError('');
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.response?.data?.error || 'Error deleting provider. Please ensure the delete API is available.');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await axios.post('/api/providers/duplicate', { providerId: id });
      const newProvider = response.data.provider;
      setProviders([...providers, newProvider]);
      setEditorStates(newProvider.inputs.map((input: ProviderInput) => {
        try {
          return deserialize(input.description);
        } catch {
          return [{ type: 'paragraph', children: [{ text: '' }] }];
        }
      }));
      setError('');
    } catch (err: any) {
      console.error('Duplicate error:', err);
      setError(err.response?.data?.error || 'Error duplicating provider. Please ensure the duplicate API is available.');
    }
  };

  // Slate.js render functions
  const renderElement = useCallback(({ attributes, children, element }: any) => {
    switch (element.type) {
      case 'ul':
        return <ul {...attributes}>{children}</ul>;
      case 'li':
        return <li {...attributes}>{children}</li>;
      default:
        return <p {...attributes}>{children}</p>;
    }
  }, []);

  const renderLeaf = useCallback(({ attributes, children, leaf }: any) => {
    let el = children;
    if (leaf.bold) el = <strong>{el}</strong>;
    if (leaf.italic) el = <em>{el}</em>;
    if (leaf.underline) el = <u>{el}</u>;
    return <span {...attributes}>{el}</span>;
  }, []);

  // Toolbar component
  const Toolbar = ({ editor }: { editor: ReactEditor }) => (
    <div className="flex gap-2 mb-2">
      <button
        type="button"
        className={`p-1 rounded ${isMarkActive(editor, 'bold') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => toggleMark(editor, 'bold')}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className={`p-1 rounded ${isMarkActive(editor, 'italic') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => toggleMark(editor, 'italic')}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        className={`p-1 rounded ${isMarkActive(editor, 'underline') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => toggleMark(editor, 'underline')}
      >
        <u>U</u>
      </button>
      <button
        type="button"
        className={`p-1 rounded ${isBlockActive(editor, 'ul') ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => toggleBlock(editor, 'ul')}
      >
        List
      </button>
    </div>
  );

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto">Loading providers...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Manage Providers</h1>
      <Link href="/" className="text-blue-500 hover:underline mb-4 block">
        Back to Pricing Tool
      </Link>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* Provider Form */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{editingProvider ? 'Edit Provider' : 'Add New Provider'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium">Provider Name</label>
            <input
              type="text"
              className="p-2 border rounded w-full"
              value={newProvider.name}
              onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              required
            />
          </div>
          <h3 className="text-lg font-medium mb-2">Input Fields</h3>
          {newProvider.inputs.map((input, index) => (
            <div key={index} className="mb-4 border p-4 rounded">
              <div className="mb-2">
                <label className="block text-sm font-medium">Input Name</label>
                <input
                  type="text"
                  className="p-2 border rounded w-full"
                  value={input.name}
                  onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium">Type</label>
                <select
                  className="p-2 border rounded w-full"
                  value={input.type}
                  onChange={(e) => handleInputChange(index, 'type', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium">Default Value</label>
                <input
                  type="text"
                  className="p-2 border rounded w-full"
                  value={input.defaultValue}
                  onChange={(e) => handleInputChange(index, 'defaultValue', e.target.value)}
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium">Description</label>
                <div className="border rounded p-2 bg-white slate-editor">
                  <Slate
                    editor={editors[index]}
                    initialValue={editorStates[index]}
                    onChange={(value) => handleEditorChange(index, value)}
                  >
                    <Toolbar editor={editors[index]} />
                    <Editable
                      renderElement={renderElement}
                      renderLeaf={renderLeaf}
                      placeholder="Enter description..."
                      className="min-h-[100px]"
                      onKeyDown={(event) => {
                        if (event.ctrlKey || event.metaKey) {
                          switch (event.key) {
                            case 'b':
                              event.preventDefault();
                              toggleMark(editors[index], 'bold');
                              break;
                            case 'i':
                              event.preventDefault();
                              toggleMark(editors[index], 'italic');
                              break;
                            case 'u':
                              event.preventDefault();
                              toggleMark(editors[index], 'underline');
                              break;
                          }
                        }
                      }}
                    />
                  </Slate>
                </div>
              </div>
              <button
                type="button"
                className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                onClick={() => removeInputField(index)}
              >
                Remove Input
              </button>
            </div>
          ))}
          <button
            type="button"
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4"
            onClick={addInputField}
          >
            Add Input Field
          </button>
          <button
            type="submit"
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            {editingProvider ? 'Update Provider' : 'Create Provider'}
          </button>
        </form>
      </div>

      {/* Provider List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Existing Providers</h2>
        {providers.length === 0 ? (
          <p>No providers found.</p>
        ) : (
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Name</th>
                <th className="border p-2">Inputs</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider._id}>
                  <td className="border p-2">{provider.name}</td>
                  <td className="border p-2">
                    {provider.inputs.map((input) => input.name).join(', ')}
                  </td>
                  <td className="border p-2 flex gap-2">
                    <button
                      className="bg-blue-500 text-white p-1 rounded hover:bg-blue-600"
                      onClick={() => handleEdit(provider)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                      onClick={() => handleDelete(provider._id)}
                    >
                      Delete
                    </button>
                    <button
                      className="bg-yellow-500 text-white p-1 rounded hover:bg-yellow-600"
                      onClick={() => handleDuplicate(provider._id)}
                    >
                      Duplicate
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
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 0.85rem;
        }
        .prose th,
        .prose td {
          border: 1px solid #e5e7eb;
          padding: 12px;
          text-align: left;
          vertical-align: top;
        }
        .prose th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        .flex {
          display: flex;
          gap: 8px;
        }
        .slate-editor {
          min-height: 100px;
          padding: 8px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background-color: #fff;
        }
        .slate-editor :global(strong) {
          font-weight: 700;
        }
        .slate-editor :global(em) {
          font-style: italic;
        }
        .slate-editor :global(u) {
          text-decoration: underline;
        }
        .slate-editor :global(ul) {
          list-style-type: disc;
          padding-left: 20px;
        }
      `}</style>
    </div>
  );
}