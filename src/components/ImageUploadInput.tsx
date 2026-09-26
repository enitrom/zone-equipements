import React, { useRef, useState } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { resolveImageUrl, handleImageError } from '../constants';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  helperText?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  label,
  placeholder = "https://... ou téléversez un fichier depuis votre appareil",
  id,
  helperText
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP, GIF, SVG).');
      return;
    }

    setIsProcessing(true);

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIsProcessing(false);
        const result = event.target?.result as string;
        if (result) {
          onChange(result);
        }
      };
      reader.onerror = () => {
        setIsProcessing(false);
        setError('Impossible de lire le fichier SVG.');
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsProcessing(false);
        setError('Impossible de lire le fichier image.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const max_size = 1200; // Sharp HD resolution for desktop & retina displays
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > max_size) {
              height = Math.round(height * (max_size / width));
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width = Math.round(width * (max_size / height));
              height = max_size;
            }
          }
          
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            const isPngOrWebp = file.type === 'image/png' || file.type === 'image/webp';
            
            if (!isPngOrWebp) {
              // Fill with clean white background for non-transparent JPEGs
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            const mimeType = isPngOrWebp ? 'image/webp' : 'image/jpeg';
            const compressed = canvas.toDataURL(mimeType, 0.85);
            setIsProcessing(false);
            onChange(compressed);
          } else {
            setIsProcessing(false);
            onChange(result);
          }
        } catch {
          setIsProcessing(false);
          onChange(result);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        onChange(result);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setError('Impossible de lire le fichier image.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClear = () => {
    onChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = resolveImageUrl(value, '');

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* URL or Upload Input Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => {
              setError('');
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6600]"
          />
          <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded"
              title="Effacer l'image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 border border-slate-700 cursor-pointer"
          title="Parcourir vos fichiers locaux"
        >
          <Upload className="w-3.5 h-3.5 text-[#FF6600]" />
          <span>{isProcessing ? 'Traitement...' : 'Importer Fichier'}</span>
        </button>
      </div>

      {/* Drag & Drop zone or Preview container */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-3 text-center transition-all ${
          isDragOver
            ? 'border-[#FF6600] bg-orange-950/20'
            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
        }`}
      >
        {value ? (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
              <img
                src={displayUrl || value}
                alt="Aperçu"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e)}
              />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <p className="text-xs text-white font-semibold truncate">Image active</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {value.startsWith('data:') ? 'Image importée depuis vos fichiers locaux' : value}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-[#FF6600] hover:underline font-semibold cursor-pointer"
                >
                  Remplacer par un autre fichier
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] text-rose-400 hover:underline font-semibold cursor-pointer"
                >
                  Supprimer l'image
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer py-2.5 flex flex-col items-center justify-center hover:opacity-90"
          >
            <ImageIcon className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-xs text-slate-400">
              Glissez-déposez une image ici, ou <span className="text-[#FF6600] font-semibold underline">parcourez vos dossiers</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WebP, SVG (qualité optimisée)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {helperText && !error && (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
};
