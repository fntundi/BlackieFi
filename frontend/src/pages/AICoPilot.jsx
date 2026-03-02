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
  RefreshCw,
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
  X,
  Search,
  Trash2,
  Eye,
  FolderOpen
} from 'lucide-react';
import { tileStyles, headerStyles, buttonStyles, GoldAccentLine, formatCurrency } from '../styles/tileStyles';

export default function AICoPilot() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('insights');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState({});

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  // AI is enabled if either system or user has it enabled
  const aiEnabled = aiStatus?.system_ai_enabled || aiStatus?.user_ai_enabled;

  // AI Analysis Results State
  const [analysisResults, setAnalysisResults] = useState({
    anomalies: null,
    cashFlow: null,
    savings: null,
    budgetSuggestion: null,
    taxEstimate: null,
  });

  // Chat mutation
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
    chatMutation.mutate({ 
      message: chatMessage,
      context: { entity_id: selectedEntityId }
    });
    setChatMessage('');
  };

  // Analysis functions
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
    { id: 'chat', label: 'Chat', icon: Brain },
    { id: 'analysis', label: 'Deep Analysis', icon: BarChart3 },
  ];

  const quickInsightCards = [
    {
      id: 'anomalies',
      title: 'Spending Anomalies',
      description: 'Detect unusual spending patterns',
      icon: AlertTriangle,
      color: '#DC2626',
      action: () => runAnalysis('anomalies'),
    },
    {
      id: 'cashFlow',
      title: 'Cash Flow Forecast',
      description: '3-month projection based on history',
      icon: TrendingUp,
      color: '#059669',
      action: () => runAnalysis('cashFlow'),
    },
    {
      id: 'savings',
      title: 'Cost Savings',
      description: 'Find opportunities to save money',
      icon: PiggyBank,
      color: '#D4AF37',
      action: () => runAnalysis('savings'),
    },
    {
      id: 'budget',
      title: 'Smart Budget',
      description: 'AI-generated budget recommendation',
      icon: Calculator,
      color: '#8B5CF6',
      action: () => runAnalysis('budget'),
    },
  ];

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="ai-copilot-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={headerStyles.label}>AI Co-Pilot</p>
            <h1 style={headerStyles.title}>Investment Intelligence</h1>
            <p style={headerStyles.subtitle}>AI-powered insights and analysis for your portfolio</p>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
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
          <div style={{
            ...tileStyles.content,
            marginBottom: '2rem',
            borderColor: 'rgba(220, 38, 38, 0.2)',
            textAlign: 'center',
            padding: '3rem',
          }}>
            <Brain style={{ width: '48px', height: '48px', color: '#DC2626', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#F5F5F5', marginBottom: '0.5rem' }}>AI Features Disabled</h3>
            <p style={{ color: '#8A8A8A', maxWidth: '400px', margin: '0 auto' }}>
              Enable AI in Admin Settings to unlock intelligent insights, forecasts, and recommendations.
            </p>
          </div>
        )}

        {aiEnabled && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '12px',
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isActive 
                        ? '1px solid rgba(212, 175, 55, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#D4AF37' : '#8A8A8A',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
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
                {/* Quick Analysis Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                  {quickInsightCards.map((card) => {
                    const CardIcon = card.icon;
                    const isLoading = isAnalyzing[card.id];
                    return (
                      <div
                        key={card.id}
                        style={{
                          ...tileStyles.card,
                          cursor: isLoading ? 'wait' : 'pointer',
                          border: `1px solid rgba(${card.color === '#DC2626' ? '220, 38, 38' : card.color === '#059669' ? '5, 150, 105' : card.color === '#D4AF37' ? '212, 175, 55' : '139, 92, 246'}, 0.15)`,
                        }}
                        onClick={() => !isLoading && card.action()}
                        data-testid={`insight-${card.id}`}
                      >
                        <div style={{
                          padding: '0.75rem',
                          borderRadius: '12px',
                          background: `rgba(${card.color === '#DC2626' ? '220, 38, 38' : card.color === '#059669' ? '5, 150, 105' : card.color === '#D4AF37' ? '212, 175, 55' : '139, 92, 246'}, 0.1)`,
                          width: 'fit-content',
                          marginBottom: '1rem',
                        }}>
                          {isLoading ? (
                            <Loader2 style={{ width: '24px', height: '24px', color: card.color, animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <CardIcon style={{ width: '24px', height: '24px', color: card.color }} />
                          )}
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#F5F5F5', margin: '0 0 0.5rem 0' }}>
                          {card.title}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>
                          {card.description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem', color: card.color, fontSize: '0.8rem', fontWeight: '600' }}>
                          {isLoading ? 'Analyzing...' : 'Run Analysis'}
                          <ChevronRight style={{ width: '14px', height: '14px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Results Display */}
                {(analysisResults.anomalies || analysisResults.cashFlow || analysisResults.savings || analysisResults.budgetSuggestion) && (
                  <div style={tileStyles.content}>
                    <GoldAccentLine />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>
                      Analysis Results
                    </h2>
                    
                    {/* Anomalies */}
                    {analysisResults.anomalies && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#DC2626', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle style={{ width: '18px', height: '18px' }} />
                          Spending Anomalies
                        </h3>
                        {analysisResults.anomalies.anomalies?.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#D4D4D4' }}>
                            {analysisResults.anomalies.anomalies.map((a, i) => (
                              <li key={i} style={{ marginBottom: '0.5rem' }}>{a}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: '#8A8A8A', margin: 0 }}>No anomalies detected. Your spending looks normal!</p>
                        )}
                      </div>
                    )}

                    {/* Cash Flow */}
                    {analysisResults.cashFlow && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#059669', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TrendingUp style={{ width: '18px', height: '18px' }} />
                          Cash Flow Forecast
                        </h3>
                        {analysisResults.cashFlow.forecast && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {analysisResults.cashFlow.forecast.map((f, i) => (
                              <div key={i} style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <p style={{ fontSize: '0.8rem', color: '#8A8A8A', marginBottom: '0.5rem' }}>Month {i + 1}</p>
                                <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: f.net_flow >= 0 ? '#059669' : '#DC2626', margin: 0 }}>
                                  {formatCurrency(f.net_flow || 0)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {analysisResults.cashFlow.analysis && (
                          <p style={{ color: '#D4D4D4', marginTop: '1rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {analysisResults.cashFlow.analysis}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Savings */}
                    {analysisResults.savings && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#D4AF37', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <PiggyBank style={{ width: '18px', height: '18px' }} />
                          Cost Saving Opportunities
                        </h3>
                        {analysisResults.savings.opportunities?.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#D4D4D4' }}>
                            {analysisResults.savings.opportunities.map((o, i) => (
                              <li key={i} style={{ marginBottom: '0.5rem' }}>{o}</li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: '#8A8A8A', margin: 0 }}>Great job! No obvious cost-saving opportunities found.</p>
                        )}
                        {analysisResults.savings.potential_savings && (
                          <p style={{ marginTop: '1rem', fontWeight: '600', color: '#D4AF37' }}>
                            Potential Monthly Savings: {formatCurrency(analysisResults.savings.potential_savings)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Budget Suggestion */}
                    {analysisResults.budgetSuggestion && (
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#8B5CF6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calculator style={{ width: '18px', height: '18px' }} />
                          Smart Budget Suggestion
                        </h3>
                        {analysisResults.budgetSuggestion.recommendations && (
                          <p style={{ color: '#D4D4D4', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {analysisResults.budgetSuggestion.recommendations}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div style={tileStyles.content}>
                <GoldAccentLine />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '12px', 
                    background: 'rgba(212, 175, 55, 0.1)',
                    boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)'
                  }}>
                    <Brain style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Chat with AI</h2>
                    <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Ask questions about your finances</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div style={{ 
                  minHeight: '300px', 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  marginBottom: '1rem',
                }}>
                  {chatHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#525252' }}>
                      <Lightbulb style={{ width: '32px', height: '32px', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>Start a conversation with your AI financial advisor</p>
                      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                        {['How can I save more?', 'Analyze my spending', 'Budget recommendations'].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setChatMessage(suggestion);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(212, 175, 55, 0.1)',
                              border: '1px solid rgba(212, 175, 55, 0.2)',
                              color: '#D4AF37',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{
                          maxWidth: '80%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          background: msg.role === 'user' 
                            ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 100%)'
                            : 'rgba(255, 255, 255, 0.05)',
                          color: msg.role === 'user' ? '#000' : '#F5F5F5',
                        }}>
                          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {chatMutation.isLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8A8A8A' }}>
                      <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '0.8rem' }}>AI is thinking...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about your finances..."
                    style={{
                      flex: 1,
                      padding: '0.875rem 1rem',
                      borderRadius: '12px',
                      background: '#0A0A0A',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F5F5F5',
                      fontSize: '0.9375rem',
                      outline: 'none',
                    }}
                    data-testid="chat-input"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || chatMutation.isLoading}
                    style={{
                      ...buttonStyles.primary,
                      opacity: (!chatMessage.trim() || chatMutation.isLoading) ? 0.5 : 1,
                      cursor: (!chatMessage.trim() || chatMutation.isLoading) ? 'not-allowed' : 'pointer',
                    }}
                    data-testid="chat-send"
                  >
                    <Send style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>
              </div>
            )}

            {/* Deep Analysis Tab */}
            {activeTab === 'analysis' && (
              <div style={tileStyles.content}>
                <GoldAccentLine />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>
                  Deep Analysis Tools
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                  {/* Tax Planning */}
                  <div style={tileStyles.cardGold}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <FileText style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Tax Planning</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#8A8A8A', marginBottom: '1rem' }}>
                      AI-powered tax estimation and optimization strategies
                    </p>
                    <a href="/tax" style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      color: '#D4AF37', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}>
                      Open Tax Planning
                      <ChevronRight style={{ width: '16px', height: '16px' }} />
                    </a>
                  </div>

                  {/* Reports */}
                  <div style={tileStyles.cardGold}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <BarChart3 style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Financial Reports</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#8A8A8A', marginBottom: '1rem' }}>
                      Generate detailed reports with AI insights
                    </p>
                    <a href="/reports" style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      color: '#D4AF37', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}>
                      Open Reports
                      <ChevronRight style={{ width: '16px', height: '16px' }} />
                    </a>
                  </div>

                  {/* Goal Analysis */}
                  <div style={tileStyles.cardGold}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Target style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Goal Analysis</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#8A8A8A', marginBottom: '1rem' }}>
                      AI recommendations for achieving your financial goals
                    </p>
                    <a href="/goals" style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      color: '#D4AF37', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}>
                      Open Goals
                      <ChevronRight style={{ width: '16px', height: '16px' }} />
                    </a>
                  </div>

                  {/* Budget Optimization */}
                  <div style={tileStyles.cardGold}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <DollarSign style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Budget Optimization</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#8A8A8A', marginBottom: '1rem' }}>
                      Smart budgeting with AI-powered zero-based planning
                    </p>
                    <a href="/budgets" style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      color: '#D4AF37', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}>
                      Open Budgets
                      <ChevronRight style={{ width: '16px', height: '16px' }} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
