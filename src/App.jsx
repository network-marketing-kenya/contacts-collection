import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import countriesData from './data/countries.json';
import { 
  ChevronDown, 
  Search, 
  Phone, 
  Check, 
  Download, 
  Users, 
  X, 
  Database,
  ArrowRight,
  UserCheck,
  Shield,
  UserPlus,
  LogIn,
  LogOut,
  Plus,
  AlertTriangle,
  FileText,
  User,
  Copy,
  Link2
} from 'lucide-react';

function App() {
  const countries = countriesData;
  const defaultCountry = countries.find(c => c.code === 'KE') || countries[0];
  
  // Navigation State (Simple Hash Router)
  const [currentRoute, setCurrentRoute] = useState(window.location.hash || '#/');
  
  // App States
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Visitor Form States
  const [visitorName, setVisitorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referrer, setReferrer] = useState(null);

  // Authentication States
  const [currentUser, setCurrentUser] = useState(null);
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegSuccess, setIsRegSuccess] = useState(false);

  // Database States (mirrored from LocalStorage)
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);

  // Refs for routing sync
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // UI Refs
  const dropdownRef = useRef(null);
  const badgeRef = useRef(null);
  const [badgeWidth, setBadgeWidth] = useState(90);

  // Load and sync database
  useEffect(() => {
    // Sync hash changes
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');
      
      // Redirect to login if visitor landing has no referrer
      if (!refParam && (hash === '#/' || hash === '')) {
        window.location.hash = '#/login';
        return;
      }

      const storedUser = JSON.parse(localStorage.getItem('contacts_current_user') || 'null');

      // Protect dashboard route
      if (hash === '#/dashboard' && (!storedUser || storedUser.role !== 'user')) {
        window.location.hash = '#/login';
        return;
      }

      // Protect admin route
      if (hash === '#/admin' && (!storedUser || storedUser.role !== 'admin')) {
        window.location.hash = '#/login';
        return;
      }
      
      setCurrentRoute(hash);
      setAuthError('');
      setIsRegSuccess(false);
    };
    window.addEventListener('hashchange', handleHashChange);

    // Initial Database Setup (Mock local stores)
    if (!localStorage.getItem('contacts_users')) {
      // Default users
      localStorage.setItem('contacts_users', JSON.stringify([
        { name: "John Doe", phone: "254700000000", password: "123", status: "active", timestamp: new Date().toLocaleString() }
      ]));
    }
    if (!localStorage.getItem('contacts_leads')) {
      // Mock leads
      localStorage.setItem('contacts_leads', JSON.stringify([]));
    }

    // Pull database states
    setUsers(JSON.parse(localStorage.getItem('contacts_users') || '[]'));
    setLeads(JSON.parse(localStorage.getItem('contacts_leads') || '[]'));

    // Pull active user session
    const storedUser = localStorage.getItem('contacts_current_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    // Check query ref parameters (e.g., ?ref=254775499650)
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    const hash = window.location.hash || '#/';

    if (refParam) {
      setReferrer(refParam);
    } else {
      const storedUserObj = JSON.parse(storedUser || 'null');
      if (hash === '#/' || hash === '') {
        window.location.hash = '#/login';
      } else if (hash === '#/dashboard' && (!storedUserObj || storedUserObj.role !== 'user')) {
        window.location.hash = '#/login';
      } else if (hash === '#/admin' && (!storedUserObj || storedUserObj.role !== 'admin')) {
        window.location.hash = '#/login';
      }
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync users & leads state dynamically whenever the hash changes
  useEffect(() => {
    setUsers(JSON.parse(localStorage.getItem('contacts_users') || '[]'));
    setLeads(JSON.parse(localStorage.getItem('contacts_leads') || '[]'));
  }, [currentRoute, isSaved]);

  // Adjust input padding dynamically
  useEffect(() => {
    if (badgeRef.current) {
      setBadgeWidth(badgeRef.current.offsetWidth);
    }
  }, [selectedCountry, currentRoute]);

  // Geolocation lookup to auto-detect country of residence on load
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => {
        if (!res.ok) throw new Error('Network lookup failed');
        return res.json();
      })
      .then(data => {
        if (data && data.country_code) {
          const detected = countries.find(c => c.code === data.country_code.toUpperCase());
          if (detected) {
            setSelectedCountry(detected);
          }
        }
      })
      .catch(err => console.log('Country detection fallback active:', err));
  }, []);

  // Filter countries by search query
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dial_code.includes(searchQuery)
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle registration
  const handleRegister = (e) => {
    e.preventDefault();
    if (!authName || !authPhone || !authPassword) {
      setAuthError('Please fill in all fields');
      return;
    }

    // Clean leading zero from phone numbers in registration
    let cleanedPhone = authPhone.trim().replace(/\D/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = cleanedPhone.substring(1);
    }

    const existingUsers = JSON.parse(localStorage.getItem('contacts_users') || '[]');
    if (existingUsers.some(u => u.phone === cleanedPhone)) {
      setAuthError('An account with this phone number already exists.');
      return;
    }

    const newUser = {
      name: authName.trim(),
      phone: cleanedPhone,
      password: authPassword,
      status: 'active',
      timestamp: new Date().toLocaleString()
    };

    const updatedUsers = [...existingUsers, newUser];
    localStorage.setItem('contacts_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    setIsRegSuccess(true);
    setAuthError('');
    setAuthName('');
    setAuthPhone('');
    setAuthPassword('');

    // Automatically navigate to login page after successful registration
    setTimeout(() => {
      window.location.hash = '#/login';
    }, 1500);
  };

  // Handle Login
  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');

    let cleanedPhone = authPhone.trim().replace(/\D/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = cleanedPhone.substring(1);
    }

    // Super Admin login check
    if (cleanedPhone === '254775499650' && authPassword === 'admin123') {
      const adminUser = { name: 'Super Admin', phone: '254775499650', role: 'admin' };
      localStorage.setItem('contacts_current_user', JSON.stringify(adminUser));
      setCurrentUser(adminUser);
      window.location.hash = '#/admin';
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('contacts_users') || '[]');
    const matchedUser = existingUsers.find(u => u.phone === cleanedPhone && u.password === authPassword);

    if (!matchedUser) {
      setAuthError('Invalid credentials. Please try again.');
      return;
    }

    if (matchedUser.status === 'suspended') {
      setAuthError('Your downline dashboard has been suspended. Contact Super Admin Tonny.');
      return;
    }

    const userSession = { ...matchedUser, role: 'user' };
    localStorage.setItem('contacts_current_user', JSON.stringify(userSession));
    setCurrentUser(userSession);
    window.location.hash = '#/dashboard';
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('contacts_current_user');
    setCurrentUser(null);
    window.location.hash = '#/login';
  };

  // Sentence Case formatter (Capitalizes first letter of each word)
  const toSentenceCase = (str) => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Visitor Form: Save lead
  const handleSaveLead = (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !phoneNumber.trim()) return;

    setIsLoading(true);

    // Dynamic phone number sanitization
    // If phone starts with NDD (usually 0), strip it and prepend Country Code
    let cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    const fullNumber = `${selectedCountry.dial_code}${cleanPhone}`;
    const formattedName = toSentenceCase(visitorName);

    setTimeout(() => {
      const newLead = {
        id: Date.now(),
        name: formattedName,
        countryName: selectedCountry.name,
        countryCode: selectedCountry.code,
        dialCode: selectedCountry.dial_code,
        rawNumber: cleanPhone,
        fullNumber: fullNumber,
        refUserPhone: referrer || '254775499650', // Default assignment is Super Admin Tonny
        timestamp: new Date().toLocaleString()
      };

      const existingLeads = JSON.parse(localStorage.getItem('contacts_leads') || '[]');
      const updatedLeads = [newLead, ...existingLeads];
      localStorage.setItem('contacts_leads', JSON.stringify(updatedLeads));
      setLeads(updatedLeads);

      setIsLoading(false);
      setIsSaved(true);
    }, 1200);
  };

  // vCard Generator for specific lead
  const handleDownloadLeadVCard = (leadName, leadPhone) => {
    const vcardContent = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${leadName}`,
      `TEL;TYPE=CELL,VOICE:${leadPhone}`,
      "END:VCARD"
    ].join("\r\n");

    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${leadName.replace(/\s+/g, '_')}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get referrer details dynamically
  const getReferrerDetails = () => {
    if (!referrer) {
      return { name: 'Tonny', phone: '254775499650' };
    }
    const matchedUser = users.find(u => u.phone === referrer);
    if (matchedUser) {
      return { name: matchedUser.name, phone: matchedUser.phone };
    }
    return { name: 'Tonny', phone: referrer };
  };

  const referrerDetails = getReferrerDetails();

  // Trigger contact save: Opens dialer app with prefilled phone number
  const handleSaveContactBack = () => {
    let formattedPhone = referrerDetails.phone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    window.location.href = `tel:${formattedPhone}`;
  };

  // Admin suspension controls
  const handleToggleUserStatus = (userPhone) => {
    const existingUsers = JSON.parse(localStorage.getItem('contacts_users') || '[]');
    const updatedUsers = existingUsers.map(u => {
      if (u.phone === userPhone) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    });
    localStorage.setItem('contacts_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  // Manual Referrer Creator inside Admin Panel
  const handleCreateDownline = () => {
    const nameInput = prompt("Enter Downline Team Member Name:");
    if (!nameInput) return;
    const phoneInput = prompt("Enter Downline Phone Number:");
    if (!phoneInput) return;
    const passInput = prompt("Enter Password:");
    if (!passInput) return;

    let cleaned = phoneInput.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);

    const existingUsers = JSON.parse(localStorage.getItem('contacts_users') || '[]');
    if (existingUsers.some(u => u.phone === cleaned)) {
      alert("A user with this number already exists.");
      return;
    }

    const newUser = {
      name: nameInput.trim(),
      phone: cleaned,
      password: passInput,
      status: 'active',
      timestamp: new Date().toLocaleString()
    };

    const updatedUsers = [...existingUsers, newUser];
    localStorage.setItem('contacts_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  // Copy referral Link to Clipboard
  const handleCopyRefLink = (phone) => {
    const base = window.location.origin + window.location.pathname;
    const link = `${base}?ref=${phone}`;
    navigator.clipboard.writeText(link);
    alert(`Copied Referral Link: ${link}`);
  };

  // Export collected leads as CSV
  const handleExportCSV = (targetRefPhone = null) => {
    const filteredLeads = targetRefPhone 
      ? leads.filter(l => l.refUserPhone === targetRefPhone) 
      : leads;

    if (filteredLeads.length === 0) return;

    const headers = ["Timestamp", "Lead Name", "Country", "Sanitized Phone", "Full Number", "Assigned To"];
    const rows = filteredLeads.map(lead => [
      `"${lead.timestamp}"`,
      `"${lead.name}"`,
      `"${lead.countryName}"`,
      `"${lead.rawNumber}"`,
      `"${lead.fullNumber}"`,
      `"${lead.refUserPhone}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `team_leads_${targetRefPhone || 'master'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear master database
  const handleClearAllLeads = () => {
    if (window.confirm("Permanently wipe all leads from database? This cannot be undone.")) {
      localStorage.setItem('contacts_leads', '[]');
      setLeads([]);
    }
  };

  // Downline User statistics
  const userLeads = leads.filter(l => l.refUserPhone === currentUser?.phone);

  // ----------------------------------------------------
  // ROUTE 1: Downline Registration Page
  // ----------------------------------------------------
  if (currentRoute === '#/register') {
    return (
      <div className="admin-container" style={{ maxWidth: '440px' }}>
        <div className="admin-header" style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'block' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}><UserPlus size={24} style={{ color: 'var(--accent-purple)', display: 'inline', marginRight: '6px' }} /> Join Our Team</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Create a dashboard account to start collecting downline contacts</p>
        </div>

        {authError && <div className="error-banner"><AlertTriangle size={16} /> {authError}</div>}
        {isRegSuccess && <div className="success-banner"><Check size={16} /> Registration successful! <a href="#/login" style={{ color: 'white', fontWeight: 'bold' }}>Login here</a></div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="phone-field" style={{ paddingLeft: '1rem' }} placeholder="John Doe" value={authName} onChange={e => setAuthName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Number</label>
            <input type="tel" className="phone-field" style={{ paddingLeft: '1rem' }} placeholder="e.g. 254775499650" value={authPhone} onChange={e => setAuthPhone(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="phone-field" style={{ paddingLeft: '1rem' }} placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)' }}>
            Register Now
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Already have an account? <a href="#/login" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Login here</a>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ROUTE 2: User Login Page
  // ----------------------------------------------------
  if (currentRoute === '#/login') {
    return (
      <div className="admin-container" style={{ maxWidth: '440px' }}>
        <div className="admin-header" style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'block' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}><LogIn size={24} style={{ color: 'var(--accent-blue)', display: 'inline', marginRight: '6px' }} /> Member Login</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Sign in to access your downline referral dashboard</p>
        </div>

        {authError && <div className="error-banner"><AlertTriangle size={16} /> {authError}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">WhatsApp Phone Number</label>
            <input type="tel" className="phone-field" style={{ paddingLeft: '1rem' }} placeholder="e.g. 254775499650" value={authPhone} onChange={e => setAuthPhone(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="phone-field" style={{ paddingLeft: '1rem' }} placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary">
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Want to generate your own team leads? <a href="#/register" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>Register as downline</a>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ROUTE 3: Downline Team Member Dashboard
  // ----------------------------------------------------
  if (currentRoute === '#/dashboard' && currentUser && currentUser.role === 'user') {
    return (
      <div className="admin-container" style={{ maxWidth: '600px' }}>
        <div className="admin-header">
          <div>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User style={{ color: 'var(--accent-blue)' }} /> Welcome, {currentUser.name}!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Team Member Dashboard</p>
          </div>
          <button className="btn-close" style={{ borderRadius: '10px', width: 'auto', padding: '0 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }} onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* Dynamic unique referral link section */}
        <div className="ref-link-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-purple)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <Link2 size={16} /> Your Unique Ad Campaign Link
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Copy this unique link and use it in your ad campaigns. Any leads captured through this link will appear on your dashboard!
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              readOnly 
              className="phone-field" 
              style={{ paddingLeft: '1rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1rem' }} 
              value={`${window.location.origin}${window.location.pathname}?ref=${currentUser.phone}`} 
            />
            <button className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={() => handleCopyRefLink(currentUser.phone)}>
              <Copy size={16} />
            </button>
          </div>
        </div>

        <div className="admin-stats" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Leads Generated</div>
            <div className="stat-value" style={{ color: 'var(--accent-teal)' }}>{userLeads.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Account Status</div>
            <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--accent-teal)', textTransform: 'capitalize', fontWeight: 'bold', paddingTop: '0.4rem' }}>
              ● {currentUser.status}
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={16} style={{ color: 'var(--accent-blue)' }} /> Your Leads Log
        </h3>

        <div className="table-wrapper">
          {userLeads.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No leads collected yet. Copy your ad campaign link above to start generating team leads!
            </div>
          ) : (
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: '600' }}>{lead.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{lead.fullNumber}</td>
                    <td>
                      <button 
                        className="btn-outline" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} 
                        onClick={() => handleDownloadLeadVCard(lead.name, lead.fullNumber)}
                      >
                        <Download size={12} /> Save Contact
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {userLeads.length > 0 && (
          <button className="btn-outline" style={{ width: '100%' }} onClick={() => handleExportCSV(currentUser.phone)}>
            <Download size={16} /> Export Your leads as CSV
          </button>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // ROUTE 4: Super Admin Master Dashboard
  // ----------------------------------------------------
  if (currentRoute === '#/admin' && currentUser && currentUser.role === 'admin') {
    return (
      <div className="admin-container" style={{ maxWidth: '720px' }}>
        <div className="admin-header">
          <div>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
              <Shield style={{ color: 'var(--accent-purple)' }} /> Super Master Admin
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Control Panel & Downline Network Analytics</p>
          </div>
          <button className="btn-close" style={{ borderRadius: '10px', width: 'auto', padding: '0 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }} onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>

        <div className="admin-stats" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Leads</div>
            <div className="stat-value">{leads.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Downlines</div>
            <div className="stat-value">{users.filter(u => u.status === 'active').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Suspended accounts</div>
            <div className="stat-value" style={{ color: 'rgba(239, 68, 68, 0.8)' }}>{users.filter(u => u.status === 'suspended').length}</div>
          </div>
        </div>

        {/* Master User Management Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 0.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--accent-purple)' }} /> Manage Team Members (Downlines)
          </h3>
          <button className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }} onClick={handleCreateDownline}>
            <Plus size={14} /> Add Member
          </button>
        </div>

        <div className="table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Ad Campaign Link</th>
                <th>Leads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const count = leads.filter(l => l.refUserPhone === u.phone).length;
                return (
                  <tr key={u.phone}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>+{u.phone}</div>
                    </td>
                    <td>
                      <button className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '0.25rem' }} onClick={() => handleCopyRefLink(u.phone)}>
                        <Copy size={10} /> Ref Link
                      </button>
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-teal)' }}>{count}</td>
                    <td>
                      <button 
                        className="btn-outline" 
                        style={{ 
                          padding: '0.3rem 0.6rem', 
                          fontSize: '0.75rem', 
                          borderColor: u.status === 'active' ? 'rgba(239,68,68,0.5)' : 'rgba(20,184,166,0.5)',
                          color: u.status === 'active' ? '#f87171' : '#2dd4bf'
                        }} 
                        onClick={() => handleToggleUserStatus(u.phone)}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Master Leads Stream Section */}
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} style={{ color: 'var(--accent-blue)' }} /> Master Leads Capture Log (Global)
        </h3>

        <div className="table-wrapper">
          {leads.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No leads captured in the entire network yet.
            </div>
          ) : (
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Network Assignment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const assigned = users.find(u => u.phone === lead.refUserPhone);
                  return (
                    <tr key={lead.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{lead.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lead.fullNumber} ({lead.countryName})</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>{assigned ? assigned.name : 'Super Admin'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{lead.refUserPhone}</div>
                      </td>
                      <td>
                        <button 
                          className="btn-outline" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} 
                          onClick={() => handleDownloadLeadVCard(lead.name, lead.fullNumber)}
                        >
                          <Download size={12} /> Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-actions" style={{ marginTop: '1.5rem' }}>
          {leads.length > 0 && (
            <>
              <button className="btn-outline" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }} onClick={handleClearAllLeads}>
                Reset Database
              </button>
              <button className="btn-outline" onClick={() => handleExportCSV()}>
                <Download size={16} /> Export All CSV
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // DEFAULT ROUTE: Visitor Landing Form
  // ----------------------------------------------------
  return (
    <div className="app-container">
      {!isSaved ? (
        <>
          <div className="header">
            <div className="logo-badge" onClick={() => window.location.hash = '#/login'}>
              <Phone size={24} />
            </div>
            <h1>Secure Contact Setup</h1>
            <p>Enter your details below to link your WhatsApp and connect with us!</p>
          </div>

          <form onSubmit={handleSaveLead}>
            {/* Full Name Input */}
            <div className="form-group">
              <label className="form-label">Your Full Name</label>
              <input 
                type="text" 
                className="phone-field" 
                style={{ paddingLeft: '1rem' }}
                placeholder="Enter your name" 
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                required
              />
            </div>

            {/* Country Selector */}
            <div className="form-group" ref={dropdownRef}>
              <label className="form-label">Country of Residence</label>
              
              <button 
                type="button" 
                className={`selector-trigger ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="trigger-value">
                  <span className="country-flag">{selectedCountry.flag}</span>
                  <span>{selectedCountry.name}</span>
                </div>
                <ChevronDown size={18} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {isDropdownOpen && (
                <div className="dropdown-panel">
                  <div className="search-container">
                    <Search size={18} className="search-icon" />
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Type country name..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="country-list">
                    {filteredCountries.length === 0 ? (
                      <div className="no-results">No countries found</div>
                    ) : (
                      filteredCountries.map(country => (
                        <button
                          key={country.code}
                          type="button"
                          className="country-option"
                          onClick={() => {
                            setSelectedCountry(country);
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <div className="country-option-info">
                            <span className="country-flag">{country.flag}</span>
                            <span>{country.name}</span>
                          </div>
                          <span className="country-dial">{country.dial_code}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Phone Number Input */}
            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <div className="phone-input-wrapper">
                <div ref={badgeRef} className="phone-dial-badge">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '1px', fontWeight: '600' }}>{selectedCountry.code}</span>
                  <span>{selectedCountry.dial_code}</span>
                </div>
                <input 
                  type="tel" 
                  className="phone-field" 
                  style={{ paddingLeft: `${badgeWidth + 24}px` }}
                  placeholder="e.g. 712345678" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || !phoneNumber.trim() || !visitorName.trim()}
            >
              {isLoading ? (
                <span className="loader" style={{ display: 'inline-block', width: '20px', height: '20px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }}></span>
              ) : (
                <>
                  Next <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </>
      ) : (
        /* SUCCESS SCREEN & SAVE CONTACT CTA */
        <div className="success-screen">
          <div className="success-badge">
            <Check size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>Successfully Linked!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '1rem' }}>
            We've linked your WhatsApp name <strong>{visitorName}</strong> and number ({selectedCountry.dial_code} {phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber}) successfully.
          </p>

          <div className="save-back-card">
            <h3>Final Step: Save Our Contact</h3>
            <p>Save <strong>{referrerDetails.name}</strong> to your contact list now so you don't miss our official follow-up message!</p>
            
            <button 
              type="button" 
              className="btn-primary btn-pulse" 
              onClick={handleSaveContactBack}
              style={{ background: 'linear-gradient(135deg, var(--accent-teal) 0%, var(--accent-blue) 100%)', boxShadow: '0 8px 24px -4px rgba(20, 184, 166, 0.4)' }}
            >
              <UserCheck size={20} /> Save {referrerDetails.name} (Contact)
            </button>
          </div>
        </div>
      )}

      {/* Footer Branding with Link to Login */}
      <div className="footer-text">
        <span>Powered by</span>
        <a href="#/login" style={{ fontWeight: '700', color: 'var(--text-primary)', textDecoration: 'none' }}>
          Tonny Network
        </a>
      </div>
    </div>
  );
}

export default App;
