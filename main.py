
import webview
import sqlite3
import json
import os
import sys

class Api:
    def __init__(self):
        self.db_path = 'usha_business.db'
        self._init_db()

    def _init_db(self):
        """Initializes the SQLite database if it doesn't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS business_data (
                id INTEGER PRIMARY KEY,
                data_json TEXT
            )
        ''')
        conn.commit()
        conn.close()

    def load_data(self):
        """Loads the AppData JSON string from SQLite."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT data_json FROM business_data WHERE id = 1')
            row = cursor.fetchone()
            conn.close()
            if row:
                return json.loads(row[0])
            return None
        except Exception as e:
            print(f"Error loading data: {e}")
            return None

    def save_data(self, data):
        """Saves the entire AppData state as a JSON blob in SQLite."""
        try:
            data_str = json.dumps(data)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            # Check if record 1 exists
            cursor.execute('SELECT id FROM business_data WHERE id = 1')
            if cursor.fetchone():
                cursor.execute('UPDATE business_data SET data_json = ? WHERE id = 1', (data_str,))
            else:
                cursor.execute('INSERT INTO business_data (id, data_json) VALUES (1, ?)', (data_str,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving data: {e}")
            return False

def get_entrypoint():
    """Determines the path to index.html."""
    if getattr(sys, 'frozen', False):
        # If bundled by PyInstaller
        return os.path.join(sys._MEIPASS, 'index.html')
    return 'index.html'

if __name__ == '__main__':
    api = Api()
    
    # Create the native desktop window
    window = webview.create_window(
        title='USHA Sales Corp - Business Manager',
        url=get_entrypoint(),
        js_api=api,
        width=1280,
        height=850,
        min_size=(1024, 768),
        background_color='#f8fafc'
    )
    
    # Start the application
    webview.start(debug=True)
