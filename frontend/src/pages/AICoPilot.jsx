import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  PiggyBank,
  Calculator,
  FileText,
  Send,
  ChevronRight,
  Lightbulb,
  Target,
  DollarSign,
  BarChart3,
  Loader2,
  Upload,
  File,
  Image,
  Video,
  Search,
  Trash2,
  Eye,
  FolderOpen,
  FlaskConical,
  Briefcase,
  Shield,
  TrendingDown,
  Building2,
  Coins,
  LineChart,
  Scale,
  ClipboardCheck,
  Globe,
  PieChart,
  MessageSquare
} from 'lucide-react';
import { tileStyles, headerStyles, buttonStyles, GoldAccentLine, formatCurrency } from '../styles/tileStyles';

export default function AICoPilot() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('insights');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState({});
  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [analyzeQuery, setAnalyzeQuery] = useState('');
  
  // Strategy Studio state
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [strategyAssetType, setStrategyAssetType] = useState('stock');
  const [strategyTicker, setStrategyTicker] = useState('');
  const [strategyContext, setStrategyContext] = useState('');
  
  // Analysis Lab state
  const [analysisAssetType, setAnalysisAssetType] = useState('stock');
  const [analysisIdentifier, setAnalysisIdentifier] = useState('');
  const [analysisDepth, setAnalysisDepth] = useState('standard');
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('medium');
  const [marketSector, setMarketSector] = useState('');

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  const aiEnabled = aiStatus?.system_ai_enabled || aiStatus?.user_ai_enabled;

  // Knowledge Lab data
  const { data: knowledgeDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => api.getKnowledgeDocuments(),
    enabled: aiEnabled,
  });

  const { data: knowledgeStats } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: () => api.getKnowledgeStats(),
    enabled: aiEnabled,
  });

  // Strategy frameworks
  const { data: frameworksData } = useQuery({
    queryKey: ['strategy-frameworks'],
    queryFn: () => api.getStrategyFrameworks(),
    enabled: aiEnabled,
  });
  const frameworks = frameworksData?.frameworks || [];

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

  // Analyze mutation - uses new AI service
  const analyzeMutation = useMutation({
    mutationFn: ({ docId, query }) => api.analyzeKnowledgeDocument(docId, query),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `Analyze: ${selectedDoc?.original_filename}${analyzeQuery ? ` - ${analyzeQuery}` : ''}` },
        { role: 'assistant', content: data.analysis }
      ]);
      setActiveTab('chat');
      toast.success('Analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Analysis failed'),
  });

  // Strategy analysis mutation
  const strategyMutation = useMutation({
    mutationFn: () => api.analyzeWithStrategy(
      selectedFramework?.id || 'default_0',
      strategyAssetType,
      strategyTicker,
      strategyContext || null
    ),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `Strategy Analysis (${data.framework}): ${data.asset}` },
        { role: 'assistant', content: data.analysis }
      ]);
      setActiveTab('chat');
      toast.success('Strategy analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Strategy analysis failed'),
  });

  // Comprehensive analysis mutation
  const comprehensiveMutation = useMutation({
    mutationFn: () => api.comprehensiveAnalysis(analysisAssetType, analysisIdentifier, analysisDepth),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `Comprehensive Analysis: ${data.identifier} (${data.asset_type})` },
        { role: 'assistant', content: data.analysis }
      ]);
      setActiveTab('chat');
      toast.success('Analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Analysis failed'),
  });

  // Risk assessment mutation
  const riskMutation = useMutation({
    mutationFn: () => api.riskAssessment(
      analysisAssetType,
      analysisIdentifier,
      parseFloat(investmentAmount) || 10000,
      timeHorizon
    ),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `Risk Assessment: ${data.identifier} ($${data.investment_amount.toLocaleString()})` },
        { role: 'assistant', content: data.risk_assessment }
      ]);
      setActiveTab('chat');
      toast.success('Risk assessment complete');
    },
    onError: (error) => toast.error(error.message || 'Risk assessment failed'),
  });

  // Due diligence mutation
  const ddMutation = useMutation({
    mutationFn: () => api.dueDiligence(
      analysisAssetType,
      analysisIdentifier,
      investmentAmount ? parseFloat(investmentAmount) : null
    ),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `Due Diligence Checklist: ${data.identifier}` },
        { role: 'assistant', content: data.due_diligence_checklist }
      ]);
      setActiveTab('chat');
      toast.success('Due diligence checklist generated');
    },
    onError: (error) => toast.error(error.message || 'Due diligence failed'),
  });

  // Market research mutation
  const researchMutation = useMutation({
    mutationFn: () => api.marketResearch(marketSector),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `Market Research: ${data.sector}` },
        { role: 'assistant', content: data.research }
      ]);
      setActiveTab('chat');
      toast.success('Market research complete');
    },
    onError: (error) => toast.error(error.message || 'Research failed'),
  });

  // Portfolio analysis mutation
  const portfolioMutation = useMutation({
    mutationFn: () => api.portfolioAnalysis(selectedEntityId),
    onSuccess: (data) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: `Portfolio Analysis (${data.holdings_count} holdings, $${data.total_value.toLocaleString()})` },
        { role: 'assistant', content: data.analysis }
      ]);
      setActiveTab('chat');
      toast.success('Portfolio analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Portfolio analysis failed'),
  });

  // Chat with knowledge base mutation
  const knowledgeChatMutation = useMutation({
    mutationFn: (message) => api.chatWithKnowledgeBase(message),
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    },
    onError: (error) => toast.error(error.message || 'Chat failed'),
  });

  // General chat mutation
  const chatMutation = useMutation({
    mutationFn: ({ message, context }) => api.aiChat(message, context, 'copilot'),
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    },
    onError: (error) => toast.error(error.message || 'Chat failed'),
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

  const handleSendMessage = () => {
    if (!chatMessage.trim() || chatMutation.isLoading) return;
    setChatHistory(prev => [...prev, { role: 'user', content: chatMessage }]);
    
    // If we have knowledge docs, use knowledge chat
    if (knowledgeDocs.length > 0) {
      knowledgeChatMutation.mutate(chatMessage);
    } else {
      chatMutation.mutate({ message: chatMessage, context: { entity_id: selectedEntityId } });
    }
    setChatMessage('');
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

  const [analysisResults, setAnalysisResults] = useState({
    anomalies: null,
    cashFlow: null,
    savings: null,
    budgetSuggestion: null,
  });

  const runAnalysis = async (type) => {
    if (!selectedEntityId || !aiEnabled) return;
    setIsAnalyzing(prev => ({ ...prev, [type]: true }));
    try {
      let result;
      switch (type) {
        case 'anomalies':
          result = await api.detectAnomalies(selectedEntityId);
          setAnalysisResults(prev => ({ ...prev, anomalies: result }));
          break;
        case 'cashFlow':
          result = await api.forecastCashFlow(selectedEntityId, 3);
          setAnalysisResults(prev => ({ ...prev, cashFlow: result }));
          break;
        case 'savings':
          result = await api.identifyCostSavings(selectedEntityId);
          setAnalysisResults(prev => ({ ...prev, savings: result }));
          break;
        case 'budget':
          const currentMonth = new Date().toISOString().slice(0, 7);
          result = await api.generateBudget(selectedEntityId, currentMonth);
          setAnalysisResults(prev => ({ ...prev, budgetSuggestion: result }));
          break;
        default:
          break;
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} analysis complete`);
    } catch (error) {
      toast.error(error.message || `Failed to run ${type} analysis`);
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [type]: false }));
    }
  };

  const tabs = [
    { id: 'insights', label: 'Quick Insights', icon: Sparkles },
    { id: 'knowledge', label: 'Knowledge Lab', icon: FolderOpen },
    { id: 'strategy', label: 'Strategy Studio', icon: Briefcase },
    { id: 'analysis', label: 'Analysis Lab', icon: FlaskConical },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  const quickInsightCards = [
    { id: 'anomalies', title: 'Spending Anomalies', description: 'Detect unusual spending patterns', icon: AlertTriangle, color: '#DC2626', action: () => runAnalysis('anomalies') },
    { id: 'cashFlow', title: 'Cash Flow Forecast', description: '3-month projection', icon: TrendingUp, color: '#059669', action: () => runAnalysis('cashFlow') },
    { id: 'savings', title: 'Cost Savings', description: 'Find savings opportunities', icon: PiggyBank, color: '#D4AF37', action: () => runAnalysis('savings') },
    { id: 'budget', title: 'Smart Budget', description: 'AI budget recommendation', icon: Calculator, color: '#8B5CF6', action: () => runAnalysis('budget') },
  ];

  const assetTypes = [
    { id: 'stock', label: 'Stock', icon: LineChart },
    { id: 'real_estate', label: 'Real Estate', icon: Building2 },
    { id: 'crypto', label: 'Crypto', icon: Coins },
    { id: 'private_equity', label: 'Private Equity', icon: Briefcase },
    { id: 'tax_lien', label: 'Tax Lien', icon: FileText },
    { id: 'precious_metal', label: 'Precious Metal', icon: Coins },
  ];

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

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="ai-copilot-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={headerStyles.label}>AI Co-Pilot</p>
            <h1 style={headerStyles.title}>Investment Intelligence</h1>
            <p style={headerStyles.subtitle}>AI-powered insights, research frameworks, and analysis tools</p>
          </div>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1.25rem', borderRadius: '12px',
            background: aiEnabled ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            border: `1px solid ${aiEnabled ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'}`,
          }}>
            <Brain style={{ width: '20px', height: '20px', color: aiEnabled ? '#059669' : '#DC2626' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: aiEnabled ? '#059669' : '#DC2626' }}>
              AI {aiEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {!aiEnabled && (
          <div style={{ ...tileStyles.content, marginBottom: '2rem', borderColor: 'rgba(220, 38, 38, 0.2)', textAlign: 'center', padding: '3rem' }}>
            <Brain style={{ width: '48px', height: '48px', color: '#DC2626', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#F5F5F5', marginBottom: '0.5rem' }}>AI Features Disabled</h3>
            <p style={{ color: '#8A8A8A', maxWidth: '400px', margin: '0 auto' }}>
              Enable AI in Admin Settings to unlock intelligent insights, research frameworks, and analysis tools.
            </p>
          </div>
        )}

        {aiEnabled && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={`tab-${tab.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.75rem 1.25rem', borderRadius: '12px',
                      background: isActive ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)' : 'rgba(255, 255, 255, 0.03)',
                      border: isActive ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#D4AF37' : '#8A8A8A',
                      fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <TabIcon style={{ width: '18px', height: '18px' }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Insights Tab */}
            {activeTab === 'insights' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                  {quickInsightCards.map((card) => {
                    const CardIcon = card.icon;
                    const isLoading = isAnalyzing[card.id];
                    return (
                      <div key={card.id} style={{ ...tileStyles.card, cursor: isLoading ? 'wait' : 'pointer' }} onClick={() => !isLoading && card.action()} data-testid={`insight-${card.id}`}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: `rgba(${card.color === '#DC2626' ? '220, 38, 38' : card.color === '#059669' ? '5, 150, 105' : card.color === '#D4AF37' ? '212, 175, 55' : '139, 92, 246'}, 0.1)`, width: 'fit-content', marginBottom: '1rem' }}>
                          {isLoading ? <Loader2 style={{ width: '24px', height: '24px', color: card.color, animation: 'spin 1s linear infinite' }} /> : <CardIcon style={{ width: '24px', height: '24px', color: card.color }} />}
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#F5F5F5', margin: '0 0 0.5rem 0' }}>{card.title}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>{card.description}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem', color: card.color, fontSize: '0.8rem', fontWeight: '600' }}>
                          {isLoading ? 'Analyzing...' : 'Run Analysis'} <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Results Display */}
                {(analysisResults.anomalies || analysisResults.cashFlow || analysisResults.savings || analysisResults.budgetSuggestion) && (
                  <div style={tileStyles.content}>
                    <GoldAccentLine />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>Analysis Results</h2>
                    {analysisResults.anomalies && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#DC2626', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle style={{ width: '18px', height: '18px' }} />Spending Anomalies</h3>
                        {analysisResults.anomalies.anomalies?.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#D4D4D4' }}>{analysisResults.anomalies.anomalies.map((a, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{typeof a === 'string' ? a : a.description}</li>)}</ul>
                        ) : <p style={{ color: '#8A8A8A', margin: 0 }}>No anomalies detected!</p>}
                      </div>
                    )}
                    {analysisResults.cashFlow && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#059669', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp style={{ width: '18px', height: '18px' }} />Cash Flow Forecast</h3>
                        {analysisResults.cashFlow.forecast && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {analysisResults.cashFlow.forecast.map((f, i) => (
                              <div key={i} style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <p style={{ fontSize: '0.8rem', color: '#8A8A8A', marginBottom: '0.5rem' }}>Month {i + 1}</p>
                                <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: (f.net_cash_flow || f.net_flow || 0) >= 0 ? '#059669' : '#DC2626', margin: 0 }}>{formatCurrency(f.net_cash_flow || f.net_flow || 0)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {analysisResults.savings && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#D4AF37', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PiggyBank style={{ width: '18px', height: '18px' }} />Cost Saving Opportunities</h3>
                        {analysisResults.savings.opportunities?.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#D4D4D4' }}>{analysisResults.savings.opportunities.map((o, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{typeof o === 'string' ? o : o.description}</li>)}</ul>
                        ) : <p style={{ color: '#8A8A8A', margin: 0 }}>Great job! No obvious cost-saving opportunities found.</p>}
                        {analysisResults.savings.total_potential_savings > 0 && <p style={{ marginTop: '1rem', fontWeight: '600', color: '#D4AF37' }}>Potential Monthly Savings: {formatCurrency(analysisResults.savings.total_potential_savings)}</p>}
                      </div>
                    )}
                    {analysisResults.budgetSuggestion && (
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#8B5CF6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calculator style={{ width: '18px', height: '18px' }} />Smart Budget Suggestion</h3>
                        {analysisResults.budgetSuggestion.budget_suggestions?.recommendations && <p style={{ color: '#D4D4D4', fontSize: '0.9rem', lineHeight: '1.5' }}>{analysisResults.budgetSuggestion.budget_suggestions.recommendations}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Knowledge Lab Tab */}
            {activeTab === 'knowledge' && (
              <div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.txt,.csv,.docx,.xlsx,.md,.png,.jpg,.jpeg,.webp,.gif,.heic,.mp4,.mov,.webm,.avi,.mkv" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div style={tileStyles.statGold}><GoldAccentLine /><p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Total Documents</p><p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>{knowledgeStats?.total_documents || 0}</p></div>
                  <div style={tileStyles.stat}><p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Documents</p><p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>{knowledgeStats?.by_type?.document?.count || 0}</p></div>
                  <div style={tileStyles.stat}><p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Images</p><p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>{knowledgeStats?.by_type?.image?.count || 0}</p></div>
                  <div style={tileStyles.stat}><p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>Videos</p><p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>{knowledgeStats?.by_type?.video?.count || 0}</p></div>
                </div>
                <div style={tileStyles.content}>
                  <GoldAccentLine />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}><FolderOpen style={{ width: '24px', height: '24px', color: '#D4AF37' }} /></div>
                      <div><h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Knowledge Lab</h2><p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Upload documents for AI analysis with RAG</p></div>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} style={{ ...buttonStyles.primary, opacity: uploadingFile ? 0.5 : 1 }} data-testid="upload-btn">
                      {uploadingFile ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: '18px', height: '18px' }} />}
                      {uploadingFile ? 'Uploading...' : 'Upload File'}
                    </button>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supported Formats</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {[{ icon: File, label: 'PDF, TXT, CSV, DOCX, XLSX, MD', color: '#D4AF37' }, { icon: Image, label: 'PNG, JPG, WEBP, GIF, HEIC', color: '#059669' }, { icon: Video, label: 'MP4, MOV, WEBM, AVI', color: '#8B5CF6' }].map((format, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: `rgba(${format.color === '#D4AF37' ? '212, 175, 55' : format.color === '#059669' ? '5, 150, 105' : '139, 92, 246'}, 0.1)` }}>
                          <format.icon style={{ width: '14px', height: '14px', color: format.color }} /><span style={{ fontSize: '0.75rem', color: format.color }}>{format.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} data-testid="knowledge-grid">
                    {docsLoading ? (
                      <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '3rem', color: '#525252' }}><Loader2 style={{ width: '32px', height: '32px', margin: '0 auto 1rem', animation: 'spin 1s linear infinite', color: '#D4AF37' }} /><p>Loading documents...</p></div>
                    ) : knowledgeDocs.length === 0 ? (
                      <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '3rem', color: '#525252' }}><FolderOpen style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} /><p style={{ margin: 0 }}>No documents uploaded yet</p><p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Upload financial documents to analyze them with AI</p></div>
                    ) : (
                      knowledgeDocs.map((doc) => {
                        const FileIcon = getFileIcon(doc.file_type);
                        const isSelected = selectedDoc?.id === doc.id;
                        return (
                          <div key={doc.id} onClick={() => setSelectedDoc(isSelected ? null : doc)} style={{ ...tileStyles.card, cursor: 'pointer', border: isSelected ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)', background: isSelected ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)' : tileStyles.card.background }} data-testid={`doc-${doc.id}`}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                              <div style={{ padding: '0.6rem', borderRadius: '10px', background: `rgba(${doc.file_type === 'document' ? '212, 175, 55' : doc.file_type === 'image' ? '5, 150, 105' : '139, 92, 246'}, 0.1)` }}><FileIcon style={{ width: '20px', height: '20px', color: doc.file_type === 'document' ? '#D4AF37' : doc.file_type === 'image' ? '#059669' : '#8B5CF6' }} /></div>
                              <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }} style={{ padding: '0.4rem', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}><Trash2 style={{ width: '14px', height: '14px' }} /></button>
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
                  {selectedDoc && (
                    <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '16px', background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#D4AF37', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Eye style={{ width: '18px', height: '18px' }} />Analyze: {selectedDoc.original_filename}</h3>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input type="text" value={analyzeQuery} onChange={(e) => setAnalyzeQuery(e.target.value)} placeholder="Ask a question about this file (optional)..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={handleAnalyze} disabled={analyzeMutation.isLoading} style={{ ...buttonStyles.primary, opacity: analyzeMutation.isLoading ? 0.5 : 1 }} data-testid="analyze-doc-btn">
                          {analyzeMutation.isLoading ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : <Search style={{ width: '18px', height: '18px' }} />} Analyze
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Strategy Studio Tab */}
            {activeTab === 'strategy' && (
              <div>
                <div style={tileStyles.content}>
                  <GoldAccentLine />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}><Briefcase style={{ width: '24px', height: '24px', color: '#D4AF37' }} /></div>
                    <div><h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Strategy Studio</h2><p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Analyze investments with proven frameworks</p></div>
                  </div>

                  {/* Framework Selection */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment Framework</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      {frameworks.slice(0, 6).map((fw) => (
                        <div key={fw.id} onClick={() => setSelectedFramework(fw)} style={{ padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: selectedFramework?.id === fw.id ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)' : 'rgba(255, 255, 255, 0.02)', border: selectedFramework?.id === fw.id ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s' }} data-testid={`framework-${fw.id}`}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: selectedFramework?.id === fw.id ? '#D4AF37' : '#F5F5F5', margin: '0 0 0.25rem 0' }}>{fw.name}</h4>
                          <p style={{ fontSize: '0.7rem', color: '#8A8A8A', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{fw.description}</p>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }}>{fw.risk_tolerance}</span>
                            <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#8A8A8A' }}>{fw.time_horizon}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Asset Input */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Asset Type</label>
                      <select value={strategyAssetType} onChange={(e) => setStrategyAssetType(e.target.value)} style={selectStyle}>
                        {assetTypes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Ticker / Name</label>
                      <input type="text" value={strategyTicker} onChange={(e) => setStrategyTicker(e.target.value)} placeholder="e.g., AAPL, 123 Main St, Bitcoin..." style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Additional Context (Optional)</label>
                    <textarea value={strategyContext} onChange={(e) => setStrategyContext(e.target.value)} placeholder="Any additional information about the investment..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                  </div>

                  <button onClick={() => strategyMutation.mutate()} disabled={!strategyTicker || strategyMutation.isLoading} style={{ ...buttonStyles.primary, width: '100%', justifyContent: 'center', opacity: (!strategyTicker || strategyMutation.isLoading) ? 0.5 : 1 }} data-testid="run-strategy-btn">
                    {strategyMutation.isLoading ? <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> Analyzing...</> : <><Target style={{ width: '18px', height: '18px' }} /> Run Strategy Analysis</>}
                  </button>
                </div>
              </div>
            )}

            {/* Analysis Lab Tab */}
            {activeTab === 'analysis' && (
              <div>
                <div style={tileStyles.content}>
                  <GoldAccentLine />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}><FlaskConical style={{ width: '24px', height: '24px', color: '#D4AF37' }} /></div>
                    <div><h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Analysis Lab</h2><p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Deep analysis, risk assessment, and due diligence</p></div>
                  </div>

                  {/* Analysis Type Selection */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[
                      { id: 'comprehensive', label: 'Comprehensive', icon: BarChart3, desc: 'Full asset analysis' },
                      { id: 'risk', label: 'Risk Assessment', icon: Shield, desc: 'Evaluate risk factors' },
                      { id: 'dd', label: 'Due Diligence', icon: ClipboardCheck, desc: 'Verification checklist' },
                      { id: 'market', label: 'Market Research', icon: Globe, desc: 'Sector overview' },
                      { id: 'portfolio', label: 'Portfolio', icon: PieChart, desc: 'Analyze your holdings' },
                    ].map(type => (
                      <div key={type.id} onClick={() => setAnalysisType(type.id)} style={{ padding: '1rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', background: analysisType === type.id ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)' : 'rgba(255, 255, 255, 0.02)', border: analysisType === type.id ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)' }} data-testid={`analysis-type-${type.id}`}>
                        <type.icon style={{ width: '24px', height: '24px', color: analysisType === type.id ? '#D4AF37' : '#8A8A8A', margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.8rem', fontWeight: '600', color: analysisType === type.id ? '#D4AF37' : '#F5F5F5', margin: 0 }}>{type.label}</p>
                        <p style={{ fontSize: '0.65rem', color: '#8A8A8A', margin: '0.25rem 0 0 0' }}>{type.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Conditional Inputs */}
                  {analysisType !== 'market' && analysisType !== 'portfolio' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Asset Type</label>
                        <select value={analysisAssetType} onChange={(e) => setAnalysisAssetType(e.target.value)} style={selectStyle}>
                          {assetTypes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Identifier</label>
                        <input type="text" value={analysisIdentifier} onChange={(e) => setAnalysisIdentifier(e.target.value)} placeholder="Ticker, address, or name..." style={inputStyle} />
                      </div>
                    </div>
                  )}

                  {analysisType === 'comprehensive' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Analysis Depth</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['quick', 'standard', 'deep'].map(d => (
                          <button key={d} onClick={() => setAnalysisDepth(d)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: analysisDepth === d ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.02)', border: analysisDepth === d ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)', color: analysisDepth === d ? '#D4AF37' : '#8A8A8A', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize' }}>{d}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisType === 'risk' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Investment Amount ($)</label>
                        <input type="number" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} placeholder="10000" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Time Horizon</label>
                        <select value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)} style={selectStyle}>
                          <option value="short">Short (1 year)</option>
                          <option value="medium">Medium (1-5 years)</option>
                          <option value="long">Long (5+ years)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {analysisType === 'market' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Market Sector</label>
                      <input type="text" value={marketSector} onChange={(e) => setMarketSector(e.target.value)} placeholder="e.g., Technology, Real Estate, Healthcare..." style={inputStyle} />
                    </div>
                  )}

                  {/* Run Button */}
                  <button
                    onClick={() => {
                      if (analysisType === 'comprehensive') comprehensiveMutation.mutate();
                      else if (analysisType === 'risk') riskMutation.mutate();
                      else if (analysisType === 'dd') ddMutation.mutate();
                      else if (analysisType === 'market') researchMutation.mutate();
                      else if (analysisType === 'portfolio') portfolioMutation.mutate();
                    }}
                    disabled={
                      (analysisType !== 'market' && analysisType !== 'portfolio' && !analysisIdentifier) ||
                      (analysisType === 'market' && !marketSector) ||
                      comprehensiveMutation.isLoading || riskMutation.isLoading || ddMutation.isLoading || researchMutation.isLoading || portfolioMutation.isLoading
                    }
                    style={{ ...buttonStyles.primary, width: '100%', justifyContent: 'center', opacity: (comprehensiveMutation.isLoading || riskMutation.isLoading || ddMutation.isLoading || researchMutation.isLoading || portfolioMutation.isLoading) ? 0.5 : 1 }}
                    data-testid="run-analysis-btn"
                  >
                    {(comprehensiveMutation.isLoading || riskMutation.isLoading || ddMutation.isLoading || researchMutation.isLoading || portfolioMutation.isLoading) ? (
                      <><Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                    ) : (
                      <><FlaskConical style={{ width: '18px', height: '18px' }} /> Run Analysis</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div style={tileStyles.content}>
                <GoldAccentLine />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}><Brain style={{ width: '24px', height: '24px', color: '#D4AF37' }} /></div>
                  <div><h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>AI Chat</h2><p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Chat with your AI financial advisor{knowledgeDocs.length > 0 ? ` (${knowledgeDocs.length} docs in context)` : ''}</p></div>
                </div>
                <div style={{ minHeight: '300px', maxHeight: '450px', overflowY: 'auto', padding: '1rem', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.3)', marginBottom: '1rem' }}>
                  {chatHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#525252' }}>
                      <Lightbulb style={{ width: '32px', height: '32px', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>Start a conversation with your AI financial advisor</p>
                      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                        {['How can I save more?', 'Analyze my spending', 'Budget recommendations'].map((suggestion) => (
                          <button key={suggestion} onClick={() => setChatMessage(suggestion)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', fontSize: '0.75rem', cursor: 'pointer' }}>{suggestion}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ maxWidth: '85%', padding: '0.75rem 1rem', borderRadius: '12px', background: msg.role === 'user' ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 100%)' : 'rgba(255, 255, 255, 0.05)', color: msg.role === 'user' ? '#000' : '#F5F5F5' }}>
                          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {(chatMutation.isLoading || knowledgeChatMutation.isLoading) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8A8A8A' }}><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: '0.8rem' }}>AI is thinking...</span></div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask about your finances..." style={{ ...inputStyle, flex: 1 }} data-testid="chat-input" />
                  <button onClick={handleSendMessage} disabled={!chatMessage.trim() || chatMutation.isLoading || knowledgeChatMutation.isLoading} style={{ ...buttonStyles.primary, opacity: (!chatMessage.trim() || chatMutation.isLoading || knowledgeChatMutation.isLoading) ? 0.5 : 1 }} data-testid="chat-send"><Send style={{ width: '18px', height: '18px' }} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
