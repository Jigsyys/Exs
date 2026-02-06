# ExchangeStudent - Documentation Technique

## 📋 Table des matières
1. [Structure de la base de données](#structure-de-la-base-de-données)
2. [Configuration Google Sign-In](#configuration-google-sign-in)
3. [Système de points](#système-de-points)
4. [Migration vers un backend](#migration-vers-un-backend)

---

## 🗄️ Structure de la base de données

### Table: `users`

```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255), -- NULL pour connexion Google
    google_id VARCHAR(255) UNIQUE, -- ID Google unique
    profile_picture TEXT, -- URL de la photo de profil
    points INT DEFAULT 100,
    bio TEXT,
    university VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_google_id (google_id)
);
```

### Table: `user_stats`

```sql
CREATE TABLE user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    exchanges INT DEFAULT 0,
    listings INT DEFAULT 0,
    reviews INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_stats (user_id)
);
```

### Table: `points_history`

```sql
CREATE TABLE points_history (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type ENUM('welcome', 'earn', 'spend', 'bonus', 'refund', 'listing') NOT NULL,
    amount INT NOT NULL, -- Positif ou négatif
    description TEXT NOT NULL,
    related_listing_id VARCHAR(255), -- ID de l'annonce liée (optionnel)
    related_reservation_id VARCHAR(255), -- ID de la réservation liée (optionnel)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at DESC)
);
```

### Table: `listings`

```sql
CREATE TABLE listings (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    type ENUM('room', 'studio', 'apartment') NOT NULL,
    capacity INT NOT NULL,
    points INT NOT NULL,
    amenities JSON, -- ["wifi", "kitchen", "washing", etc.]
    photos JSON, -- URLs des photos
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_city (city),
    INDEX idx_user_active (user_id, is_active)
);
```

### Table: `reservations`

```sql
CREATE TABLE reservations (
    id VARCHAR(255) PRIMARY KEY,
    listing_id VARCHAR(255) NOT NULL,
    guest_user_id VARCHAR(255) NOT NULL, -- Celui qui réserve
    host_user_id VARCHAR(255) NOT NULL, -- Propriétaire du logement
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_points INT NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_guest (guest_user_id, status),
    INDEX idx_host (host_user_id, status),
    INDEX idx_dates (start_date, end_date)
);
```

### Table: `reviews`

```sql
CREATE TABLE reviews (
    id VARCHAR(255) PRIMARY KEY,
    reservation_id VARCHAR(255) NOT NULL,
    reviewer_user_id VARCHAR(255) NOT NULL,
    reviewed_user_id VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (reservation_id, reviewer_user_id)
);
```

---

## 🔐 Configuration Google Sign-In

### Étape 1: Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet "ExchangeStudent"
3. Activez l'API "Google+ API" ou "Google Identity Services"

### Étape 2: Configurer OAuth 2.0

1. Dans le menu, allez à **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth 2.0 Client ID**
3. Configurez l'écran de consentement:
   - Type d'application: External
   - Nom: ExchangeStudent
   - Email support: votre email
   - Logo: votre logo
   - Domaine autorisé: votre domaine

4. Créez les credentials OAuth 2.0:
   - Type: Web application
   - Nom: ExchangeStudent Web Client
   - JavaScript origins autorisées:
     ```
     http://localhost:3000
     https://votredomaine.com
     ```
   - URIs de redirection autorisées:
     ```
     http://localhost:3000
     https://votredomaine.com
     ```

5. **IMPORTANT**: Copiez le **Client ID**

### Étape 3: Intégrer dans le code

Dans `index.html`, remplacez:
```html
<meta name="google-signin-client_id" content="VOTRE_CLIENT_ID_GOOGLE.apps.googleusercontent.com">
```

Par votre vrai Client ID:
```html
<meta name="google-signin-client_id" content="123456789-abc123.apps.googleusercontent.com">
```

### Étape 4: Implémenter le backend

Le frontend envoie le token Google au backend qui doit le vérifier:

**Backend Node.js exemple:**

```javascript
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        return {
            googleId: payload.sub,
            email: payload.email,
            firstName: payload.given_name,
            lastName: payload.family_name,
            profilePicture: payload.picture
        };
    } catch (error) {
        throw new Error('Invalid Google token');
    }
}

// Route de connexion Google
app.post('/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        const googleUser = await verifyGoogleToken(token);
        
        // Vérifier si l'utilisateur existe déjà
        let user = await User.findOne({ googleId: googleUser.googleId });
        
        if (!user) {
            // Créer nouvel utilisateur
            user = await User.create({
                ...googleUser,
                points: 100,
                pointsHistory: [{
                    type: 'welcome',
                    amount: 100,
                    description: 'Points de bienvenue'
                }]
            });
        }
        
        // Créer session/JWT
        const sessionToken = createJWT(user);
        
        res.json({ success: true, user, token: sessionToken });
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
});
```

---

## 💎 Système de points

### Types de transactions

| Type | Description | Exemple |
|------|-------------|---------|
| `welcome` | Points de bienvenue | +100 points à l'inscription |
| `earn` | Points gagnés (hébergement) | +30 points pour héberger 1 nuit |
| `spend` | Points dépensés (réservation) | -30 points pour réserver 1 nuit |
| `bonus` | Bonus divers | +10 points pour créer une annonce |
| `refund` | Remboursement | +30 points si annulation |
| `listing` | Lié à une annonce | Transactions liées aux annonces |

### Logique métier

#### Création d'annonce
```javascript
// +10 points bonus
addPointsTransaction(userId, 'bonus', 10, 'Bonus pour création d\'annonce');
```

#### Réservation confirmée
```javascript
// L'invité dépense des points
addPointsTransaction(guestId, 'spend', -totalPoints, `Réservation chez ${hostName}`);

// L'hôte gagne des points (après séjour)
addPointsTransaction(hostId, 'earn', totalPoints, `Hébergement de ${guestName}`);
```

#### Annulation
```javascript
// Remboursement invité
addPointsTransaction(guestId, 'refund', totalPoints, 'Remboursement annulation');
```

---

## 🚀 Migration vers un backend

### Option 1: Node.js + Express + MongoDB

**Avantages:**
- JavaScript partout (frontend + backend)
- MongoDB flexible pour JSON
- Facile à déployer

**Stack:**
```
- Node.js + Express
- MongoDB (Atlas pour le cloud)
- JWT pour l'authentification
- Mongoose pour les modèles
```

**Installation:**
```bash
npm install express mongoose bcrypt jsonwebtoken cors dotenv
npm install google-auth-library
```

### Option 2: Firebase (Recommandé pour démarrer)

**Avantages:**
- Pas besoin de coder le backend
- Authentication Google intégrée
- Base de données temps réel
- Hébergement gratuit

**Setup Firebase:**

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Activez Authentication > Google Sign-In
3. Activez Firestore Database
4. Installez Firebase:

```bash
npm install firebase
```

5. Configuration dans votre code:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "votre-api-key",
    authDomain: "votre-projet.firebaseapp.com",
    projectId: "votre-projet-id",
    storageBucket: "votre-projet.appspot.com",
    messagingSenderId: "123456789",
    appId: "votre-app-id"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Connexion Google
async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        // Créer/mettre à jour l'utilisateur dans Firestore
    } catch (error) {
        console.error(error);
    }
}
```

### Option 3: Supabase (Alternative open-source à Firebase)

**Avantages:**
- Open source
- PostgreSQL (SQL robuste)
- Authentication intégrée
- API REST automatique

**Setup:**
```bash
npm install @supabase/supabase-js
```

---

## 📝 Structure des données actuelles (localStorage)

### Clés utilisées:

1. **`users`** - Array de tous les utilisateurs
```javascript
[
    {
        id: "unique_id_123",
        firstName: "Marie",
        lastName: "Dubois",
        email: "marie@example.com",
        password: "hashed_password", // À chiffrer en production!
        googleId: null, // ou "google_123" si connexion Google
        profilePicture: null,
        points: 150,
        bio: "",
        university: "",
        createdAt: "2024-01-15T10:30:00.000Z",
        stats: {
            exchanges: 2,
            listings: 1,
            reviews: 3
        },
        pointsHistory: [
            {
                id: "trans_001",
                type: "welcome",
                amount: 100,
                description: "Points de bienvenue",
                date: "2024-01-15T10:30:00.000Z"
            },
            {
                id: "trans_002",
                type: "bonus",
                amount: 10,
                description: "Bonus pour création d'annonce",
                date: "2024-01-16T14:20:00.000Z"
            },
            {
                id: "trans_003",
                type: "earn",
                amount: 40,
                description: "Hébergement de Paul Martin",
                date: "2024-01-20T09:00:00.000Z"
            }
        ]
    }
]
```

2. **`currentUser`** - Utilisateur connecté
3. **`listings`** - Toutes les annonces
4. **`reservations`** - Toutes les réservations

---

## 🔒 Sécurité importante

### À faire AVANT la production:

1. **Chiffrer les mots de passe**
```javascript
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 10);
```

2. **Utiliser HTTPS** (obligatoire pour Google Sign-In)

3. **Valider côté serveur**
   - Ne jamais faire confiance aux données frontend
   - Valider tous les inputs
   - Vérifier les permissions

4. **Variables d'environnement**
```env
GOOGLE_CLIENT_ID=votre_client_id
DATABASE_URL=votre_url_db
JWT_SECRET=votre_secret_key
```

5. **Rate limiting** pour éviter les abus

6. **CORS** configuré correctement

---

## 📞 Support

Pour toute question sur l'implémentation:
- Structure de base de données
- Configuration Google Sign-In
- Migration backend
- Système de points

N'hésitez pas à demander ! 🚀
