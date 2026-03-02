import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  Send,
  ChevronRight,
  Lightbulb,
  Loader2,
  FolderOpen,
  FlaskConical,
  Briefcase,
  MessageSquare
} from 'lucide-react';
import { tileStyles, headerStyles, buttonStyles, GoldAccentLine, formatCurrency } from '../styles/tileStyles';

// Import modular components
import { KnowledgeLab, StrategyStudio, AnalysisLab } from '../components/ai-copilot';

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

export default function AICoPilot() {
  const { selectedEntityId } = useEntity();
  const [activeTab, setActiveTab] = useState('insights');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState({});
  const [analysisResults, setAnalysisResults] = useState({
    anomalies: null,
    cashFlow: null,
    savings: null,
    budgetSuggestion: null,
  });

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  const aiEnabled = aiStatus?.system_ai_enabled || aiStatus?.user_ai_enabled;

  // Knowledge documents for chat context
  const { data: knowledgeDocs = [] } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => api.getKnowledgeDocuments(),
    enabled: aiEnabled,
  });

  // Chat mutations
  const knowledgeChatMutation = useMutation({
    mutationFn: (message) => api.chatWithKnowledgeBase(message),
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    },
    onError: (error) => toast.error(error.message || 'Chat failed'),
  });

  const chatMutation = useMutation({
    mutationFn: ({ message, context }) => api.aiChat(message, context, 'copilot'),
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    },
    onError: (error) => toast.error(error.message || 'Chat failed'),
  });

  const handleSendMessage = () => {
    if (!chatMessage.trim() || chatMutation.isLoading) return;
    setChatHistory(prev => [...prev, { role: 'user', content: chatMessage }]);
    
    if (knowledgeDocs.length > 0) {
      knowledgeChatMutation.mutate(chatMessage);
    } else {
      chatMutation.mutate({ message: chatMessage, context: { entity_id: selectedEntityId } });
    }
    setChatMessage('');
  };

  // Callback for child components to add to chat
  const handleAnalysisComplete = ({ userMessage, aiResponse }) => {
    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: aiResponse }
    ]);
    setActiveTab('chat');
  };

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
              <KnowledgeLab onAnalysisComplete={handleAnalysisComplete} />
            )}

            {/* Strategy Studio Tab */}
            {activeTab === 'strategy' && (
              <StrategyStudio onAnalysisComplete={handleAnalysisComplete} />
            )}

            {/* Analysis Lab Tab */}
            {activeTab === 'analysis' && (
              <AnalysisLab onAnalysisComplete={handleAnalysisComplete} />
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div style={tileStyles.content}>
                <GoldAccentLine />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}>
                    <Brain style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>AI Chat</h2>
                    <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Chat with your AI financial advisor{knowledgeDocs.length > 0 ? ` (${knowledgeDocs.length} docs in context)` : ''}</p>
                  </div>
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
