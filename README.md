# 🎬 Kinofilm

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Kinofilm** is a modern, elegant, and lightning-fast movie discovery and tracking application. Built with a focus on aesthetics and user experience, it helps you find your next favourite film and keep track of everything you want to watch.

---

## ✨ Features

- 🔍 **Powerful Search**: Discover movies and TV shows from the extensive OMDB database.
- 📺 **Watchlist Management**: Save movies you're interested in for later viewing.
- ❤️ **Favourites**: Curate a list of your all-time favourite films.
- 🎲 **Smart Recommendations**:
  - **Today's Pick**: A daily suggestion from your own watchlist.
  - **Top Rated Shuffle**: Explore curated top 100 movies with a single click.
- 🌓 **Dynamic Themes**: Beautiful dark and light modes that respect your system preferences.
- 🌍 **Multi-language Support**: Fully localized interface in **English** and **Ukrainian**.
- 📱 **Responsive Design**: Flawless experience across mobile, tablet, and desktop devices.
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
- **API**: [OMDb API](http://www.omdbapi.com/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) or [npm](https://www.npmjs.com/)
- An [OMDb API Key](http://www.omdbapi.com/apikey.aspx) (Free)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/your-next-watch.git
   cd your-next-watch
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

4. **Add your API Key**:
   Open the app in your browser and enter your OMDb API key when prompted in the settings or setup screen.

---

## 🐳 Docker Deployment

The project includes a multi-stage `Dockerfile` for easy deployment using Nginx.

1. **Build the image**:

   ```bash
   docker build -t kinofilm .
   ```

2. **Run the container**:
   ```bash
   docker run -d -p 8080:80 kinofilm
   ```
   The app will be available at `http://localhost:8080`.

---

## 📖 Project Structure

```text
src/
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
├── lib/          # Core utilities (i18n, db, theme, omdb api)
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
