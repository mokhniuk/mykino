# 🎬 MyKino

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**MyKino** is a modern, elegant, and lightning-fast movie discovery and tracking application. Built with a focus on aesthetics and user experience, it helps you find your next favourite film and keep track of everything you want to watch.

---

## ✨ Features

- 🔍 **Powerful Search**: Discover movies and TV shows from the extensive TMDB database.
- 📱 **PWA Support**: Install MyKino on your home screen for a native app-like experience.
- 📺 **Watchlist Management**: Save movies you're interested in for later viewing.
- ❤️ **Favourites**: Curate a list of your all-time favourite films.
- 🎲 **Smart Recommendations**:
  - **Today's Pick**: A daily suggestion from your own watchlist.
  - **Top Rated Shuffle**: Explore curated top 100 movies with a single click.
- 🌓 **Dynamic Themes**: Beautiful dark and light modes that respect your system preferences.
- 🌍 **Multi-language Support**: Fully localized interface in **English**, **Ukrainian**, and **German**.
- 🖼️ **Localized Content**: Movie information and covers are displayed in your preferred language.
- 💻 **Responsive Design**: Flawless experience across mobile, tablet, and desktop devices.
- 💾 **Offline-first**: Uses IndexedDB (via `idb`) for local storage, ensuring your data is always accessible without a backend.
- ⚡ **Lightning Fast**: Optimized with Vite and TanStack Query for a snappy, high-performance feel.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **State Management**: [TanStack Query (FKA React Query)](https://tanstack.com/query/latest)
- **Routing**: [React Router 6](https://reactrouter.com/)
- **Storage**: [IndexedDB (via idb)](https://github.com/jakearchibald/idb)
- **API**: [TMDB API](https://developer.themoviedb.org/docs/getting-started)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) or [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/mokhniuk/mykino.git
   cd mykino
   ```

2. **Install dependencies**:

   ```bash
   bun install
   # or
   npm install
   ```

3. **Start the development server**:

   ```bash
   bun dev
   # or
   npm run dev
   ```

---

## 🐳 Docker Deployment

The project includes a multi-stage `Dockerfile` for easy deployment using Nginx.

1. **Build the image**:

   ```bash
   docker build -t mykino .
   ```

2. **Run the container**:
   ```bash
   docker run -d -p 8080:80 mykino
   ```
   The app will be available at `http://localhost:8080`.

---

## 📖 Project Structure

```text
src/
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
├── lib/          # Core utilities (i18n, db, theme, tmdb api)
├── pages/        # Application views/routes
└── App.tsx       # Main application component
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ for movie lovers everywhere.
</p>
