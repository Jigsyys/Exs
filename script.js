// ===================================
// State Management
// ===================================

let currentUser = null;
let listings = [];
let userListings = [];
let reservations = [];

// Enhanced user data structure
const createUserStructure = (userData) => ({
    id: userData.id || generateId(),
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    password: userData.password,
    googleId: userData.googleId || null,
    profilePicture: userData.profilePicture || null,
    points: userData.points || 100,
    createdAt: userData.createdAt || new Date().toISOString(),
    stats: {
        exchanges: userData.stats?.exchanges || 0,
        listings: userData.stats?.listings || 0,
        reviews: userData.stats?.reviews || 0
    },
    pointsHistory: userData.pointsHistory || [
        {
            id: generateId(),
            type: 'welcome',
            amount: 100,
            description: 'Points de bienvenue',
            date: new Date().toISOString()
        }
    ],
    bio: userData.bio || '',
    university: userData.university || ''
});

// Sample data for demonstration
const sampleListings = [
    {
        id: 1,
        title: "Chambre lumineuse proche Sorbonne",
        city: "Paris",
        postal: "75005",
        description: "Belle chambre dans appartement calme, à 5 min de la Sorbonne. Parfait pour étudiant en échange.",
        type: "room",
        capacity: 1,
        points: 30,
        amenities: ["wifi", "kitchen", "desk"],
        userId: "demo1",
        userName: "Marie Dubois"
    },
    {
        id: 2,
        title: "Studio moderne centre Lyon",
        city: "Lyon",
        postal: "69002",
        description: "Studio entièrement équipé au cœur de Lyon. Idéal pour une expérience urbaine authentique.",
        type: "studio",
        capacity: 2,
        points: 45,
        amenities: ["wifi", "kitchen", "washing"],
        userId: "demo2",
        userName: "Lucas Martin"
    },
    {
        id: 3,
        title: "Chambre confortable à Marseille",
        city: "Marseille",
        postal: "13001",
        description: "Chambre dans colocation sympa, proche de la plage et des universités. Ambiance conviviale.",
        type: "room",
        capacity: 1,
        points: 25,
        amenities: ["wifi", "balcony"],
        userId: "demo3",
        userName: "Sophie Lefebvre"
    },
    {
        id: 4,
        title: "Appartement spacieux Bordeaux",
        city: "Bordeaux",
        postal: "33000",
        description: "Grand appartement T3 avec vue sur la Garonne. Proche des transports et commerces.",
        type: "apartment",
        capacity: 3,
        points: 60,
        amenities: ["wifi", "kitchen", "washing", "parking", "desk"],
        userId: "demo4",
        userName: "Thomas Rousseau"
    },
    {
        id: 5,
        title: "Chambre étudiante Toulouse",
        city: "Toulouse",
        postal: "31000",
        description: "Chambre cosy dans quartier étudiant animé. Toutes commodités à proximité.",
        type: "room",
        capacity: 1,
        points: 28,
        amenities: ["wifi", "desk", "kitchen"],
        userId: "demo5",
        userName: "Emma Petit"
    },
    {
        id: 6,
        title: "Studio près de Sciences Po",
        city: "Paris",
        postal: "75007",
        description: "Petit studio charmant à deux pas de Sciences Po. Quartier calme et résidentiel.",
        type: "studio",
        capacity: 1,
        points: 40,
        amenities: ["wifi", "kitchen"],
        userId: "demo6",
        userName: "Alexandre Moreau"
    }
];

listings = [...sampleListings];

// ===================================
// Utility Functions
// ===================================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--gradient-primary)' : '#ff4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// ===================================
// Authentication Functions
// ===================================

function showLogin(e) {
    e.preventDefault();
    closeModal('register-modal');
    document.getElementById('login-modal').classList.add('active');
}

function showRegister(e) {
    e.preventDefault();
    closeModal('login-modal');
    document.getElementById('register-modal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchToRegister(e) {
    e.preventDefault();
    closeModal('login-modal');
    showRegister(e);
}

function switchToLogin(e) {
    e.preventDefault();
    closeModal('register-modal');
    showLogin(e);
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Get users from localStorage
    const users = getFromLocalStorage('users') || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        saveToLocalStorage('currentUser', user);
        closeModal('login-modal');
        showDashboard();
        showNotification('Connexion réussie ! Bienvenue ' + user.firstName);
    } else {
        showNotification('Email ou mot de passe incorrect', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('register-firstname').value;
    const lastName = document.getElementById('register-lastname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    if (password !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    // Get existing users
    const users = getFromLocalStorage('users') || [];
    
    // Check if email already exists
    if (users.some(u => u.email === email)) {
        showNotification('Cet email est déjà utilisé', 'error');
        return;
    }
    
    // Create new user with enhanced structure
    const newUser = createUserStructure({
        firstName,
        lastName,
        email,
        password
    });
    
    users.push(newUser);
    saveToLocalStorage('users', users);
    
    currentUser = newUser;
    saveToLocalStorage('currentUser', newUser);
    
    closeModal('register-modal');
    showDashboard();
    showNotification('Compte créé avec succès ! Tu as reçu 100 points de bienvenue 🎉');
}

// ===================================
// Google Sign-In Functions
// ===================================

function handleGoogleLogin() {
    // Initialize Google Sign-In
    if (typeof google === 'undefined') {
        showNotification('Service Google temporairement indisponible. Utilise l\'inscription classique.', 'error');
        return;
    }
    
    // Simulate Google login for demo (replace with real Google OAuth in production)
    const mockGoogleUser = {
        id: 'google_' + generateId(),
        firstName: 'Utilisateur',
        lastName: 'Google',
        email: 'google.user@gmail.com',
        googleId: 'google_123456',
        profilePicture: null,
        password: null // Google users don't have password
    };
    
    // Check if user already exists
    const users = getFromLocalStorage('users') || [];
    let existingUser = users.find(u => u.googleId === mockGoogleUser.googleId);
    
    if (existingUser) {
        // Login existing Google user
        currentUser = existingUser;
        saveToLocalStorage('currentUser', existingUser);
        closeModal('login-modal');
        closeModal('register-modal');
        showDashboard();
        showNotification('Connexion réussie avec Google ! 🎉');
    } else {
        // Create new Google user
        const newUser = createUserStructure(mockGoogleUser);
        users.push(newUser);
        saveToLocalStorage('users', users);
        
        currentUser = newUser;
        saveToLocalStorage('currentUser', newUser);
        
        closeModal('login-modal');
        closeModal('register-modal');
        showDashboard();
        showNotification('Compte Google créé avec succès ! Tu as reçu 100 points de bienvenue 🎉');
    }
}

// Note: Pour une vraie implémentation Google Sign-In
// Vous devrez:
// 1. Créer un projet sur Google Cloud Console
// 2. Activer l'API Google Sign-In
// 3. Obtenir un Client ID
// 4. Remplacer VOTRE_CLIENT_ID_GOOGLE dans index.html
// 5. Utiliser la vraie API Google avec ce code:

/*
function initializeGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: 'VOTRE_CLIENT_ID_GOOGLE.apps.googleusercontent.com',
        callback: handleGoogleCallback
    });
}

function handleGoogleCallback(response) {
    const credential = response.credential;
    const payload = JSON.parse(atob(credential.split('.')[1]));
    
    const googleUser = {
        firstName: payload.given_name,
        lastName: payload.family_name,
        email: payload.email,
        googleId: payload.sub,
        profilePicture: payload.picture,
        password: null
    };
    
    // Same logic as above...
}
*/

// ===================================
// Points History Functions
// ===================================

function addPointsTransaction(userId, type, amount, description) {
    const users = getFromLocalStorage('users') || [];
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return;
    
    const transaction = {
        id: generateId(),
        type: type, // 'earn', 'spend', 'welcome', 'bonus'
        amount: amount,
        description: description,
        date: new Date().toISOString()
    };
    
    // Add transaction to history
    if (!users[userIndex].pointsHistory) {
        users[userIndex].pointsHistory = [];
    }
    users[userIndex].pointsHistory.unshift(transaction);
    
    // Update points
    users[userIndex].points += amount;
    
    // Save to localStorage
    saveToLocalStorage('users', users);
    
    // Update current user if it's the same
    if (currentUser && currentUser.id === userId) {
        currentUser = users[userIndex];
        saveToLocalStorage('currentUser', currentUser);
    }
}

function renderPointsHistory(limit = 5) {
    if (!currentUser || !currentUser.pointsHistory) return;
    
    const container = document.getElementById('points-history-container');
    const history = currentUser.pointsHistory.slice(0, limit);
    
    if (history.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune transaction pour le moment</p>';
        return;
    }
    
    container.innerHTML = history.map(transaction => {
        const isPositive = transaction.amount > 0;
        const icon = getTransactionIcon(transaction.type);
        const date = new Date(transaction.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        return `
            <div class="points-history-item">
                <div class="points-history-left">
                    <div class="points-history-icon ${isPositive ? 'positive' : 'negative'}">
                        ${icon}
                    </div>
                    <div class="points-history-info">
                        <h4>${transaction.description}</h4>
                        <p>${date}</p>
                    </div>
                </div>
                <div class="points-history-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${transaction.amount}
                </div>
            </div>
        `;
    }).join('');
}

function getTransactionIcon(type) {
    const icons = {
        'welcome': '🎉',
        'earn': '💰',
        'spend': '🏠',
        'bonus': '⭐',
        'refund': '↩️',
        'listing': '📝'
    };
    return icons[type] || '💫';
}

function showAllPointsHistory() {
    showNotification('Affichage de l\'historique complet...');
    renderPointsHistory(100); // Show more transactions
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    hideDashboard();
    showNotification('Déconnexion réussie');
}

function showDashboard() {
    document.querySelector('.hero').style.display = 'none';
    document.querySelector('.stats-section').style.display = 'none';
    document.querySelector('.how-it-works').style.display = 'none';
    document.querySelector('.listings-section').style.display = 'none';
    document.querySelector('.cta-section').style.display = 'none';
    document.querySelector('.footer').style.display = 'none';
    document.querySelector('.navbar').style.display = 'none';
    
    document.getElementById('dashboard').style.display = 'grid';
    
    // Update dashboard with user data
    updateDashboardData();
}

function hideDashboard() {
    document.getElementById('dashboard').style.display = 'none';
    
    document.querySelector('.hero').style.display = 'flex';
    document.querySelector('.stats-section').style.display = 'block';
    document.querySelector('.how-it-works').style.display = 'block';
    document.querySelector('.listings-section').style.display = 'block';
    document.querySelector('.cta-section').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    document.querySelector('.navbar').style.display = 'block';
}

function updateDashboardData() {
    if (!currentUser) return;
    
    // Update user name
    document.getElementById('user-name').textContent = currentUser.firstName;
    document.getElementById('user-points').textContent = currentUser.points;
    document.getElementById('points-detail').textContent = currentUser.points;
    
    // Update stats
    document.getElementById('stat-exchanges').textContent = currentUser.stats.exchanges;
    document.getElementById('stat-listings').textContent = currentUser.stats.listings;
    document.getElementById('stat-reviews').textContent = currentUser.stats.reviews;
    
    // Render points history
    renderPointsHistory();
    
    // Load user's listings
    loadUserListings();
}

// ===================================
// Dashboard Navigation
// ===================================

function showDashboardSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`section-${sectionName}`).style.display = 'block';
    
    // Add active class to clicked link
    event.currentTarget.classList.add('active');
    
    // Load data for specific sections
    if (sectionName === 'my-listings') {
        loadUserListings();
    }
}

// ===================================
// Listings Functions
// ===================================

function renderListings() {
    const container = document.getElementById('listings-container');
    
    if (listings.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune annonce disponible pour le moment</p>';
        return;
    }
    
    // Show first 6 listings
    const listingsToShow = listings.slice(0, 6);
    
    container.innerHTML = listingsToShow.map(listing => `
        <div class="listing-card" onclick="viewListing(${listing.id})">
            <div class="listing-image">
                🏠
            </div>
            <div class="listing-content">
                <div class="listing-header">
                    <div>
                        <div class="listing-title">${listing.title}</div>
                        <div class="listing-location">
                            📍 ${listing.city}
                        </div>
                    </div>
                    <div class="listing-points">${listing.points} pts</div>
                </div>
                <p class="listing-description">${listing.description}</p>
                <div class="listing-details">
                    <span>👤 ${listing.capacity} pers.</span>
                    <span>📦 ${listing.type === 'room' ? 'Chambre' : listing.type === 'studio' ? 'Studio' : 'Appartement'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function viewListing(listingId) {
    showNotification('Fonctionnalité de vue détaillée à venir !');
}

function showAllListings() {
    showNotification('Affichage de toutes les annonces...');
    renderListings();
}

function loadUserListings() {
    if (!currentUser) return;
    
    const container = document.getElementById('user-listings-container');
    const userListings = listings.filter(l => l.userId === currentUser.id);
    
    if (userListings.length === 0) {
        container.innerHTML = '<p class="empty-state">Tu n\'as pas encore créé d\'annonce</p>';
        return;
    }
    
    container.innerHTML = '<div class="listings-grid">' + userListings.map(listing => `
        <div class="listing-card">
            <div class="listing-image">🏠</div>
            <div class="listing-content">
                <div class="listing-header">
                    <div>
                        <div class="listing-title">${listing.title}</div>
                        <div class="listing-location">📍 ${listing.city}</div>
                    </div>
                    <div class="listing-points">${listing.points} pts</div>
                </div>
                <p class="listing-description">${listing.description}</p>
                <div class="listing-details">
                    <span>👤 ${listing.capacity} pers.</span>
                    <span>📦 ${listing.type === 'room' ? 'Chambre' : listing.type === 'studio' ? 'Studio' : 'Appartement'}</span>
                </div>
            </div>
        </div>
    `).join('') + '</div>';
}

function handleCreateListing(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Tu dois être connecté pour créer une annonce', 'error');
        return;
    }
    
    const title = document.getElementById('listing-title').value;
    const city = document.getElementById('listing-city').value;
    const postal = document.getElementById('listing-postal').value;
    const description = document.getElementById('listing-description').value;
    const type = document.getElementById('listing-type').value;
    const capacity = parseInt(document.getElementById('listing-capacity').value);
    
    // Get selected amenities
    const amenities = Array.from(document.querySelectorAll('.amenity-checkbox input:checked'))
        .map(input => input.value);
    
    // Calculate points based on type and capacity
    let points = 20;
    if (type === 'studio') points = 35;
    if (type === 'apartment') points = 50;
    points += (capacity - 1) * 10;
    
    const newListing = {
        id: generateId(),
        title,
        city,
        postal,
        description,
        type,
        capacity,
        points,
        amenities,
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        createdAt: new Date().toISOString()
    };
    
    listings.push(newListing);
    saveToLocalStorage('listings', listings);
    
    // Update user stats
    currentUser.stats.listings++;
    const users = getFromLocalStorage('users') || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].stats.listings++;
        saveToLocalStorage('users', users);
        saveToLocalStorage('currentUser', users[userIndex]);
        currentUser = users[userIndex];
    }
    
    // Add bonus points for creating listing
    addPointsTransaction(
        currentUser.id,
        'bonus',
        10,
        'Bonus pour création d\'annonce'
    );
    
    showNotification('Annonce créée avec succès ! Tu as gagné 10 points bonus 🎉');
    
    // Reset form
    e.target.reset();
    
    // Go to my listings
    showDashboardSection('my-listings');
    updateDashboardData();
}

// ===================================
// Search Functions
// ===================================

function searchAccommodations(e) {
    e.preventDefault();
    
    const location = document.getElementById('search-location').value;
    const startDate = document.getElementById('search-start').value;
    const endDate = document.getElementById('search-end').value;
    
    showNotification(`Recherche de logements à ${location}...`);
    
    // Filter listings by location
    const results = listings.filter(listing => 
        listing.city.toLowerCase().includes(location.toLowerCase())
    );
    
    // Scroll to listings section
    document.getElementById('annonces').scrollIntoView({ behavior: 'smooth' });
}

function scrollToSearch() {
    document.querySelector('.search-widget').scrollIntoView({ behavior: 'smooth' });
}

// ===================================
// Profile Functions
// ===================================

function handleUpdateProfile(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const firstName = document.getElementById('profile-firstname').value;
    const lastName = document.getElementById('profile-lastname').value;
    const bio = document.getElementById('profile-bio').value;
    const university = document.getElementById('profile-university').value;
    const oldPassword = document.getElementById('profile-old-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    
    // Update user data
    currentUser.firstName = firstName;
    currentUser.lastName = lastName;
    currentUser.bio = bio;
    currentUser.university = university;
    
    // Update password if provided
    if (oldPassword && newPassword) {
        if (oldPassword === currentUser.password) {
            currentUser.password = newPassword;
            showNotification('Mot de passe mis à jour avec succès');
        } else {
            showNotification('Ancien mot de passe incorrect', 'error');
            return;
        }
    }
    
    // Save to localStorage
    const users = getFromLocalStorage('users') || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        saveToLocalStorage('users', users);
        saveToLocalStorage('currentUser', currentUser);
    }
    
    showNotification('Profil mis à jour avec succès');
    updateDashboardData();
}

// ===================================
// Reservations Functions
// ===================================

function showReservationsTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    const container = document.getElementById('reservations-container');
    
    if (tab === 'upcoming') {
        container.innerHTML = '<p class="empty-state">Aucune réservation à venir</p>';
    } else {
        container.innerHTML = '<p class="empty-state">Aucune réservation passée</p>';
    }
}

// ===================================
// Navbar Scroll Effect
// ===================================

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===================================
// Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Migrate old users to new structure
    const users = getFromLocalStorage('users') || [];
    const migratedUsers = users.map(user => {
        if (!user.pointsHistory) {
            return createUserStructure(user);
        }
        return user;
    });
    saveToLocalStorage('users', migratedUsers);
    
    // Check if user is already logged in
    const savedUser = getFromLocalStorage('currentUser');
    if (savedUser) {
        // Update user with latest data from users array
        const updatedUser = migratedUsers.find(u => u.id === savedUser.id);
        if (updatedUser) {
            currentUser = updatedUser;
            saveToLocalStorage('currentUser', updatedUser);
        } else {
            currentUser = savedUser;
        }
        
        showDashboard();
    } else {
        // Render listings for public view
        renderListings();
    }
    
    // Load saved listings
    const savedListings = getFromLocalStorage('listings');
    if (savedListings && savedListings.length > 0) {
        listings = savedListings;
        renderListings();
    }
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// ===================================
// Add CSS for notifications animation
// ===================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
