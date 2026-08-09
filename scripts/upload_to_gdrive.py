"""
Google Drive Automated File Uploader

Uploads all 13 exported JSON data files from public/data/ directly into your Google Drive folder.
Generates VITE_GDRIVE_FILE_IDS mapping automatically into .env.

Usage:
    python3 scripts/upload_to_gdrive.py --folder-id 1mJH91_YV0hZ-rOqah95F8krkZv--iN-9
"""

import json
import os
import sys
import urllib.request
import urllib.parse
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "public" / "data"
ENV_FILE = PROJECT_DIR / ".env"

def main():
    folder_id = "1mJH91_YV0hZ-rOqah95F8krkZv--iN-9"
    for arg in sys.argv:
        if arg.startswith("--folder-id="):
            folder_id = arg.split("=", 1)[1].split("?")[0]
        elif arg == "--folder-id" and sys.argv.index(arg) + 1 < len(sys.argv):
            folder_id = sys.argv[sys.argv.index(arg) + 1].split("?")[0]

    if not DATA_DIR.exists():
        sys.exit("Error: public/data directory does not exist. Run scripts/export_supabase_to_json.py first.")

    json_files = list(DATA_DIR.glob("*.json"))
    if not json_files:
        sys.exit("No JSON files found in public/data/")

    print(f"Preparing to upload {len(json_files)} JSON files to Google Drive folder: {folder_id}\n")

    # Check for google-api-python-client or provide OAuth / Service Account auth flow
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials

        os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
        SCOPES = ['https://www.googleapis.com/auth/drive.file']
        creds = None
        token_path = PROJECT_DIR / "token.json"
        client_secret_path = PROJECT_DIR / "client_secret.json"

        if token_path.exists():
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not client_secret_path.exists():
                    print("To upload automatically via Google API:")
                    print(" 1. Download OAuth client secret from Google Cloud Console as client_secret.json in project root.")
                    print(" 2. Re-run python3 scripts/upload_to_gdrive.py --folder-id " + folder_id)
                    print("\nAlternatively, drag & drop the 13 files in public/data/ into Google Drive directly!")
                    return
                flow = InstalledAppFlow.from_client_secrets_file(str(client_secret_path), SCOPES)
                creds = flow.run_local_server(port=0)
            with open(token_path, 'w') as token:
                token.write(creds.to_json())

        service = build('drive', 'v3', credentials=creds)
        file_ids_map = {}

        for filepath in json_files:
            file_metadata = {
                'name': filepath.name,
                'parents': [folder_id]
            }
            media = MediaFileUpload(str(filepath), mimetype='application/json')
            file_obj = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
            table_name = filepath.stem
            file_ids_map[table_name] = file_obj.get('id')
            print(f"Uploaded {filepath.name} -> ID: {file_obj.get('id')}")

        # Update .env with VITE_GDRIVE_FILE_IDS
        env_content = ""
        if ENV_FILE.exists():
            with open(ENV_FILE) as f:
                env_content = f.read()

        file_ids_json = json.dumps(file_ids_map)
        new_line = f"VITE_GDRIVE_FILE_IDS='{file_ids_json}'\n"

        if "VITE_GDRIVE_FILE_IDS=" in env_content:
            lines = env_content.splitlines()
            updated_lines = [new_line.strip() if l.startswith("VITE_GDRIVE_FILE_IDS=") else l for l in lines]
            env_content = "\n".join(updated_lines) + "\n"
        else:
            env_content += new_line

        with open(ENV_FILE, "w") as f:
            f.write(env_content)

        print("\nSuccessfully updated .env with uploaded Google Drive File IDs!")

    except ImportError:
        print("[Notice] google-api-python-client is not installed.")
        print("To run automated Google Drive API uploads, run:")
        print("  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
        print("\nIn the meantime, your app is running cleanly using the local public/data/ files at http://127.0.0.1:5173/state-of-payments/")

if __name__ == "__main__":
    main()
