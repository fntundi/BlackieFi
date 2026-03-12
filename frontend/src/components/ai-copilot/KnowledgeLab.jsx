import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useEntity } from '../../contexts/EntityContext';
import { toast } from 'sonner';
import {
  Loader2,
  Upload,
  File,
  Image,
  Video,
  Search,
  Trash2,
  Eye,
  FolderOpen
} from 'lucide-react';
import { tileStyles, buttonStyles, GoldAccentLine } from '../../styles/tileStyles';

const inputStyle = {
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  background: '#0A0A0A',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#F5F5F5',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
};

export default function KnowledgeLab({ onAnalysisComplete }) {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [analyzeQuery, setAnalyzeQuery] = useState('');

  // Fetch documents
  const { data: knowledgeDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => api.getKnowledgeDocuments(),
  });

  const { data: knowledgeStats } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: () => api.getKnowledgeStats(),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, description, tags }) =>
      api.uploadKnowledgeDocument(file, description, tags, selectedEntityId),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge-documents']);
      queryClient.invalidateQueries(['knowledge-stats']);
      toast.success('Document uploaded successfully');
      setUploadingFile(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Upload failed');
      setUploadingFile(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (docId) => api.deleteKnowledgeDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge-documents']);
      queryClient.invalidateQueries(['knowledge-stats']);
      toast.success('Document deleted');
      setSelectedDoc(null);
    },
    onError: (error) => toast.error(error.message || 'Delete failed'),
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: ({ docId, query }) => api.analyzeKnowledgeDocument(docId, query),
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          userMessage: `Analyze: ${selectedDoc?.original_filename}${analyzeQuery ? ` - ${analyzeQuery}` : ''}`,
          aiResponse: data.analysis
        });
      }
      toast.success('Analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Analysis failed'),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    uploadMutation.mutate({ file, description: null, tags: null });
    e.target.value = '';
  };

  const handleAnalyze = () => {
    if (!selectedDoc) return;
    analyzeMutation.mutate({ docId: selectedDoc.id, query: analyzeQuery });
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image': return Image;
      case 'video': return Video;
      default: return File;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept=".pdf,.txt,.csv,.docx,.xlsx,.md,.png,.jpg,.jpeg,.webp,.gif,.heic,.mp4,.mov,.webm,.avi,.mkv"
      />
      
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={tileStyles.statGold}>
          <GoldAccentLine />
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Total Documents</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>{knowledgeStats?.total_documents || 0}</p>
        </div>
        <div style={tileStyles.stat}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Documents</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>{knowledgeStats?.by_type?.document?.count || 0}</p>
        </div>
        <div style={tileStyles.stat}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Images</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>{knowledgeStats?.by_type?.image?.count || 0}</p>
        </div>
        <div style={tileStyles.stat}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Videos</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>{knowledgeStats?.by_type?.video?.count || 0}</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={tileStyles.content}>
        <GoldAccentLine />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}>
              <FolderOpen style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Knowledge Lab</h2>
              <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Upload documents for AI analysis with RAG</p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            style={{ ...buttonStyles.primary, opacity: uploadingFile ? 0.5 : 1 }}
            data-testid="upload-btn"
          >
            {uploadingFile ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: '18px', height: '18px' }} />}
            {uploadingFile ? 'Uploading...' : 'Upload File'}
          </button>
        </div>

        {/* Supported Formats */}
        <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supported Formats</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { icon: File, label: 'PDF, TXT, CSV, DOCX, XLSX, MD', color: '#D4AF37' },
              { icon: Image, label: 'PNG, JPG, WEBP, GIF, HEIC', color: '#059669' },
              { icon: Video, label: 'MP4, MOV, WEBM, AVI', color: '#8B5CF6' }
            ].map((format, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: `rgba(${format.color === '#D4AF37' ? '212, 175, 55' : format.color === '#059669' ? '5, 150, 105' : '139, 92, 246'}, 0.1)` }}>
                <format.icon style={{ width: '14px', height: '14px', color: format.color }} />
                <span style={{ fontSize: '0.75rem', color: format.color }}>{format.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Document Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} data-testid="knowledge-grid">
          {docsLoading ? (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '3rem', color: '#525252' }}>
              <Loader2 style={{ width: '32px', height: '32px', margin: '0 auto 1rem', animation: 'spin 1s linear infinite', color: '#D4AF37' }} />
              <p>Loading documents...</p>
            </div>
          ) : knowledgeDocs.length === 0 ? (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '3rem', color: '#525252' }}>
              <FolderOpen style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No documents uploaded yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Upload financial documents to analyze them with AI</p>
            </div>
          ) : (
            knowledgeDocs.map((doc) => {
              const FileIcon = getFileIcon(doc.file_type);
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(isSelected ? null : doc)}
                  style={{
                    ...tileStyles.card,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                    background: isSelected ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)' : tileStyles.card.background
                  }}
                  data-testid={`doc-${doc.id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.6rem', borderRadius: '10px', background: `rgba(${doc.file_type === 'document' ? '212, 175, 55' : doc.file_type === 'image' ? '5, 150, 105' : '139, 92, 246'}, 0.1)` }}>
                      <FileIcon style={{ width: '20px', height: '20px', color: doc.file_type === 'document' ? '#D4AF37' : doc.file_type === 'image' ? '#059669' : '#8B5CF6' }} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }}
                      style={{ padding: '0.4rem', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#F5F5F5', margin: '0 0 0.25rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.original_filename}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#8A8A8A', textTransform: 'uppercase' }}>{doc.file_type}</span>
                    <span style={{ fontSize: '0.7rem', color: '#525252' }}>•</span>
                    <span style={{ fontSize: '0.7rem', color: '#8A8A8A' }}>{formatFileSize(doc.file_size)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Analyze Panel */}
        {selectedDoc && (
          <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '16px', background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#D4AF37', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye style={{ width: '18px', height: '18px' }} />
              Analyze: {selectedDoc.original_filename}
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={analyzeQuery}
                onChange={(e) => setAnalyzeQuery(e.target.value)}
                placeholder="Ask a question about this file (optional)..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isLoading}
                style={{ ...buttonStyles.primary, opacity: analyzeMutation.isLoading ? 0.5 : 1 }}
                data-testid="analyze-doc-btn"
              >
                {analyzeMutation.isLoading ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : <Search style={{ width: '18px', height: '18px' }} />}
                Analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
