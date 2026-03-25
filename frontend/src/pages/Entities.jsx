import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'sonner';
import { Plus, Building2, X, User, Briefcase, Download, Upload, Trash2 } from 'lucide-react';
import { useEntity } from '../contexts/EntityContext';

const defaultBusinessDetails = {
  legal_name: '',
  dba_name: '',
  ein: '',
  entity_structure: '',
  formation_state: '',
  formation_date: '',
  registered_agent_name: '',
  registered_agent_email: '',
  registered_agent_phone: '',
  registered_agent_address: '',
  principal_address: '',
  mailing_address: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  fiscal_year_end: '',
  tax_filing_due_date: '',
  annual_report_due_date: '',
  renewal_date: '',
  accounting_method: '',
  payroll_provider: '',
  tax_elections: [],
  associated_accounts: [],
  primary_account_id: '',
  owners: [],
  officers: [],
  licenses: [],
  notes: ''
};

const defaultPersonalDetails = {
  legal_name: '',
  preferred_name: '',
  date_of_birth: '',
  ssn_last4: '',
  filing_status: '',
  dependents: [],
  tax_filing_due_date: '',
  primary_address: '',
  residency_state: '',
  phone: '',
  email: '',
  employment_status: '',
  employer_name: '',
  income_sources: [],
  assets: [],
  liabilities: [],
  risk_tolerance: '',
  retirement_accounts: [],
  associated_accounts: [],
  primary_account_id: '',
  notes: ''
};

const listToText = (list) => (list || []).join('\n');
const textToList = (text) => text.split('\n').map((item) => item.trim()).filter(Boolean);


const normalizeDetails = (details, defaults) => {
  const normalized = { ...defaults };
  Object.keys(defaults).forEach((key) => {
    const defaultValue = defaults[key];
    const value = details ? details[key] : undefined;
    if (Array.isArray(defaultValue)) {
      normalized[key] = Array.isArray(value) ? value : [];
    } else {
      normalized[key] = value ?? '';
    }
  });
  return normalized;
};

export default function Entities() {
  const queryClient = useQueryClient();
  const { selectEntity } = useEntity();
  const [showForm, setShowForm] = useState(false);
  const [activeEntity, setActiveEntity] = useState(null);
  const [businessDetails, setBusinessDetails] = useState(defaultBusinessDetails);
  const [personalDetails, setPersonalDetails] = useState(defaultPersonalDetails);
  const [docForm, setDocForm] = useState({
    document_type: 'other',
    title: '',
    notes: '',
    tags: '',
    file: null
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal',
  });

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const { data: entityDetails } = useQuery({
    queryKey: ['entity-details', activeEntity?.id],
    queryFn: () => api.getEntityDetails(activeEntity.id),
    enabled: !!activeEntity?.id,
  });

  const { data: entityDocuments = [] } = useQuery({
    queryKey: ['entity-documents', activeEntity?.id],
    queryFn: () => api.listEntityDocuments(activeEntity.id),
    enabled: !!activeEntity?.id,
  });

  useEffect(() => {
    if (!entityDetails) {
      return;
    }
    if (entityDetails.business_details) {
      setBusinessDetails(normalizeDetails(entityDetails.business_details, defaultBusinessDetails));
    }
    if (entityDetails.personal_details) {
      setPersonalDetails(normalizeDetails(entityDetails.personal_details, defaultPersonalDetails));
    }
  }, [entityDetails]);

  useEffect(() => {
    if (!activeEntity) {
      return;
    }
    if (activeEntity.type === 'business') {
      setBusinessDetails(defaultBusinessDetails);
    } else {
      setPersonalDetails(defaultPersonalDetails);
    }
  }, [activeEntity?.id]);


  const createMutation = useMutation({
    mutationFn: (data) => api.createEntity(data),
    onSuccess: (newEntity) => {
      queryClient.invalidateQueries(['entities']);
      toast.success('Entity created');
      setShowForm(false);
      setFormData({ name: '', type: 'personal' });
      if (newEntity?.id) {
        selectEntity(newEntity.id);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['entities']);
      toast.success('Entity deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const saveDetailsMutation = useMutation({
    mutationFn: (payload) => api.updateEntityDetails(activeEntity.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['entity-details', activeEntity?.id]);
      toast.success('Details updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadDocMutation = useMutation({
    mutationFn: (formPayload) => api.uploadEntityDocument(activeEntity.id, formPayload),
    onSuccess: () => {
      queryClient.invalidateQueries(['entity-documents', activeEntity?.id]);
      toast.success('Document uploaded');
      setDocForm({ document_type: 'other', title: '', notes: '', tags: '', file: null });
    },
    onError: (error) => toast.error(error.message || 'Upload failed'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => api.deleteEntityDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries(['entity-documents', activeEntity?.id]);
      toast.success('Document removed');
    },
    onError: (error) => toast.error(error.message || 'Delete failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSaveDetails = () => {
    if (!activeEntity) return;
    if (activeEntity.type === 'business') {
      saveDetailsMutation.mutate({ business_details: businessDetails });
    } else {
      saveDetailsMutation.mutate({ personal_details: personalDetails });
    }
  };

  const handleUploadDocument = () => {
    if (!docForm.file || !docForm.title) {
      toast.error('Please add a file and title');
      return;
    }
    const formPayload = new FormData();
    formPayload.append('file', docForm.file);
    formPayload.append('document_type', docForm.document_type);
    formPayload.append('title', docForm.title);
    if (docForm.notes) {
      formPayload.append('notes', docForm.notes);
    }
    if (docForm.tags) {
      formPayload.append('tags', docForm.tags);
    }
    uploadDocMutation.mutate(formPayload);
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const blob = await api.downloadEntityDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_filename || doc.title || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message || 'Download failed');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    background: '#0A0A0A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    fontSize: '0.9375rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="entities-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Management</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Entities</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Manage your personal and business entities</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="add-entity-btn">
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Entity
          </button>
        </div>

        {/* Entities Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} data-testid="entities-grid">
          {entities.map((entity) => {
            const Icon = entity.type === 'business' ? Briefcase : User;
            return (
              <div key={entity.id} style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: '#0A0A0A',
                border: '1px solid rgba(212, 175, 55, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }} onClick={() => { selectEntity(entity.id); setActiveEntity(entity); }} data-testid={`entity-${entity.id}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: entity.type === 'business' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}>
                    <Icon style={{ width: '24px', height: '24px', color: entity.type === 'business' ? '#D4AF37' : '#3B82F6' }} />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(entity.id); }} style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }} data-testid={`delete-entity-${entity.id}`}>
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{entity.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    background: entity.type === 'business' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: entity.type === 'business' ? '#D4AF37' : '#3B82F6',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>{entity.type}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '1rem' }}>
                  Created: {new Date(entity.created_at).toLocaleDateString()}
                </p>
              </div>
            );
          })}
          {!isLoading && entities.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <Building2 style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No entities yet. Create your first entity.</p>
            </div>
          )}
        </div>

        {/* Add Entity Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }} data-testid="add-entity-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Entity</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}><X style={{ width: '20px', height: '20px' }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Entity Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., My Business LLC" required data-testid="entity-name-input" />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="entity-type-select">
                    <option value="personal" style={{ background: '#0A0A0A' }}>Personal</option>
                    <option value="business" style={{ background: '#0A0A0A' }}>Business</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-entity-btn">{createMutation.isPending ? 'Saving...' : 'Save Entity'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Entity Details Modal */}
        {activeEntity && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem', overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '20px', background: '#0B0B0B', border: '1px solid rgba(212, 175, 55, 0.2)' }} data-testid="entity-details-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <p style={{ color: '#737373', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entity Details</p>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{activeEntity.name}</h2>
                </div>
                <button onClick={() => setActiveEntity(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373' }} data-testid="close-entity-details"><X style={{ width: '22px', height: '22px' }} /></button>
              </div>

              {activeEntity.type === 'business' ? (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Legal Name</label>
                      <input value={businessDetails.legal_name} onChange={(e) => setBusinessDetails({ ...businessDetails, legal_name: e.target.value })} style={inputStyle} data-testid="business-legal-name" />
                    </div>
                    <div>
                      <label className="label">DBA Name</label>
                      <input value={businessDetails.dba_name} onChange={(e) => setBusinessDetails({ ...businessDetails, dba_name: e.target.value })} style={inputStyle} data-testid="business-dba-name" />
                    </div>
                    <div>
                      <label className="label">EIN</label>
                      <input value={businessDetails.ein} onChange={(e) => setBusinessDetails({ ...businessDetails, ein: e.target.value })} style={inputStyle} data-testid="business-ein" />
                    </div>
                    <div>
                      <label className="label">Entity Structure</label>
                      <input value={businessDetails.entity_structure} onChange={(e) => setBusinessDetails({ ...businessDetails, entity_structure: e.target.value })} style={inputStyle} placeholder="LLC, S-Corp, C-Corp" data-testid="business-structure" />
                    </div>
                    <div>
                      <label className="label">Formation State</label>
                      <input value={businessDetails.formation_state} onChange={(e) => setBusinessDetails({ ...businessDetails, formation_state: e.target.value })} style={inputStyle} data-testid="business-formation-state" />
                    </div>
                    <div>
                      <label className="label">Formation Date</label>
                      <input type="date" value={businessDetails.formation_date} onChange={(e) => setBusinessDetails({ ...businessDetails, formation_date: e.target.value })} style={inputStyle} data-testid="business-formation-date" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Registered Agent Name</label>
                      <input value={businessDetails.registered_agent_name} onChange={(e) => setBusinessDetails({ ...businessDetails, registered_agent_name: e.target.value })} style={inputStyle} data-testid="business-registered-agent-name" />
                    </div>
                    <div>
                      <label className="label">Registered Agent Email</label>
                      <input value={businessDetails.registered_agent_email} onChange={(e) => setBusinessDetails({ ...businessDetails, registered_agent_email: e.target.value })} style={inputStyle} data-testid="business-registered-agent-email" />
                    </div>
                    <div>
                      <label className="label">Registered Agent Phone</label>
                      <input value={businessDetails.registered_agent_phone} onChange={(e) => setBusinessDetails({ ...businessDetails, registered_agent_phone: e.target.value })} style={inputStyle} data-testid="business-registered-agent-phone" />
                    </div>
                    <div>
                      <label className="label">Registered Agent Address</label>
                      <input value={businessDetails.registered_agent_address} onChange={(e) => setBusinessDetails({ ...businessDetails, registered_agent_address: e.target.value })} style={inputStyle} data-testid="business-registered-agent-address" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Principal Address</label>
                      <input value={businessDetails.principal_address} onChange={(e) => setBusinessDetails({ ...businessDetails, principal_address: e.target.value })} style={inputStyle} data-testid="business-principal-address" />
                    </div>
                    <div>
                      <label className="label">Mailing Address</label>
                      <input value={businessDetails.mailing_address} onChange={(e) => setBusinessDetails({ ...businessDetails, mailing_address: e.target.value })} style={inputStyle} data-testid="business-mailing-address" />
                    </div>
                    <div>
                      <label className="label">Contact Email</label>
                      <input value={businessDetails.contact_email} onChange={(e) => setBusinessDetails({ ...businessDetails, contact_email: e.target.value })} style={inputStyle} data-testid="business-contact-email" />
                    </div>
                    <div>
                      <label className="label">Contact Phone</label>
                      <input value={businessDetails.contact_phone} onChange={(e) => setBusinessDetails({ ...businessDetails, contact_phone: e.target.value })} style={inputStyle} data-testid="business-contact-phone" />
                    </div>
                    <div>
                      <label className="label">Website</label>
                      <input value={businessDetails.website} onChange={(e) => setBusinessDetails({ ...businessDetails, website: e.target.value })} style={inputStyle} data-testid="business-website" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Fiscal Year End</label>
                      <input value={businessDetails.fiscal_year_end} onChange={(e) => setBusinessDetails({ ...businessDetails, fiscal_year_end: e.target.value })} style={inputStyle} data-testid="business-fiscal-year" />
                    </div>
                    <div>
                      <label className="label">Tax Filing Due Date</label>
                      <input type="date" value={businessDetails.tax_filing_due_date} onChange={(e) => setBusinessDetails({ ...businessDetails, tax_filing_due_date: e.target.value })} style={inputStyle} data-testid="business-tax-filing-date" />
                    </div>
                    <div>
                      <label className="label">Annual Report Due Date</label>
                      <input type="date" value={businessDetails.annual_report_due_date} onChange={(e) => setBusinessDetails({ ...businessDetails, annual_report_due_date: e.target.value })} style={inputStyle} data-testid="business-annual-report-date" />
                    </div>
                    <div>
                      <label className="label">Renewal Date</label>
                      <input type="date" value={businessDetails.renewal_date} onChange={(e) => setBusinessDetails({ ...businessDetails, renewal_date: e.target.value })} style={inputStyle} data-testid="business-renewal-date" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Accounting Method</label>
                      <input value={businessDetails.accounting_method} onChange={(e) => setBusinessDetails({ ...businessDetails, accounting_method: e.target.value })} style={inputStyle} data-testid="business-accounting-method" />
                    </div>
                    <div>
                      <label className="label">Payroll Provider</label>
                      <input value={businessDetails.payroll_provider} onChange={(e) => setBusinessDetails({ ...businessDetails, payroll_provider: e.target.value })} style={inputStyle} data-testid="business-payroll-provider" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Tax Elections (one per line)</label>
                      <textarea value={listToText(businessDetails.tax_elections)} onChange={(e) => setBusinessDetails({ ...businessDetails, tax_elections: textToList(e.target.value) })} style={textareaStyle} data-testid="business-tax-elections" />
                    </div>
                    <div>
                      <label className="label">Associated Accounts (one per line)</label>
                      <textarea value={listToText(businessDetails.associated_accounts)} onChange={(e) => setBusinessDetails({ ...businessDetails, associated_accounts: textToList(e.target.value) })} style={textareaStyle} data-testid="business-associated-accounts" />
                    </div>
                    <div>
                      <label className="label">Primary Account ID</label>
                      <input value={businessDetails.primary_account_id} onChange={(e) => setBusinessDetails({ ...businessDetails, primary_account_id: e.target.value })} style={inputStyle} data-testid="business-primary-account-id" />
                    </div>

                    <div>
                      <label className="label">Owners (one per line)</label>
                      <textarea value={listToText(businessDetails.owners)} onChange={(e) => setBusinessDetails({ ...businessDetails, owners: textToList(e.target.value) })} style={textareaStyle} data-testid="business-owners" />
                    </div>
                    <div>
                      <label className="label">Officers (one per line)</label>
                      <textarea value={listToText(businessDetails.officers)} onChange={(e) => setBusinessDetails({ ...businessDetails, officers: textToList(e.target.value) })} style={textareaStyle} data-testid="business-officers" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Licenses (one per line)</label>
                    <textarea value={listToText(businessDetails.licenses)} onChange={(e) => setBusinessDetails({ ...businessDetails, licenses: textToList(e.target.value) })} style={textareaStyle} data-testid="business-licenses" />
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea value={businessDetails.notes} onChange={(e) => setBusinessDetails({ ...businessDetails, notes: e.target.value })} style={textareaStyle} data-testid="business-notes" />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Legal Name</label>
                      <input value={personalDetails.legal_name} onChange={(e) => setPersonalDetails({ ...personalDetails, legal_name: e.target.value })} style={inputStyle} data-testid="personal-legal-name" />
                    </div>
                    <div>
                      <label className="label">Preferred Name</label>
                      <input value={personalDetails.preferred_name} onChange={(e) => setPersonalDetails({ ...personalDetails, preferred_name: e.target.value })} style={inputStyle} data-testid="personal-preferred-name" />
                    </div>
                    <div>
                      <label className="label">Date of Birth</label>
                      <input type="date" value={personalDetails.date_of_birth} onChange={(e) => setPersonalDetails({ ...personalDetails, date_of_birth: e.target.value })} style={inputStyle} data-testid="personal-dob" />
                    </div>
                    <div>
                      <label className="label">SSN Last 4</label>
                      <input value={personalDetails.ssn_last4} onChange={(e) => setPersonalDetails({ ...personalDetails, ssn_last4: e.target.value })} style={inputStyle} data-testid="personal-ssn" />
                    </div>
                    <div>
                      <label className="label">Filing Status</label>
                      <input value={personalDetails.filing_status} onChange={(e) => setPersonalDetails({ ...personalDetails, filing_status: e.target.value })} style={inputStyle} data-testid="personal-filing-status" />
                    </div>
                    <div>
                      <label className="label">Tax Filing Due Date</label>
                      <input type="date" value={personalDetails.tax_filing_due_date} onChange={(e) => setPersonalDetails({ ...personalDetails, tax_filing_due_date: e.target.value })} style={inputStyle} data-testid="personal-tax-filing-date" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Primary Address</label>
                      <input value={personalDetails.primary_address} onChange={(e) => setPersonalDetails({ ...personalDetails, primary_address: e.target.value })} style={inputStyle} data-testid="personal-primary-address" />
                    </div>
                    <div>
                      <label className="label">Residency State</label>
                      <input value={personalDetails.residency_state} onChange={(e) => setPersonalDetails({ ...personalDetails, residency_state: e.target.value })} style={inputStyle} data-testid="personal-residency-state" />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input value={personalDetails.phone} onChange={(e) => setPersonalDetails({ ...personalDetails, phone: e.target.value })} style={inputStyle} data-testid="personal-phone" />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input value={personalDetails.email} onChange={(e) => setPersonalDetails({ ...personalDetails, email: e.target.value })} style={inputStyle} data-testid="personal-email" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Employment Status</label>
                      <input value={personalDetails.employment_status} onChange={(e) => setPersonalDetails({ ...personalDetails, employment_status: e.target.value })} style={inputStyle} data-testid="personal-employment-status" />
                    </div>
                    <div>
                      <label className="label">Employer Name</label>
                      <input value={personalDetails.employer_name} onChange={(e) => setPersonalDetails({ ...personalDetails, employer_name: e.target.value })} style={inputStyle} data-testid="personal-employer" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Dependents (one per line)</label>
                      <textarea value={listToText(personalDetails.dependents)} onChange={(e) => setPersonalDetails({ ...personalDetails, dependents: textToList(e.target.value) })} style={textareaStyle} data-testid="personal-dependents" />
                    </div>
                    <div>
                      <label className="label">Income Sources (one per line)</label>
                      <textarea value={listToText(personalDetails.income_sources)} onChange={(e) => setPersonalDetails({ ...personalDetails, income_sources: textToList(e.target.value) })} style={textareaStyle} data-testid="personal-income-sources" />
                    </div>
                    <div>
                      <label className="label">Assets (one per line)</label>
                      <textarea value={listToText(personalDetails.assets)} onChange={(e) => setPersonalDetails({ ...personalDetails, assets: textToList(e.target.value) })} style={textareaStyle} data-testid="personal-assets" />
                    </div>
                    <div>
                      <label className="label">Liabilities (one per line)</label>
                      <textarea value={listToText(personalDetails.liabilities)} onChange={(e) => setPersonalDetails({ ...personalDetails, liabilities: textToList(e.target.value) })} style={textareaStyle} data-testid="personal-liabilities" />
                    </div>
                    <div>
                      <label className="label">Associated Accounts (one per line)</label>
                      <textarea value={listToText(personalDetails.associated_accounts)} onChange={(e) => setPersonalDetails({ ...personalDetails, associated_accounts: textToList(e.target.value) })} style={textareaStyle} data-testid="personal-associated-accounts" />
                    </div>

                  </div>

                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="label">Risk Tolerance</label>
                      <input value={personalDetails.risk_tolerance} onChange={(e) => setPersonalDetails({ ...personalDetails, risk_tolerance: e.target.value })} style={inputStyle} data-testid="personal-risk-tolerance" />
                    </div>
                    <div>
                      <label className="label">Retirement Accounts (one per line)</label>
                      <textarea value={listToText(personalDetails.retirement_accounts)} onChange={(e) => setPersonalDetails({ ...personalDetails, retirement_accounts: textToList(e.target.value) })} style={textareaStyle} data-testid="personal-retirement-accounts" />
                    </div>
                    <div>
                      <label className="label">Primary Account ID</label>
                      <input value={personalDetails.primary_account_id} onChange={(e) => setPersonalDetails({ ...personalDetails, primary_account_id: e.target.value })} style={inputStyle} data-testid="personal-primary-account-id" />
                    </div>

                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea value={personalDetails.notes} onChange={(e) => setPersonalDetails({ ...personalDetails, notes: e.target.value })} style={textareaStyle} data-testid="personal-notes" />
                  </div>
                </div>
              )}

              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#F5F5F5', marginBottom: '1rem' }}>Entity Documents</h3>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <div>
                    <label className="label">Document Type</label>
                    <select value={docForm.document_type} onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="document-type-select">
                      <option value="articles_of_incorporation">Articles of Incorporation / Organization</option>
                      <option value="operating_agreement">Operating Agreement / Bylaws</option>
                      <option value="ein_letter">EIN Letter</option>
                      <option value="tax_return">Tax Return</option>
                      <option value="w9">W-9</option>
                      <option value="w2">W-2</option>
                      <option value="1099">1099</option>
                      <option value="bank_statement">Bank Statement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Document Title</label>
                    <input value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} style={inputStyle} data-testid="document-title-input" />
                  </div>
                  <div>
                    <label className="label">Tags (comma separated)</label>
                    <input value={docForm.tags} onChange={(e) => setDocForm({ ...docForm, tags: e.target.value })} style={inputStyle} data-testid="document-tags-input" />
                  </div>
                  <div>
                    <label className="label">Notes</label>
                    <input value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} style={inputStyle} data-testid="document-notes-input" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <input type="file" onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })} data-testid="document-file-input" />
                  <button onClick={handleUploadDocument} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37', cursor: 'pointer' }} data-testid="upload-document-btn">
                    <Upload style={{ width: '18px', height: '18px' }} />
                    {uploadDocMutation.isPending ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }} data-testid="entity-documents-list">
                  {entityDocuments.length === 0 && (
                    <p style={{ color: '#525252' }}>No documents uploaded yet.</p>
                  )}
                  {entityDocuments.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '12px', background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p style={{ color: '#F5F5F5', margin: 0 }}>{doc.title}</p>
                        <p style={{ color: '#525252', fontSize: '0.75rem', margin: 0 }}>{doc.document_type} • {(doc.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button onClick={() => handleDownloadDocument(doc)} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', padding: '0.4rem 0.6rem', borderRadius: '8px', cursor: 'pointer' }} data-testid={`download-document-${doc.id}`}>
                          <Download style={{ width: '16px', height: '16px' }} />
                        </button>
                        <button onClick={() => deleteDocMutation.mutate(doc.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', padding: '0.4rem 0.6rem', borderRadius: '8px', cursor: 'pointer' }} data-testid={`delete-document-${doc.id}`}>
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button onClick={() => setActiveEntity(null)} style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#737373', cursor: 'pointer' }} data-testid="close-details-btn">Close</button>
                <button onClick={handleSaveDetails} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', fontWeight: '600', cursor: 'pointer' }} data-testid="save-entity-details-btn">{saveDetailsMutation.isPending ? 'Saving...' : 'Save Details'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) { [data-testid="entities-grid"] { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { [data-testid="entities-grid"] { grid-template-columns: 1fr !important; } }
        input:focus, select:focus, textarea:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
        .label { display: block; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #737373; margin-bottom: 0.5rem; }
      `}</style>
    </div>
  );
}
