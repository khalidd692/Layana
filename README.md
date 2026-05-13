# La Gardienne de la Vérité 🌙

**Un jeu islamique pour enfants en français** — thème : la vérité contre le mensonge.

Conçu pour les filles de 7 ans selon la méthodologie islamique Salafi.

---

## 🎮 Fonctionnalités

- **6 écrans complets** : Titre → Personnage → Carte de niveau → Jeu → Conséquence → Victoire
- **5 scénarios** (Maison, École, Parc, Mosquée, Magasin) avec des choix moraux
- **Système de vies** (3 ❤️) et de **lumières** (score sur 5)
- **Barre XP** animée en temps réel
- **Système de combo** : 3 vérités d'affilée = "COMBO VÉRITÉ 🔥"
- **Hadiths** dans un parchemin animé après les bonnes réponses
- **Maison du Paradis** en pixel art CSS (se construit avec les bonnes réponses)
- **Feux d'artifice CSS** à l'écran de victoire
- **Web Audio API** : mélodies générées sans fichiers audio
- **Silhouette de mosquée** SVG, ciel étoilé animé, bordure géométrique islamique

## 🚀 Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

## 🏗️ Build production

```bash
npm run build
```

## 🔧 Tech

- React 19 + Vite
- CSS keyframes uniquement (zéro librairie d'animation)
- Web Audio API (zéro fichier audio)
- Zéro dépendances externes hors React
