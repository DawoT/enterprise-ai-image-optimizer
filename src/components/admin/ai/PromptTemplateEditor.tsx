'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';

interface PromptVariable {
  name: string;
  description: string;
  defaultValue?: string;
  type: 'string' | 'number' | 'boolean';
}

interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PromptTemplateEditorProps {
  initialTemplates?: PromptTemplate[];
  availableVariables?: PromptVariable[];
  onSave?: (template: PromptTemplate) => void;
  loading?: boolean;
  className?: string;
}

const defaultVariables: PromptVariable[] = [
  { name: 'format', description: 'Output format (webp, jpg, png)', defaultValue: 'webp', type: 'string' },
  { name: 'width', description: 'Target width in pixels', defaultValue: '1920', type: 'number' },
  { name: 'height', description: 'Target height in pixels', defaultValue: '1080', type: 'number' },
  { name: 'quality', description: 'Quality setting (1-100)', defaultValue: '80', type: 'number' },
  { name: 'compressionLevel', description: 'Compression intensity', defaultValue: 'medium', type: 'string' },
  { name: 'brightness', description: 'Brightness adjustment', defaultValue: '0', type: 'number' },
  { name: 'contrast', description: 'Contrast adjustment', defaultValue: '0', type: 'number' },
  { name: 'removeBackground', description: 'Remove background', defaultValue: 'false', type: 'boolean' },
];

const defaultTemplates: PromptTemplate[] = [
  {
    id: 'template-default',
    name: 'Default Optimization',
    description: 'Standard image optimization prompt',
    content: 'Optimize this image for web use. Reduce file size while maintaining visual quality. Target format: {{format}}. Target dimensions: {{width}}x{{height}}. Quality setting: {{quality}}.',
    variables: ['format', 'width', 'height', 'quality'],
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'template-ecommerce',
    name: 'E-commerce Product',
    description: 'Optimized for product photography',
    content: 'Enhance this product image for e-commerce. Brightness: {{brightness}}%. Contrast: {{contrast}}%. Remove background: {{removeBackground}}. Output format: {{format}}.',
    variables: ['brightness', 'contrast', 'removeBackground', 'format'],
    isDefault: false,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

export default function PromptTemplateEditor({
  initialTemplates = defaultTemplates,
  availableVariables = defaultVariables,
  onSave,
  loading = false,
  className = '',
}: PromptTemplateEditorProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplates[0]?.id || '');
  const [isLoading, setIsLoading] = useState(loading);
  const [editorContent, setEditorContent] = useState(initialTemplates[0]?.content || '');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'duplicate'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVariables, setShowVariables] = useState(true);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    description: '',
    content: '',
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const MAX_CHARS = 2000;

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<PromptTemplate[]>('/admin/ai/prompt-templates');
      setTemplates(response.data);
      if (response.data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(response.data[0].id);
        setEditorContent(response.data[0].content);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (initialTemplates.length === 0) {
      fetchTemplates();
    }
  }, [initialTemplates.length, fetchTemplates]);

  useEffect(() => {
    if (selectedTemplate) {
      setEditorContent(selectedTemplate.content);
    }
  }, [selectedTemplate]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setEditorContent(template.content);
    }
  };

  const validateContent = (content: string): string | null => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = variablePattern.exec(content)) !== null) {
      const variableName = match[1].trim();
      if (!availableVariables.find((v) => v.name === variableName)) {
        return `Invalid variable syntax: {{${variableName}}}. Use valid variables from the sidebar.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    const contentError = validateContent(editorContent);
    if (contentError) {
      setErrors({ content: contentError });
      return;
    }

    try {
      await apiClient.put(`/admin/ai/prompt-templates/${selectedTemplate.id}`, {
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        content: editorContent,
        variables: extractVariables(editorContent),
      });

      toast.success('Template saved successfully!');
      onSave?.({ ...selectedTemplate, content: editorContent });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
  };

  const extractVariables = (content: string): string[] => {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;
    while ((match = variablePattern.exec(content)) !== null) {
      variables.add(match[1].trim());
    }
    return Array.from(variables);
  };

  const handleInsertVariable = (variableName: string) => {
    setEditorContent((prev) => `${prev.length > 0 && !prev.endsWith(' ') ? prev + ' ' : prev}{{${variableName}}}`);
  };

  const handleReset = () => {
    if (selectedTemplate) {
      setEditorContent(selectedTemplate.content);
      setErrors({});
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate || selectedTemplate.isDefault) {
      toast.error('Cannot delete default template');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/ai/prompt-templates/${selectedTemplate.id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = () => {
    if (!selectedTemplate) return;
    setModalMode('duplicate');
    setNewTemplateForm({
      name: `Copy of ${selectedTemplate.name}`,
      description: selectedTemplate.description || '',
      content: selectedTemplate.content,
    });
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setModalMode('create');
    setNewTemplateForm({ name: '', description: '', content: '' });
    setShowModal(true);
  };

  const handleSaveNewTemplate = async () => {
    const newErrors: Record<string, string> = {};

    if (!newTemplateForm.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (!newTemplateForm.content.trim()) {
      newErrors.content = 'Prompt content is required';
    }

    const contentError = validateContent(newTemplateForm.content);
    if (contentError) {
      newErrors.content = contentError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await apiClient.post('/admin/ai/prompt-templates', {
        ...newTemplateForm,
        variables: extractVariables(newTemplateForm.content),
      });

      toast.success('Template created successfully!');
      setShowModal(false);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleGeneratePreview = () => {
    const preview: Record<string, unknown> = {};
    availableVariables.forEach((v) => {
      preview[v.name] = v.defaultValue || (v.type === 'number' ? 0 : v.type === 'boolean' ? false : 'value');
    });
    setPreviewData(preview);
  };

  const getPreviewContent = () => {
    let content = editorContent;
    availableVariables.forEach((v) => {
      const value = previewData[v.name] ?? v.defaultValue ?? '';
      content = content.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), String(value));
    });
    return content;
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const characterCount = editorContent.length;
  const isNearLimit = characterCount > MAX_CHARS * 0.9;
  const isOverLimit = characterCount > MAX_CHARS;

  if (isLoading) {
    return (
      <div data-testid="templates-skeleton" className={`animate-pulse ${className}`}>
        <div className="flex gap-6">
          <div className="w-64 h-96 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-6 ${className}`}>
      {/* Template List Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Templates</h3>
            <button
              onClick={handleCreateNew}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="Add new template"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Template List */}
          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedTemplateId === template.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate">{template.name}</span>
                  {template.isDefault && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{template.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedTemplate?.name}</h2>
              {selectedTemplate?.description && (
                <p className="text-sm text-gray-500 mt-1">{selectedTemplate.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDuplicate}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Duplicate
              </button>
              <button
                onClick={handleDelete}
                disabled={selectedTemplate?.isDefault}
                className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowVariables(!showVariables)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {showVariables ? 'Hide' : 'Show'} Variables
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGeneratePreview}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Generate Preview
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Editor */}
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                  placeholder="Enter your prompt template here. Use {{variable}} syntax for dynamic values."
                  className={`w-full h-64 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none ${
                    errors.content ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {/* Character Count */}
                <div className={`absolute bottom-3 right-3 text-xs ${
                  isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {characterCount} / {MAX_CHARS} characters
                </div>
              </div>
              {errors.content && (
                <p className="mt-2 text-sm text-red-600">{errors.content}</p>
              )}

              {/* Preview Panel */}
              {Object.keys(previewData).length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview Output:</h4>
                  <p data-testid="preview-output" className="text-sm text-gray-600">
                    {getPreviewContent()}
                  </p>
                </div>
              )}
            </div>

            {/* Variables Sidebar */}
            {showVariables && (
              <div className="w-64 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Available Variables</h4>
                  <div className="space-y-2">
                    {availableVariables.map((variable) => (
                      <button
                        key={variable.name}
                        onClick={() => handleInsertVariable(variable.name)}
                        className="w-full text-left p-2 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-blue-600">{{{variable.name}}}</span>
                          <span className="text-xs text-gray-400">{variable.type}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              Last updated: {selectedTemplate ? new Date(selectedTemplate.updatedAt).toLocaleDateString() : '-'}
            </span>
            <span>
              {extractVariables(editorContent).length} variables detected
            </span>
          </div>
        </div>
      </div>

      {/* Create/Duplicate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowModal(false)}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {modalMode === 'create' ? 'Create New Template' : 'Duplicate Template'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={newTemplateForm.name}
                    onChange={(e) => setNewTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="My Custom Template"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newTemplateForm.description}
                    onChange={(e) => setNewTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt Content *
                  </label>
                  <textarea
                    value={newTemplateForm.content}
                    onChange={(e) => {
                      setNewTemplateForm((prev) => ({ ...prev, content: e.target.value }));
                      if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                    }}
                    className={`w-full h-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                      errors.content ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your prompt template..."
                  />
                  {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
