const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de données temporaire en mémoire
let movies = [
  {
    id: "1",
    title: "Inception (Exemple)",
    category: "Sci-Fi",
    isPremium: true,
    previewSeconds: 60, // Limité à 60 secondes pour les comptes gratuits
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500"
  }
];

let users = [
  { email: "user@test.com", password: "123", isPremium: false, premiumDays: 0 }
];

const ADMIN_PASSWORD = "admba";

// API : Récupérer les films
app.get('/api/movies', (req, res) => {
  res.json(movies);
});

// API Admin : Ajouter un film
app.post('/api/admin/add-movie', (req, res) => {
  const { password, title, category, isPremium, previewSeconds, videoUrl, poster } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe admin incorrect" });
  }
  const newMovie = {
    id: Date.now().toString(),
    title,
    category,
    isPremium: !!isPremium,
    previewSeconds: parseInt(previewSeconds) || 60,
    videoUrl,
    poster: poster || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500"
  };
  movies.push(newMovie);
  res.json({ success: true, movie: newMovie });
});

// API Admin : Offrir / Révoquer un abonnement
app.post('/api/admin/user-subscription', (req, res) => {
  const { password, email, isPremium, days } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe admin incorrect" });
  }
  let user = users.find(u => u.email === email);
  if (!user) {
    user = { email, password: "defaultPassword", isPremium: false, premiumDays: 0 };
    users.push(user);
  }
  user.isPremium = isPremium;
  user.premiumDays = days || 0;
  res.json({ success: true, user });
});

// Redirection vers les pages HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur ALIBAFILM démarré sur le port ${PORT}`);
});
