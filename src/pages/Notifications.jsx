import React, { useMemo, useState } from "react";
import { appApi } from "@/lib/app-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Clock, Trash2 } from "lucide-react";

export default function Notifications() {
  const [tab, setTab] = useState("all");
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => appApi.get("/api/notifications") });
  const upcoming = useQuery({ queryKey: ["upcoming-notifications"], queryFn: () => appApi.get("/api/notifications/upcoming?days=7") });

  const markRead = useMutation({
    mutationFn: (id) => appApi.put(`/api/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  const markAllRead = useMutation({
    mutationFn: () => appApi.put("/api/notifications/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  const deleteNotification = useMutation({
    mutationFn: (id) => appApi.delete(`/api/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const notificationRows = notifications.data ?? [];
  const unreadCount = useMemo(() => notificationRows.filter((row) => !row.read).length, [notificationRows]);
  const visibleRows = tab === "unread" ? notificationRows.filter((row) => !row.read) : notificationRows;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">In-app notifications and upcoming reminders from `latest-changes`.</p>
          </div>
          {unreadCount > 0 && <Button variant="outline" onClick={() => markAllRead.mutate()}><CheckCheck className="w-4 h-4 mr-2" />Mark All Read</Button>}
        </div>

        <div className="flex gap-2">
          {[
            { key: "all", label: `All (${notificationRows.length})` },
            { key: "unread", label: `Unread (${unreadCount})` },
            { key: "upcoming", label: `Upcoming (${(upcoming.data ?? []).length})` }
          ].map((item) => (
            <Button key={item.key} variant={tab === item.key ? "default" : "outline"} onClick={() => setTab(item.key)}>
              {item.key === "upcoming" ? <Clock className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              {item.label}
            </Button>
          ))}
        </div>

        {tab !== "upcoming" && (
          <div className="space-y-4">
            {visibleRows.map((notification) => (
              <Card key={notification.id} className={!notification.read ? "border-amber-300" : undefined}>
                <CardContent className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{notification.title || "Notification"}</p>
                      {!notification.read && <Badge>Unread</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{notification.message || "No message"}</p>
                    <p className="text-xs text-gray-400">{new Date(notification.created_date || notification.created_at || Date.now()).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && <Button size="icon" variant="outline" onClick={() => markRead.mutate(notification.id)}><Check className="w-4 h-4" /></Button>}
                    <Button size="icon" variant="ghost" onClick={() => deleteNotification.mutate(notification.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!visibleRows.length && <Card><CardContent className="py-12 text-center text-gray-500">No notifications to show.</CardContent></Card>}
          </div>
        )}

        {tab === "upcoming" && (
          <div className="space-y-4">
            {(upcoming.data ?? []).map((item, index) => (
              <Card key={`${item.name}-${index}`}>
                <CardContent className="pt-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.type} • due {item.date}</p>
                  </div>
                  <Badge variant="secondary">${Number(item.amount ?? 0).toFixed(2)}</Badge>
                </CardContent>
              </Card>
            ))}
            {!(upcoming.data ?? []).length && <Card><CardContent className="py-12 text-center text-gray-500">Nothing due in the next seven days.</CardContent></Card>}
          </div>
        )}
      </div>
    </div>
  );
}
