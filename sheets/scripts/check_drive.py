"""Liệt kê tất cả files trong Google Drive của Service Account"""
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
import json

creds = Credentials.from_service_account_file(
    r'credentials\gen-lang-client-0658622290-67f651f4974d.json',
    scopes=['https://www.googleapis.com/auth/drive']
)
service = build('drive', 'v3', credentials=creds)

# Get storage quota
about = service.about().get(fields='storageQuota,user').execute()
quota = about.get('storageQuota', {})
print("=== STORAGE QUOTA ===")
print(f"  Limit:      {int(quota.get('limit',0))/1e9:.2f} GB")
print(f"  Usage:      {int(quota.get('usage',0))/1e9:.2f} GB")
print(f"  In Drive:   {int(quota.get('usageInDrive',0))/1e6:.2f} MB")
print(f"  In Trash:   {int(quota.get('usageInDriveTrash',0))/1e6:.2f} MB")
print()

# List all files
print("=== ALL FILES ===")
page_token = None
all_files = []
while True:
    results = service.files().list(
        pageSize=200,
        fields='nextPageToken, files(id,name,mimeType,size,createdTime,trashed)',
        pageToken=page_token
    ).execute()
    all_files.extend(results.get('files', []))
    page_token = results.get('nextPageToken')
    if not page_token:
        break

print(f"Total files: {len(all_files)}")
for f in all_files:
    size_bytes = int(f.get('size', 0))
    size_mb = size_bytes / 1e6
    trash = " [TRASH]" if f.get('trashed') else ""
    print(f"  {f['name']}{trash}  |  {size_mb:.2f}MB  |  {f.get('createdTime','')[:10]}")
