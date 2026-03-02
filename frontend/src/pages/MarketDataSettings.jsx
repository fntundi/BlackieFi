import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  TrendingUp, Bitcoin, BarChart3, Key, Check, X, 
  Play, Loader2, ExternalLink, ToggleLeft, ToggleRight,
  Search, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { tileStyles, headerStyles, inputStyles, buttonStyles, GoldAccentLine } from '../styles/tileStyles';

const MarketDataSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [testingProvider, setTestingProvider] = useState(null);
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('stocks'); // stocks or crypto
  const [searchResults, setSearchResults] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const isAdmin = user?.role === 'admin';

  // Query market data providers
  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ['market-data-providers'],
    queryFn: () => api.getMarketDataProviders(),
    enabled: isAdmin,
  });

  const providers = providersData?.providers || [];

  // Mutations
  const updateProviderMutation = useMutation({
    mutationFn: ({ provider, config }) => api.updateMarketDataProvider(provider, config),
    onSuccess: () => {
      queryClient.invalidateQueries(['market-data-providers']);
      toast.success('Provider configuration updated');
    },
    onError: (error) => toast.error(error.message || 'Failed to update provider'),
  });

  const testProviderMutation = useMutation({
    mutationFn: (provider) => api.testMarketDataProvider(provider),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.provider} is working correctly!`);
        setSelectedQuote(data.sample_data);
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    },
    onError: (error) => toast.error(error.message || 'Test failed'),
    onSettled: () => setTestingProvider(null),
  });

  // Search mutations
  const searchMutation = useMutation({
    mutationFn: async ({ type, query }) => {
      if (type === 'stocks') {
        return api.searchStocks(query);
      } else {
        return api.searchCryptos(query);
      }
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
    },
    onError: (error) => toast.error(error.message || 'Search failed'),
  });

  const quoteMutation = useMutation({
    mutationFn: async ({ type, symbol }) => {
      if (type === 'stocks') {
        return api.getStockQuote(symbol);
      } else {
        return api.getCryptoPrice(symbol);
      }
    },
    onSuccess: (data) => {
      setSelectedQuote(data);
    },
    onError: (error) => toast.error(error.message || 'Failed to get quote'),
  });

  const handleToggleProvider = async (providerId, currentEnabled) => {
    await updateProviderMutation.mutateAsync({
      provider: providerId,
      config: { enabled: !currentEnabled },
    });
  };

  const handleSaveApiKey = async (providerId) => {
    const apiKey = apiKeyInputs[providerId];
    if (!apiKey) return;

    await updateProviderMutation.mutateAsync({
      provider: providerId,
      config: { api_key: apiKey },
    });
    
    setApiKeyInputs({ ...apiKeyInputs, [providerId]: '' });
  };

  const handleTestProvider = async (providerId) => {
    setTestingProvider(providerId);
    await testProviderMutation.mutateAsync(providerId);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchMutation.mutate({ type: searchType, query: searchQuery });
  };

  const handleGetQuote = (symbol) => {
    quoteMutation.mutate({ type: searchType, symbol });
  };

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <TrendingUp style={{ width: 64, height: 64, color: '#D4AF37', margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: '#666' }}>This page is only accessible to administrators.</p>
      </div>
    );
  }

  const getProviderIcon = (providerId) => {
    if (providerId === 'alpha_vantage') return <BarChart3 style={{ width: 24, height: 24, color: '#22c55e' }} />;
    if (providerId === 'coingecko') return <Bitcoin style={{ width: 24, height: 24, color: '#f7931a' }} />;
    return <TrendingUp style={{ width: 24, height: 24, color: '#D4AF37' }} />;
  };

  return (
    <div data-testid="market-data-settings">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ ...headerStyles.page, marginBottom: '0.25rem' }}>Market Data Settings</h1>
        <p style={{ color: '#666' }}>Configure stock and cryptocurrency market data providers</p>
      </div>

      {/* Providers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {providersLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 style={{ width: 32, height: 32, color: '#D4AF37', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} style={tileStyles.content}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                    {getProviderIcon(provider.id)}
                  </div>
                  <div>
                    <h3 style={{ color: '#fff', fontWeight: '600', marginBottom: '0.25rem' }}>{provider.name}</h3>
                    <p style={{ color: '#666', fontSize: '0.85rem', maxWidth: '400px' }}>{provider.description}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>
                        {provider.asset_type === 'stocks' ? '📈 Stocks' : '🪙 Crypto'}
                      </span>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>
                        Rate: {provider.rate_limit}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Toggle */}
                <button
                  onClick={() => handleToggleProvider(provider.id, provider.enabled)}
                  style={{ ...buttonStyles.ghost, padding: '0.5rem' }}
                  disabled={updateProviderMutation.isPending}
                >
                  {provider.enabled ? (
                    <ToggleRight style={{ width: 32, height: 32, color: '#D4AF37' }} />
                  ) : (
                    <ToggleLeft style={{ width: 32, height: 32, color: '#444' }} />
                  )}
                </button>
              </div>

              {/* API Key Section */}
              {provider.requires_api_key && (
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Key style={{ width: 16, height: 16, color: '#888' }} />
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>API Key</span>
                    {provider.has_api_key && (
                      <span style={{ color: '#22c55e', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Check style={{ width: 12, height: 12 }} /> Configured
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="password"
                      placeholder={provider.has_api_key ? '••••••••••••' : 'Enter API key'}
                      value={apiKeyInputs[provider.id] || ''}
                      onChange={(e) => setApiKeyInputs({ ...apiKeyInputs, [provider.id]: e.target.value })}
                      style={{ ...inputStyles.text, flex: 1 }}
                    />
                    <button
                      onClick={() => handleSaveApiKey(provider.id)}
                      disabled={!apiKeyInputs[provider.id] || updateProviderMutation.isPending}
                      style={buttonStyles.secondary}
                    >
                      Save
                    </button>
                  </div>
                  <a 
                    href={provider.signup_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#D4AF37', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}
                  >
                    Get API key <ExternalLink style={{ width: 12, height: 12 }} />
                  </a>
                </div>
              )}

              {/* Test Button */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleTestProvider(provider.id)}
                  disabled={!provider.enabled || testingProvider === provider.id}
                  style={provider.enabled ? buttonStyles.primary : { ...buttonStyles.ghost, opacity: 0.5 }}
                >
                  {testingProvider === provider.id ? (
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Play style={{ width: 16, height: 16 }} />
                  )}
                  Test Connection
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Search & Quote Section */}
      <div style={tileStyles.content}>
        <GoldAccentLine />
        <div style={{ ...headerStyles.section, marginBottom: '1rem' }}>
          <Search style={{ width: 20, height: 20, color: '#D4AF37' }} />
          <span>Test Market Data</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <select
            value={searchType}
            onChange={(e) => {
              setSearchType(e.target.value);
              setSearchResults(null);
              setSelectedQuote(null);
            }}
            style={inputStyles.select}
          >
            <option value="stocks">Stocks (Alpha Vantage)</option>
            <option value="crypto">Crypto (CoinGecko)</option>
          </select>
          <input
            type="text"
            placeholder={searchType === 'stocks' ? 'Search stocks (e.g., Apple, MSFT)' : 'Search crypto (e.g., Bitcoin, ETH)'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ ...inputStyles.text, flex: 1 }}
          />
          <button
            onClick={handleSearch}
            disabled={searchMutation.isPending}
            style={buttonStyles.primary}
          >
            {searchMutation.isPending ? (
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            ) : (
              <Search style={{ width: 16, height: 16 }} />
            )}
            Search
          </button>
        </div>

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Search Results:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGetQuote(searchType === 'stocks' ? result.symbol : result.id)}
                  style={{ 
                    ...buttonStyles.ghost, 
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                  }}
                >
                  <span style={{ color: '#D4AF37', fontWeight: '600' }}>
                    {searchType === 'stocks' ? result.symbol : result.symbol?.toUpperCase()}
                  </span>
                  <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                    {result.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Quote */}
        {selectedQuote && !selectedQuote.error && (
          <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ color: '#D4AF37', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {selectedQuote.symbol || selectedQuote.coin_id?.toUpperCase()}
                </h4>
                <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '700' }}>
                  ${selectedQuote.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {(selectedQuote.change_percent || selectedQuote.change_24h) !== undefined && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem',
                    color: (parseFloat(selectedQuote.change_percent || selectedQuote.change_24h) >= 0) ? '#22c55e' : '#ef4444',
                  }}>
                    {parseFloat(selectedQuote.change_percent || selectedQuote.change_24h) >= 0 ? (
                      <ArrowUpRight style={{ width: 16, height: 16 }} />
                    ) : (
                      <ArrowDownRight style={{ width: 16, height: 16 }} />
                    )}
                    <span style={{ fontWeight: '600' }}>
                      {parseFloat(selectedQuote.change_percent || selectedQuote.change_24h).toFixed(2)}%
                    </span>
                  </div>
                )}
                {selectedQuote.cached && (
                  <span style={{ color: '#888', fontSize: '0.75rem' }}>Cached</span>
                )}
              </div>
            </div>
            {selectedQuote.market_cap && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem' }}>
                <div>
                  <p style={{ color: '#666', fontSize: '0.75rem' }}>Market Cap</p>
                  <p style={{ color: '#fff', fontWeight: '500' }}>${selectedQuote.market_cap?.toLocaleString()}</p>
                </div>
                {(selectedQuote.volume || selectedQuote.volume_24h) && (
                  <div>
                    <p style={{ color: '#666', fontSize: '0.75rem' }}>24h Volume</p>
                    <p style={{ color: '#fff', fontWeight: '500' }}>${(selectedQuote.volume || selectedQuote.volume_24h)?.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedQuote?.error && (
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p style={{ color: '#ef4444' }}>{selectedQuote.error}</p>
          </div>
        )}
      </div>

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MarketDataSettings;
