
# USHA Business Manager - Desktop Edition

This software has been compiled for native desktop use using Python and SQLite.

## Installation Steps

1.  **Install Python 3.9+**:
    Ensure Python is installed and added to your system PATH.

2.  **Install Dependencies**:
    Open your terminal/command prompt in this folder and run:
    ```bash
    pip install pywebview
    ```
    *Note: Depending on your OS, you might need `pip install pyqt6` or `pip install pyobjc` for native rendering.*

3.  **Run the Software**:
    ```bash
    python main.py
    ```

## Storage Engine
*   **Database**: `usha_business.db` (SQLite)
*   **Location**: Created automatically in the project root.
*   **Backup**: You can manually copy the `.db` file to a USB drive or use the **Export Snapshot** feature in the Settings tab.

## Features
*   **GST Ready**: Full HSN and GST slab support.
*   **Offline First**: No cloud login required.
*   **AI Forecaster**: Requires internet only for the Gemini API connection.
*   **Zero Latency**: Direct interaction with local SQLite for high-speed ledger management.
