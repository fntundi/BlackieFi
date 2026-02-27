import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Database
} from 'lucide-react';

export default function Import() {
  const [file, setFile] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts(),
  });

  const { data: importBatches = [] } = useQuery({
    queryKey: ['import-batches'],
    queryFn: () => api.getImportBatches(),
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities, selectedEntity]);

  const filteredAccounts = accounts.filter(a => a.entity_id === selectedEntity);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedEntity || !selectedAccount) {
      toast.error('Please select entity, account, and file');
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const isPDF = file.name.toLowerCase().endsWith('.pdf');
      const result = isPDF 
        ? await api.importPDF(selectedEntity, selectedAccount, file)
        : await api.importCSV(selectedEntity, selectedAccount, file);
      
      setImportResult({
        success: true,
        count: result.transactions_imported,
        message: result.message,
      });
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['import-batches']);
      toast.success(result.message || `Imported ${result.transactions_imported} transactions`);
    } catch (error) {
      setImportResult({
        success: false,
        error: error.message,
      });
      toast.error('Import failed');
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const deleteBatchMutation = useMutation({
    mutationFn: ({ id, deleteTransactions }) => api.deleteImportBatch(id, deleteTransactions),
    onSuccess: () => {
      queryClient.invalidateQueries(['import-batches']);
      queryClient.invalidateQueries(['transactions']);
      toast.success('Batch deleted');
    },
  });

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: '#0F0F0F',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    width: '100%'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="import-page">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Data Import</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Import Bank Statements</h1>
          <p style={{ marginTop: '0.5rem', color: '#525252' }}>Upload CSV files to automatically import transactions</p>
        </div>

        {/* Upload Section */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Upload style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Upload Statement</h2>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Entity</label>
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setSelectedAccount('');
                }}
                style={inputStyle}
                data-testid="entity-select"
              >
                <option value="">Select entity...</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                style={inputStyle}
                data-testid="account-select"
              >
                <option value="">Select account...</option>
                {filteredAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Statement File</label>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  borderRadius: '12px',
                  border: '2px dashed rgba(212, 175, 55, 0.3)',
                  background: 'rgba(212, 175, 55, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Database style={{ width: '32px', height: '32px', color: '#D4AF37', marginBottom: '0.75rem' }} />
                <p style={{ color: '#F5F5F5', fontWeight: '500', marginBottom: '0.25rem' }}>
                  {file ? file.name : 'Click to upload CSV or PDF'}
                </p>
                <p style={{ color: '#525252', fontSize: '0.75rem' }}>CSV or PDF bank statements</p>
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  data-testid="file-input"
                />
              </label>
            </div>

            <button
              onClick={handleImport}
              disabled={!file || !selectedEntity || !selectedAccount || uploading}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1rem',
                background: (!file || !selectedEntity || !selectedAccount || uploading) 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                color: (!file || !selectedEntity || !selectedAccount || uploading) ? '#525252' : '#000',
                border: 'none',
                cursor: (!file || !selectedEntity || !selectedAccount || uploading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              data-testid="import-btn"
            >
              {uploading ? (
                <>
                  <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  Importing...
                </>
              ) : (
                <>
                  <Upload style={{ width: '20px', height: '20px' }} />
                  Import Transactions
                </>
              )}
            </button>

            {importResult && (
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                background: importResult.success ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                border: `1px solid ${importResult.success ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                {importResult.success ? (
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#059669', flexShrink: 0, marginTop: '0.125rem' }} />
                ) : (
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#DC2626', flexShrink: 0, marginTop: '0.125rem' }} />
                )}
                <div>
                  {importResult.success ? (
                    <>
                      <p style={{ fontWeight: '600', color: '#059669', marginBottom: '0.25rem' }}>Import Successful!</p>
                      <p style={{ fontSize: '0.875rem', color: '#059669' }}>
                        Imported {importResult.count} transactions. Review them in the Transactions page.
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontWeight: '600', color: '#DC2626', marginBottom: '0.25rem' }}>Import Failed</p>
                      <p style={{ fontSize: '0.875rem', color: '#DC2626' }}>{importResult.error}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Imports */}
        <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <FileText style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Recent Imports</h2>
          </div>

          {importBatches.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#525252', padding: '2rem' }}>No imports yet</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {importBatches.map(batch => (
                <div
                  key={batch.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileText style={{ width: '20px', height: '20px', color: '#525252' }} />
                    <div>
                      <p style={{ fontWeight: '500', color: '#F5F5F5', marginBottom: '0.125rem' }}>{batch.file_name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#525252' }}>{batch.created_date?.split('T')[0]}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.625rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: batch.status === 'completed' ? 'rgba(5, 150, 105, 0.2)' : batch.status === 'failed' ? 'rgba(220, 38, 38, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                        color: batch.status === 'completed' ? '#059669' : batch.status === 'failed' ? '#DC2626' : '#D4AF37'
                      }}>
                        {batch.status}
                      </span>
                      {batch.transactions_imported > 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#737373', marginTop: '0.25rem' }}>{batch.transactions_imported} transactions</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this import batch? You can also choose to delete the imported transactions.')) {
                          const deleteTransactions = window.confirm('Also delete the imported transactions?');
                          deleteBatchMutation.mutate({ id: batch.id, deleteTransactions });
                        }
                      }}
                      style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px', color: '#DC2626' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
          <p style={{ fontSize: '0.875rem', color: '#3B82F6', fontWeight: '500', marginBottom: '0.5rem' }}>CSV Format Tips</p>
          <ul style={{ fontSize: '0.8rem', color: '#A3A3A3', margin: 0, paddingLeft: '1.25rem', lineHeight: '1.6' }}>
            <li>Include columns: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>date</code>, <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>description</code>, <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>amount</code></li>
            <li>Or use: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>credit</code> and <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>debit</code> columns</li>
            <li>Transactions will be auto-categorized based on your category rules</li>
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #0A0A0A; }
      `}</style>
    </div>
  );
}
