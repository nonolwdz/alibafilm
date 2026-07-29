const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔌 CONNEXION SUPABASE
const supabaseUrl = 'https://onvmmrgnzbargubpkqxk.supabase.co';
const supabaseKey = 'sb_secret_PVHdVI86aWopBfX2huF30g_xglSdVDQ';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PASSWORD = "admba";

// 🎥 SUIVI DES LECTURES SIMULTANÉES (1 seule par compte)
let activeStreams = {}; // { email: sessionId }

app.post('/api/stream/start', (req, res) => {
  const { email, sessionId } = req.body;
  if (!email) return res.json({ success: true });
  activeStreams[email] = sessionId;
  res.json({ success: true });
});

app.post('/api/stream/check', (req, res) => {
  const { email, sessionId } = req.body;
  if (!email) return res.json({ allowed: true });
  if (activeStreams[email] && activeStreams[email] !== sessionId) {
    return res.json({ allowed: false });
  }
  res.json({ allowed: true });
});

// --- API UTILISATEURS ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).single();
  if (existingUser) return res.status(400).json({ error: "Cet email est déjà utilisé." });

  const newUser = { email, password, isPremium: false, premiumUntil: null };
  const { error } = await supabase.from('users').insert([newUser]);
  if (error) return res.status(500).json({ error: "Erreur de base de données." });

  res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();

  if (!user || error) return res.status(401).json({ error: "Identifiants incorrects." });

  if (user.isPremium && user.premiumUntil && new Date() > new Date(user.premiumUntil)) {
    user.isPremium = false;
    user.premiumUntil = null;
    await supabase.from('users').update({ isPremium: false, premiumUntil: null }).eq('email', email);
  }
  res.json({ success: true, user });
});

app.post('/api/auth/verify', async (req, res) => {
  const { email } = req.body;
  const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user) return res.json({ success: false });

  if (user.isPremium && user.premiumUntil && new Date() > new Date(user.premiumUntil)) {
    user.isPremium = false;
    user.premiumUntil = null;
    await supabase.from('users').update({ isPremium: false, premiumUntil: null }).eq('email', email);
  }
  res.json({ success: true, user });
});

// --- API FILMS ---
app.get('/api/movies', async (req, res) => {
  const { data: movies, error } = await supabase.from('movies').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(movies || []);
});

app.post('/api/admin/movies', async (req, res) => {
  const { password, title, category, videoUrl, poster, isPremium, previewSeconds } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Accès refusé" });

  const newMovie = {
    id: Date.now().toString(),
    title, category, videoUrl, poster,
    isPremium: !!isPremium,
    previewSeconds: parseInt(previewSeconds) || 60
  };
  const { error } = await supabase.from('movies').insert([newMovie]);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, movie: newMovie });
});

app.put('/api/admin/movies/:id', async (req, res) => {
  const { password, title, category, videoUrl, poster, isPremium, previewSeconds } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Accès refusé" });

  const updatedMovie = {
    title, category, videoUrl, poster,
    isPremium: !!isPremium,
    previewSeconds: parseInt(previewSeconds) || 60
  };
  const { error } = await supabase.from('movies').update(updatedMovie).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

app.delete('/api/admin/movies/:id', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Accès refusé" });

  const { error } = await supabase.from('movies').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

app.post('/api/admin/users', async (req, res) => {
  const { password, email, grantPremium, days } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Accès refusé" });

  const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  let updates = {};
  if (grantPremium) {
    updates.isPremium = true;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + parseInt(days));
    updates.premiumUntil = expiry.toISOString();
  } else {
    updates.isPremium = false;
    updates.premiumUntil = null;
  }

  const { error } = await supabase.from('users').update(updates).eq('email', email);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// --- ROUTES ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur en ligne sur le port ${PORT}`));
