import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Boxes,
  Crown,
  LogOut,
  Server,
  Settings,
  ShoppingBag,
  Upload,
  Users,
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function Field({ label, value, onChange, textarea = false, type = 'text' }) {
  return (
    <label className="field">
      <span>{label}</span>
      {textarea ? (
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function Login() {
  return (
    <div className="login">
      <div className="card hero">
        <h1>AhnajakMC Store</h1>
        <p>Golden dark admin panel • Supabase • Discord auth</p>
        <a className="btn gold" href={`${API}/api/auth/discord`}>
          Login with Discord
        </a>
      </div>
    </div>
  );
}

function UploadBox() {
  const [url, setUrl] = useState('');

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API}/api/admin/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await response.json();
    setUrl(data.url || data.error);
  }

  return (
    <div className="upload">
      <Upload />
      <input type="file" onChange={upload} />
      {url && <code>{url}</code>}
    </div>
  );
}

function Crud({ title, table, rows, fields, reload }) {
  const [form, setForm] = useState({});

  async function create() {
    await request(`/api/admin/${table}`, {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setForm({});
    reload();
  }

  async function remove(id) {
    await request(`/api/admin/${table}/${id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <section>
      <div className="card">
        <h2>{title}</h2>
        {fields.map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={form[key] || ''}
            onChange={(value) => setForm({ ...form, [key]: value })}
            textarea={key.includes('description') || key.includes('command')}
          />
        ))}
        <button className="btn gold" onClick={create}>
          Create
        </button>
      </div>
      <div className="list">
        {rows?.map((row) => (
          <div className="item" key={row.id}>
            <b>{row.name || row.id}</b>
            <code>{row.id}</code>
            <button onClick={() => remove(row.id)}>Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsTab({ data, reload }) {
  const [settings, setSettings] = useState(data.settings || {});

  async function save() {
    await request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    reload();
  }

  return (
    <section className="grid">
      <div className="card">
        <h2>Store UI</h2>
        <Field
          label="Store name"
          value={settings.store_name}
          onChange={(value) => setSettings({ ...settings, store_name: value })}
        />
        <Field
          label="Description"
          value={settings.description}
          onChange={(value) => setSettings({ ...settings, description: value })}
          textarea
        />
        <Field
          label="Banner URL"
          value={settings.banner_url}
          onChange={(value) => setSettings({ ...settings, banner_url: value })}
        />
        <Field
          label="Logo URL"
          value={settings.logo_url}
          onChange={(value) => setSettings({ ...settings, logo_url: value })}
        />
        <Field
          label="How to use"
          value={settings.how_to_use}
          onChange={(value) => setSettings({ ...settings, how_to_use: value })}
          textarea
        />
        <Field
          label="Terms & privacy"
          value={settings.terms_privacy}
          onChange={(value) => setSettings({ ...settings, terms_privacy: value })}
          textarea
        />
        <button className="btn gold" onClick={save}>
          Save
        </button>
      </div>
      <div className="card">
        <h2>KHQR</h2>
        <Field
          label="Webhook secret"
          value={settings.webhook_secret}
          onChange={(value) => setSettings({ ...settings, webhook_secret: value })}
        />
        <Field
          label="Merchant name"
          value={settings.merchant_name}
          onChange={(value) => setSettings({ ...settings, merchant_name: value })}
        />
        <Field
          label="Merchant ID"
          value={settings.merchant_id}
          onChange={(value) => setSettings({ ...settings, merchant_id: value })}
        />
        <Field
          label="Admin role ID"
          value={settings.admin_role_id}
          onChange={(value) => setSettings({ ...settings, admin_role_id: value })}
        />
        <UploadBox />
      </div>
    </section>
  );
}

function ServersTab({ data, reload }) {
  return (
    <Crud
      title="Servers"
      table="minecraft_servers"
      rows={data.servers}
      fields={[
        ['name', 'Name'],
        ['api_base_url', 'Plugin API URL'],
        ['plugin_api_key', 'Plugin API key'],
      ]}
      reload={reload}
    />
  );
}

function CategoriesTab({ data, reload }) {
  return (
    <Crud
      title="Categories"
      table="categories"
      rows={data.categories}
      fields={[
        ['name', 'Name'],
        ['description', 'Description'],
        ['logo_url', 'Logo URL'],
        ['sort_order', 'Sort order'],
      ]}
      reload={reload}
    />
  );
}

function ProductsTab({ data, reload }) {
  return (
    <Crud
      title="Products"
      table="products"
      rows={data.products}
      fields={[
        ['name', 'Name'],
        ['description', 'Description'],
        ['logo_url', 'Logo URL'],
        ['price', 'Price'],
        ['category_id', 'Category ID'],
        ['server_id', 'Server ID'],
        ['minecraft_command', 'Minecraft command'],
      ]}
      reload={reload}
    />
  );
}

function UsersTab({ data, reload }) {
  async function updateRole(user, role) {
    await request(`/api/admin/users/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    reload();
  }

  async function loginAs(user) {
    await request(`/api/admin/users/${user.id}/login-as`, { method: 'POST' });
    alert(`Now logged in as ${user.username}`);
    location.reload();
  }

  return (
    <section>
      <div className="card">
        <h2>Users</h2>
        <p>Owner can log in as a user to help them.</p>
      </div>
      <div className="list">
        {data.users?.map((user) => (
          <div className="item" key={user.id}>
            <b>{user.username}</b>
            <code>{user.discord_id}</code>
            <span>{user.role}</span>
            <button onClick={() => updateRole(user, 'admin')}>Make admin</button>
            <button onClick={() => updateRole(user, 'user')}>Make user</button>
            <button onClick={() => loginAs(user)}>Login as</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Admin() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('settings');
  const [error, setError] = useState('');

  useEffect(() => {
    request('/api/me')
      .then((result) => setMe(result.user))
      .catch(() => {
        location.href = '/login';
      });
  }, []);

  async function load() {
    try {
      setData(await request('/api/admin/bootstrap'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!me || !data) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <aside>
        <h2>
          <Crown /> Ahnajak
        </h2>
        <button onClick={() => setTab('settings')}>
          <Settings /> Settings
        </button>
        <button onClick={() => setTab('servers')}>
          <Server /> Servers
        </button>
        <button onClick={() => setTab('categories')}>
          <Boxes /> Categories
        </button>
        <button onClick={() => setTab('products')}>
          <ShoppingBag /> Products
        </button>
        <button onClick={() => setTab('users')}>
          <Users /> Users
        </button>
        <button
          onClick={async () => {
            await request('/api/auth/logout', { method: 'POST' });
            location.href = '/login';
          }}
        >
          <LogOut /> Logout
        </button>
      </aside>
      <main>
        <header>
          <b>Welcome, {me.username}</b>
          <span>{me.role}</span>
        </header>
        {error && <div className="error">{error}</div>}
        {tab === 'settings' && <SettingsTab data={data} reload={load} />}
        {tab === 'servers' && <ServersTab data={data} reload={load} />}
        {tab === 'categories' && <CategoriesTab data={data} reload={load} />}
        {tab === 'products' && <ProductsTab data={data} reload={load} />}
        {tab === 'users' && <UsersTab data={data} reload={load} />}
      </main>
    </div>
  );
}

function App() {
  return location.pathname.startsWith('/login') ? <Login /> : <Admin />;
}

createRoot(document.getElementById('root')).render(<App />);
