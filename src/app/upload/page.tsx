'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ImageIcon,
  FileImage,
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';

/**
 * Componente de zona de drag and drop para subir archivos.
 */
function DropZone({
  onFilesSelected,
  isUploading,
}: {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/'),
      );

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg p-12 text-center transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50',
        isUploading && 'opacity-50 pointer-events-none',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept="image/jpeg,image/png,image/webp,image/tiff"
        onChange={handleFileInput}
        disabled={isUploading}
        multiple={false}
      />
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            'h-16 w-16 rounded-full flex items-center justify-center transition-colors',
            isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          <Upload className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-medium">
            {isDragging ? 'Suelta la imagen aquí' : 'Arrastra y suelta tu imagen'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            o haz clic para seleccionar un archivo
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>Formatos soportados: JPEG, PNG, WEBP, TIFF</p>
          <p>Tamaño máximo: 50 MB</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de archivo seleccionado.
 */
function SelectedFile({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useState(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  });

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileImage className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="p-2 hover:bg-muted rounded-full transition-colors"
        disabled={false}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Opciones de configuración para el procesamiento.
 */
function ProcessingOptions({
  options,
  onChange,
}: {
  options: ProcessingOptions;
  onChange: (options: ProcessingOptions) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Opciones de Procesamiento</h3>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={options.runAIAnalysis}
          onChange={(e) =>
            onChange({ ...options, runAIAnalysis: e.target.checked })
          }
          className="h-4 w-4 rounded border-input"
        />
        <div>
          <p className="font-medium text-sm">Análisis con IA</p>
          <p className="text-xs text-muted-foreground">
            Generar prompts y sugerencias de optimización
          </p>
        </div>
      </label>

      <div className="space-y-2">
        <label className="text-sm font-medium">Vertical del Producto</label>
        <select
          value={options.vertical}
          onChange={(e) =>
            onChange({ ...options, vertical: e.target.value as ProcessingOptions['vertical'] })
          }
          className="input w-full"
        >
          <option value="fashion">Fashion</option>
          <option value="electronics">Electronics</option>
          <option value="home">Home</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tono de Marca</label>
        <select
          value={options.tone}
          onChange={(e) =>
            onChange({ ...options, tone: e.target.value as ProcessingOptions['tone'] })
          }
          className="input w-full"
        >
          <option value="premium">Premium</option>
          <option value="neutral">Neutral</option>
          <option value="mass-market">Mass Market</option>
        </select>
      </div>
    </div>
  );
}

interface ProcessingOptions {
  runAIAnalysis: boolean;
  vertical: 'fashion' | 'electronics' | 'home' | 'other';
  tone: 'premium' | 'neutral' | 'mass-market';
}

/**
 * Página de subida de imágenes.
 */
export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    runAIAnalysis: true,
    vertical: 'fashion',
    tone: 'neutral',
  });

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFile(files[0]);
    setUploadError(null);
    setUploadSuccess(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(null);
  }, []);

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('runAIAnalysis', String(processingOptions.runAIAnalysis));
      formData.append(
        'brandContext',
        JSON.stringify({
          vertical: processingOptions.vertical,
          tone: processingOptions.tone,
        }),
      );

      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir el archivo');
      }

      const data = await response.json();
      setUploadSuccess(`Imagen subida exitosamente. Job ID: ${data.jobId}`);

      // Redirigir a jobs después de 2 segundos
      setTimeout(() => {
        router.push('/jobs');
      }, 2000);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Error desconocido al subir',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subir Imagen</h1>
        <p className="text-muted-foreground mt-1">
          Sube una imagen para procesarla con IA y generar las versiones optimizadas
        </p>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div className="card-content p-6 space-y-6">
          {!selectedFile ? (
            <DropZone
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
            />
          ) : (
            <div className="space-y-4">
              <SelectedFile file={selectedFile} onRemove={handleRemoveFile} />
              <ProcessingOptions
                options={processingOptions}
                onChange={setProcessingOptions}
              />
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="flex items-center gap-2 p-4 border border-success/50 bg-success/10 rounded-lg text-success">
              <CheckCircle className="h-5 w-5" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Subiendo y procesando...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          {selectedFile && !isUploading && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleRemoveFile}
                className="btn-outline"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Procesar Imagen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Información del Procesamiento</h2>
        </div>
        <div className="card-content">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Versiones Generadas</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• V1 Master 4K (4096x4096)</li>
                <li>• V2 Grid (2048x2048)</li>
                <li>• V3 PDP (1200x1200)</li>
                <li>• V4 Thumbnail (600x600)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Optimizaciones</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Formato WEBP optimizado</li>
                <li>• Compresión inteligente</li>
                <li>• Análisis de IA (opcional)</li>
                <li>• Prompts enterprise</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
