import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from '../components';

const SettingsPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: 'user@example.com',
    displayName: 'John Doe',
    timezone: 'UTC',
    theme: 'light',
    notifications: true,
    emailAlerts: true,
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account and application settings</p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-sm font-semibold text-green-900">Settings saved successfully</p>
        </div>
      )}

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Display Name</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="UTC">UTC</option>
              <option value="EST">EST (UTC-5)</option>
              <option value="CST">CST (UTC-6)</option>
              <option value="PST">PST (UTC-8)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={formData.theme === 'light'}
                  onChange={handleChange}
                />
                <span className="text-sm text-slate-700">Light</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={formData.theme === 'dark'}
                  onChange={handleChange}
                  disabled
                />
                <span className="text-sm text-slate-700">Dark (Coming soon)</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Control how you receive alerts and updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              name="notifications"
              checked={formData.notifications}
              onChange={handleChange}
              className="rounded"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">In-app Notifications</p>
              <p className="text-xs text-slate-500">Receive notifications in the application</p>
            </div>
          </label>

          <label className="flex items-center gap-3 py-2 border-t border-slate-200 pt-4">
            <input
              type="checkbox"
              name="emailAlerts"
              checked={formData.emailAlerts}
              onChange={handleChange}
              className="rounded"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Email Notifications</p>
              <p className="text-xs text-slate-500">Receive email alerts for critical events</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage your API access credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono text-slate-600">sk_live_51Hv...WK5</span>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-xs text-slate-500 mb-3">Created: Jan 15, 2025</p>
            <button className="text-xs text-red-600 hover:text-red-700 font-medium">Revoke</button>
          </div>

          <Button variant="outline" className="w-full">
            + Create New API Key
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Delete Account</h3>
            <p className="text-sm text-slate-600 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button onClick={handleSave}>Save Settings</Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </div>
  );
};

export { SettingsPage };
export default SettingsPage;
