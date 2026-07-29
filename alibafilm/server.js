const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de données en mémoire
let users = [];
let movies = [
  {
    id: "1",
    title: "Tears of Steel",
    category: "Action / Sci-Fi",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070",
    isPremium: true,
    previewSeconds: 60
  },
  {
    id: "2",
    title: "Big Buck Bunny",
    category: "Animation",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025",
    isPremium: false,
    previewSeconds: 0
  }
];

const ADMIN_PASSWORD = "admba";

// --- API UTILISATEURS ---
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "Cet email est déjà utilisé." });
  }
  const newUser = { email, password, isPremium: false, premiumUntil: null };
  users.push(newUser);
  res.json({ success: true, user: { email: newUser.email, isPremium: newUser.isPremium } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) return res.status(401).json({ error: "Identifiants incorrects." });

  // Vérifier si l'abonnement a expiré
  if (user.isPremium && user.premiumUntil && new Date() > new Date(user.premiumUntil)) {
    user.isPremium = false;
    user.premiumUntil = null;
  }
  
  res.json({ success: true, user: { email: user.email, isPremium: user.isPremium } });
});

// --- API FILMS ---
app.get('/api/movies', (req, res) => {
  res.json(movies);
});

// --- API ADMIN ---
app.post('/api/admin/movies', (req, res) => {
  const { password, title, category, videoUrl, poster, isPremium, previewSeconds } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Accès refusé" });

  const newMovie = {
    id: Date.now().toString(),
    title, category, videoUrl, poster,
    isPremium: !!isPremium,
    previewSeconds: parseInt(previewSeconds) || 60
  };
  movies.push(newMovie);
  res.json({ success: true, movie: newMovie });
});

app.post('/api/admin/users', (req, res) => {
  const { password, email, grantPremium, days } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Accès refusé" });

  let user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  if (grantPremium) {
    user.isPremium = true;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + parseInt(days));
    user.premiumUntil = expiry.toISOString();
  } else {
    user.isPremium = false;
    user.premiumUntil = null;
  }
  res.json({ success: true, user });
});

// --- ROUTES ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur en ligne sur le port ${PORT}`));
