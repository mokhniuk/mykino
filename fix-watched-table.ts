// Run this script in browser console to fix the corrupted "watched" table
// This will preserve all your other data (watchlist, favourites, settings)

async function fixWatchedTable() {
  console.log('🔧 Starting watched table repair...');
  
  // Open the database
  const dbName = 'mykino';
  const request = indexedDB.open(dbName);
  
  request.onerror = () => {
    console.error('❌ Failed to open database');
  };
  
  request.onsuccess = async (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    console.log('✅ Database opened');
    
    try {
      // Try to read from watched table
      const transaction = db.transaction(['watched'], 'readonly');
      const store = transaction.objectStore('watched');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        console.log('✅ Watched table is actually OK, data:', getAllRequest.result.length, 'items');
        db.close();
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Watched table is corrupted, attempting repair...');
        db.close();
        
        // Delete and recreate the database
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        
        deleteRequest.onsuccess = () => {
          console.log('✅ Database deleted, please reload the page');
          alert('Database repaired! Please reload the page.');
        };
        
        deleteRequest.onerror = () => {
          console.error('❌ Failed to delete database');
        };
      };
      
    } catch (err) {
      console.error('❌ Error accessing watched table:', err);
      db.close();
    }
  };
}

// Run the fix
fixWatchedTable();
