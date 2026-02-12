import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function Import() {
  const [file, setFile] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.filter({ is_active: true }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: importBatches = [] } = useQuery({
    queryKey: ['import-batches'],
    queryFn: () => base44.entities.ImportBatch.list('-created_date', 10),
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedEntity || !selectedAccount) {
      alert('Please select entity, account, and file');
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const fileType = file.name.endsWith('.csv') ? 'csv' : 'pdf';
      
      const batch = await base44.entities.ImportBatch.create({
        entity_id: selectedEntity,
        account_id: selectedAccount,
        file_name: file.name,
        file_url: file_url,
        file_type: fileType,
        status: 'processing',
      });

      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['income', 'expense'] },
          },
        },
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: schema,
      });

      if (extractResult.status === 'success' && extractResult.output) {
        const transactions = extractResult.output;
        const categorizedTransactions = transactions.map(t => {
          let categoryId = null;
          const description = (t.description || '').toLowerCase();
          
          for (const category of categories) {
            if (category.auto_categorization_rules) {
              for (const rule of category.auto_categorization_rules) {
                if (description.includes(rule.toLowerCase())) {
                  categoryId = category.id;
                  break;
                }
              }
            }
            if (categoryId) break;
          }

          const miscCategory = categories.find(c => c.name === 'Misc' || c.name === 'Miscellaneous');
          if (!categoryId && miscCategory) {
            categoryId = miscCategory.id;
          }

          return {
            entity_id: selectedEntity,
            account_id: selectedAccount,
            type: t.type || (t.amount > 0 ? 'income' : 'expense'),
            amount: Math.abs(t.amount),
            date: t.date,
            description: t.description,
            category_id: categoryId,
            import_source: fileType,
            import_batch_id: batch.id,
          };
        });

        await base44.entities.Transaction.bulkCreate(categorizedTransactions);

        await base44.entities.ImportBatch.update(batch.id, {
          status: 'completed',
          transactions_imported: categorizedTransactions.length,
        });

        setImportResult({
          success: true,
          count: categorizedTransactions.length,
        });

        queryClient.invalidateQueries(['transactions']);
        queryClient.invalidateQueries(['import-batches']);
      } else {
        await base44.entities.ImportBatch.update(batch.id, {
          status: 'failed',
          error_message: extractResult.details || 'Failed to extract data',
        });

        setImportResult({
          success: false,
          error: extractResult.details || 'Failed to extract data from file',
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        error: error.message,
      });
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import Bank Statements</h1>
          <p className="text-gray-500 mt-1">Upload CSV or PDF bank statements to automatically import transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Statement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Entity</Label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.entity_id === selectedEntity).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bank Statement File</Label>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {file ? file.name : 'Click to upload CSV or PDF'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">CSV or PDF files only</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
            <Button
              onClick={handleImport}
              disabled={!file || !selectedEntity || !selectedAccount || uploading}
              className="w-full"
            >
              {uploading ? 'Importing...' : 'Import Transactions'}
            </Button>

            {importResult && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${
                importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  {importResult.success ? (
                    <>
                      <p className="font-medium text-green-900">Import Successful!</p>
                      <p className="text-sm text-green-700 mt-1">
                        Imported {importResult.count} transactions. You can now review and recategorize them if needed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-red-900">Import Failed</p>
                      <p className="text-sm text-red-700 mt-1">{importResult.error}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {importBatches.map(batch => (
                <div key={batch.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{batch.file_name}</p>
                      <p className="text-sm text-gray-500">{batch.created_date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      batch.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : batch.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {batch.status}
                    </div>
                    {batch.transactions_imported > 0 && (
                      <p className="text-sm text-gray-600 mt-1">{batch.transactions_imported} transactions</p>
                    )}
                  </div>
                </div>
              ))}
              {importBatches.length === 0 && (
                <p className="text-center text-gray-500 py-4">No imports yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}