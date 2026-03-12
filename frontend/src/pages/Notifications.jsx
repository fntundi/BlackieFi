import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Calendar,
  Target,
  DollarSign,
  Mail,
  Settings,
  RefreshCw,
  ChevronRight,
  Clock,
  TrendingUp,
  Send,
  Loader2
} from 'lucide-react';

export default function Notifications() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('notifications');
  const [testEmail, setTestEmail] = useState('');

  // Fetch notifications
  const { data: notifications = [], isLoading: loadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(50, false),
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.getUnreadCount(),
  });

  // Fetch notification preferences
  const { data: preferences = {}, isLoading: loadingPrefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.getNotificationPreferences(),
  });

  // Mark notifications as read
  const markReadMutation = useMutation({
    mutationFn: (ids) => api.markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-count']);
      toast.success('Notifications marked as read');
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-count']);
      toast.success('All notifications marked as read');
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-count']);
      toast.success('Notification deleted');
    },
  });

  // Update preferences
  const updatePrefsMutation = useMutation({
    mutationFn: (prefs) => api.updateNotificationPreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-preferences']);
      toast.success('Preferences saved');
    },
  });

  // Check alerts
  const checkAlertsMutation = useMutation({
    mutationFn: () => api.checkAlerts(selectedEntityId),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-count']);
      if (data.alerts_triggered > 0) {
        toast.success(`${data.alerts_triggered} alert(s) triggered`);
      } else {
        toast.info('No alerts to trigger');
      }
    },
    onError: () => {
      toast.error('Failed to check alerts');
    },
  });

  // Send test email
  const sendTestEmailMutation = useMutation({
    mutationFn: (email) => api.sendTestEmail(email),
    onSuccess: () => {
      toast.success('Test email sent successfully');
      setTestEmail('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send test email');
    },
  });

  const handlePreferenceChange = (key, value) => {
    updatePrefsMutation.mutate({ ...preferences, [key]: value });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'budget_alert': return <AlertTriangle style={{ width: '18px', height: '18px', color: '#DC2626' }} />;
      case 'bill_reminder': return <Calendar style={{ width: '18px', height: '18px', color: '#EAB308' }} />;
      case 'goal_milestone': return <Target style={{ width: '18px', height: '18px', color: '#059669' }} />;
      case 'transaction_alert': return <DollarSign style={{ width: '18px', height: '18px', color: '#3B82F6' }} />;
      default: return <Bell style={{ width: '18px', height: '18px', color: '#D4AF37' }} />;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'budget_alert': return 'Budget Alert';
      case 'bill_reminder': return 'Bill Reminder';
      case 'goal_milestone': return 'Goal Milestone';
      case 'transaction_alert': return 'Transaction Alert';
      case 'welcome': return 'Welcome';
      case 'system': return 'System';
      default: return 'Notification';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const cardStyle = {
    background: '#0A0A0A',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '1.5rem'
  };

  const unreadCount = unreadData?.unread_count || 0;

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="notifications-page">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Alerts & Updates</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  fontSize: '0.875rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  background: 'rgba(220, 38, 38, 0.2)',
                  color: '#DC2626',
                  fontWeight: '600'
                }}>{unreadCount} unread</span>
              )}
            </h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Manage your alerts and notification preferences</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => checkAlertsMutation.mutate()}
              disabled={checkAlertsMutation.isLoading || !selectedEntityId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#D4AF37',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
              data-testid="check-alerts-btn"
            >
              {checkAlertsMutation.isLoading ? (
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCw style={{ width: '16px', height: '16px' }} />
              )}
              Check Alerts
            </button>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                  border: 'none',
                  color: '#000',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
                data-testid="mark-all-read-btn"
              >
                <CheckCheck style={{ width: '16px', height: '16px' }} />
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#D4AF37' : '#737373',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
                data-testid={`tab-${tab.id}`}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div style={cardStyle} data-testid="notifications-list">
            {loadingNotifications ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#D4AF37', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <BellOff style={{ width: '48px', height: '48px', color: '#404040', margin: '0 auto 1rem' }} />
                <p style={{ color: '#737373', margin: 0 }}>No notifications yet</p>
                <p style={{ color: '#525252', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  We'll notify you when there's something important
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: notification.read ? '#0F0F0F' : 'rgba(212, 175, 55, 0.05)',
                      border: notification.read ? '1px solid rgba(255, 255, 255, 0.03)' : '1px solid rgba(212, 175, 55, 0.15)',
                      transition: 'all 0.2s'
                    }}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: notification.read ? 'rgba(255, 255, 255, 0.03)' : 'rgba(212, 175, 55, 0.1)'
                    }}>
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.625rem',
                          fontWeight: '600',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: notification.read ? '#525252' : '#D4AF37'
                        }}>
                          {getCategoryLabel(notification.category)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#525252', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock style={{ width: '12px', height: '12px' }} />
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <p style={{ color: notification.read ? '#A3A3A3' : '#F5F5F5', margin: 0, fontWeight: notification.read ? '400' : '500' }}>
                        {notification.data?.category_name && `${notification.data.category_name}: `}
                        {notification.data?.percentage && `${notification.data.percentage}% `}
                        {notification.data?.bill_name && notification.data.bill_name}
                        {notification.data?.goal_name && notification.data.goal_name}
                        {notification.data?.message || 'Notification details'}
                      </p>
                      {notification.data?.spent && notification.data?.budget && (
                        <p style={{ fontSize: '0.875rem', color: '#737373', margin: '0.25rem 0 0' }}>
                          Spent: ${notification.data.spent} / Budget: ${notification.data.budget}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!notification.read && (
                        <button
                          onClick={() => markReadMutation.mutate([notification.id])}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: 'rgba(5, 150, 105, 0.1)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Mark as read"
                        >
                          <Check style={{ width: '14px', height: '14px', color: '#059669' }} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(notification.id)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '8px',
                          background: 'rgba(220, 38, 38, 0.1)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Delete"
                      >
                        <Trash2 style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Email Settings */}
            <div style={cardStyle} data-testid="email-settings">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.1)' }}>
                  <Mail style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
                </div>
                <div>
                  <h3 style={{ color: '#F5F5F5', margin: 0, fontWeight: '600' }}>Email Notifications</h3>
                  <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Configure email delivery settings</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '10px', background: '#0F0F0F' }}>
                  <div>
                    <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '500' }}>Enable Email Notifications</p>
                    <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Receive important alerts via email</p>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('email_notifications', !preferences.email_notifications)}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      background: preferences.email_notifications ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : '#1A1A1A',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.3s'
                    }}
                    data-testid="toggle-email-notifications"
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#FFF',
                      position: 'absolute',
                      top: '3px',
                      left: preferences.email_notifications ? '23px' : '3px',
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }} />
                  </button>
                </div>

                {/* Test Email */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#0F0F0F' }}>
                  <p style={{ color: '#F5F5F5', margin: '0 0 0.75rem', fontWeight: '500' }}>Test Email Configuration</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter your email"
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        background: '#0A0A0A',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#F5F5F5',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                      data-testid="test-email-input"
                    />
                    <button
                      onClick={() => sendTestEmailMutation.mutate(testEmail)}
                      disabled={!testEmail || sendTestEmailMutation.isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '8px',
                        background: testEmail ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : '#1A1A1A',
                        border: 'none',
                        color: testEmail ? '#000' : '#525252',
                        cursor: testEmail ? 'pointer' : 'not-allowed',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}
                      data-testid="send-test-email-btn"
                    >
                      {sendTestEmailMutation.isLoading ? (
                        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Send style={{ width: '16px', height: '16px' }} />
                      )}
                      Send Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Types */}
            <div style={cardStyle} data-testid="alert-types">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(220, 38, 38, 0.1)' }}>
                  <AlertTriangle style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                </div>
                <div>
                  <h3 style={{ color: '#F5F5F5', margin: 0, fontWeight: '600' }}>Alert Types</h3>
                  <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Choose which alerts you want to receive</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Budget Alerts */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#0F0F0F' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <AlertTriangle style={{ width: '18px', height: '18px', color: '#DC2626' }} />
                      <div>
                        <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '500' }}>Budget Alerts</p>
                        <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Get notified when spending exceeds budget</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('budget_alerts', !preferences.budget_alerts)}
                      style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        background: preferences.budget_alerts ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : '#1A1A1A',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s'
                      }}
                      data-testid="toggle-budget-alerts"
                    >
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#FFF',
                        position: 'absolute',
                        top: '3px',
                        left: preferences.budget_alerts ? '23px' : '3px',
                        transition: 'all 0.3s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }} />
                    </button>
                  </div>
                  {preferences.budget_alerts && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <label style={{ display: 'block', color: '#A3A3A3', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Alert threshold (%)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={preferences.budget_alert_threshold || 80}
                        onChange={(e) => handlePreferenceChange('budget_alert_threshold', parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#D4AF37' }}
                        data-testid="budget-threshold-slider"
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#525252' }}>
                        <span>50%</span>
                        <span style={{ color: '#D4AF37', fontWeight: '600' }}>{preferences.budget_alert_threshold || 80}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bill Reminders */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#0F0F0F' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar style={{ width: '18px', height: '18px', color: '#EAB308' }} />
                      <div>
                        <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '500' }}>Bill Reminders</p>
                        <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Get reminded before bills are due</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('bill_reminders', !preferences.bill_reminders)}
                      style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        background: preferences.bill_reminders ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : '#1A1A1A',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s'
                      }}
                      data-testid="toggle-bill-reminders"
                    >
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#FFF',
                        position: 'absolute',
                        top: '3px',
                        left: preferences.bill_reminders ? '23px' : '3px',
                        transition: 'all 0.3s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }} />
                    </button>
                  </div>
                  {preferences.bill_reminders && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <label style={{ display: 'block', color: '#A3A3A3', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Days before due date
                      </label>
                      <select
                        value={preferences.bill_reminder_days || 7}
                        onChange={(e) => handlePreferenceChange('bill_reminder_days', parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: '#0A0A0A',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#F5F5F5',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                        data-testid="bill-reminder-days"
                      >
                        <option value={1}>1 day</option>
                        <option value={3}>3 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Goal Milestones */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: '#0F0F0F' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Target style={{ width: '18px', height: '18px', color: '#059669' }} />
                      <div>
                        <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '500' }}>Goal Milestones</p>
                        <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Celebrate when you reach 25%, 50%, 75%, and 100%</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('goal_milestones', !preferences.goal_milestones)}
                      style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        background: preferences.goal_milestones ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : '#1A1A1A',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s'
                      }}
                      data-testid="toggle-goal-milestones"
                    >
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#FFF',
                        position: 'absolute',
                        top: '3px',
                        left: preferences.goal_milestones ? '23px' : '3px',
                        transition: 'all 0.3s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Reports */}
            <div style={cardStyle} data-testid="summary-reports">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)' }}>
                  <TrendingUp style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                </div>
                <div>
                  <h3 style={{ color: '#F5F5F5', margin: 0, fontWeight: '600' }}>Summary Reports</h3>
                  <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Receive periodic financial summaries</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Weekly Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '10px', background: '#0F0F0F' }}>
                  <div>
                    <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '500' }}>Weekly Summary</p>
                    <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Get a weekly overview every Sunday</p>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('weekly_summary', !preferences.weekly_summary)}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      background: preferences.weekly_summary ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : '#1A1A1A',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.3s'
                    }}
                    data-testid="toggle-weekly-summary"
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#FFF',
                      position: 'absolute',
                      top: '3px',
                      left: preferences.weekly_summary ? '23px' : '3px',
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }} />
                  </button>
                </div>

                {/* Monthly Report */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '10px', background: '#0F0F0F' }}>
                  <div>
                    <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '500' }}>Monthly Report</p>
                    <p style={{ color: '#525252', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>Get a detailed monthly report on the 1st</p>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('monthly_report', !preferences.monthly_report)}
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      background: preferences.monthly_report ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : '#1A1A1A',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.3s'
                    }}
                    data-testid="toggle-monthly-report"
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#FFF',
                      position: 'absolute',
                      top: '3px',
                      left: preferences.monthly_report ? '23px' : '3px',
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
